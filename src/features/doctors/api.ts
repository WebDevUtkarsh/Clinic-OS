import { apiClient } from "@/lib/api/client";
import {
  type Doctor,
  type DoctorListItem,
  type CreateDoctorPayload,
  type UpdateDoctorPayload,
  type UpdateDoctorFacilitiesPayload,
  type ApiResponse,
  type PaginatedResponse,
  type DoctorInviteResponse,
} from "./types";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useFacility } from "@/features/auth/components/FacilityProvider";
import { doctorKeys } from "./query-keys";

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export function useDoctors(params?: { search?: string; page?: number; pageSize?: number }) {
  const { facilityId } = useFacility();
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;

  return useQuery({
    queryKey: doctorKeys.list(facilityId ?? null, { search: params?.search, page }),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<DoctorListItem>>("/doctors", {
        params: {
          page,
          pageSize,
          search: params?.search || undefined,
        },
      });
      return data;
    },
    enabled: !!facilityId,
    placeholderData: keepPreviousData,
  });
}

export function useDoctor(id: string) {
  return useQuery({
    queryKey: doctorKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Doctor>>(`/doctors/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

// ─────────────────────────────────────────────
// Mutations — broad invalidation via doctorKeys.all
// ─────────────────────────────────────────────

export function useCreateDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDoctorPayload) => {
      const { data } = await apiClient.post<ApiResponse<Doctor>>("/doctors", payload);
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: doctorKeys.lists() });
      if (data) {
        queryClient.setQueryData(doctorKeys.detail(data.id), data);
      }
    },
  });
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateDoctorPayload }) => {
      const { data } = await apiClient.patch<ApiResponse<Doctor>>(`/doctors/${id}`, payload);
      return data.data;
    },
    onSuccess: (updatedDoctor) => {
      if (updatedDoctor) {
        queryClient.setQueryData(doctorKeys.detail(updatedDoctor.id), updatedDoctor);
      }
      queryClient.invalidateQueries({ queryKey: doctorKeys.lists() });
    },
  });
}

export function useDeleteDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse<Doctor>>(`/doctors/${id}`);
      return data.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: doctorKeys.all });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: doctorKeys.all });
    },
  });
}

export function useAssignDoctorFacilities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateDoctorFacilitiesPayload }) => {
      const { data } = await apiClient.post<ApiResponse<Doctor>>(`/doctors/${id}/facilities`, payload);
      return data.data;
    },
    onSuccess: (updatedDoctor) => {
      if (updatedDoctor) {
        queryClient.setQueryData(doctorKeys.detail(updatedDoctor.id), updatedDoctor);
      }
      queryClient.invalidateQueries({ queryKey: doctorKeys.lists() });
    },
  });
}

export function useSendDoctorInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (doctorId: string) => {
      const { data } = await apiClient.post<ApiResponse<DoctorInviteResponse>>(`/doctors/${doctorId}/invite`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorKeys.all });
    },
  });
}
