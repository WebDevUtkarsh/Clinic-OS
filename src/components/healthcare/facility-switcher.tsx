"use client";

import { ChevronsUpDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type FacilitySwitcherProps = {
  facilityId: string;
  accessibleFacilityIds: string[];
};

function getFacilityLabel(facilityId: string, index: number) {
  return `Care Facility ${index + 1} - ${facilityId.slice(0, 8)}`;
}

export function FacilitySwitcher({
  facilityId,
  accessibleFacilityIds,
}: FacilitySwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (nextFacilityId: string) => {
    if (nextFacilityId === facilityId) {
      return;
    }

    const nextPath = pathname.replace(`/f/${facilityId}`, `/f/${nextFacilityId}`);
    const nextSearch = searchParams.toString();
    router.push(nextSearch ? `${nextPath}?${nextSearch}` : nextPath);
  };

  if (!accessibleFacilityIds.length) {
    return (
      <Button variant="outline" size="sm" disabled>
        No facilities available
      </Button>
    );
  }

  return (
    <label className="flex min-w-[220px] items-center gap-3 rounded-xl border border-border bg-card/90 px-3 py-2 text-sm shadow-sm">
      <ChevronsUpDown size={16} className="text-muted-foreground" />
      <select
        value={facilityId}
        onChange={(event) => handleChange(event.target.value)}
        className="w-full bg-transparent outline-none"
        aria-label="Switch facility"
      >
        {accessibleFacilityIds.map((accessibleFacilityId, index) => (
          <option key={accessibleFacilityId} value={accessibleFacilityId}>
            {getFacilityLabel(accessibleFacilityId, index)}
            {facilityId === accessibleFacilityId ? " (Current)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
