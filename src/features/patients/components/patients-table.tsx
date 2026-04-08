"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Edit2, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { type Patient } from "@/features/patients/types";
import { useDeletePatient } from "@/features/patients/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Can } from "@/hooks/use-can";

type PatientsTableProps = {
  data: Patient[];
  rowSelection: Record<string, boolean>;
  setRowSelection: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  isFetchingMore: boolean;
  onRefresh: () => void;
  onEdit?: (patient: Patient) => void;
};

const columnHelper = createColumnHelper<Patient>();

export function PatientsTable({
  data,
  rowSelection,
  setRowSelection,
  onLoadMore,
  hasMore,
  isLoading,
  isFetchingMore,
  onEdit,
}: PatientsTableProps) {
  const deleteMutation = useDeletePatient();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-white/[0.2] dark:bg-[#1f2937]"
            checked={table.getIsAllPageRowsSelected()}
            ref={(input) => {
              if (input) {
                input.indeterminate = table.getIsSomeRowsSelected();
              }
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-white/[0.2] dark:bg-[#1f2937]"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      }),
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => (
          <div className="font-medium text-foreground">
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => <div className="text-muted-foreground">{info.getValue() || "N/A"}</div>,
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => <div className="text-muted-foreground truncate max-w-[200px]">{info.getValue() || "N/A"}</div>,
      }),
      columnHelper.accessor("gender", {
        header: "Gender",
        cell: (info) => (
          <Badge variant={info.getValue() === "Female" ? "default" : "secondary"}>
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2 pr-2">
            <Can permission="patients:update">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onEdit?.(row.original)}
              >
                <Edit2 size={14} className="text-text-secondary hover:text-primary transition-colors" />
              </Button>
            </Can>
            <Can permission="patients:delete">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={deleteMutation.isPending}
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete ${row.original.name}?`)) {
                    await deleteMutation.mutateAsync(row.original.id);
                  }
                }}
              >
                <Trash2 size={14} className="text-danger hover:text-danger/80 transition-colors" />
              </Button>
            </Can>
          </div>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onEdit]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-auto overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse min-w-[700px]">
          <thead className="text-xs uppercase bg-gray-50 dark:bg-white/[0.02] border-b border-border sticky top-0 z-10 transition-colors">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 font-semibold text-text-secondary whitespace-nowrap first:w-10 first:pl-6"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  <Loader2 className="animate-spin inline-block mr-2 h-4 w-4" /> Loading entries...
                </td>
              </tr>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-muted/50 transition-colors group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle first:pl-6">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-16 text-center text-muted-foreground transition-all animate-in fade-in"
                >
                  <div className="flex justify-center mb-2">
                    <div className="p-3 bg-muted rounded-full">
                      <MoreHorizontal className="h-6 w-6 text-text-secondary" />
                    </div>
                  </div>
                  <p className="font-medium text-foreground">No patients found</p>
                  <p className="text-xs mt-1">Try adjusting your search filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {hasMore && (
        <div className="p-4 border-t border-border bg-white dark:bg-[#0B0F14] flex justify-center sticky bottom-0">
          <Button 
            variant="secondary" 
            onClick={onLoadMore} 
            disabled={isFetchingMore}
            className="w-full max-w-xs"
          >
            {isFetchingMore ? (
              <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Loading more...</>
            ) : (
              "Load More Patients"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
