import { z } from "zod";
import { apiClient } from "@/lib/api/client";
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
  const res = await apiClient.post<LoginResponse>("/auth/login", input);
  return res.data;
}

export async function registerTenant(input: {
  name: string;
  email: string;
  password: string;
  tenantName: string;
}) {
  const res = await apiClient.post("/auth/register", input);
  const parsed = registerResponseSchema.parse(res.data);
  return parsed as RegisterResponse;
}

export async function getAuthSession() {
  const res = await apiClient.get("/auth/me");
  const parsed = getSessionResponseSchema.parse(res.data);

  return parsed.data as SessionData;
}

export async function logoutSession() {
  const res = await apiClient.post("/auth/logout");
  return res.data;
}

export async function selectTenant(tenantId: string) {
  const res = await apiClient.post("/auth/tenant/select", { tenantId });
  return res.data;
}
