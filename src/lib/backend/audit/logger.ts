import { NextRequest } from "next/server";
import { enqueueAuditLog } from "./queue";

type AuditInput = {
  action: string;
  resource: string;
  resourceId?: string;
  permissionUsed: string;
  facilityId?: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
};

export async function auditLog(req: NextRequest, input: AuditInput): Promise<void> {
  try {
    const userId = req.headers.get("x-user-id");
    const tenantId = req.headers.get("x-tenant-id");

    if (!userId || !tenantId) {
      return;
    }

    const permissions = safeJsonParse<string[]>(req.headers.get("x-permissions"), []);
    const isSuperAdmin = req.headers.get("x-super-admin") === "true";

    await auditLogWithContext({
      tenantId,
      userId,
      facilityId: input.facilityId ?? req.headers.get("x-facility-id") ?? undefined,
      organizationId: input.organizationId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      permissionUsed: input.permissionUsed,
      isSuperAdmin,
      permissionsSnapshot: permissions,
      ip: extractIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: input.metadata,
    });
  } catch (error) {
    console.error("Audit logging failed:", error);
  }
}

type AuditContextInput = AuditInput & {
  tenantId: string;
  userId: string;
  isSuperAdmin: boolean;
  permissionsSnapshot?: string[];
  ip?: string;
  userAgent?: string;
};

export async function auditLogWithContext(
  input: AuditContextInput,
): Promise<void> {
  try {
    await enqueueAuditLog({
      tenantId: input.tenantId,
      userId: input.userId,
      facilityId: input.facilityId,
      organizationId: input.organizationId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      permissionUsed: input.permissionUsed,
      isSuperAdmin: input.isSuperAdmin,
      permissionsSnapshot: input.permissionsSnapshot ?? [],
      ip: input.ip,
      userAgent: input.userAgent,
      metaData: input.metadata,
    });
  } catch (error) {
    console.error("Audit logging failed:", error);
  }
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function extractIp(req: NextRequest): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (!forwarded) {
    return undefined;
  }

  return forwarded.split(",")[0]?.trim() || undefined;
}
