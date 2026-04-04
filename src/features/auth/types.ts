export type TenantStatus = "PROVISIONING" | "ONBOARDING" | "ACTIVE" | "FAILED";
export type FacilityType = "CLINIC" | "HOSPITAL" | "DIAGNOSTIC" | "PHARMACY";

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
};

export type SessionData = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  tenant: TenantSummary;
  role: string;
  permissions: string[];
  facilityIds: string[];
  isSuperAdmin: boolean;
  tenantStatus: TenantStatus;
  requiresOrganizationSetup: boolean;
  requiresFacilitySetup: boolean;
  accessibleFacilityIds: string[];
};

export type LoginTenantOption = {
  tenantId: string;
  name: string;
  slug: string;
  role: string;
  status: TenantStatus;
};

export type LoginResponse =
  | {
      success: true;
      requiresTenantSelection: true;
      tenants: LoginTenantOption[];
    }
  | {
      success: true;
      activeTenantId: string;
      tenantStatus: TenantStatus;
      requiresOrganizationSetup: boolean;
      requiresFacilitySetup: boolean;
      accessibleFacilityIds: string[];
    };

export type RegisterResponse = {
  success: true;
  tenantId: string;
  tenantStatus: TenantStatus;
};

export type OrganizationRecord = {
  id: string;
  name: string;
};

export type FacilityRecord = {
  id: string;
  organizationId: string;
  name: string;
  type: FacilityType;
  address: string | null;
};

export function hasOnboardingRequirements(session: Pick<
  SessionData,
  "requiresOrganizationSetup" | "requiresFacilitySetup"
>) {
  return session.requiresOrganizationSetup || session.requiresFacilitySetup;
}

export function resolvePostAuthRoute(
  session: Pick<
    SessionData,
    | "requiresOrganizationSetup"
    | "requiresFacilitySetup"
    | "accessibleFacilityIds"
  >,
  preferredFacilityId?: string | null,
) {
  if (hasOnboardingRequirements(session)) {
    return "/onboarding";
  }

  const nextFacilityId = preferredFacilityId ?? session.accessibleFacilityIds[0];
  return nextFacilityId ? `/f/${nextFacilityId}/dashboard` : "/onboarding";
}
