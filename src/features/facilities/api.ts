import { z } from "zod";
import { apiClient } from "@/lib/api/client";

const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export async function createOrganization(input: { name: string }) {
  const response = await apiClient.post("/organizations", input);
  return response.data.data;
}

export async function createFacility(input: {
  organizationId: string;
  name: string;
  type: "CLINIC" | "HOSPITAL" | "DIAGNOSTIC" | "PHARMACY";
  address?: string;
}) {
  const response = await apiClient.post("/facilities", input);
  return response.data.data;
}
import { useQuery } from "@tanstack/react-query";

export type Facility = {
  id: string;
  organizationId: string;
  name: string;
  type: "CLINIC" | "HOSPITAL" | "DIAGNOSTIC" | "PHARMACY";
  address: string | null;
};

export function useFacilities() {
  return useQuery({
    queryKey: ["facilities", "list"],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Facility[] }>("/facilities");
      return response.data.data;
    },
  });
}
