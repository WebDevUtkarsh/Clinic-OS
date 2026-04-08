export const queryKeys = {
  patients: {
    list: (facilityId: string, search: string) =>
      ["patients", facilityId, { search }] as const,
  },
} as const;

const facilityScopedRoots = new Set(["patients", "session"]);

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

export function facilityQueryKey(facilityId: string | null, keyArray: unknown[]) {
  if (!facilityId) return keyArray;
  return [keyArray[0], facilityId, ...keyArray.slice(1)];
}
