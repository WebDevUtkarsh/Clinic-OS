import { apiClient } from "@/lib/api/client";
import { type Patient, type CreatePatientPayload, type UpdatePatientPayload, type ApiResponse } from "./types";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useFacility } from "@/features/auth/components/FacilityProvider";
import { patientKeys } from "./query-keys";

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export function usePatients(params?: { search?: string; limit?: number }) {
  const { facilityId } = useFacility();
  return useInfiniteQuery({
    queryKey: patientKeys.list(facilityId ?? null, params?.search),
    queryFn: async ({ pageParam = "" }) => {
      const response = await apiClient.get<ApiResponse<Patient[]>>("/patients", {
        params: {
          cursor: pageParam || undefined,
          limit: params?.limit || 20,
          search: params?.search || undefined,
        },
      });
      return response.data;
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: !!facilityId,
  });
}

export function usePatient(id: string) {
  const { facilityId } = useFacility();
  return useQuery({
    queryKey: patientKeys.detail(facilityId ?? null, id),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Patient>>(`/patients/${id}`);
      return response.data.data;
    },
    enabled: !!facilityId && !!id,
  });
}

// ─────────────────────────────────────────────
// Mutations — all use patientKeys.all for broad,
// filter-safe invalidation so every list/detail
// query refreshes regardless of search/pagination.
// ─────────────────────────────────────────────

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePatientPayload) => {
      const response = await apiClient.post<ApiResponse<Patient>>("/patients", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdatePatientPayload }) => {
      const response = await apiClient.patch<ApiResponse<Patient>>(`/patients/${id}`, payload);
      return response.data;
    },
    onSuccess: (response, variables) => {
      // Update detail cache immediately with returned data
      if (facilityId && response.data) {
        queryClient.setQueryData(
          patientKeys.detail(facilityId, variables.id),
          response.data,
        );
      }
      // Broad invalidation — refreshes ALL patient lists regardless of filters
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(`/patients/${id}`);
      return response.data;
    },
    onMutate: async () => {
      // Cancel in-flight queries to prevent stale overwrites
      await queryClient.cancelQueries({ queryKey: patientKeys.all });
    },
    onSettled: () => {
      // Always refetch after success OR error to stay in sync
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}

export function useBulkDeletePatients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiClient.post<ApiResponse<null>>("/patients/bulk-delete", { ids });
      return response.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: patientKeys.all });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}
