import { NextRequest, NextResponse } from "next/server";
import { renderInvoicePdf } from "@/lib/backend/invoices/pdf";
import { getInvoiceById } from "@/lib/backend/invoices/service";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

type InvoicePdfRouteContext = {
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
  { params }: InvoicePdfRouteContext,
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

    const pdfBuffer = await renderInvoicePdf(invoice.snapshot);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, max-age=300, immutable",
      },
    });
  } catch (error) {
    console.error("Render invoice PDF failed:", error);
    return jsonError("Failed to render invoice PDF", 500);
  }
}
