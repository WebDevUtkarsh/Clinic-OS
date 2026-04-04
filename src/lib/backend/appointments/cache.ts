import { redis } from "@/lib/backend/queue/redis";
import type { AppointmentSlotResponse } from "@/lib/backend/appointments/types";

const SLOT_CACHE_TTL_SECONDS = 60;

export function buildAppointmentSlotsCacheKey(input: {
  tenantId: string;
  doctorId: string;
  facilityId: string;
  date: string;
  timeZone: string;
}) {
  return [
    "appointments:slots",
    input.tenantId,
    input.doctorId,
    input.facilityId,
    input.date,
    input.timeZone,
  ].join(":");
}

export async function getCachedAppointmentSlots(key: string) {
  try {
    const cached = await redis.get(key);
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter(isAppointmentSlotResponse);
  } catch (error) {
    console.error("Appointment slot cache read failed:", error);
    return null;
  }
}

export async function setCachedAppointmentSlots(
  key: string,
  slots: AppointmentSlotResponse[],
) {
  try {
    await redis.set(key, JSON.stringify(slots), "EX", SLOT_CACHE_TTL_SECONDS);
  } catch (error) {
    console.error("Appointment slot cache write failed:", error);
  }
}

export async function invalidateAppointmentSlotsCache(input: {
  tenantId: string;
  doctorId: string;
  facilityId: string;
}) {
  const prefix = [
    "appointments:slots",
    input.tenantId,
    input.doctorId,
    input.facilityId,
  ].join(":");

  try {
    let cursor = "0";

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${prefix}:*`,
        "COUNT",
        100,
      );

      if (keys.length > 0) {
        await redis.del(...keys);
      }

      cursor = nextCursor;
    } while (cursor !== "0");
  } catch (error) {
    console.error("Appointment slot cache invalidation failed:", error);
  }
}

function isAppointmentSlotResponse(
  value: unknown,
): value is AppointmentSlotResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.startTime === "string" &&
    typeof candidate.endTime === "string"
  );
}
