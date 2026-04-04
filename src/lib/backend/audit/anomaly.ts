import { redis } from "@/lib/backend/queue/redis";
import type { AlertSeverity } from "@/lib/backend/alert/types";

type AnomalyInput = {
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
};

type Anomaly = {
  type: string;
  severity: AlertSeverity;
  message: string;
  count: number;
};

const WINDOW_SECONDS = 60;

function normalizeAction(action: string): string {
  return action.trim().toUpperCase();
}

export async function detectAnomaly(
  input: AnomalyInput
): Promise<Anomaly | null> {
  try {
    const action = normalizeAction(input.action);

    // 🔐 Scoped key (tenant-safe + normalized)
    const key = `anomaly:${input.tenantId}:${input.userId}:${action}`;

    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    // 🚨 RULE 1: Burst activity
    if (count > 100) {
      return {
        type: "BURST_ACTIVITY",
        severity: "HIGH",
        message: `${action} spike detected`,
        count,
      };
    }

    // 🚨 RULE 2: Sensitive action abuse
    if (action === "DELETE" && count > 20) {
      return {
        type: "SENSITIVE_ACTION_ABUSE",
        severity: "CRITICAL",
        message: "Excessive DELETE operations detected",
        count,
      };
    }

    // 🚨 RULE 3: Rapid resource access (optional but powerful)
    if (action === "READ" && count > 200) {
      return {
        type: "DATA_ACCESS_SPIKE",
        severity: "MEDIUM",
        message: "Unusual volume of data access",
        count,
      };
    }

    return null;
  } catch (err) {
    console.error("Anomaly detection failed:", err);

    // 🔒 Fail-safe: never break audit pipeline
    return null;
  }
}