import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/tenant/client";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  billingDetailSelect,
  ensureBillingCanAcceptPayment,
  getBillingTotals,
  serializeBillingDetail,
  syncBillingStatus,
  toMoneyDecimal,
  toMoneyNumber,
  withBillingLock,
} from "@/lib/backend/billing/service";
import { writeOffBillingSchema } from "@/lib/backend/billing/schemas";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import {
  refreshFinancialAggregateForDate,
} from "@/lib/backend/reports/aggregator";
import { invalidateFinancialReportCache } from "@/lib/backend/reports/cache";
import { requireAccess } from "@/lib/backend/rbac/guard";

type BillingWriteOffRouteContext = {
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
  { params }: BillingWriteOffRouteContext,
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
    const parsed = writeOffBillingSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid input", 400, {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { id } = await params;
    const prisma = await getTenantPrisma(context.tenantId);
    const writeOffAmount = toMoneyDecimal(parsed.data.amount);

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

      const writeOffError = ensureBillingCanAcceptPayment(billing.status);
      if (writeOffError) {
        throw new Error(writeOffError);
      }

      const totalsBefore = await getBillingTotals(tx, billing.id, context.facilityId);
      if (totalsBefore.due <= 0) {
        throw new Error("BILLING_HAS_NO_DUE");
      }

      if (writeOffAmount.greaterThan(toMoneyDecimal(totalsBefore.due))) {
        throw new Error("WRITEOFF_EXCEEDS_DUE");
      }

      await tx.ledgerEntry.create({
        data: {
          billingId: billing.id,
          facilityId: context.facilityId,
          type: "WRITE_OFF",
          amount: writeOffAmount,
          referenceType: "WRITE_OFF",
          metadata: {
            reason: parsed.data.reason,
            ...(parsed.data.metadata ?? {}),
          } as Prisma.InputJsonValue,
          createdBy,
        },
        select: {
          id: true,
        },
      });

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
        amount: toMoneyNumber(writeOffAmount),
      };
    });

    await auditLog(req, {
      action: "billing:writeoff",
      resource: "Billing",
      resourceId: result.billing.id,
      permissionUsed: "billing:update",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        amount: result.amount,
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
        case "Cancelled bills cannot accept payments":
          return jsonError(error.message, 400);
        case "BILLING_HAS_NO_DUE":
          return jsonError("Billing has no due amount", 400);
        case "WRITEOFF_EXCEEDS_DUE":
          return jsonError("Write-off amount exceeds the current due", 400);
        default:
          break;
      }
    }

    console.error("Write off billing failed:", error);
    return jsonError("Failed to write off billing amount", 500);
  }
}
