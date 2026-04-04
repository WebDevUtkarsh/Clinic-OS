import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  generateDoctorInviteToken,
  sendDoctorInviteEmail,
} from "@/lib/backend/doctors/invite";
import {
  getAccessibleDoctorById,
  isSuperAdmin,
  parseAccessibleFacilityIds,
} from "@/lib/backend/doctors/service";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

type DoctorInviteRouteContext = {
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
  { params }: DoctorInviteRouteContext,
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

    const currentFacilityMapping = doctor.facilities.find(
      (facility) => facility.facilityId === context.facilityId,
    );

    if (!currentFacilityMapping) {
      return jsonError("Access denied for this doctor in the current facility", 403);
    }

    if (!doctor.isActive) {
      return jsonError("Inactive doctors cannot be invited", 400);
    }

    if (doctor.userId) {
      return jsonError("Doctor is already linked to a user account", 400);
    }

    const organizationName =
      (
        await prisma.organization.findUnique({
          where: { id: context.organizationId },
          select: { name: true },
        })
      )?.name ?? "your organization";

    const { publicToken, tokenHash, expiresAt } =
      generateDoctorInviteToken(context.tenantId);

    const invite = await prisma.$transaction(async (tx) => {
      await tx.doctorInvite.deleteMany({
        where: {
          doctorId: doctor.id,
          acceptedAt: null,
        },
      });

      const createdInvite = await tx.doctorInvite.create({
        data: {
          doctorId: doctor.id,
          email: doctor.email,
          tokenHash,
          expiresAt,
        },
        select: {
          id: true,
          expiresAt: true,
        },
      });

      await sendDoctorInviteEmail({
        to: doctor.email,
        doctorName: `${doctor.firstName} ${doctor.lastName}`.trim(),
        organizationName,
        acceptToken: publicToken,
        expiresAt: createdInvite.expiresAt,
      });

      return createdInvite;
    });

    await auditLog(req, {
      action: "doctor:invite",
      resource: "DoctorInvite",
      resourceId: invite.id,
      permissionUsed: "doctors:update",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        doctorId: doctor.id,
        invitedEmail: doctor.email,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        inviteId: invite.id,
        email: doctor.email,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create doctor invite failed:", error);
    return jsonError("Failed to create doctor invite", 500);
  }
}
