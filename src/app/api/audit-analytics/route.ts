import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/backend/queue/redis";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

type AggregateMap = Record<string, number>;

export async function GET(req: NextRequest) {
  const error = requireAccess(req, {
    permission: "audit:read",
  });

  if (error) {
    return error;
  }

  try {
    const tenantId = req.headers.get("x-tenant-id")!;
    const date =
      new URL(req.url).searchParams.get("date") ||
      new Date().toISOString().slice(0, 10);

    const redisData = await fetchFromRedis(tenantId, date);
    if (redisData) {
      return NextResponse.json({
        success: true,
        data: {
          users: mapToSorted(redisData.users),
          actions: mapToSorted(redisData.actions),
          resources: mapToSorted(redisData.resources),
          facilities: mapToSorted(redisData.facilities),
          total: redisData.total,
        },
      });
    }

    const prisma = await getTenantPrisma(tenantId);
    const rollup = await prisma.auditDailyAggregate.findUnique({
      where: {
        tenantId_date: {
          tenantId,
          date,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        users: mapToSorted(asAggregateMap(rollup?.users)),
        actions: mapToSorted(asAggregateMap(rollup?.actions)),
        resources: mapToSorted(asAggregateMap(rollup?.resources)),
        facilities: mapToSorted(asAggregateMap(rollup?.facilities)),
        total: rollup?.total ?? 0,
      },
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}

async function fetchFromRedis(tenantId: string, date: string) {
  const base = `audit:${tenantId}:${date}`;

  try {
    const [users, actions, resources, facilities, total] = await Promise.all([
      redis.hgetall(`${base}:users`),
      redis.hgetall(`${base}:actions`),
      redis.hgetall(`${base}:resources`),
      redis.hgetall(`${base}:facilities`),
      redis.get(`${base}:total`),
    ]);

    if (!total) {
      return null;
    }

    return {
      users: normalizeMap(users),
      actions: normalizeMap(actions),
      resources: normalizeMap(resources),
      facilities: normalizeMap(facilities),
      total: Number(total || 0),
    };
  } catch (error) {
    console.error("Audit analytics Redis fetch failed:", error);
    return null;
  }
}

function normalizeMap(obj: Record<string, string>): AggregateMap {
  return Object.entries(obj).reduce<AggregateMap>((acc, [key, value]) => {
    const count = Number(value);
    if (!Number.isNaN(count)) {
      acc[key] = count;
    }
    return acc;
  }, {});
}

function asAggregateMap(value: unknown): AggregateMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<AggregateMap>(
    (acc, [key, rawValue]) => {
      const count = Number(rawValue);
      if (!Number.isNaN(count)) {
        acc[key] = count;
      }
      return acc;
    },
    {},
  );
}

function mapToSorted(obj: AggregateMap) {
  return Object.entries(obj)
    .map(([key, count]) => ({
      key,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
