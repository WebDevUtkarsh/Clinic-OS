import { Prisma } from "@/generated/control/client";
import { controlPrisma } from "@/lib/backend/prisma/control";
import { getRequestIp } from "@/lib/backend/security/rate-limit";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type ControlAuditInput = {
  action: string;
  req: Request;
  userId?: string | null;
  tenantId?: string | null;
  metadata?: Record<string, JsonValue>;
};

export async function logControlAuditEvent({
  action,
  req,
  userId,
  tenantId,
  metadata,
}: ControlAuditInput): Promise<void> {
  try {
    const payload = {
      ip: getRequestIp(req),
      userAgent: req.headers.get("user-agent"),
      ...metadata,
    };

    await controlPrisma.auditLog.create({
      data: {
        action,
        userId: userId ?? null,
        tenantId: tenantId ?? null,
        metadata: payload as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("Control audit logging failed:", error);
  }
}
