import {
  BarChart3,
  CalendarDays,
  LayoutGrid,
  Receipt,
  Shield,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
};

export type FacilityOption = {
  id: string;
  name: string;
  organizationName: string;
};

export const navigationSections: Array<{
  label: string;
  items: NavigationItem[];
}> = [
  {
    label: "MAIN",
    items: [
      { href: "dashboard", label: "Dashboard", icon: LayoutGrid },
      { href: "patients", label: "Patients", icon: Users, permission: "patients:read" },
      { href: "doctors", label: "Doctors", icon: Stethoscope, permission: "doctors:read" },
      { href: "appointments", label: "Appointments", icon: CalendarDays, permission: "appointments:read" },
      { href: "billing", label: "Billing", icon: Receipt, permission: "billing:read" },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { href: "reports", label: "Reports", icon: BarChart3, permission: "reports:read" },
      { href: "audit", label: "Audit / Security", icon: Shield, permission: "audit:read" },
    ],
  },
] as const;

export function getFacilityLabel(
  facilityId: string,
  facilities: FacilityOption[],
) {
  return facilities.find((facility) => facility.id === facilityId)?.name ?? "Unknown facility";
}

export function getFacilitySubtitle(
  facilityId: string,
  facilities: FacilityOption[],
) {
  const facility = facilities.find((item) => item.id === facilityId);

  if (!facility) {
    return `ID ${facilityId.slice(0, 8).toUpperCase()}`;
  }

  return facility.organizationName;
}

export function getInitials(name?: string) {
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function getRoleBadgeClasses(role?: string) {
  if (!role) return "border-gray-500/20 bg-gray-500/10 text-gray-500";
  const normalizedRole = role.toLowerCase();

  if (normalizedRole.includes("doctor")) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
  }

  if (normalizedRole.includes("staff")) {
    return "border-violet-500/20 bg-violet-500/10 text-violet-500";
  }

  return "border-blue-500/20 bg-blue-500/10 text-blue-500";
}
