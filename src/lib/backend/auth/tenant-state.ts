import type { CachedAuthContext } from "@/lib/backend/cache/auth-cache";
import type { TenantStatus } from "@/generated/control/enums";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";

export type TenantOnboardingState = {
  tenantStatus: TenantStatus;
  requiresOrganizationSetup: boolean;
  requiresFacilitySetup: boolean;
  accessibleFacilityIds: string[];
};

export function isAccessibleTenantStatus(status: TenantStatus): boolean {
  return status === "ONBOARDING" || status === "ACTIVE";
}

export async function resolveTenantOnboardingState(
  tenantId: string,
  tenantStatus: TenantStatus,
  authContext: CachedAuthContext,
): Promise<TenantOnboardingState> {
  const prisma = await getTenantPrisma(tenantId);

  const [organizationCount, facilityCount] = await Promise.all([
    prisma.organization.count(),
    prisma.facility.count(),
  ]);

  return {
    tenantStatus,
    requiresOrganizationSetup: organizationCount === 0,
    requiresFacilitySetup: facilityCount === 0,
    accessibleFacilityIds: authContext.facilityIds,
  };
}
