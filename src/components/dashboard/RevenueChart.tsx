"use client";

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { revenueSeries } from "@/constants/mockData";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartSize } from "@/components/dashboard/use-chart-size";

type RevenueChartProps = {
  loading: boolean;
};

export function RevenueChart({ loading }: RevenueChartProps) {
  const { ref, width, height, ready } = useChartSize(220);

  return (
    <section className="animate-dashboard-fade-up animation-delay-300 min-w-0 rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.06] dark:bg-[#111827]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-[#F9FAFB]">
            Revenue
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#6B7280]">
            Last 30 days
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold tracking-tight text-blue-500">
            $284,320
          </div>
          <div className="mt-1 text-sm font-medium text-emerald-500">+12.5%</div>
        </div>
      </div>

      <div ref={ref} className="mt-6 h-[220px] min-w-0">
        {loading || !ready ? (
          <Skeleton className="h-full w-full rounded-2xl bg-black/5 dark:bg-white/[0.06]" />
        ) : (
          <AreaChart width={width} height={height} data={revenueSeries}>
            <defs>
              <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.15}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip
              formatter={(value) =>
                typeof value === "number" ? [`$${value.toLocaleString()}`, "Revenue"] : [value, "Revenue"]
              }
              labelFormatter={(label) => `Day ${label}`}
              contentStyle={{
                backgroundColor: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
              }}
              itemStyle={{ color: "#F9FAFB" }}
              labelStyle={{ color: "#9CA3AF" }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#revenueFill)"
            />
          </AreaChart>
        )}
      </div>
    </section>
  );
}
