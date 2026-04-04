import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { Prisma } from "@/generated/tenant/client";

export type AuditPayload = {
  userId: string;
  facilityId?: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  permissionUsed: string;
  isSuperAdmin: boolean;
  permissionsSnapshot?: string[];
  ip?: string;
  userAgent?: string;
  metaData?: Record<string, unknown>;
};

export async function writeAuditLog(
  tenantId: string,
  payload: AuditPayload,
): Promise<void> {
  const prisma = await getTenantPrisma(tenantId);

  await prisma.auditLog.create({
    data: {
      userId: payload.userId,
      facilityId: payload.facilityId ?? null,
      organizationId: payload.organizationId ?? null,
      action: payload.action,
      resource: payload.resource,
      resourceId: payload.resourceId ?? null,
      permissionUsed: payload.permissionUsed,
      isSuperAdmin: payload.isSuperAdmin,
      permissionsSnapshot: payload.permissionsSnapshot ?? [],
      ip: payload.ip ?? null,
      userAgent: payload.userAgent ?? null,
      metadata: payload.metaData
        ? (payload.metaData as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
}
