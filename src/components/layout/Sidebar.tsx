"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { type SessionData } from "@/features/auth/types";
import { useUIStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils/cn";
import {
  type FacilityOption,
  getFacilityLabel,
  getFacilitySubtitle,
  getInitials,
  getRoleBadgeClasses,
  navigationSections,
} from "@/components/layout/dashboard-utils";
import { Can } from "@/hooks/use-can";

type SidebarProps = {
  facilityId: string;
  facilities: FacilityOption[];
  session: SessionData;
};

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center border border-transparent text-sm font-medium transition-all duration-150",
        collapsed
          ? "h-9 w-9 justify-center rounded-2xl px-0 py-0"
          : "gap-3 rounded-2xl px-3 py-3",
        active
          ? collapsed
            ? "bg-blue-500/10 text-blue-500"
            : "border-l-2 border-l-blue-500 bg-blue-500/10 text-blue-500"
          : "text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:text-[#6B7280] dark:hover:bg-white/4 dark:hover:text-[#F9FAFB]",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span
        className={cn(
          "truncate transition-all duration-300",
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
        )}
      >
        {label}
      </span>

      {collapsed ? (
        <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 hidden -translate-y-1/2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-900 shadow-lg group-hover:flex dark:border-white/8 dark:bg-[#111827] dark:text-[#F9FAFB]">
          {label}
        </span>
      ) : null}
    </Link>
  );
}

