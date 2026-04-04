"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  PanelRightOpen,
  Repeat2,
  Search,
  UserCircle2,
  X,
} from "lucide-react";
import { type SessionData } from "@/features/auth/types";
import { ThemeToggle } from "@/components/healthcare/theme-toggle";
import { dashboardAlerts } from "@/constants/mockData";
import {
  type FacilityOption,
  getFacilityLabel,
  getFacilitySubtitle,
  getInitials,
  getRoleBadgeClasses,
} from "@/components/layout/dashboard-utils";
import { useUIStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils/cn";

type TopbarProps = {
  facilityId: string;
  facilities: FacilityOption[];
  session: SessionData;
  onLogout: () => Promise<void>;
};

export function Topbar({
  facilityId,
  facilities,
  session,
  onLogout,
}: TopbarProps) {
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const isInsightsOpen = useUIStore((state) => state.isInsightsOpen);
  const toggleInsightsOpen = useUIStore((state) => state.toggleInsightsOpen);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const facilityLabel = useMemo(
    () => getFacilityLabel(facilityId, facilities),
    [facilities, facilityId],
  );
  const organizationLabel = useMemo(
    () => getFacilitySubtitle(facilityId, facilities),
    [facilities, facilityId],
  );
  const initials = useMemo(() => getInitials(session.user.name), [session.user.name]);
  const roleBadgeClasses = getRoleBadgeClasses(session.role);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur xl:px-6 dark:border-white/[0.06] dark:bg-[#0B0F14]/90">
      <div className="flex min-h-14 items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 lg:hidden dark:border-white/[0.08] dark:bg-[#111827] dark:text-[#9CA3AF]"
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1 lg:flex-none">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#9CA3AF]">
            <span className="truncate">
              {session.tenant.name || "Utkarsh Healthcare Group"}
            </span>
            <span className="text-gray-400 dark:text-[#6B7280]">{">"}</span>
            <span className="truncate">{organizationLabel}</span>
            <span className="text-gray-400 dark:text-[#6B7280]">{">"}</span>
            <span className="truncate font-semibold text-gray-900 dark:text-[#F9FAFB]">
              {facilityLabel}
            </span>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          <label className="flex h-11 w-full max-w-xl items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 dark:border-white/[0.08] dark:bg-[#1F2937]">
            <Search className="h-4 w-4 text-gray-400 dark:text-[#6B7280]" />
            <input
              type="search"
              placeholder="Search patients, appointments..."
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-[#F9FAFB] dark:placeholder:text-[#6B7280]"
              aria-label="Search patients and appointments"
            />
            <span className="rounded-full border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-400 dark:border-white/[0.08] dark:text-[#6B7280]">
              Ctrl K
            </span>
          </label>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleInsightsOpen}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:border-blue-500/20 hover:text-blue-500 dark:border-white/[0.08] dark:bg-[#111827] dark:text-[#9CA3AF]",
              isInsightsOpen && "border-blue-500/20 bg-blue-500/10 text-blue-500",
            )}
            aria-label="Toggle insights panel"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>

          <ThemeToggle
            variant="outline"
            className="h-11 w-11 border-gray-200 bg-white text-gray-600 hover:text-blue-500 dark:border-white/[0.08] dark:bg-[#111827] dark:text-[#9CA3AF]"
          />

          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((current) => !current)}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:border-blue-500/20 hover:text-blue-500 dark:border-white/[0.08] dark:bg-[#111827] dark:text-[#9CA3AF]"
              aria-label="Open notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                3
              </span>
            </button>

            {notificationsOpen ? (
              <div className="absolute right-0 top-[calc(100%+12px)] z-20 w-80 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-white/[0.08] dark:bg-[#111827]">
                <div className="flex items-center justify-between px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-[#F9FAFB]">
                      Recent alerts
                    </div>
                    <div className="text-xs text-gray-500 dark:text-[#6B7280]">
                      3 active notifications
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                    aria-label="Close notifications"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {dashboardAlerts.slice(0, 3).map((alert) => (
                    <div
                      key={`${alert.type}-${alert.message}`}
                      className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-white/[0.06]"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-[#F9FAFB]">
                        {alert.message}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-[#6B7280]">
                        {alert.timeAgo}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((current) => !current)}
              className="flex h-11 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 text-left transition-colors hover:border-blue-500/20 dark:border-white/[0.08] dark:bg-[#111827]"
              aria-label="Open account menu"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-sm font-semibold text-blue-500">
                {initials}
              </div>
              <div className="hidden min-w-0 md:block">
                <div className="truncate text-sm font-medium text-gray-900 dark:text-[#F9FAFB]">
                  {session.user.name}
                </div>
                <div className="truncate text-xs text-gray-500 dark:text-[#6B7280]">
                  {session.role}
                </div>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-gray-400 md:block dark:text-[#6B7280]" />
            </button>

            {accountMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+12px)] z-20 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-white/[0.08] dark:bg-[#111827]">
                <div className="px-3 py-2">
                  <div className="text-sm font-semibold text-gray-900 dark:text-[#F9FAFB]">
                    {session.user.name}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
                        roleBadgeClasses,
                      )}
                    >
                      {session.role}
                    </span>
                    <span className="truncate text-xs text-gray-500 dark:text-[#6B7280]">
                      {session.user.email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-[#9CA3AF] dark:hover:bg-white/[0.04] dark:hover:text-[#F9FAFB]"
                >
                  <UserCircle2 className="h-4 w-4" />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-[#9CA3AF] dark:hover:bg-white/[0.04] dark:hover:text-[#F9FAFB]"
                >
                  <Repeat2 className="h-4 w-4" />
                  Switch Role
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
