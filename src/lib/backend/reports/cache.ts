import { createHash } from "crypto";
import { redis } from "@/lib/backend/queue/redis";

const DEFAULT_REPORT_CACHE_TTL_SECONDS = 180;

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(([key, entryValue]) => `"${key}":${stableSerialize(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashFilters(filters: Record<string, unknown>) {
  return createHash("sha256")
    .update(stableSerialize(filters))
    .digest("hex")
    .slice(0, 16);
}

export function buildReportCacheKey(input: {
  tenantId: string;
  facilityId: string;
  type: string;
  filters: Record<string, unknown>;
}) {
  return `reports:${input.tenantId}:${input.facilityId}:${input.type}:${hashFilters(input.filters)}`;
}

export async function getCachedReport<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as T;
  } catch (error) {
    console.error("Report cache read failed:", error);
    return null;
  }
}

export async function setCachedReport<T>(
  key: string,
  value: T,
  ttlSeconds = DEFAULT_REPORT_CACHE_TTL_SECONDS,
): Promise<void> {
  try {
    await redis.set(
      key,
      JSON.stringify(value),
      "EX",
      Math.max(60, Math.min(ttlSeconds, 300)),
    );
  } catch (error) {
    console.error("Report cache write failed:", error);
  }
}

export async function invalidateFinancialReportCache(input: {
  tenantId: string;
  facilityId: string;
}): Promise<void> {
  const prefixes = [
    `reports:${input.tenantId}:${input.facilityId}:`,
    `reports:${input.tenantId}:all:`,
  ];

  try {
    for (const prefix of prefixes) {
      let cursor = "0";

      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          "MATCH",
          `${prefix}*`,
          "COUNT",
          100,
        );

        if (keys.length > 0) {
          await redis.del(...keys);
        }

        cursor = nextCursor;
      } while (cursor !== "0");
    }
  } catch (error) {
    console.error("Financial report cache invalidation failed:", error);
  }
}
