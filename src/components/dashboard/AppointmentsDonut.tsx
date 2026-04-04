"use client";

import { Cell, Pie, PieChart } from "recharts";
import { appointmentBreakdown } from "@/constants/mockData";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartSize } from "@/components/dashboard/use-chart-size";

type AppointmentsDonutProps = {
  loading: boolean;
};

const legendDotClasses = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
} as const;

export function AppointmentsDonut({ loading }: AppointmentsDonutProps) {
  const { ref, width, height, ready } = useChartSize(220);

  return (
    <section className="animate-dashboard-fade-up animation-delay-300 min-w-0 rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.06] dark:bg-[#111827]">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-[#F9FAFB]">
          Appointments
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#6B7280]">
          Today&apos;s breakdown
        </p>
      </div>

      <div ref={ref} className="relative mt-6 h-[220px] min-w-0">
        {loading || !ready ? (
          <Skeleton className="h-full w-full rounded-2xl bg-black/5 dark:bg-white/[0.06]" />
        ) : (
          <>
            <PieChart width={width} height={height}>
              <Pie
                data={appointmentBreakdown}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
              >
                {appointmentBreakdown.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#F9FAFB]">
                24
              </div>
              <div className="text-xs text-gray-500 dark:text-[#6B7280]">Total</div>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-[#9CA3AF]">
        {appointmentBreakdown.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${legendDotClasses[item.tone]}`}
            />
            <span>{item.label}</span>
            <span className="font-medium text-gray-900 dark:text-[#F9FAFB]">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
