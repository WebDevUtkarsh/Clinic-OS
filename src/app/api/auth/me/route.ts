import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/backend/auth/jwt";
import { resolveAuthContext } from "@/lib/backend/auth/context";
import {
  isAccessibleTenantStatus,
  resolveTenantOnboardingState,
} from "@/lib/backend/auth/tenant-state";
import { controlPrisma } from "@/lib/backend/prisma/control";

function unauthorizedResponse(clearToken = false) {
  const response = NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );

  if (clearToken) {
    response.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return unauthorizedResponse();
    }

    let payload: ReturnType<typeof verifyAuthToken>;
    try {
      payload = verifyAuthToken(token);
    } catch {
      return unauthorizedResponse(true);
    }

    const { userId, activeTenantId } = payload;

    const [user, membership] = await Promise.all([
      controlPrisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
        },
      }),
      controlPrisma.tenantMember.findUnique({
        where: {
          userId_tenantId: {
            userId,
            tenantId: activeTenantId,
          },
        },
        select: {
          role: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      }),
    ]);

    if (
      !user ||
      !membership ||
      !isAccessibleTenantStatus(membership.tenant.status)
    ) {
      return unauthorizedResponse(true);
    }

    const authContext = await resolveAuthContext(activeTenantId, userId);
    const onboardingState = await resolveTenantOnboardingState(
      activeTenantId,
      membership.tenant.status,
      authContext,
    );

    return NextResponse.json({
      success: true,
      data: {
        user,
        tenant: membership.tenant,
        role: membership.role,
        permissions: authContext.permissions,
        facilityIds: authContext.facilityIds,
        isSuperAdmin: authContext.isSuperAdmin,
        tenantStatus: onboardingState.tenantStatus,
        requiresOrganizationSetup: onboardingState.requiresOrganizationSetup,
        requiresFacilitySetup: onboardingState.requiresFacilitySetup,
        accessibleFacilityIds: onboardingState.accessibleFacilityIds,
      },
    });
  } catch (error) {
    console.error("Auth /me failed:", error);
    return unauthorizedResponse();
  }
}
