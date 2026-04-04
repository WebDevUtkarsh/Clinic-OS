"use client";

import type {
  FacilityRecord,
  FacilityType,
  LoginResponse,
  LoginTenantOption,
  OrganizationRecord,
  RegisterResponse,
  SessionData,
  TenantStatus,
} from "@/features/auth/types";
import {
  getAuthSession,
  loginWithPassword,
  logoutSession,
  registerTenant,
} from "@/features/auth/api";
import { resolvePostAuthRoute } from "@/features/auth/types";
import { createFacility, createOrganization } from "@/features/facilities/api";
import { ApiClientError } from "@/lib/api/client";

export type {
  FacilityRecord,
  FacilityType,
  LoginResponse,
  LoginTenantOption,
  OrganizationRecord,
  RegisterResponse,
  SessionData,
  TenantStatus,
};

export {
  createFacility,
  createOrganization,
  getAuthSession,
  loginWithPassword,
  logoutSession,
  registerTenant,
  resolvePostAuthRoute,
};

export { ApiClientError as ApiError };