export function Sidebar({ facilityId, facilities, session }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore(
    (state) => state.toggleSidebarCollapsed,
  );
  const [facilityMenuOpen, setFacilityMenuOpen] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const facilityLabel = useMemo(
    () => getFacilityLabel(facilityId, facilities),
    [facilities, facilityId],
  );
  const initials = useMemo(
    () => getInitials(session.user.name),
    [session.user.name],
  );
  const roleBadgeClasses = getRoleBadgeClasses(session.role);
  const scrollZone = !canScrollUp
    ? "top"
    : !canScrollDown
      ? "bottom"
      : "middle";

  useEffect(() => {
    const element = navScrollRef.current;

    if (!element) {
      return;
    }

    const updateScrollState = () => {
      setCanScrollUp(element.scrollTop > 4);
      setCanScrollDown(
        element.scrollTop + element.clientHeight < element.scrollHeight - 4,
      );
    };

    updateScrollState();
    element.addEventListener("scroll", updateScrollState);

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [isSidebarCollapsed]);

  const handleFacilityChange = (nextFacilityId: string) => {
    if (nextFacilityId === facilityId) {
      setFacilityMenuOpen(false);
      return;
    }

    const nextPath = pathname.replace(
      `/f/${facilityId}`,
      `/f/${nextFacilityId}`,
    );
    const nextSearch = searchParams.toString();
    setSidebarOpen(false);
    setFacilityMenuOpen(false);
    router.push(nextSearch ? `${nextPath}?${nextSearch}` : nextPath);
  };

  const scrollNavigation = (direction: "up" | "down") => {
    navScrollRef.current?.scrollBy({
      top: direction === "up" ? -220 : 220,
      behavior: "smooth",
    });
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-white/6 dark:bg-[#0D1117]",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isSidebarCollapsed ? "w-12 px-1.5 py-4" : "w-74 px-4 py-6",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/f/${facilityId}/dashboard`}
          className={cn(
            "flex min-w-0 items-center gap-3",
            isSidebarCollapsed && "justify-center",
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-2xl bg-blue-500 font-semibold text-white shadow-lg shadow-blue-500/20",
              isSidebarCollapsed ? "h-9 w-9 text-xs" : "h-10 w-10 text-sm",
            )}
          >
            C
          </div>
          <div
            className={cn(
              "min-w-0 transition-all duration-300",
              isSidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
            )}
          >
            <div className="truncate text-lg font-bold tracking-tight text-gray-900 dark:text-[#F9FAFB]">
              Clinic OS
            </div>
            <div className="truncate text-xs text-gray-500 dark:text-[#6B7280]">
              Operations workspace
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 lg:hidden dark:border-white/8 dark:text-[#9CA3AF]"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mt-6 shrink-0">
        <button
          type="button"
          onClick={() => setFacilityMenuOpen((current) => !current)}
          className={cn(
            "flex w-full items-center rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-left transition-colors hover:border-blue-500/20 hover:bg-gray-50 dark:border-white/8 dark:bg-[#1F2937] dark:hover:bg-[#1F2937]/80",
            isSidebarCollapsed
              ? "h-9 justify-center rounded-2xl px-0"
              : "gap-3",
          )}
          aria-label="Switch facility"
        >
          <Building2 className="h-4 w-4 shrink-0 text-gray-500 dark:text-[#9CA3AF]" />
          <div
            className={cn(
              "min-w-0 flex-1 transition-all duration-300",
              isSidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
            )}
          >
            <div className="truncate text-sm font-medium text-gray-900 dark:text-[#F9FAFB]">
              {facilityLabel}
            </div>
            <div className="truncate text-xs text-gray-500 dark:text-[#6B7280]">
              {getFacilitySubtitle(facilityId, facilities)}
            </div>
          </div>
          <ChevronsUpDown
            className={cn(
              "h-4 w-4 shrink-0 text-gray-500 transition-all dark:text-[#9CA3AF]",
              isSidebarCollapsed ? "opacity-0" : "opacity-100",
            )}
          />
        </button>

        {facilityMenuOpen ? (
          <div
            className={cn(
              "absolute top-[calc(100%+12px)] z-20 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-white/8 dark:bg-[#111827]",
              isSidebarCollapsed ? "left-full ml-3 w-64" : "w-full",
            )}
          >
            {facilities.map((facility) => {
              const active = facility.id === facilityId;

              return (
                <button
                  key={facility.id}
                  type="button"
                  onClick={() => handleFacilityChange(facility.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-blue-500/10 text-blue-500"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-[#9CA3AF] dark:hover:bg-white/4 dark:hover:text-[#F9FAFB]",
                  )}
                >
                  <Building2 className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{facility.name}</div>
                    <div className="truncate text-xs opacity-70">
                      {facility.organizationName}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-8 min-h-0 flex-1",
          isSidebarCollapsed ? "flex" : "grid grid-cols-[minmax(0,1fr)_28px] gap-3",
        )}
      >
        <div
          className={cn(
            "flex h-full min-h-0 flex-col",
            isSidebarCollapsed && "w-full items-center",
          )}
        >
          <button
            type="button"
            onClick={() => scrollNavigation("up")}
            disabled={!canScrollUp}
            className={cn(
              "inline-flex shrink-0 items-center justify-center border border-gray-200 bg-gray-50 text-gray-500 transition-all dark:border-white/6 dark:bg-[#111827] dark:text-[#6B7280]",
              isSidebarCollapsed
                ? "mb-3 h-7 w-7 rounded-2xl"
                : "hidden",
              canScrollUp
                ? "hover:border-blue-500/20 hover:text-blue-500 dark:hover:text-[#9CA3AF]"
                : "cursor-default opacity-35",
            )}
            aria-label="Scroll navigation up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <div
            ref={navScrollRef}
            className={cn(
              "min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              isSidebarCollapsed ? "w-full" : "pr-1",
            )}
          >
            <div
              className={cn(
                "space-y-6 pb-2",
                isSidebarCollapsed && "flex flex-col items-center",
              )}
            >
              {navigationSections.map((section) => (
                <div
                  key={section.label}
                  className={cn(isSidebarCollapsed && "w-full")}
                >
                  {isSidebarCollapsed ? null : (
                    <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-[#6B7280]">
                      {section.label}
                    </div>
                  )}
                  <div
                    className={cn(
                      "mt-3 space-y-1.5",
                      isSidebarCollapsed && "flex flex-col items-center",
                    )}
                  >
                    {section.items.map((item) => {
                      const href = `/f/${facilityId}/${item.href}`;
                      const active =
                        item.href === "dashboard"
                          ? pathname === href
                          : pathname.startsWith(href);

                      const navNode = (
                        <NavItem
                          href={href}
                          label={item.label}
                          icon={item.icon}
                          active={active}
                          collapsed={isSidebarCollapsed}
                          onNavigate={() => setSidebarOpen(false)}
                        />
                      );

                      if (item.permission) {
                        return (
                          <Can key={item.href} permission={item.permission}>
                            {navNode}
                          </Can>
                        );
                      }

                      return <div key={item.href}>{navNode}</div>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollNavigation("down")}
            disabled={!canScrollDown}
            className={cn(
              "inline-flex shrink-0 items-center justify-center border border-gray-200 bg-gray-50 text-gray-500 transition-all dark:border-white/6 dark:bg-[#111827] dark:text-[#6B7280]",
              isSidebarCollapsed
                ? "mt-3 h-7 w-7 rounded-2xl"
                : "hidden",
              canScrollDown
                ? "hover:border-blue-500/20 hover:text-blue-500 dark:hover:text-[#9CA3AF]"
                : "cursor-default opacity-35",
            )}
            aria-label="Scroll navigation down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {!isSidebarCollapsed ? (
          <div className="pointer-events-none flex h-full min-h-0 flex-col items-center py-1">
            <button
              type="button"
              onClick={() => scrollNavigation("up")}
              disabled={!canScrollUp}
              className={cn(
                "pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition-all dark:border-white/6 dark:bg-[#111827] dark:text-[#6B7280]",
                canScrollUp
                  ? "hover:border-blue-500/20 hover:text-blue-500 dark:hover:text-[#9CA3AF]"
                  : "cursor-default opacity-35",
              )}
              aria-label="Scroll navigation up"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>

            <div className="relative my-3 flex-1 w-px rounded-full bg-gray-200/80 dark:bg-white/8">
              <div className="absolute -inset-x-1 inset-y-0 rounded-full bg-linear-to-b from-blue-500/0 via-blue-500/5 to-blue-500/0" />
              <span
                className={cn(
                  "absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-blue-500/25 bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.22)] transition-all duration-200",
                  scrollZone === "top"
                    ? "top-0"
                    : scrollZone === "middle"
                      ? "top-1/2 -translate-y-1/2"
                      : "bottom-0",
                )}
              />
            </div>

            <button
              type="button"
              onClick={() => scrollNavigation("down")}
              disabled={!canScrollDown}
              className={cn(
                "pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition-all dark:border-white/6 dark:bg-[#111827] dark:text-[#6B7280]",
                canScrollDown
                  ? "hover:border-blue-500/20 hover:text-blue-500 dark:hover:text-[#9CA3AF]"
                  : "cursor-default opacity-35",
              )}
              aria-label="Scroll navigation down"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-gray-200 pt-4 dark:border-white/6",
          isSidebarCollapsed ? "space-y-2" : "space-y-3",
        )}
      >
        {!isSidebarCollapsed ? (
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-white/6 dark:bg-[#111827]">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
                roleBadgeClasses,
              )}
            >
              {session.role}
            </span>
            <span className="text-xs text-gray-500 dark:text-[#6B7280]">
              {session.permissions.length} permissions
            </span>
          </div>
        ) : null}

        <div
          className={cn(
            "flex items-center rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/6 dark:bg-[#111827]",
            isSidebarCollapsed ? "h-10 justify-center px-0" : "gap-3 px-3 py-3",
          )}
          title={isSidebarCollapsed ? session.user.name : undefined}
        >
          <div
            className={cn(
              "flex shrink-0 items-center justify-center bg-blue-500/15 font-semibold text-blue-500",
              isSidebarCollapsed
                ? "h-8 w-8 rounded-2xl text-xs"
                : "h-11 w-11 rounded-2xl text-[15px]",
            )}
          >
            {initials}
          </div>
          {!isSidebarCollapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold leading-none text-gray-900 dark:text-[#F9FAFB]">
                  {session.user.name}
                </div>
                <div className="mt-1 truncate text-[12px] text-gray-500 dark:text-[#6B7280]">
                  {session.user.email}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                  roleBadgeClasses,
                )}
              >
                {session.role}
              </span>
            </>
          ) : null}
        </div>

        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className={cn(
            "hidden items-center justify-center gap-2 border border-gray-200 bg-gray-50 text-sm font-medium text-gray-600 transition-colors hover:border-blue-500/20 hover:text-gray-900 lg:flex dark:border-white/6 dark:bg-[#111827] dark:text-[#9CA3AF] dark:hover:text-[#F9FAFB]",
            isSidebarCollapsed
              ? "h-9 w-full rounded-2xl px-0"
              : "h-11 w-full rounded-xl px-3",
          )}
          aria-label={
            isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
          <span className={cn(isSidebarCollapsed && "hidden")}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}
