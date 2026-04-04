type PermissionSet = Set<string>;

const permissionCache = new Map<string, PermissionSet>();

function getCacheKey(tenantId: string, userId: string) {
  return `${tenantId}:${userId}`;
}

export function getCachedPermissions(
  tenantId: string,
  userId: string
): PermissionSet | null {
  const key = getCacheKey(tenantId, userId);
  return permissionCache.get(key) ?? null;
}

export function setCachedPermissions(
  tenantId: string,
  userId: string,
  permissions: string[]
) {
  const key = getCacheKey(tenantId, userId);
  permissionCache.set(key, new Set(permissions));
}

export function invalidateUserPermissions(
  tenantId: string,
  userId: string
) {
  const key = getCacheKey(tenantId, userId);
  permissionCache.delete(key);
}