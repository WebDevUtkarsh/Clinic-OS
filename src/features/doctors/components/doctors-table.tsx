"use client";

import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { MoreHorizontal, Send, Pencil, Trash2, Building2 } from "lucide-react";
import { type DoctorListItem, deriveDoctorStatus, type DoctorStatus } from "../types";
import { cn } from "@/lib/utils/cn";

type DoctorsTableProps = {
  data: DoctorListItem[];
  rowSelection: Record<string, boolean>;
  setRowSelection: (val: Record<string, boolean>) => void;
  isLoading: boolean;
  onEdit: (doctor: DoctorListItem) => void;
  onDelete: (doctor: DoctorListItem) => void;
  onInvite: (doctor: DoctorListItem) => void;
};

const STATUS_STYLES: Record<DoctorStatus, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  INVITED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  NOT_INVITED: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  DISABLED: "bg-red-500/10 text-red-500 border-red-500/20",
};

const STATUS_LABELS: Record<DoctorStatus, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  NOT_INVITED: "Not Invited",
  DISABLED: "Disabled",
};

function StatusBadge({ status }: { status: DoctorStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function DoctorsTable({
  data,
  rowSelection,
  setRowSelection,
  isLoading,
  onEdit,
  onDelete,
  onInvite,
}: DoctorsTableProps) {
  const columns = useMemo<ColumnDef<DoctorListItem>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="h-4 w-4 rounded border-gray-300 accent-blue-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="h-4 w-4 rounded border-gray-300 accent-blue-500"
          />
        ),
        size: 40,
      },
      {
        accessorKey: "firstName",
        header: "Name",
        cell: ({ row }) => {
          const d = row.original;
          const fullName = [d.salutation, d.firstName, d.lastName].filter(Boolean).join(" ");
          return (
            <div>
              <div className="font-medium text-gray-900 dark:text-[#F9FAFB]">{fullName}</div>
              {d.specialization && (
                <div className="text-xs text-gray-500 dark:text-[#6B7280]">{d.specialization}</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-600 dark:text-[#9CA3AF]">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-600 dark:text-[#9CA3AF]">
            {getValue<string | null>() || "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={deriveDoctorStatus(row.original)} />,
      },
      {
        id: "facilities",
        header: "Facilities",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {row.original.facilities?.length > 0 ? (
              row.original.facilities.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#9CA3AF] truncate max-w-[120px]"
                  title={f.name}
                >
                  {f.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">None</span>
            )}
          </div>
        ),
      },
      {
        id: "fee",
        header: "Consult Fee",
        cell: ({ row }) => {
          const fee = row.original.currentFacility?.consultationFee;
          return (
            <span className="text-sm text-gray-600 dark:text-[#9CA3AF]">
              {fee != null ? `₹${fee}` : "—"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const doctor = row.original;
          const status = deriveDoctorStatus(doctor);
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => onEdit(doctor)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.04] dark:hover:text-[#F9FAFB]"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {status === "NOT_INVITED" && (
                <button
                  type="button"
                  onClick={() => onInvite(doctor)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-500/10"
                  title="Send Invite"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(doctor)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
        size: 120,
      },
    ],
    [onEdit, onDelete, onInvite],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { rowSelection },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(next);
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
          <MoreHorizontal className="h-6 w-6" />
        </div>
        <div className="text-sm font-medium text-gray-900 dark:text-[#F9FAFB]">No doctors found</div>
        <div className="text-xs text-gray-500 dark:text-[#6B7280]">Add your first doctor to get started</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 dark:border-white/[0.06] dark:bg-[#0B0F14]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#6B7280]"
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="whitespace-nowrap px-4 py-3 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
