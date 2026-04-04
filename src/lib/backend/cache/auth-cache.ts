import { redis } from "@/lib/backend/queue/redis";

export type CachedAuthContext = {
  permissions: string[];
  facilityIds: string[];
  isSuperAdmin: boolean;
};

export const AUTH_CACHE_TTL_SECONDS = 300;

function buildTenantUsersSetKey(tenantId: string): string {
  return `tenant_users:${tenantId}`;
}

export function buildAuthCacheKey(tenantId: string, userId: string): string {
  return `auth:${tenantId}:${userId}`;
}

export async function getTenantUserIdsFromCacheIndex(
  tenantId: string
): Promise<string[]> {
  try {
    return await redis.smembers(buildTenantUsersSetKey(tenantId));
  } catch (error) {
    console.error("Auth cache tenant index read failed:", error);
    return [];
  }
}

export async function getCachedAuthContext(
  tenantId: string,
  userId: string
): Promise<CachedAuthContext | null> {
  let raw: string | null = null;

  try {
    raw = await redis.get(buildAuthCacheKey(tenantId, userId));
  } catch (error) {
    console.error("Auth cache read failed:", error);
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedAuthContext;

    if (
      !Array.isArray(parsed.permissions) ||
      !Array.isArray(parsed.facilityIds) ||
      typeof parsed.isSuperAdmin !== "boolean"
    ) {
      try {
        await redis.del(buildAuthCacheKey(tenantId, userId));
      } catch (error) {
        console.error("Auth cache invalidation failed:", error);
      }
      return null;
    }

    return parsed;
  } catch {
    try {
      await redis.del(buildAuthCacheKey(tenantId, userId));
    } catch (error) {
      console.error("Auth cache cleanup failed:", error);
    }
    return null;
  }
}

export async function setCachedAuthContext(
  tenantId: string,
  userId: string,
  value: CachedAuthContext
): Promise<void> {
  try {
    await redis
      .multi()
      .set(
        buildAuthCacheKey(tenantId, userId),
        JSON.stringify(value),
        "EX",
        AUTH_CACHE_TTL_SECONDS
      )
      .sadd(buildTenantUsersSetKey(tenantId), userId)
      .exec();
  } catch (error) {
    console.error("Auth cache write failed:", error);
  }
}

export async function clearTenantCacheIndex(tenantId: string): Promise<void> {
  try {
    await redis.del(buildTenantUsersSetKey(tenantId));
  } catch (error) {
    console.error("Auth cache tenant index clear failed:", error);
  }
}
