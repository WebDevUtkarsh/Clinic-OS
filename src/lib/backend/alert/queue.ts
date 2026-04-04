import { Queue } from "bullmq";
import { redis } from "@/lib/backend/queue/redis";
import type { AlertPayload } from "./types";

export const alertQueue = new Queue<AlertPayload>("alert-queue", {
  connection: redis,
  prefix: "tenorix",
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 5000,
  },
});