import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/tenant/client";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  doctorDetailSelect,
  getAccessibleDoctorById,
  isSuperAdmin,
  parseAccessibleFacilityIds,
  serializeDoctor,
} from "@/lib/backend/doctors/service";
import { updateDoctorSchema } from "@/lib/backend/doctors/schemas";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

type DoctorRouteContext = {
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

export async function GET(
  req: NextRequest,
  { params }: DoctorRouteContext,
) {
  const accessError = requireAccess(req, {
    permission: "doctors:read",
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
    const accessibleFacilityIds = parseAccessibleFacilityIds(req);
    const superAdmin = isSuperAdmin(req);

    const doctor = await getAccessibleDoctorById(prisma, {
      doctorId: id,
      accessibleFacilityIds,
      superAdmin,
    });

    if (!doctor) {
      return jsonError("Doctor not found", 404);
    }

    return NextResponse.json({
      success: true,
      data: serializeDoctor(
        doctor,
        superAdmin ? undefined : { allowedFacilityIds: accessibleFacilityIds },
      ),
    });
  } catch (error) {
    console.error("Fetch doctor failed:", error);
    return jsonError("Failed to fetch doctor", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: DoctorRouteContext,
) {
  const accessError = requireAccess(req, {
    permission: "doctors:update",
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
    const body = await req.json();
    const parsed = updateDoctorSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid input", 400, {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { id } = await params;
    const prisma = await getTenantPrisma(context.tenantId);
    const accessibleFacilityIds = parseAccessibleFacilityIds(req);
    const superAdmin = isSuperAdmin(req);

    const existingDoctor = await getAccessibleDoctorById(prisma, {
      doctorId: id,
      accessibleFacilityIds,
      superAdmin,
    });

    if (!existingDoctor) {
      return jsonError("Doctor not found", 404);
    }

    if (
      parsed.data.email &&
      parsed.data.email !== existingDoctor.email
    ) {
      const duplicateEmailDoctor = await prisma.doctor.findUnique({
        where: { email: parsed.data.email },
        select: { id: true },
      });

      if (duplicateEmailDoctor) {
        return jsonError("Doctor email already exists", 409);
      }
    }

    const updatedDoctor = await prisma.doctor.update({
      where: { id: existingDoctor.id },
      data: {
        salutation: parsed.data.salutation,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        specialization: parsed.data.specialization,
        licenseNumber: parsed.data.licenseNumber,
        councilName: parsed.data.councilName,
        yearsOfExperience: parsed.data.yearsOfExperience,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        postalCode: parsed.data.postalCode,
      },
      select: doctorDetailSelect,
    });

    await auditLog(req, {
      action: "doctors:update",
      resource: "Doctor",
      resourceId: updatedDoctor.id,
      permissionUsed: "doctors:update",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        changedFields: Object.keys(parsed.data),
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeDoctor(
        updatedDoctor,
        superAdmin ? undefined : { allowedFacilityIds: accessibleFacilityIds },
      ),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("Doctor email already exists", 409);
    }

    console.error("Update doctor failed:", error);
    return jsonError("Failed to update doctor", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: DoctorRouteContext,
) {
  const accessError = requireAccess(req, {
    permission: "doctors:delete",
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
    const accessibleFacilityIds = parseAccessibleFacilityIds(req);
    const superAdmin = isSuperAdmin(req);

    const existingDoctor = await getAccessibleDoctorById(prisma, {
      doctorId: id,
      accessibleFacilityIds,
      superAdmin,
    });

    if (!existingDoctor) {
      return jsonError("Doctor not found", 404);
    }

    const deletedDoctor = await prisma.doctor.update({
      where: { id: existingDoctor.id },
      data: {
        isActive: false,
      },
      select: doctorDetailSelect,
    });

    await auditLog(req, {
      action: "doctors:delete",
      resource: "Doctor",
      resourceId: deletedDoctor.id,
      permissionUsed: "doctors:delete",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        softDelete: true,
        wasActive: existingDoctor.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeDoctor(
        deletedDoctor,
        superAdmin ? undefined : { allowedFacilityIds: accessibleFacilityIds },
      ),
    });
  } catch (error) {
    console.error("Delete doctor failed:", error);
    return jsonError("Failed to delete doctor", 500);
  }
}
