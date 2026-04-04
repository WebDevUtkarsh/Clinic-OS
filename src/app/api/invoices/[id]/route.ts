import { NextRequest, NextResponse } from "next/server";
import { getInvoiceById } from "@/lib/backend/invoices/service";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

type InvoiceRouteContext = {
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
  { params }: InvoiceRouteContext,
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
    const invoice = await getInvoiceById(prisma, {
      invoiceId: id,
      facilityId: context.facilityId,
    });

    if (!invoice) {
      return jsonError("Invoice not found", 404);
    }

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Fetch invoice failed:", error);
    return jsonError("Failed to fetch invoice", 500);
  }
}
