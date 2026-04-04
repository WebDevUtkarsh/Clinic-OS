import { z } from "zod";
import { apiRequest } from "@/lib/api/client";
import type {
  LoginResponse,
  RegisterResponse,
  SessionData,
} from "@/features/auth/types";

const tenantStatusSchema = z.enum([
  "PROVISIONING",
  "ONBOARDING",
  "ACTIVE",
  "FAILED",
]);

const sessionSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
  }),
  tenant: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    status: tenantStatusSchema,
  }),
  role: z.string(),
  permissions: z.array(z.string()),
  facilityIds: z.array(z.string()),
  isSuperAdmin: z.boolean(),
  tenantStatus: tenantStatusSchema,
  requiresOrganizationSetup: z.boolean(),
  requiresFacilitySetup: z.boolean(),
  accessibleFacilityIds: z.array(z.string()),
});

const getSessionResponseSchema = z.object({
  success: z.literal(true),
  data: sessionSchema,
});

const registerResponseSchema = z.object({
  success: z.literal(true),
  tenantId: z.string(),
  tenantStatus: tenantStatusSchema,
});

export async function loginWithPassword(input: {
  email: string;
  password: string;
}) {
  return (await apiRequest("/api/auth/login", {
    method: "POST",
    body: input,
  })) as LoginResponse;
}

export async function registerTenant(input: {
  name: string;
  email: string;
  password: string;
  tenantName: string;
}) {
  return (await apiRequest("/api/auth/register", {
    method: "POST",
    body: input,
    schema: registerResponseSchema,
  })) as RegisterResponse;
}

export async function getAuthSession() {
  const response = await apiRequest("/api/auth/me", {
    schema: getSessionResponseSchema,
  });

  return response.data as SessionData;
}

export async function logoutSession() {
  return apiRequest("/api/auth/logout", {
    method: "POST",
  });
}
