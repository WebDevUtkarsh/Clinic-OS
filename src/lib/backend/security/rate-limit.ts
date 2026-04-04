import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/backend/queue/redis";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
  message?: string;
};

export function getRequestIp(req: Request | NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip") || "unknown";
}

export async function enforceRateLimit(
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  try {
    const count = await redis.incr(options.key);

    if (count === 1) {
      await redis.expire(options.key, options.windowSeconds);
    }

    if (count > options.limit) {
      return NextResponse.json(
        {
          success: false,
          error: options.message || "Too many requests",
        },
        { status: 429 },
      );
    }
  } catch (error) {
    console.error("Rate limit check failed:", error);
  }

  return null;
}
