import { Queue } from "bullmq";
import { redis } from "@/lib/backend/queue/redis";
import { writeAuditLog } from "./writer";

export type AuditPayload = {
  tenantId: string;
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

export const auditQueue = new Queue<AuditPayload>("audit-log", {
  connection: redis,
  prefix: "tenorix",
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 5000,
  },
});

export async function enqueueAuditLog(payload: AuditPayload): Promise<void> {
  try {
    await auditQueue.add("audit-log", payload, {
      removeOnComplete: true,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    });
  } catch (error) {
    console.error("Audit enqueue failed:", error);

    queueMicrotask(() => {
      void writeAuditLog(payload.tenantId, {
        userId: payload.userId,
        facilityId: payload.facilityId,
        organizationId: payload.organizationId,
        action: payload.action,
        resource: payload.resource,
        resourceId: payload.resourceId,
        permissionUsed: payload.permissionUsed,
        isSuperAdmin: payload.isSuperAdmin,
        permissionsSnapshot: payload.permissionsSnapshot,
        ip: payload.ip,
        userAgent: payload.userAgent,
        metaData: payload.metaData,
      }).catch((fallbackError) => {
        console.error("Audit fallback persistence failed:", fallbackError);
      });
    });
  }
}
