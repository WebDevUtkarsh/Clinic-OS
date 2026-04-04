import { NextRequest, NextResponse } from "next/server";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";
import z from "zod";
import { auditLog } from "@/lib/backend/audit/logger";

const schema = z.object({
  name: z.string().min(1).optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  dob: z.string().datetime().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

type PatientRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  req: NextRequest,
  { params }: PatientRouteContext,
) {
  const error = requireAccess(req, {
    permission: "patients:read",
    facilityScoped: true,
  });
  const { error: facilityError, context } = await requireFacilityContext(req);

  if (error) return error;
  if (facilityError) return facilityError;

  const { id } = await params;
  const { facilityId } = context;
  try {
    const tenantId = req.headers.get("x-tenant-id")!;
    const prisma = await getTenantPrisma(tenantId);

    const patient = await prisma.patient.findFirst({
      where: {
        id,
        facilityId,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error("Fetch patient failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch patient" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: PatientRouteContext,
) {
  const error = requireAccess(req, {
    permission: "patients:update",
    facilityScoped: true,
  });
  if (error) return error;

  const { error: facilityError, context } = await requireFacilityContext(req);
  if (facilityError) return facilityError;

  const { id } = await params;
  const { facilityId } = context;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    const tenantId = req.headers.get("x-tenant-id")!;
    const prisma = await getTenantPrisma(tenantId);

    const existing = await prisma.patient.findFirst({
      where: {
        id,
        facilityId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.patient.update({
      where: { id: existing.id },
      data: {
        ...parsed.data,
        ...(parsed.data.dob && { dob: new Date(parsed.data.dob) }),
      },
    });

    auditLog(req, {
      action: "patient_updated",
      resource: "Patient",
      resourceId: existing.id,
      permissionUsed: "patients:update",
      facilityId,
      organizationId: context.organizationId,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Update patient failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update patient" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: PatientRouteContext
) {
  const error = requireAccess(req, {
    permission: "patients:delete",
    facilityScoped: true,
  });
  if (error) return error;

  const { error: facilityError, context } =
    await requireFacilityContext(req);
  if (facilityError) return facilityError;

  const { id } = await params;
  const { facilityId } = context;

  try {
    const tenantId = req.headers.get("x-tenant-id")!;
    const prisma = await getTenantPrisma(tenantId);

    const existing = await prisma.patient.findFirst({
      where: {
        id,
        facilityId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    await prisma.patient.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    // 🧾 Audit
    auditLog(req, {
      action: "soft_delete patient",
      resource: "Patient",
      resourceId: id,
        permissionUsed: "patients:delete",
        facilityId,
        organizationId: context.organizationId,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error("Delete patient failed:", err);

    return NextResponse.json(
      { success: false, error: "Failed to delete patient" },
      { status: 500 }
    );
  }
}
