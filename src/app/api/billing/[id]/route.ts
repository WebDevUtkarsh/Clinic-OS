import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  billingDetailSelect,
  ensureBillingCanDelete,
  getBillingDetail,
  getBillingTotals,
  serializeBillingDetail,
  withBillingLock,
} from "@/lib/backend/billing/service";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { invalidateFinancialReportCache } from "@/lib/backend/reports/cache";
import { requireAccess } from "@/lib/backend/rbac/guard";

type BillingRouteContext = {
  params: Promise<{ id: string }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  );
}

export async function GET(
  req: NextRequest,
  { params }: BillingRouteContext,
) {
  const accessError = requireAccess(req, {
    permission: "billing:read",
    facilityScoped: true,
  });

  if (accessError) {
    return accessError;
  }

  const { error: facilityError, context } = await requireFacilityContext(req);
  if (facilityError) {
    return facilityError;
  }

  try {
    const { id } = await params;
    const prisma = await getTenantPrisma(context.tenantId);
    const billing = await getBillingDetail(prisma, id, context.facilityId);

    if (!billing) {
      return jsonError("Billing not found", 404);
    }

    return NextResponse.json({
      success: true,
      data: billing,
    });
  } catch (error) {
    console.error("Fetch billing detail failed:", error);
    return jsonError("Failed to fetch billing", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: BillingRouteContext,
) {
  const accessError = requireAccess(req, {
    permission: "billing:delete",
    facilityScoped: true,
  });

  if (accessError) {
    return accessError;
  }

  const { error: facilityError, context } = await requireFacilityContext(req);
  if (facilityError) {
    return facilityError;
  }

  try {
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
          facilityId: true,
          status: true,
        },
      });

      if (!billing) {
        throw new Error("BILLING_NOT_FOUND");
      }

      const deletionError = ensureBillingCanDelete(billing.status);
      if (deletionError) {
        throw new Error(deletionError);
      }

      const totals = await getBillingTotals(tx, billing.id, context.facilityId);
      if (totals.paid > 0 || totals.refund > 0 || totals.writeOff > 0) {
        throw new Error("BILLING_HAS_FINANCIAL_ACTIVITY");
      }

      const updated = await tx.billing.update({
        where: { id: billing.id },
        data: {
          status: "CANCELLED",
        },
        select: billingDetailSelect,
      });

      return {
        billing: updated,
        totals,
        previousStatus: billing.status,
      };
    });

    await auditLog(req, {
      action: "billing:cancel",
      resource: "Billing",
      resourceId: result.billing.id,
      permissionUsed: "billing:delete",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        previousStatus: result.previousStatus,
        nextStatus: "CANCELLED",
      },
    });

    await invalidateFinancialReportCache({
      tenantId: context.tenantId,
      facilityId: context.facilityId,
    });

    return NextResponse.json({
      success: true,
      data: serializeBillingDetail(result.billing, result.totals),
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "BILLING_NOT_FOUND":
          return jsonError("Billing not found", 404);
        case "Billing is already cancelled":
          return jsonError("Billing is already cancelled", 400);
        case "BILLING_HAS_FINANCIAL_ACTIVITY":
          return jsonError(
            "Bills with payments, refunds, or write-offs cannot be cancelled",
            400,
          );
        default:
          break;
      }
    }

    console.error("Cancel billing failed:", error);
    return jsonError("Failed to cancel billing", 500);
  }
}
