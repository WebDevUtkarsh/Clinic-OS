export const queryKeys = {
  patients: {
    list: (facilityId: string, search: string) =>
      ["patients", facilityId, { search }] as const,
  },
} as const;

const facilityScopedRoots = new Set(["patients"]);

export function isFacilityScopedQueryKey(
  queryKey: readonly unknown[],
  facilityId: string,
) {
  return (
    typeof queryKey[0] === "string" &&
    facilityScopedRoots.has(queryKey[0]) &&
    queryKey[1] === facilityId
  );
}
