import { redis } from "@/lib/backend/queue/redis";
import { alertQueue } from "./queue";
import type { AlertPayload } from "./types";

export async function dispatchAlert(payload: AlertPayload): Promise<void> {
  try {
    const dedupeKey = `alert:dedupe:${payload.tenantId}:${payload.userId}:${payload.type}`;
    const rateKey = `alert:rate:${payload.tenantId}:${payload.userId}`;

    const exists = await redis.get(dedupeKey);
    if (exists) {
      return;
    }

    const count = await redis.incr(rateKey);

    if (count === 1) {
      await redis.expire(rateKey, 60);
    }

    if (count > 5) {
      return;
    }

    await redis.set(dedupeKey, "1", "EX", 60);
    await alertQueue.add("alert", payload);
  } catch (error) {
    console.error("Alert dispatch failed:", error);
  }
}
