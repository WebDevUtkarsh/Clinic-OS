"use client";

import { AlertTriangle, CalendarDays, Clock3, X } from "lucide-react";
import { insightCards } from "@/constants/mockData";
import { cn } from "@/lib/utils/cn";

type InsightsPanelProps = {
  open: boolean;
  onClose: () => void;
};

const insightIcons = {
  blue: CalendarDays,
  emerald: Clock3,
  amber: AlertTriangle,
} as const;

const insightIconClasses = {
  blue: "bg-blue-500/10 text-blue-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
  amber: "bg-amber-500/10 text-amber-500",
} as const;

export function InsightsPanel({ open, onClose }: InsightsPanelProps) {
  return (
    <aside
      className={cn(
        "fixed bottom-0 right-0 top-16 z-40 w-[300px] border-l border-gray-200 bg-white px-4 py-5 shadow-2xl transition-transform duration-200 ease-out dark:border-white/[0.06] dark:bg-[#0D1117]",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-[#F9FAFB]">
            Insights
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#6B7280]">
            Live operational snapshot
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 dark:border-white/[0.06] dark:bg-[#111827] dark:text-[#9CA3AF]"
          aria-label="Close insights panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {insightCards.map((insight) => {
          const Icon = insightIcons[insight.tone];

          return (
            <div
              key={insight.label}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/[0.06] dark:bg-[#111827]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    insightIconClasses[insight.tone],
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[22px] font-bold tracking-tight text-gray-900 dark:text-[#F9FAFB]">
                    {insight.value}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-[#6B7280]">
                    {insight.label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
