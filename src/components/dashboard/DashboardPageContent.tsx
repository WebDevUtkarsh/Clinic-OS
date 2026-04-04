"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { AppointmentsDonut } from "@/components/dashboard/AppointmentsDonut";
import { AppointmentsTable } from "@/components/dashboard/AppointmentsTable";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { Button } from "@/components/ui/button";

type DashboardPageContentProps = {
  userName: string;
  welcome: boolean;
};

export function DashboardPageContent({
  userName,
  welcome,
}: DashboardPageContentProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 850);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#F9FAFB]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
            Welcome back, {userName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="h-11 rounded-xl border-gray-200 bg-white px-4 text-sm font-medium dark:border-white/[0.08] dark:bg-[#111827]"
          >
            + New Patient
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl border-gray-200 bg-white px-4 text-sm font-medium dark:border-white/[0.08] dark:bg-[#111827]"
          >
            + Book Appointment
          </Button>
          <Button className="h-11 rounded-xl px-4 text-sm font-medium">
            + Generate Bill
          </Button>
        </div>
      </section>

      {welcome ? (
        <div className="animate-dashboard-fade-up rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-500">
          Your facility workspace is live. Scheduling, billing, patient flow,
          and audit visibility are now anchored to this facility context.
        </div>
      ) : null}

      <StatsGrid loading={loading} />

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr] xl:items-stretch">
        <RevenueChart loading={loading} />
        <AppointmentsDonut loading={loading} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <AppointmentsTable loading={loading} />
        <AlertsPanel loading={loading} />
      </div>

      <section className="animate-dashboard-fade-up animation-delay-400 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-white/[0.06] dark:bg-[#111827]">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-[#F9FAFB]">
            Daily operations snapshot
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#6B7280]">
            Patient intake, clinician load, and billing exceptions are trending
            within expected ranges today.
          </p>
        </div>
        <Button
          variant="ghost"
          className="hidden text-sm font-medium text-blue-500 hover:text-blue-600 lg:inline-flex"
        >
          View detailed reports
          <ArrowRight className="h-4 w-4" />
        </Button>
      </section>
    </div>
  );
}
