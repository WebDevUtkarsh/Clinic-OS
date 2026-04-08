"use client";

import { useSession } from "@/features/auth/components/SessionProvider";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useFacility } from "@/features/auth/components/FacilityProvider";
import { ReactNode } from "react";

export default function FacilityLayout({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const { facilityId } = useFacility();

  if (!session || !facilityId) {
    return null; // Will be handled by SessionGuard / FacilityGuard inherently
  }

  // Convert the accessibleFacilityIds string[] into our standard FacilityOption mock until API provides details
  const facilities = (session.facilityIds || []).map((id) => ({
    id,
    name: "Care Facility", // Ideal placeholder mapping
    organizationName: session.tenant.name
  }));

  return (
    <DashboardShell facilityId={facilityId} facilities={facilities} session={session}>
      {children}
    </DashboardShell>
  );
}
