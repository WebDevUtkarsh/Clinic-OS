import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  doctorDetailSelect,
  ensureFacilityAccess,
  getAccessibleDoctorById,
  getFacilityRecordsByIds,
  isSuperAdmin,
  parseAccessibleFacilityIds,
  serializeDoctor,
} from "@/lib/backend/doctors/service";
import { updateDoctorFacilitiesSchema } from "@/lib/backend/doctors/schemas";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

type DoctorFacilitiesRouteContext = {
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
  { params }: DoctorFacilitiesRouteContext,
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
    const parsed = updateDoctorFacilitiesSchema.safeParse(body);

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

    const referencedFacilityIds = Array.from(
      new Set([
        ...parsed.data.assign.map((facility) => facility.facilityId),
        ...parsed.data.remove,
      ]),
    );

    if (
      !superAdmin &&
      !ensureFacilityAccess(referencedFacilityIds, accessibleFacilityIds)
    ) {
      return jsonError("Access denied for one or more facilities", 403);
    }

    const facilities = await getFacilityRecordsByIds(prisma, referencedFacilityIds);

    if (facilities.length !== referencedFacilityIds.length) {
      return jsonError("One or more facilities do not exist", 400);
    }

    const facilityMap = new Map(
      facilities.map((facility) => [facility.id, facility]),
    );

    const updatedDoctor = await prisma.$transaction(async (tx) => {
      for (const assignment of parsed.data.assign) {
        const facility = facilityMap.get(assignment.facilityId);

        if (!facility) {
          throw new Error("FACILITY_NOT_FOUND");
        }

        await tx.doctorFacility.upsert({
          where: {
            doctorId_facilityId: {
              doctorId: existingDoctor.id,
              facilityId: assignment.facilityId,
            },
          },
          update: {
            organizationId: facility.organizationId,
            consultationFee: assignment.consultationFee ?? null,
            consultationDuration: assignment.consultationDuration ?? null,
            consultationStartTime: assignment.consultationStartTime ?? null,
            consultationEndTime: assignment.consultationEndTime ?? null,
          },
          create: {
            doctorId: existingDoctor.id,
            facilityId: assignment.facilityId,
            organizationId: facility.organizationId,
            consultationFee: assignment.consultationFee ?? null,
            consultationDuration: assignment.consultationDuration ?? null,
            consultationStartTime: assignment.consultationStartTime ?? null,
            consultationEndTime: assignment.consultationEndTime ?? null,
          },
        });
      }

      if (parsed.data.remove.length > 0) {
        await tx.doctorFacility.deleteMany({
          where: {
            doctorId: existingDoctor.id,
            facilityId: {
              in: parsed.data.remove,
            },
          },
        });
      }

      return tx.doctor.findUniqueOrThrow({
        where: { id: existingDoctor.id },
        select: doctorDetailSelect,
      });
    });

    await auditLog(req, {
      action: "doctors:update-facilities",
      resource: "Doctor",
      resourceId: updatedDoctor.id,
      permissionUsed: "doctors:update",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        assignedFacilityIds: parsed.data.assign.map(
          (facility) => facility.facilityId,
        ),
        removedFacilityIds: parsed.data.remove,
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
    if (error instanceof Error && error.message === "FACILITY_NOT_FOUND") {
      return jsonError("One or more facilities do not exist", 400);
    }

    console.error("Update doctor facilities failed:", error);
    return jsonError("Failed to update doctor facilities", 500);
  }
}
