import {
  getCachedAuthContext,
  setCachedAuthContext,
  type CachedAuthContext,
} from "@/lib/backend/cache/auth-cache";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";

export async function buildAuthContext(
  tenantId: string,
  userId: string,
): Promise<CachedAuthContext> {
  const prisma = await getTenantPrisma(tenantId);

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: {
      roleId: true,
      facilityId: true,
    },
  });

  const roleIds = Array.from(new Set(userRoles.map((userRole) => userRole.roleId)));

  let permissions: string[] = [];

  if (roleIds.length > 0) {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        roleId: {
          in: roleIds,
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

    permissions = Array.from(
      new Set(rolePermissions.map((rolePermission) => rolePermission.permission.key)),
    );
  }

  const facilityIds = Array.from(
    new Set(
      userRoles
        .map((userRole) => userRole.facilityId)
        .filter((facilityId): facilityId is string => typeof facilityId === "string"),
    ),
  );

  return {
    permissions,
    facilityIds,
    isSuperAdmin: permissions.includes("*"),
  };
}

export async function resolveAuthContext(
  tenantId: string,
  userId: string,
): Promise<CachedAuthContext> {
  const cached = await getCachedAuthContext(tenantId, userId);
  if (cached) {
    return cached;
  }

  const context = await buildAuthContext(tenantId, userId);
  await setCachedAuthContext(tenantId, userId, context);

  return context;
}

export async function refreshAuthContext(
  tenantId: string,
  userId: string,
): Promise<CachedAuthContext> {
  const context = await buildAuthContext(tenantId, userId);
  await setCachedAuthContext(tenantId, userId, context);

  return context;
}
