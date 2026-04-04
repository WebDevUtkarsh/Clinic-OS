import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import type { AlertPayload } from "@/lib/backend/alert/types";

export async function updateBehaviorProfile(alert: AlertPayload) {
  try {
    const prisma = await getTenantPrisma(alert.tenantId);

    await prisma.userBehaviorProfile.upsert({
      where: { userId: alert.userId },
      update: {
        avgActionsPerMinute: {
          increment: 1, // simplified baseline
        },
      },
      create: {
        userId: alert.userId,
        avgActionsPerMinute: 1,
      },
    });
  } catch (err) {
    console.error("Behavior update failed:", err);
  }
}