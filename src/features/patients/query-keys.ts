export const patientKeys = {
  all: ["patients"] as const,
  lists: () => [...patientKeys.all, "list"] as const,
  list: (facilityId: string | null, search?: string) => 
    [...patientKeys.lists(), facilityId, { search }] as const,
  details: () => [...patientKeys.all, "detail"] as const,
  detail: (facilityId: string | null, id: string) => 
    [...patientKeys.details(), facilityId, id] as const,
};
