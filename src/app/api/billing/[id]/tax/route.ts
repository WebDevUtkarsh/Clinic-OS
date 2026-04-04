import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/tenant/client";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  billingDetailSelect,
  calculateRateAmount,
  ensureBillingCanChangeCharges,
  getBillingTotals,
  serializeBillingDetail,
  syncBillingStatus,
  toMoneyDecimal,
  toMoneyNumber,
  withBillingLock,
} from "@/lib/backend/billing/service";
import { applyTaxSchema } from "@/lib/backend/billing/schemas";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import {
  refreshFinancialAggregateForDate,
} from "@/lib/backend/reports/aggregator";
import { invalidateFinancialReportCache } from "@/lib/backend/reports/cache";
import { requireAccess } from "@/lib/backend/rbac/guard";

type BillingTaxRouteContext = {
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
  { params }: BillingTaxRouteContext,
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
    const parsed = applyTaxSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid input", 400, {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { id } = await params;
    const prisma = await getTenantPrisma(context.tenantId);

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

      const statusError = ensureBillingCanChangeCharges(billing.status);
      if (statusError) {
        throw new Error(statusError);
      }

      const currentTotals = await getBillingTotals(tx, billing.id, context.facilityId);
      const taxableBase = Math.max(
        toMoneyNumber(
          toMoneyDecimal(currentTotals.subtotal).plus(currentTotals.discount),
        ),
        0,
      );

      if (taxableBase <= 0) {
        throw new Error("TAXABLE_BASE_EMPTY");
      }

      let totalTaxAdded = 0;

      for (const taxLine of parsed.data.taxes) {
        const taxAmount = taxLine.amount !== undefined
          ? toMoneyDecimal(taxLine.amount)
          : calculateRateAmount(taxableBase, taxLine.rate ?? 0);

        totalTaxAdded += toMoneyNumber(taxAmount);

        await tx.ledgerEntry.create({
          data: {
            billingId: billing.id,
            facilityId: context.facilityId,
            type: "TAX",
            amount: taxAmount,
            referenceType: "TAX",
            metadata: {
              name: taxLine.name,
              rate: taxLine.rate ?? null,
              taxableBase,
              ...(taxLine.metadata ?? {}),
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
        taxableBase,
        totalTaxAdded: toMoneyNumber(totalTaxAdded),
      };
    });

    await auditLog(req, {
      action: "billing:tax",
      resource: "Billing",
      resourceId: result.billing.id,
      permissionUsed: "billing:update",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        taxableBase: result.taxableBase,
        taxLines: parsed.data.taxes.map((taxLine) => ({
          name: taxLine.name,
          rate: taxLine.rate ?? null,
          amount: taxLine.amount ?? null,
        })),
        totalTaxAdded: result.totalTaxAdded,
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
        case "TAXABLE_BASE_EMPTY":
          return jsonError("Taxes require at least one chargeable amount", 400);
        case "Cancelled bills cannot be modified":
        case "Paid bills cannot be modified":
          return jsonError(error.message, 400);
        default:
          break;
      }
    }

    console.error("Apply billing tax failed:", error);
    return jsonError("Failed to apply tax", 500);
  }
}
