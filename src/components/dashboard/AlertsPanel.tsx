"use client";

import { HeartPulse, Receipt, ShieldAlert, UserRound } from "lucide-react";
import { dashboardAlerts } from "@/constants/mockData";
import { cn } from "@/lib/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";

type AlertsPanelProps = {
  loading: boolean;
};

const alertIcons = {
  Billing: Receipt,
  Patient: UserRound,
  Security: ShieldAlert,
  Medical: HeartPulse,
} as const;

const alertClasses = {
  red: "border-l-red-500 bg-red-500/10 text-red-500",
  amber: "border-l-amber-500 bg-amber-500/10 text-amber-500",
  blue: "border-l-blue-500 bg-blue-500/10 text-blue-500",
} as const;

export function AlertsPanel({ loading }: AlertsPanelProps) {
  return (
    <section className="animate-dashboard-fade-up animation-delay-400 rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.06] dark:bg-[#111827]">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-[#F9FAFB]">
          Alerts
        </h2>
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-[#6B7280]">
        Real-time notifications
      </p>

      <div className="mt-5 space-y-3">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-4 dark:border-white/[0.06]"
              >
                <Skeleton className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 bg-black/5 dark:bg-white/[0.06]" />
                  <Skeleton className="h-3 w-24 bg-black/5 dark:bg-white/[0.06]" />
                </div>
              </div>
            ))
          : dashboardAlerts.map((alert) => {
              const Icon = alertIcons[alert.type];

              return (
                <article
                  key={`${alert.type}-${alert.message}`}
                  className="flex gap-3 border-b border-gray-200 py-3 last:border-b-0 dark:border-white/[0.04]"
                >
                  <div
                    className={cn(
                      "w-0.5 rounded-full",
                      alert.tone === "red"
                        ? "bg-red-500"
                        : alert.tone === "amber"
                          ? "bg-amber-500"
                          : "bg-blue-500",
                    )}
                  />
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-l-2",
                      alertClasses[alert.tone],
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-[#F9FAFB]">
                      {alert.message}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-[#6B7280]">
                      {alert.timeAgo}
                    </div>
                  </div>
                </article>
              );
            })}
      </div>
    </section>
  );
}
