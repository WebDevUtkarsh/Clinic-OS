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
import { refundBillingSchema } from "@/lib/backend/billing/schemas";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import {
  refreshFinancialAggregateForDate,
} from "@/lib/backend/reports/aggregator";
import { invalidateFinancialReportCache } from "@/lib/backend/reports/cache";
import { requireAccess } from "@/lib/backend/rbac/guard";

type BillingRefundRouteContext = {
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
  { params }: BillingRefundRouteContext,
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
    const parsed = refundBillingSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid input", 400, {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { id } = await params;
    const prisma = await getTenantPrisma(context.tenantId);
    const refundAmount = toMoneyDecimal(parsed.data.amount);

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

      const payment = await tx.payment.findFirst({
        where: {
          id: parsed.data.paymentId,
          billingId: billing.id,
        },
        select: {
          id: true,
          amount: true,
          status: true,
        },
      });

      if (!payment) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      if (payment.status === "FAILED") {
        throw new Error("PAYMENT_NOT_REFUNDABLE");
      }

      const refundedAmount = await tx.ledgerEntry.aggregate({
        where: {
          billingId: billing.id,
          facilityId: context.facilityId,
          type: "REFUND",
          referenceType: "PAYMENT",
          referenceId: payment.id,
        },
        _sum: {
          amount: true,
        },
      });

      const alreadyRefunded = toMoneyDecimal(refundedAmount._sum.amount ?? 0);
      const remainingRefundable = toMoneyDecimal(payment.amount).minus(alreadyRefunded);

      if (remainingRefundable.lte(0)) {
        throw new Error("PAYMENT_NOT_REFUNDABLE");
      }

      if (refundAmount.greaterThan(remainingRefundable)) {
        throw new Error("REFUND_EXCEEDS_PAYMENT");
      }

      await tx.ledgerEntry.create({
        data: {
          billingId: billing.id,
          facilityId: context.facilityId,
          type: "REFUND",
          amount: refundAmount,
          referenceType: "PAYMENT",
          referenceId: payment.id,
          metadata: {
            reason: parsed.data.reason,
            paymentId: payment.id,
            ...(parsed.data.metadata ?? {}),
          } as Prisma.InputJsonValue,
          createdBy,
        },
        select: {
          id: true,
        },
      });

      const refundedAfter = alreadyRefunded.plus(refundAmount);
      if (refundedAfter.greaterThanOrEqualTo(toMoneyDecimal(payment.amount))) {
        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: "REFUNDED",
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
        refundAmount: toMoneyNumber(refundAmount),
      };
    });

    await auditLog(req, {
      action: "billing:refund",
      resource: "Billing",
      resourceId: result.billing.id,
      permissionUsed: "billing:update",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        paymentId: result.paymentId,
        amount: result.refundAmount,
        reason: parsed.data.reason,
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
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "BILLING_NOT_FOUND":
          return jsonError("Billing not found", 404);
        case "PAYMENT_NOT_FOUND":
          return jsonError("Payment not found for this bill", 404);
        case "Cancelled bills cannot accept payments":
          return jsonError(error.message, 400);
        case "PAYMENT_NOT_REFUNDABLE":
          return jsonError("Payment has no refundable balance", 400);
        case "REFUND_EXCEEDS_PAYMENT":
          return jsonError("Refund amount exceeds the remaining refundable amount", 400);
        default:
          break;
      }
    }

    console.error("Refund billing failed:", error);
    return jsonError("Failed to record refund", 500);
  }
}
