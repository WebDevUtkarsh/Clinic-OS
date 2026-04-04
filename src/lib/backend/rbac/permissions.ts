import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import {
  getCachedPermissions,
  setCachedPermissions,
} from "./cache";

export async function hasPermission(
  tenantId: string,
  userId: string,
  permissionKey: string
): Promise<boolean> {
  // 1. Try cache first
  const cached = getCachedPermissions(tenantId, userId);
  if (cached) {
    return cached.has(permissionKey);
  }

  // 2. Load from DB (single optimized query)
  const prisma = await getTenantPrisma(tenantId);

  const permissions = await prisma.rolePermission.findMany({
    where: {
      role: {
        userRoles: {
          some: {
            userId,
          },
        },
      },
    },
    select: {
      permission: {
        select: {
          key: true,
        },
      },
    },
  });

  const permissionKeys = permissions.map((p) => p.permission.key);

  // 3. Cache result
  setCachedPermissions(tenantId, userId, permissionKeys);

  // 4. Check permission
  return permissionKeys.includes(permissionKey);
}