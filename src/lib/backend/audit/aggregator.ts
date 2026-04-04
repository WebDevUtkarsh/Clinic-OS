import { redis } from "@/lib/backend/queue/redis";

type AggregateInput = {
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  facilityId?: string;
};

function getDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function aggregateAudit(input: AggregateInput): Promise<void> {
  try {
    const date = getDateKey();
    const base = `audit:${input.tenantId}:${date}`;
    const pipeline = redis.pipeline();

    pipeline.hincrby(`${base}:users`, input.userId, 1);
    pipeline.hincrby(`${base}:actions`, input.action, 1);
    pipeline.hincrby(`${base}:resources`, input.resource, 1);

    if (input.facilityId) {
      pipeline.hincrby(`${base}:facilities`, input.facilityId, 1);
    }

    pipeline.incr(`${base}:total`);
    pipeline.expire(`${base}:users`, 60 * 60 * 24 * 7);
    pipeline.expire(`${base}:actions`, 60 * 60 * 24 * 7);
    pipeline.expire(`${base}:resources`, 60 * 60 * 24 * 7);
    pipeline.expire(`${base}:facilities`, 60 * 60 * 24 * 7);
    pipeline.expire(`${base}:total`, 60 * 60 * 24 * 7);

    await pipeline.exec();
  } catch (error) {
    console.error("Audit aggregation failed:", error);
  }
}
