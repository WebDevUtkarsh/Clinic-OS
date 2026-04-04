import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import type { AlertPayload } from "@/lib/backend/alert/types";

function getRiskWeight(severity: string): number {
  switch (severity) {
    case "CRITICAL": return 50;
    case "HIGH": return 25;
    case "MEDIUM": return 10;
    default: return 5;
  }
}

export async function evaluateRisk(alert: AlertPayload) {
  try {
    const prisma = await getTenantPrisma(alert.tenantId);

    const increment = getRiskWeight(alert.severity);

    await prisma.userRiskScore.upsert({
      where: { userId: alert.userId },
      update: {
        score: { increment },
      },
      create: {
        userId: alert.userId,
        score: increment,
      },
    });
  } catch (err) {
    console.error("Risk evaluation failed:", err);
  }
}