"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  UsersRound,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { logoutSession } from "@/features/auth/api";
import { type SessionData } from "@/features/auth/types";
import { isFacilityScopedQueryKey } from "@/lib/query/query-keys";
import { useUIStore } from "@/lib/store/ui-store";
import { fadeIn, slideUp, staggerContainer } from "@/lib/utils/motion";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/healthcare/theme-toggle";
import { FacilitySwitcher } from "@/components/healthcare/facility-switcher";

type DashboardShellProps = {
  facilityId: string;
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
  session,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const resetUIState = useUIStore((state) => state.reset);
  const facilityIndex = Math.max(
    session.accessibleFacilityIds.indexOf(facilityId),
    0,
  );
  const facilityLabel = `Care Facility ${facilityIndex + 1}`;

  const navigation = useMemo(
    () => [
      {
        href: `/f/${facilityId}/dashboard`,
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        href: `/f/${facilityId}/patients`,
        label: "Patient Records",
        icon: UsersRound,
      },
      {
        href: `/f/${facilityId}/audit`,
        label: "Activity Timeline",
        icon: Activity,
      },
    ],
    [facilityId],
  );

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
    <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
      <FacilityUrlSync facilityId={facilityId} />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border/80 bg-card/95 px-6 py-8 shadow-2xl backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <Link href={`/f/${facilityId}/dashboard`} className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              ClinicOS
            </div>
            <div className="text-lg font-semibold tracking-tight text-foreground">
              Care Facility Workspace
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={16} />
          </Button>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-background/70 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Active facility
          </div>
          <div className="mt-2 text-base font-semibold text-foreground">
            {facilityLabel}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {facilityId}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{session.role}</Badge>
            <Badge variant="secondary">
              {session.permissions.length} permissions
            </Badge>
          </div>
        </div>

        <nav className="mt-8 space-y-2">
          {navigation.map((item) => {
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden pt-10 lg:block">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            End secure session
          </Button>
        </div>
      </aside>

      <div className="relative min-h-screen">
        {isSidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        ) : null}

        <motion.main
          className="relative z-10 px-5 py-5 md:px-8 lg:px-10"
          initial="hidden"
          animate="show"
          variants={staggerContainer}
        >
          <motion.header
            variants={fadeIn}
            className="sticky top-4 z-30 mb-6 flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/90 px-4 py-4 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                onClick={toggleSidebar}
              >
                <Menu size={16} />
              </Button>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  Tenant-safe navigation
                </div>
                <div className="text-base font-semibold tracking-tight text-foreground">
                  {session.tenant.name}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <FacilitySwitcher
                facilityId={facilityId}
                accessibleFacilityIds={session.accessibleFacilityIds}
              />
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="hidden md:inline-flex">
                  <Shield className="mr-1 h-3.5 w-3.5" />
                  {session.isSuperAdmin ? "Super admin" : "Facility scope"}
                </Badge>
                <ThemeToggle />
              </div>
            </div>
          </motion.header>

          <motion.div variants={slideUp}>{children}</motion.div>
        </motion.main>
      </div>
    </div>
  );
}
