import { redis } from "@/lib/backend/queue/redis";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";

type AggregateMap = Record<string, string>;

type RollupData = {
  users: AggregateMap;
  actions: AggregateMap;
  resources: AggregateMap;
  facilities: AggregateMap;
  total: number;
};

/**
 * Safely converts Redis hash values (string numbers) → JSON-safe object
 */
function normalizeMap(input: AggregateMap | null): Record<string, number> {
  if (!input) return {};

  const output: Record<string, number> = {};

  for (const [key, value] of Object.entries(input)) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      output[key] = parsed;
    }
  }

  return output;
}

/**
 * Fetch aggregation data from Redis
 */
async function fetchFromRedis(
  tenantId: string,
  date: string
): Promise<RollupData | null> {
  const base = `audit:${tenantId}:${date}`;

  try {
    const [users, actions, resources, facilities, total] =
      await Promise.all([
        redis.hgetall(`${base}:users`),
        redis.hgetall(`${base}:actions`),
        redis.hgetall(`${base}:resources`),
        redis.hgetall(`${base}:facilities`),
        redis.get(`${base}:total`),
      ]);

    // 🚫 No activity → skip
    if (!total || Number(total) === 0) {
      return null;
    }

    return {
      users: users || {},
      actions: actions || {},
      resources: resources || {},
      facilities: facilities || {},
      total: Number(total),
    };
  } catch (err) {
    console.error("Redis rollup fetch failed:", err);
    return null;
  }
}

/**
 * Main rollup function
 * - Idempotent
 * - Safe for retries
 */
export async function rollupAudit(
  tenantId: string,
  date: string
): Promise<void> {
  // 🔐 Defensive: never proceed without tenant
  if (!tenantId) return;

  const data = await fetchFromRedis(tenantId, date);

  if (!data) {
    // No activity → skip write
    return;
  }

  try {
    const prisma = await getTenantPrisma(tenantId);

    await prisma.auditDailyAggregate.upsert({
      where: {
        tenantId_date: {
          tenantId,
          date,
        },
      },
      update: {
        total: data.total,
        users: normalizeMap(data.users),
        actions: normalizeMap(data.actions),
        resources: normalizeMap(data.resources),
        facilities: normalizeMap(data.facilities),
      },
      create: {
        tenantId,
        date,
        total: data.total,
        users: normalizeMap(data.users),
        actions: normalizeMap(data.actions),
        resources: normalizeMap(data.resources),
        facilities: normalizeMap(data.facilities),
      },
    });
  } catch (err) {
    console.error(
      `Audit rollup DB write failed (tenant=${tenantId}, date=${date})`,
      err
    );
  }
}