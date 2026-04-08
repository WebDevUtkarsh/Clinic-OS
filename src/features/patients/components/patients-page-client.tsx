"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientsTable } from "./patients-table";
import { PatientFormModal } from "./patient-form-modal";
import { usePatients, useBulkDeletePatients } from "@/features/patients/api";
import { Can } from "@/hooks/use-can";
import { useDebounce } from "@/hooks/use-debounce";

import { type Patient } from "@/features/patients/types";

export function PatientsPageClient({ facilityId }: { facilityId: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    refetch
  } = usePatients({ search: debouncedSearch, limit: 15 });

  const bulkDeleteMutation = useBulkDeletePatients();

  // Selected arrays
  const selectedCount = Object.keys(selectedRowIds).filter((k) => selectedRowIds[k]).length;
  const selectedList = Object.keys(selectedRowIds).filter((k) => selectedRowIds[k]);

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedCount} patient(s)?`)) {
      await bulkDeleteMutation.mutateAsync(selectedList);
      setSelectedRowIds({});
    }
  };

  const handleCreateNew = () => {
    setPatientToEdit(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (patient: Patient) => {
    setPatientToEdit(patient);
    setIsCreateModalOpen(true);
  };

  // Flatten infinite query pages
  const flatData = data?.pages.flatMap((p) => p.data) || [];

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4 animate-auth-flow">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search patients by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-[320px]"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {selectedCount > 0 && (
            <Can permission="patients:delete">
              <Button
                variant="outline"
                className="gap-2 text-danger border-danger hover:bg-danger/10"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 size={16} />
                Delete Selected ({selectedCount})
              </Button>
            </Can>
          )}

          <Can permission="patients:create">
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus size={16} />
              Add Patient
            </Button>
          </Can>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-xl flex flex-col overflow-hidden animate-dashboard-fade-up shadow-xs">
        <PatientsTable
          data={flatData}
          rowSelection={selectedRowIds}
          setRowSelection={setSelectedRowIds}
          onLoadMore={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          hasMore={!!hasNextPage}
          isLoading={status === "pending"}
          isFetchingMore={isFetchingNextPage}
          onRefresh={refetch}
          onEdit={handleEdit}
        />
      </div>

      <PatientFormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setPatientToEdit(null);
        }}
        patientToEdit={patientToEdit}
      />
    </>
  );
}
