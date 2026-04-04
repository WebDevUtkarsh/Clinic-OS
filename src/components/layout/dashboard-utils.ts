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
      { href: "patients", label: "Patients", icon: Users },
      { href: "doctors", label: "Doctors", icon: Stethoscope },
      { href: "appointments", label: "Appointments", icon: CalendarDays },
      { href: "billing", label: "Billing", icon: Receipt },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { href: "reports", label: "Reports", icon: BarChart3 },
      { href: "audit", label: "Audit / Security", icon: Shield },
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

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function getRoleBadgeClasses(role: string) {
  const normalizedRole = role.toLowerCase();

  if (normalizedRole.includes("doctor")) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
  }

  if (normalizedRole.includes("staff")) {
    return "border-violet-500/20 bg-violet-500/10 text-violet-500";
  }

  return "border-blue-500/20 bg-blue-500/10 text-blue-500";
}
