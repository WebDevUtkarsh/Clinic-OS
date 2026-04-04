import { z } from "zod";
import { apiRequest } from "@/lib/api/client";

const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export async function createOrganization(input: { name: string }) {
  const response = await apiRequest("/api/organizations", {
    method: "POST",
    body: input,
    schema: z.object({
      success: z.literal(true),
      data: organizationSchema,
    }),
  });

  return response.data;
}

export async function createFacility(input: {
  organizationId: string;
  name: string;
  type: "CLINIC" | "HOSPITAL" | "DIAGNOSTIC" | "PHARMACY";
  address?: string;
}) {
  const response = await apiRequest("/api/facilities", {
    method: "POST",
    body: input,
    schema: z.object({
      success: z.literal(true),
      data: z.object({
        id: z.string(),
        organizationId: z.string(),
        name: z.string(),
        type: z.enum(["CLINIC", "HOSPITAL", "DIAGNOSTIC", "PHARMACY"]),
        address: z.string().nullable(),
      }),
    }),
  });

  return response.data;
}
