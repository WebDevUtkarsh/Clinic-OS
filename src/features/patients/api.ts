import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, requireFacilityId } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/query-keys";

const patientSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  name: z.string(),
  gender: z.enum(["Male", "Female", "Other"]),
  dob: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  isDeleted: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const patientsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(patientSchema),
  nextCursor: z.string().nullable(),
});

export async function getPatients(input: {
  facilityId: string;
  search?: string;
}) {
  const facilityId = requireFacilityId(input.facilityId);
  const response = await apiRequest("/api/patients", {
    facilityId,
    query: {
      search: input.search?.trim() || undefined,
      limit: 20,
    },
    schema: patientsResponseSchema,
  });

  return response;
}

export function usePatientsQuery(facilityId: string, search: string) {
  return useQuery({
    queryKey: queryKeys.patients.list(facilityId, search),
    queryFn: () => getPatients({ facilityId, search }),
    enabled: Boolean(facilityId),
  });
}
