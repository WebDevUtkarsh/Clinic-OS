import "dotenv/config";
import { Worker } from "bullmq";
import { redis } from "@/lib/backend/queue/redis";
import { AlertPayload } from "@/lib/backend/alert/types";
import { sendSlackAlert } from "@/lib/backend/alert/providers/slack";
import { persistAlert } from "@/lib/backend/alert/writer";
import { evaluateRisk } from "@/lib/backend/risk/engine";
import { updateBehaviorProfile } from "@/lib/backend/behavior/profile";
import { sendEmailAlert } from "@/lib/backend/alert/providers/email";
import { sendWebhookAlert } from "@/lib/backend/alert/providers/webhook";

new Worker<AlertPayload>(
  "alert-queue",
  async (job) => {
    const alert = job.data;

    await persistAlert(alert);

    await Promise.all([evaluateRisk(alert), updateBehaviorProfile(alert)]);

    await Promise.all([
      sendSlackAlert(alert),
      sendEmailAlert(alert),
      sendWebhookAlert(alert),
    ]);
  },
  {
    connection: redis,
    concurrency: 10,
    prefix: "tenorix",
  },
);
