import "dotenv/config";
import { Worker } from "bullmq";
import { redis } from "@/lib/backend/queue/redis";
import { writeAuditLog } from "@/lib/backend/audit/writer";
import { type AuditPayload } from "@/lib/backend/audit/queue";
import { aggregateAudit } from "@/lib/backend/audit/aggregator";
import { detectAnomaly } from "@/lib/backend/audit/anomaly";
import { dispatchAlert } from "@/lib/backend/alert/dispatcher";

new Worker<AuditPayload>(
  "audit-log",
  async (job) => {
    const data = job.data;

    await writeAuditLog(data.tenantId, {
      userId: data.userId,
      facilityId: data.facilityId,
      organizationId: data.organizationId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      permissionUsed: data.permissionUsed,
      isSuperAdmin: data.isSuperAdmin,
      permissionsSnapshot: data.permissionsSnapshot,
      ip: data.ip,
      userAgent: data.userAgent,
    });

    await aggregateAudit({
      tenantId: data.tenantId,
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      facilityId: data.facilityId,
    });

    const anomaly = await detectAnomaly({
      tenantId: data.tenantId,
      userId: data.userId,
      action: data.action,
      resource: data.resource,
    });

    if (anomaly) {
      console.warn("AUDIT ANOMALY DETECTED:", anomaly);

      await dispatchAlert({
        tenantId: data.tenantId,
        userId: data.userId,
        type: anomaly.type,
        severity: anomaly.severity,
        message: anomaly.message,
        metadata: {
          action: data.action,
          resource: data.resource,
          organizationId: data.organizationId,
          facilityId: data.facilityId,
        },
      });
    }
  },
  {
    connection: redis,
    prefix: "tenorix",
    concurrency: 20,
    limiter: {
      max: 5000,
      duration: 1000,
    },
  },
);
