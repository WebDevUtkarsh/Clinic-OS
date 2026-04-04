export type AlertSeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type AlertMetadata = Record<string, unknown>;

export type AlertPayload = {
  tenantId: string;
  userId: string;

  type: string;
  severity: AlertSeverity;
  message: string;

  metadata?: AlertMetadata;
};