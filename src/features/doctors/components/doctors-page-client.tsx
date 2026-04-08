"use client";

import { useState, useCallback } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DoctorsTable } from "./doctors-table";
import { DoctorFormModal } from "./doctor-form-modal";
import { useDoctors, useDeleteDoctor, useSendDoctorInvite } from "@/features/doctors/api";
import { Can } from "@/hooks/use-can";
import { useDebounce } from "@/hooks/use-debounce";
import { type DoctorListItem } from "@/features/doctors/types";

export function DoctorsPageClient({ facilityId }: { facilityId: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [doctorToEdit, setDoctorToEdit] = useState<DoctorListItem | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});

  const { data, status, isFetching } = useDoctors({
    search: debouncedSearch,
    page,
    pageSize: 20,
  });

  const deleteMutation = useDeleteDoctor();
  const inviteMutation = useSendDoctorInvite();

  const doctors = data?.data ?? [];
  const pagination = data?.pagination;

  const handleCreateNew = () => {
    setDoctorToEdit(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = useCallback((doctor: DoctorListItem) => {
    setDoctorToEdit(doctor);
    setIsCreateModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (doctor: DoctorListItem) => {
    const fullName = [doctor.firstName, doctor.lastName].join(" ");
    if (confirm(`Are you sure you want to deactivate ${fullName}?`)) {
      await deleteMutation.mutateAsync(doctor.id);
    }
  }, [deleteMutation]);

  const handleInvite = useCallback(async (doctor: DoctorListItem) => {
    const fullName = [doctor.firstName, doctor.lastName].join(" ");
    if (confirm(`Send invite to ${fullName} (${doctor.email})?`)) {
      try {
        await inviteMutation.mutateAsync(doctor.id);
        alert("Invite sent successfully!");
      } catch {
        alert("Failed to send invite. Please try again.");
      }
    }
  }, [inviteMutation]);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4 animate-auth-flow">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search doctors by name, email, specialization..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[340px]"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Can permission="doctors:create">
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus size={16} />
              Add Doctor
            </Button>
          </Can>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-xl flex flex-col overflow-hidden animate-dashboard-fade-up shadow-xs">
        <DoctorsTable
          data={doctors}
          rowSelection={selectedRowIds}
          setRowSelection={setSelectedRowIds}
          isLoading={status === "pending"}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onInvite={handleInvite}
        />

        {/* Offset Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/[0.06] px-4 py-3">
            <div className="text-xs text-gray-500 dark:text-[#6B7280]">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
              {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-gray-700 dark:text-[#9CA3AF]">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages || isFetching}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <DoctorFormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setDoctorToEdit(null);
        }}
        doctorToEdit={doctorToEdit}
        facilityId={facilityId}
      />
    </>
  );
}
