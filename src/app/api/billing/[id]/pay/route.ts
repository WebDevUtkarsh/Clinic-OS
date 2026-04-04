import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/tenant/client";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  billingDetailSelect,
  ensureBillingCanAcceptPayment,
  serializeBillingDetail,
  syncBillingStatus,
  toMoneyDecimal,
  toMoneyNumber,
  withBillingLock,
} from "@/lib/backend/billing/service";
import { makePaymentSchema } from "@/lib/backend/billing/schemas";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import {
  refreshFinancialAggregateForDate,
} from "@/lib/backend/reports/aggregator";
import { invalidateFinancialReportCache } from "@/lib/backend/reports/cache";
import { requireAccess } from "@/lib/backend/rbac/guard";

type BillingPaymentRouteContext = {
  params: Promise<{ id: string }>;
};

function jsonError(
  message: string,
  status: number,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

export async function POST(
  req: NextRequest,
  { params }: BillingPaymentRouteContext,
) {
  const accessError = requireAccess(req, {
    permission: "billing:update",
    facilityScoped: true,
  });

  if (accessError) {
    return accessError;
  }

  const { error: facilityError, context } = await requireFacilityContext(req);
  if (facilityError) {
    return facilityError;
  }

  const createdBy = req.headers.get("x-user-id");
  if (!createdBy) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const parsed = makePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid input", 400, {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { id } = await params;
    const prisma = await getTenantPrisma(context.tenantId);
    const paymentAmount = toMoneyDecimal(parsed.data.amount);

    const result = await withBillingLock(prisma, id, async (tx) => {
      const billing = await tx.billing.findFirst({
        where: {
          id,
          facilityId: context.facilityId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!billing) {
        throw new Error("BILLING_NOT_FOUND");
      }

      const paymentError = ensureBillingCanAcceptPayment(billing.status);
      if (paymentError) {
        throw new Error(paymentError);
      }

      if (parsed.data.idempotencyKey) {
        const existingPayment = await tx.payment.findFirst({
          where: {
            billingId: billing.id,
            idempotencyKey: parsed.data.idempotencyKey,
          },
          select: {
            id: true,
          },
        });

        if (existingPayment) {
          const totals = await syncBillingStatus(tx, {
            billingId: billing.id,
            facilityId: context.facilityId,
            currentStatus: billing.status,
            preserveDraft: billing.status === "DRAFT",
          });
          const existingBilling = await tx.billing.findFirst({
            where: {
              id: billing.id,
              facilityId: context.facilityId,
            },
            select: billingDetailSelect,
          });

          if (!existingBilling) {
            throw new Error("BILLING_NOT_FOUND");
          }

          return {
            billing: existingBilling,
            totals: totals.totals,
            paymentId: existingPayment.id,
            replayed: true,
          };
        }
      }

      const totalsBefore = await syncBillingStatus(tx, {
        billingId: billing.id,
        facilityId: context.facilityId,
        currentStatus: billing.status,
        preserveDraft: billing.status === "DRAFT",
      });

      if (parsed.data.status === "SUCCESS") {
        if (totalsBefore.totals.due <= 0) {
          throw new Error("BILLING_HAS_NO_DUE");
        }

        if (paymentAmount.greaterThan(toMoneyDecimal(totalsBefore.totals.due))) {
          throw new Error("PAYMENT_EXCEEDS_DUE");
        }
      }

      const payment = await tx.payment.create({
        data: {
          billingId: billing.id,
          amount: paymentAmount,
          method: parsed.data.method,
          referenceId: parsed.data.referenceId ?? null,
          idempotencyKey: parsed.data.idempotencyKey ?? null,
          status: parsed.data.status,
        },
        select: {
          id: true,
        },
      });

      if (parsed.data.status === "SUCCESS") {
        await tx.ledgerEntry.create({
          data: {
            billingId: billing.id,
            facilityId: context.facilityId,
            type: "PAYMENT",
            amount: paymentAmount,
            referenceType: "PAYMENT",
            referenceId: payment.id,
            metadata: {
              method: parsed.data.method,
              referenceId: parsed.data.referenceId ?? null,
              idempotencyKey: parsed.data.idempotencyKey ?? null,
            } as Prisma.InputJsonValue,
            createdBy,
          },
          select: {
            id: true,
          },
        });
      }

      const { totals } = await syncBillingStatus(tx, {
        billingId: billing.id,
        facilityId: context.facilityId,
        currentStatus: billing.status,
        preserveDraft: billing.status === "DRAFT",
      });

      const updated = await tx.billing.findFirst({
        where: {
          id: billing.id,
          facilityId: context.facilityId,
        },
        select: billingDetailSelect,
      });

      if (!updated) {
        throw new Error("BILLING_NOT_FOUND");
      }

      return {
        billing: updated,
        totals,
        paymentId: payment.id,
        replayed: false,
      };
    });

    await auditLog(req, {
      action: "billing:payment",
      resource: "Billing",
      resourceId: result.billing.id,
      permissionUsed: "billing:update",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        paymentId: result.paymentId,
        amount: toMoneyNumber(paymentAmount),
        method: parsed.data.method,
        status: parsed.data.status,
        replayed: result.replayed,
        idempotencyKey: parsed.data.idempotencyKey ?? null,
      },
    });

    await Promise.all([
      invalidateFinancialReportCache({
        tenantId: context.tenantId,
        facilityId: context.facilityId,
      }),
      refreshFinancialAggregateForDate({
        tenantId: context.tenantId,
        facilityId: context.facilityId,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: serializeBillingDetail(result.billing, result.totals),
      ...(result.replayed ? { idempotentReplay: true } : {}),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("Duplicate payment request", 409);
    }

    if (error instanceof Error) {
      switch (error.message) {
        case "BILLING_NOT_FOUND":
          return jsonError("Billing not found", 404);
        case "Cancelled bills cannot accept payments":
          return jsonError(error.message, 400);
        case "BILLING_HAS_NO_DUE":
          return jsonError("Billing has no due amount", 400);
        case "PAYMENT_EXCEEDS_DUE":
          return jsonError("Payment amount exceeds current due", 400);
        default:
          break;
      }
    }

    console.error("Make billing payment failed:", error);
    return jsonError("Failed to record payment", 500);
  }
}
