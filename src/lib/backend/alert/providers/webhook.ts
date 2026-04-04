import axios from "axios";
import { controlPrisma } from "@/lib/backend/prisma/control";
import type { AlertPayload } from "../types";

export async function sendWebhookAlert(alert: AlertPayload) {
  try {
    const hooks = await controlPrisma.alertWebhook.findMany({
      where: {
        tenantId: alert.tenantId,
        isActive: true,
      },
    });

    await Promise.all(
      hooks.map((hook) =>
        axios.post(hook.url, {
          event: "audit.alert",
          data: alert,
        })
      )
    );
  } catch (err) {
    console.error("Webhook alert failed:", err);
  }
}