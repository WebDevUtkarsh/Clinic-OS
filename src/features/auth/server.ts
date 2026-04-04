import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAuthContext } from "@/lib/backend/auth/context";
import {
  isAccessibleTenantStatus,
  resolveTenantOnboardingState,
} from "@/lib/backend/auth/tenant-state";
import { verifyAuthToken } from "@/lib/backend/auth/jwt";
import { controlPrisma } from "@/lib/backend/prisma/control";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import {
  resolvePostAuthRoute,
  type SessionData,
} from "@/features/auth/types";

export async function getServerSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = verifyAuthToken(token);

    const [user, membership] = await Promise.all([
      controlPrisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
        },
      }),
      controlPrisma.tenantMember.findUnique({
        where: {
          userId_tenantId: {
            userId: payload.userId,
            tenantId: payload.activeTenantId,
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
      return null;
    }

    const authContext = await resolveAuthContext(payload.activeTenantId, payload.userId);
    const onboardingState = await resolveTenantOnboardingState(
      payload.activeTenantId,
      membership.tenant.status,
      authContext,
    );

    return {
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
    };
  } catch (error) {
    console.error("Failed to resolve server session:", error);
    return null;
  }
}

export async function requireServerSession() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireFacilitySession(facilityId: string) {
  const session = await requireServerSession();

  if (session.requiresOrganizationSetup || session.requiresFacilitySetup) {
    redirect("/onboarding");
  }

  const prisma = await getTenantPrisma(session.tenant.id);
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { id: true },
  });

  if (!facility) {
    redirect(resolvePostAuthRoute(session));
  }

  if (
    !session.isSuperAdmin &&
    !session.accessibleFacilityIds.includes(facilityId)
  ) {
    redirect(resolvePostAuthRoute(session));
  }

  return session;
}
