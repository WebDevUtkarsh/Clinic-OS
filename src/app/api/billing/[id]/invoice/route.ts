import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/tenant/client";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  buildInvoiceSnapshot,
  withInvoiceGenerationLock,
} from "@/lib/backend/invoices/service";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

type BillingInvoiceRouteContext = {
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

export async function POST(
  req: NextRequest,
  { params }: BillingInvoiceRouteContext,
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

  const generatedBy = req.headers.get("x-user-id");
  if (!generatedBy) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const { id } = await params;
    const prisma = await getTenantPrisma(context.tenantId);
    const year = new Date().getUTCFullYear();

    const invoice = await withInvoiceGenerationLock(
      prisma,
      {
        billingId: id,
        facilityId: context.facilityId,
        year,
      },
      async (tx) =>
        buildInvoiceSnapshot(tx, {
          tenantId: context.tenantId,
          billingId: id,
          facilityId: context.facilityId,
          generatedBy,
        }),
    );

    await auditLog(req, {
      action: "invoice:generated",
      resource: "Invoice",
      resourceId: invoice.id,
      permissionUsed: "billing:read",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        billingId: invoice.billingId,
        invoiceNumber: invoice.invoiceNumber,
      },
    });

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "BILLING_NOT_FOUND":
          return jsonError("Billing not found", 404);
        case "FACILITY_NOT_FOUND":
          return jsonError("Facility not found", 404);
        case "INVOICE_ALREADY_EXISTS":
          return jsonError("Invoice already exists for this bill", 409);
        default:
          break;
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("Invoice already exists for this bill", 409);
    }

    console.error("Generate invoice failed:", error);
    return jsonError("Failed to generate invoice", 500);
  }
}
