import { NextResponse } from "next/server";
import { Prisma as ControlPrisma } from "@/generated/control/client";
import { auditLogWithContext } from "@/lib/backend/audit/logger";
import { logControlAuditEvent } from "@/lib/backend/audit/control";
import { hashPassword } from "@/lib/backend/auth/password";
import {
  compareInviteHashes,
  hashInviteToken,
  parseInviteToken,
} from "@/lib/backend/doctors/invite";
import { acceptDoctorInviteSchema } from "@/lib/backend/doctors/schemas";
import { controlPrisma } from "@/lib/backend/prisma/control";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { enforceRateLimit, getRequestIp } from "@/lib/backend/security/rate-limit";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = acceptDoctorInviteSchema.safeParse(body);

    if (!parsed.success) {
      await logControlAuditEvent({
        action: "DOCTOR_INVITE_ACCEPT_FAILED",
        req,
        metadata: {
          reason: "INVALID_INPUT",
        },
      });

      return jsonError("Invalid invite payload", 400);
    }

    const rateLimitResponse = await enforceRateLimit({
      key: `rate:doctor-invite-accept:${getRequestIp(req)}`,
      limit: 10,
      windowSeconds: 60,
      message: "Too many invite acceptance attempts",
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const parsedToken = parseInviteToken(parsed.data.token);
    if (!parsedToken) {
      await logControlAuditEvent({
        action: "DOCTOR_INVITE_ACCEPT_FAILED",
        req,
        metadata: {
          reason: "INVALID_TOKEN_FORMAT",
        },
      });

      return jsonError("Invalid invite token", 400);
    }

    let tenantPrisma;
    try {
      tenantPrisma = await getTenantPrisma(parsedToken.tenantId);
    } catch {
      await logControlAuditEvent({
        action: "DOCTOR_INVITE_ACCEPT_FAILED",
        req,
        metadata: {
          reason: "INVALID_TENANT_TOKEN",
        },
      });

      return jsonError("Invalid invite token", 400);
    }
    const tokenHash = hashInviteToken(parsed.data.token);

    const invite = await tenantPrisma.doctorInvite.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        doctorId: true,
        email: true,
        tokenHash: true,
        expiresAt: true,
        acceptedAt: true,
        doctor: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            facilities: {
              select: {
                facilityId: true,
                organizationId: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    });

    if (!invite || !compareInviteHashes(invite.tokenHash, tokenHash)) {
      await logControlAuditEvent({
        action: "DOCTOR_INVITE_ACCEPT_FAILED",
        req,
        tenantId: parsedToken.tenantId,
        metadata: {
          reason: "INVITE_NOT_FOUND",
        },
      });

      return jsonError("Invalid invite token", 400);
    }

    if (invite.acceptedAt) {
      await logControlAuditEvent({
        action: "DOCTOR_INVITE_ACCEPT_FAILED",
        req,
        tenantId: parsedToken.tenantId,
        metadata: {
          inviteId: invite.id,
          reason: "INVITE_ALREADY_USED",
        },
      });

      return jsonError("Invite has already been used", 400);
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      await logControlAuditEvent({
        action: "DOCTOR_INVITE_ACCEPT_FAILED",
        req,
        tenantId: parsedToken.tenantId,
        metadata: {
          inviteId: invite.id,
          reason: "INVITE_EXPIRED",
        },
      });

      return jsonError("Invite has expired", 400);
    }

    if (invite.doctor.userId) {
      await logControlAuditEvent({
        action: "DOCTOR_INVITE_ACCEPT_FAILED",
        req,
        tenantId: parsedToken.tenantId,
        metadata: {
          inviteId: invite.id,
          doctorId: invite.doctor.id,
          reason: "DOCTOR_ALREADY_LINKED",
        },
      });

      return jsonError("Doctor is already linked to a user", 400);
    }

    if (invite.doctor.email !== invite.email) {
      await logControlAuditEvent({
        action: "DOCTOR_INVITE_ACCEPT_FAILED",
        req,
        tenantId: parsedToken.tenantId,
        metadata: {
          inviteId: invite.id,
          doctorId: invite.doctor.id,
          reason: "DOCTOR_EMAIL_MISMATCH",
        },
      });

      return jsonError("Invite is no longer valid", 400);
    }

    if (invite.doctor.facilities.length === 0) {
      await logControlAuditEvent({
        action: "DOCTOR_INVITE_ACCEPT_FAILED",
        req,
        tenantId: parsedToken.tenantId,
        metadata: {
          inviteId: invite.id,
          doctorId: invite.doctor.id,
          reason: "DOCTOR_HAS_NO_FACILITIES",
        },
      });

      return jsonError("Doctor has no facility access assigned", 400);
    }

    const email = invite.email.toLowerCase().trim();
    const existingUser = await controlPrisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      await logControlAuditEvent({
        action: "DOCTOR_INVITE_ACCEPT_FAILED",
        req,
        tenantId: parsedToken.tenantId,
        userId: existingUser.id,
        metadata: {
          inviteId: invite.id,
          doctorId: invite.doctor.id,
          reason: "USER_ALREADY_EXISTS",
        },
      });

      return jsonError("An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const displayName = `${invite.doctor.firstName} ${invite.doctor.lastName}`.trim();

    let createdUserId: string | null = null;
    let createdTenantMemberId: string | null = null;

    try {
      const controlResult = await controlPrisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            password: passwordHash,
            name: displayName,
          },
          select: { id: true },
        });

        const membership = await tx.tenantMember.create({
          data: {
            userId: user.id,
            tenantId: parsedToken.tenantId,
            role: "DOCTOR",
          },
          select: { id: true },
        });

        return {
          userId: user.id,
          tenantMemberId: membership.id,
        };
      });

      createdUserId = controlResult.userId;
      createdTenantMemberId = controlResult.tenantMemberId;

      const tenantResult = await tenantPrisma.$transaction(async (tx) => {
        let doctorRole = await tx.role.findFirst({
          where: { name: "DOCTOR" },
          select: { id: true },
        });

        if (!doctorRole) {
          doctorRole = await tx.role.create({
            data: { name: "DOCTOR" },
            select: { id: true },
          });
        }

        await tx.doctor.update({
          where: { id: invite.doctor.id },
          data: {
            userId: createdUserId,
          },
        });

        await tx.userRole.createMany({
          data: invite.doctor.facilities.map((facility) => ({
            userId: createdUserId!,
            roleId: doctorRole.id,
            facilityId: facility.facilityId,
          })),
        });

        const acceptedInvite = await tx.doctorInvite.update({
          where: { id: invite.id },
          data: {
            acceptedAt: new Date(),
          },
          select: {
            acceptedAt: true,
          },
        });

        return {
          doctorRoleId: doctorRole.id,
          acceptedAt: acceptedInvite.acceptedAt,
          primaryFacilityId: invite.doctor.facilities[0]?.facilityId ?? null,
          primaryOrganizationId:
            invite.doctor.facilities[0]?.organizationId ?? null,
        };
      });

      await auditLogWithContext({
        tenantId: parsedToken.tenantId,
        userId: createdUserId,
        action: "doctor:invite_accepted",
        resource: "DoctorInvite",
        resourceId: invite.id,
        permissionUsed: "public:doctor-invite:accept",
        isSuperAdmin: false,
        permissionsSnapshot: [],
        facilityId: tenantResult.primaryFacilityId ?? undefined,
        organizationId: tenantResult.primaryOrganizationId ?? undefined,
        ip: getRequestIp(req),
        userAgent: req.headers.get("user-agent") ?? undefined,
        metadata: {
          doctorId: invite.doctor.id,
          acceptedAt: tenantResult.acceptedAt?.toISOString() ?? null,
          roleId: tenantResult.doctorRoleId,
          assignedFacilityIds: invite.doctor.facilities.map(
            (facility) => facility.facilityId,
          ),
        },
      });

      await logControlAuditEvent({
        action: "DOCTOR_INVITE_ACCEPTED",
        req,
        userId: createdUserId,
        tenantId: parsedToken.tenantId,
        metadata: {
          inviteId: invite.id,
          doctorId: invite.doctor.id,
          tenantMemberId: createdTenantMemberId,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          doctorId: invite.doctor.id,
          userId: createdUserId,
          tenantId: parsedToken.tenantId,
        },
      });
    } catch (error) {
      if (createdTenantMemberId || createdUserId) {
        await controlPrisma.$transaction(async (tx) => {
          if (createdTenantMemberId) {
            await tx.tenantMember.deleteMany({
              where: { id: createdTenantMemberId },
            });
          }

          if (createdUserId) {
            await tx.user.deleteMany({
              where: { id: createdUserId },
            });
          }
        }).catch((cleanupError) => {
          console.error("Invite acceptance cleanup failed:", cleanupError);
        });
      }

      throw error;
    }
  } catch (error) {
    if (
      error instanceof ControlPrisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("An account with this email already exists", 409);
    }

    console.error("Accept doctor invite failed:", error);

    await logControlAuditEvent({
      action: "DOCTOR_INVITE_ACCEPT_FAILED",
      req,
      metadata: {
        reason: "UNHANDLED_ERROR",
      },
    });

    return jsonError("Failed to accept invite", 500);
  }
}
