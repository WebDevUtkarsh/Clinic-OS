import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { auditLog } from "@/lib/backend/audit/logger";

const schema = z.object({
  ids: z.array(z.string()).min(1).max(100),
});

export async function POST(req: NextRequest) {
  const error = requireAccess(req, {
    permission: "patients:delete",
    facilityScoped: true,
  });
  if (error) return error;

  const { error: facilityError, context } =
    await requireFacilityContext(req);
  if (facilityError) return facilityError;

  const { facilityId, organizationId, tenantId } = context;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    const prisma = await getTenantPrisma(tenantId);

    const result = await prisma.patient.updateMany({
      where: {
        id: { in: parsed.data.ids },
        facilityId,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });

    auditLog(req, {
      action: "patients:bulk_delete",
      resource: "Patient",
      permissionUsed: "patients:delete",
      facilityId,
      organizationId,
      metadata: {
        requested: parsed.data.ids.length,
        deleted: result.count,
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });

  } catch (err) {
    console.error("Bulk delete failed:", err);

    return NextResponse.json(
      { success: false, error: "Bulk delete failed" },
      { status: 500 }
    );
  }
}