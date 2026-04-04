import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logControlAuditEvent } from "@/lib/backend/audit/control";
import { signAuthToken } from "@/lib/backend/auth/jwt";
import { verifyPassword } from "@/lib/backend/auth/password";
import { resolveAuthContext } from "@/lib/backend/auth/context";
import {
  isAccessibleTenantStatus,
  resolveTenantOnboardingState,
} from "@/lib/backend/auth/tenant-state";
import { controlPrisma } from "@/lib/backend/prisma/control";
import { enforceRateLimit, getRequestIp } from "@/lib/backend/security/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      await logControlAuditEvent({
        action: "AUTH_LOGIN_FAILED",
        req,
        metadata: {
          reason: "INVALID_INPUT",
        },
      });

      return NextResponse.json({ success: false }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;
    const rateLimitResponse = await enforceRateLimit({
      key: `rate:auth:login:${getRequestIp(req)}:${email}`,
      limit: 10,
      windowSeconds: 60,
      message: "Too many login attempts",
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const user = await controlPrisma.user.findUnique({
      where: { email },
      select: { id: true, password: true },
    });

    const valid = user && (await verifyPassword(password, user.password));
    if (!valid) {
      await logControlAuditEvent({
        action: "AUTH_LOGIN_FAILED",
        req,
        userId: user?.id ?? null,
        metadata: {
          email,
          reason: "INVALID_CREDENTIALS",
        },
      });

      return NextResponse.json({ success: false }, { status: 401 });
    }

    const memberships = await controlPrisma.tenantMember.findMany({
      where: {
        userId: user.id,
        tenant: {
          status: {
            in: ["ONBOARDING", "ACTIVE"],
          },
        },
      },
      include: {
        tenant: true,
      },
    });

    if (!memberships.length) {
      await logControlAuditEvent({
        action: "AUTH_LOGIN_FAILED",
        req,
        userId: user.id,
        metadata: {
          email,
          reason: "NO_ACCESSIBLE_TENANT",
        },
      });

      return NextResponse.json({ success: false }, { status: 403 });
    }

    if (memberships.length > 1) {
      await logControlAuditEvent({
        action: "AUTH_LOGIN_SUCCESS",
        req,
        userId: user.id,
        metadata: {
          email,
          requiresTenantSelection: true,
          tenantIds: memberships.map((membership) => membership.tenantId),
        },
      });

      return NextResponse.json({
        success: true,
        requiresTenantSelection: true,
        tenants: memberships.map((membership) => ({
          tenantId: membership.tenantId,
          name: membership.tenant.name,
          slug: membership.tenant.slug,
          role: membership.role,
          status: membership.tenant.status,
        })),
      });
    }

    const membership = memberships[0];
    if (!isAccessibleTenantStatus(membership.tenant.status)) {
      await logControlAuditEvent({
        action: "AUTH_LOGIN_FAILED",
        req,
        userId: user.id,
        tenantId: membership.tenantId,
        metadata: {
          email,
          tenantStatus: membership.tenant.status,
          reason: "TENANT_STATUS_BLOCKED",
        },
      });

      return NextResponse.json({ success: false }, { status: 403 });
    }

    const tenantId = membership.tenantId;
    const token = signAuthToken({
      userId: user.id,
      activeTenantId: tenantId,
    });

    const authContext = await resolveAuthContext(tenantId, user.id);
    const onboardingState = await resolveTenantOnboardingState(
      tenantId,
      membership.tenant.status,
      authContext,
    );

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    await logControlAuditEvent({
      action: "AUTH_LOGIN_SUCCESS",
      req,
      userId: user.id,
      tenantId,
      metadata: {
        email,
        tenantStatus: onboardingState.tenantStatus,
        requiresOrganizationSetup: onboardingState.requiresOrganizationSetup,
        requiresFacilitySetup: onboardingState.requiresFacilitySetup,
        accessibleFacilityIds: onboardingState.accessibleFacilityIds,
      },
    });

    return NextResponse.json({
      success: true,
      activeTenantId: tenantId,
      tenantStatus: onboardingState.tenantStatus,
      requiresOrganizationSetup: onboardingState.requiresOrganizationSetup,
      requiresFacilitySetup: onboardingState.requiresFacilitySetup,
      accessibleFacilityIds: onboardingState.accessibleFacilityIds,
    });
  } catch (error) {
    console.error(error);

    await logControlAuditEvent({
      action: "AUTH_LOGIN_FAILED",
      req,
      metadata: {
        reason: "UNHANDLED_ERROR",
      },
    });

    return NextResponse.json({ success: false }, { status: 500 });
  }
}
