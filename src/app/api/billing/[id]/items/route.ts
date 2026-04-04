import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/tenant/client";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  billingDetailSelect,
  calculateLineAmount,
  ensureBillingCanChangeCharges,
  serializeBillingDetail,
  syncBillingStatus,
  toMoneyDecimal,
  toMoneyNumber,
  withBillingLock,
} from "@/lib/backend/billing/service";
import { addBillingItemSchema } from "@/lib/backend/billing/schemas";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import {
  refreshFinancialAggregateForDate,
} from "@/lib/backend/reports/aggregator";
import { invalidateFinancialReportCache } from "@/lib/backend/reports/cache";
import { requireAccess } from "@/lib/backend/rbac/guard";

type BillingItemRouteContext = {
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
  { params }: BillingItemRouteContext,
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
    const parsed = addBillingItemSchema.safeParse(body);

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
          doctorId: true,
          facilityId: true,
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

      let itemType = parsed.data.type;
      let itemName = parsed.data.name ?? "Consultation";
      let unitPriceDecimal = parsed.data.unitPrice
        ? toMoneyDecimal(parsed.data.unitPrice)
        : null;
      let metadataObject: Record<string, unknown> = {
        ...(parsed.data.metadata ?? {}),
      };

      if (parsed.data.serviceId) {
        const service = await tx.service.findFirst({
          where: {
            id: parsed.data.serviceId,
            facilityId: context.facilityId,
          },
          select: {
            id: true,
            name: true,
            type: true,
            defaultPrice: true,
          },
        });

        if (!service) {
          throw new Error("SERVICE_NOT_FOUND");
        }

        itemType = service.type;
        itemName = parsed.data.name ?? service.name;
        unitPriceDecimal = parsed.data.unitPrice
          ? toMoneyDecimal(parsed.data.unitPrice)
          : service.defaultPrice;
        metadataObject = {
          ...metadataObject,
          serviceId: service.id,
          serviceName: service.name,
        };
      } else if (parsed.data.type === "CONSULTATION") {
        if (!billing.doctorId) {
          throw new Error("CONSULTATION_DOCTOR_REQUIRED");
        }

        const doctorFacility = await tx.doctorFacility.findFirst({
          where: {
            doctorId: billing.doctorId,
            facilityId: context.facilityId,
          },
          select: {
            consultationFee: true,
          },
        });

        if (!doctorFacility) {
          throw new Error("DOCTOR_NOT_FOUND");
        }

        if (doctorFacility.consultationFee === null) {
          throw new Error("CONSULTATION_FEE_NOT_CONFIGURED");
        }

        itemName = parsed.data.name ?? "Consultation";
        unitPriceDecimal = toMoneyDecimal(doctorFacility.consultationFee);
      }

      if (!unitPriceDecimal) {
        throw new Error("UNIT_PRICE_REQUIRED");
      }

      const item = await tx.billingItem.create({
        data: {
          billingId: billing.id,
          type: itemType,
          name: itemName,
          quantity: parsed.data.quantity,
          unitPrice: unitPriceDecimal,
          metadata: metadataObject as Prisma.InputJsonValue,
        },
        select: {
          id: true,
        },
      });

      const amount = calculateLineAmount(parsed.data.quantity, unitPriceDecimal);

      await tx.ledgerEntry.create({
        data: {
          billingId: billing.id,
          facilityId: context.facilityId,
          type: "CHARGE",
          amount,
          referenceType: "BILLING_ITEM",
          referenceId: item.id,
          metadata: {
            itemType,
            itemName,
            quantity: parsed.data.quantity,
            unitPrice: toMoneyNumber(unitPriceDecimal),
            ...metadataObject,
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
        itemType,
        itemName,
        quantity: parsed.data.quantity,
        unitPrice: toMoneyNumber(unitPriceDecimal),
        amount: toMoneyNumber(amount),
      };
    });

    await auditLog(req, {
      action: "billing:add-item",
      resource: "Billing",
      resourceId: result.billing.id,
      permissionUsed: "billing:update",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        itemType: result.itemType,
        itemName: result.itemName,
        quantity: result.quantity,
        unitPrice: result.unitPrice,
        amount: result.amount,
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
        case "SERVICE_NOT_FOUND":
          return jsonError("Service not found in this facility", 404);
        case "CONSULTATION_DOCTOR_REQUIRED":
          return jsonError("Consultation charges require a doctor on the bill", 400);
        case "DOCTOR_NOT_FOUND":
          return jsonError("Doctor is not assigned to this facility", 404);
        case "CONSULTATION_FEE_NOT_CONFIGURED":
          return jsonError("Consultation fee is not configured for this doctor", 400);
        case "UNIT_PRICE_REQUIRED":
          return jsonError("Unit price is required", 400);
        case "Cancelled bills cannot be modified":
        case "Paid bills cannot be modified":
          return jsonError(error.message, 400);
        default:
          break;
      }
    }

    console.error("Add billing item failed:", error);
    return jsonError("Failed to add billing item", 500);
  }
}
