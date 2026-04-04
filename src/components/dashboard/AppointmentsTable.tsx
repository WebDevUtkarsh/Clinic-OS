"use client";

import { CalendarDays, Check, Eye } from "lucide-react";
import { todaysAppointments } from "@/constants/mockData";
import { cn } from "@/lib/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";

type AppointmentsTableProps = {
  loading: boolean;
};

const statusClasses = {
  Completed: "bg-emerald-500/10 text-emerald-500",
  "In Progress": "bg-blue-500/10 text-blue-500",
  Upcoming: "bg-amber-500/10 text-amber-500",
  Cancelled: "bg-red-500/10 text-red-500",
} as const;

export function AppointmentsTable({ loading }: AppointmentsTableProps) {
  return (
    <section className="animate-dashboard-fade-up animation-delay-400 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.06] dark:bg-[#111827]">
      <div className="px-6 pb-4 pt-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-[#F9FAFB]">
          Today&apos;s Appointments
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#6B7280]">
          6 scheduled for today
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 px-6 pb-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-5 gap-4 rounded-xl bg-black/5 px-4 py-4 dark:bg-white/[0.06]"
            >
              <Skeleton className="h-4 w-16 bg-black/5 dark:bg-white/[0.06]" />
              <Skeleton className="h-4 w-24 bg-black/5 dark:bg-white/[0.06]" />
              <Skeleton className="h-4 w-28 bg-black/5 dark:bg-white/[0.06]" />
              <Skeleton className="h-4 w-20 bg-black/5 dark:bg-white/[0.06]" />
              <Skeleton className="h-4 w-20 bg-black/5 dark:bg-white/[0.06]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-black/[0.02] dark:bg-white/[0.02]">
              <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                {["Time", "Patient", "Doctor", "Status", "Action"].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-[#6B7280]"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todaysAppointments.map((appointment) => (
                <tr
                  key={`${appointment.time}-${appointment.patient}`}
                  className="group border-b border-gray-200 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3.5 text-sm text-gray-900 dark:text-[#F9FAFB]">
                    {appointment.time}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-900 dark:text-[#F9FAFB]">
                    {appointment.patient}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-[#9CA3AF]">
                    {appointment.doctor}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        statusClasses[appointment.status],
                      )}
                    >
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-black/[0.06] hover:text-gray-900 dark:text-[#9CA3AF] dark:hover:bg-white/[0.06] dark:hover:text-[#F9FAFB]"
                        aria-label={`View ${appointment.patient}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-black/[0.06] hover:text-gray-900 dark:text-[#9CA3AF] dark:hover:bg-white/[0.06] dark:hover:text-[#F9FAFB]"
                        aria-label={`Reschedule ${appointment.patient}`}
                      >
                        <CalendarDays className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-black/[0.06] hover:text-gray-900 dark:text-[#9CA3AF] dark:hover:bg-white/[0.06] dark:hover:text-[#F9FAFB]"
                        aria-label={`Mark ${appointment.patient} complete`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
