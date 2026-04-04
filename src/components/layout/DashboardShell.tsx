"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { logoutSession } from "@/features/auth/api";
import { type SessionData } from "@/features/auth/types";
import { isFacilityScopedQueryKey } from "@/lib/query/query-keys";
import { useUIStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils/cn";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { type FacilityOption } from "@/components/layout/dashboard-utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

type DashboardShellProps = {
  facilityId: string;
  facilities: FacilityOption[];
  session: SessionData;
  children: ReactNode;
};

function FacilityUrlSync({ facilityId }: { facilityId: string }) {
  const queryClient = useQueryClient();
  const previousFacilityId = useRef<string | null>(null);
  const setActiveFacilityId = useUIStore((state) => state.setActiveFacilityId);

  useEffect(() => {
    setActiveFacilityId(facilityId);

    if (previousFacilityId.current && previousFacilityId.current !== facilityId) {
      const previous = previousFacilityId.current;

      queryClient.removeQueries({
        predicate: (query) => isFacilityScopedQueryKey(query.queryKey, previous),
      });
    }

    queryClient.invalidateQueries({
      predicate: (query) => isFacilityScopedQueryKey(query.queryKey, facilityId),
    });

    previousFacilityId.current = facilityId;
  }, [facilityId, queryClient, setActiveFacilityId]);

  return null;
}

export function DashboardShell({
  facilityId,
  facilities,
  session,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const isInsightsOpen = useUIStore((state) => state.isInsightsOpen);
  const setInsightsOpen = useUIStore((state) => state.setInsightsOpen);
  const resetUIState = useUIStore((state) => state.reset);

  const handleLogout = async () => {
    try {
      await logoutSession();
    } finally {
      queryClient.clear();
      resetUIState();
      router.replace("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#0B0F14] dark:text-[#F9FAFB]">
      <FacilityUrlSync facilityId={facilityId} />

      {isSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      ) : null}

      {isInsightsOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setInsightsOpen(false)}
          aria-label="Close insights panel overlay"
        />
      ) : null}

      <Sidebar facilityId={facilityId} facilities={facilities} session={session} />

      <div
        className={cn(
          "min-h-screen transition-[padding-left] duration-300 ease-out",
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-[296px]",
        )}
      >
        <Topbar
          facilityId={facilityId}
          facilities={facilities}
          session={session}
          onLogout={handleLogout}
        />
        <main className="px-4 pb-8 pt-6 md:px-6 lg:px-8">{children}</main>
      </div>

      <InsightsPanel open={isInsightsOpen} onClose={() => setInsightsOpen(false)} />
    </div>
  );
}
