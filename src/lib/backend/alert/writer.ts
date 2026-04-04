import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import type { AlertPayload } from "./types";
import { Prisma } from "@/generated/tenant/client";

export async function persistAlert(payload: AlertPayload) {
  try {
    const prisma = await getTenantPrisma(payload.tenantId);

    await prisma.auditAlert.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        severity: payload.severity,
        message: payload.message,
        metadata: payload.metadata
          ? (payload.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error("Persist alert failed:", err);
  }
}
