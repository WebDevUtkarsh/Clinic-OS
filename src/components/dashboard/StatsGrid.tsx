"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  DollarSign,
  Receipt,
  Users,
} from "lucide-react";
import { Line, LineChart } from "recharts";
import { dashboardStats } from "@/constants/mockData";
import { cn } from "@/lib/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";

type StatsGridProps = {
  loading: boolean;
};

const iconMap = {
  revenue: DollarSign,
  appointments: CalendarDays,
  patients: Users,
  billing: Receipt,
} as const;

const iconClasses = {
  revenue: "bg-blue-500/10 text-blue-500",
  appointments: "bg-emerald-500/10 text-emerald-500",
  patients: "bg-violet-500/10 text-violet-500",
  billing: "bg-red-500/10 text-red-500",
} as const;

const sparklineColors = {
  revenue: "var(--color-success)",
  appointments: "var(--color-success)",
  patients: "var(--color-analytics)",
  billing: "var(--color-danger)",
} as const;

export function StatsGrid({ loading }: StatsGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111827]",
              "animate-dashboard-fade-up",
              index === 1 && "animation-delay-75",
              index === 2 && "animation-delay-150",
              index === 3 && "animation-delay-225",
            )}
          >
            <Skeleton className="h-3 w-28 bg-black/5 dark:bg-white/[0.06]" />
            <Skeleton className="mt-5 h-8 w-32 bg-black/5 dark:bg-white/[0.06]" />
            <Skeleton className="mt-6 h-10 w-full rounded-xl bg-black/5 dark:bg-white/[0.06]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {dashboardStats.map((stat, index) => {
        const Icon = iconMap[stat.key];
        const positive = stat.change.startsWith("+");

        return (
          <article
            key={stat.key}
            className={cn(
              "min-w-0 rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-blue-500/25 dark:border-white/[0.06] dark:bg-[#111827]",
              "animate-dashboard-fade-up",
              index === 1 && "animation-delay-75",
              index === 2 && "animation-delay-150",
              index === 3 && "animation-delay-225",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500 dark:text-[#6B7280]">
                {stat.label}
              </div>
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  iconClasses[stat.key],
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <div className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-[#F9FAFB]">
                  {stat.value}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-medium",
                      positive ? "text-emerald-500" : "text-red-500",
                    )}
                  >
                    {positive ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {stat.change}
                  </span>
                  <span className="text-gray-500 dark:text-[#6B7280]">
                    {stat.comparison}
                  </span>
                </div>
              </div>

              <div className="h-10 w-20 shrink-0">
                <LineChart width={80} height={40} data={stat.sparkline}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={sparklineColors[stat.key]}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
