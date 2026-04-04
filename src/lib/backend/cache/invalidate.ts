import {
  buildAuthCacheKey,
  clearTenantCacheIndex,
  getTenantUserIdsFromCacheIndex,
} from "@/lib/backend/cache/auth-cache";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { redis } from "@/lib/backend/queue/redis";

async function invalidateMany(tenantId: string, userIds: string[]): Promise<void> {
  const uniqueUserIds = Array.from(new Set(userIds));
  if (uniqueUserIds.length === 0) {
    return;
  }

  const keys = uniqueUserIds.map((userId) => buildAuthCacheKey(tenantId, userId));
  try {
    await redis.del(...keys);
  } catch (error) {
    console.error("Auth cache bulk invalidation failed:", error);
  }
}

export async function invalidateAuthCache(
  tenantId: string,
  userId: string
): Promise<void> {
  try {
    await redis.del(buildAuthCacheKey(tenantId, userId));
  } catch (error) {
    console.error("Auth cache invalidation failed:", error);
  }
}

export async function invalidateAuthCacheForRole(
  tenantId: string,
  roleId: string
): Promise<void> {
  const prisma = await getTenantPrisma(tenantId);
  const userRoles = await prisma.userRole.findMany({
    where: { roleId },
    select: { userId: true },
  });

  await invalidateMany(
    tenantId,
    userRoles.map((userRole) => userRole.userId)
  );
}

export async function invalidateAuthCacheForPermission(
  tenantId: string,
  permissionId: string
): Promise<void> {
  const prisma = await getTenantPrisma(tenantId);

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { permissionId },
    select: { roleId: true },
  });

  const roleIds = Array.from(
    new Set(rolePermissions.map((rolePermission) => rolePermission.roleId))
  );

  if (roleIds.length === 0) {
    return;
  }

  const userRoles = await prisma.userRole.findMany({
    where: { roleId: { in: roleIds } },
    select: { userId: true },
  });

  await invalidateMany(
    tenantId,
    userRoles.map((userRole) => userRole.userId)
  );
}

export async function invalidateTenantAuthCache(tenantId: string): Promise<void> {
  const userIds = await getTenantUserIdsFromCacheIndex(tenantId);
  await invalidateMany(tenantId, userIds);
  await clearTenantCacheIndex(tenantId);
}
