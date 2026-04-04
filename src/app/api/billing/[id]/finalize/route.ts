import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  billingDetailSelect,
  ensureBillingCanFinalize,
  getBillingTotals,
  serializeBillingDetail,
  syncBillingStatus,
  withBillingLock,
} from "@/lib/backend/billing/service";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

type BillingFinalizeRouteContext = {
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

export async function PATCH(
  req: NextRequest,
  { params }: BillingFinalizeRouteContext,
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
          status: true,
        },
      });

      if (!billing) {
        throw new Error("BILLING_NOT_FOUND");
      }

      const finalizeError = ensureBillingCanFinalize(billing.status);
      if (finalizeError) {
        throw new Error(finalizeError);
      }

      const totalsBefore = await getBillingTotals(tx, billing.id, context.facilityId);
      if (totalsBefore.subtotal <= 0 && totalsBefore.tax <= 0) {
        throw new Error("BILLING_EMPTY");
      }

      const { totals, status } = await syncBillingStatus(tx, {
        billingId: billing.id,
        facilityId: context.facilityId,
        currentStatus: billing.status,
        preserveDraft: false,
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
        status,
      };
    });

    await auditLog(req, {
      action: "billing:finalize",
      resource: "Billing",
      resourceId: result.billing.id,
      permissionUsed: "billing:update",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        nextStatus: result.status,
      },
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
        case "Cancelled bills cannot be finalized":
        case "Only draft bills can be finalized":
          return jsonError(error.message, 400);
        case "BILLING_EMPTY":
          return jsonError("Billing must contain at least one charge before finalizing", 400);
        default:
          break;
      }
    }

    console.error("Finalize billing failed:", error);
    return jsonError("Failed to finalize billing", 500);
  }
}
