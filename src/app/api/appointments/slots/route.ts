import { NextRequest, NextResponse } from "next/server";
import {
  buildAppointmentSlotsCacheKey,
  getCachedAppointmentSlots,
  setCachedAppointmentSlots,
} from "@/lib/backend/appointments/cache";
import { appointmentSlotsQuerySchema } from "@/lib/backend/appointments/schemas";
import {
  buildAppointmentQueryWindow,
  buildSessionIntervals,
  generateAvailableSlots,
  getMaxBufferWindow,
  resolveDoctorAvailabilityConfig,
} from "@/lib/backend/appointments/service";
import {
  buildUtcDayRangeForTimeZone,
  getDayOfWeekForDate,
  resolveTimeZone,
} from "@/lib/backend/appointments/timezone";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  );
}

export async function GET(req: NextRequest) {
  const accessError = requireAccess(req, {
    permission: "appointments:read",
    facilityScoped: true,
  });

  if (accessError) {
    return accessError;
  }

  const { error: facilityError, context } = await requireFacilityContext(req);
  if (facilityError) {
    return facilityError;
  }

  const url = new URL(req.url);
  const parsedQuery = appointmentSlotsQuerySchema.safeParse({
    doctorId: url.searchParams.get("doctorId"),
    date: url.searchParams.get("date"),
    timezone: url.searchParams.get("timezone"),
  });

  if (!parsedQuery.success) {
    return jsonError("Invalid query parameters", 400);
  }

  const timeZone = resolveTimeZone(parsedQuery.data.timezone);
  if (!timeZone) {
    return jsonError("Invalid timezone", 400);
  }

  const cacheKey = buildAppointmentSlotsCacheKey({
    tenantId: context.tenantId,
    doctorId: parsedQuery.data.doctorId,
    facilityId: context.facilityId,
    date: parsedQuery.data.date,
    timeZone,
  });

  const cachedSlots = await getCachedAppointmentSlots(cacheKey);
  if (cachedSlots) {
    return NextResponse.json({
      success: true,
      data: cachedSlots,
    });
  }

  try {
    const prisma = await getTenantPrisma(context.tenantId);
    const dayOfWeek = getDayOfWeekForDate(parsedQuery.data.date);
    if (dayOfWeek === null) {
      return jsonError("Invalid date", 400);
    }

    const [doctorFacility, schedules, allDoctorFacilityConfigs] =
      await Promise.all([
        prisma.doctorFacility.findFirst({
          where: {
            doctorId: parsedQuery.data.doctorId,
            facilityId: context.facilityId,
            doctor: {
              is: {
                isActive: true,
              },
            },
          },
          select: {
            facilityId: true,
            organizationId: true,
            consultationDuration: true,
            consultationStartTime: true,
            consultationEndTime: true,
            bufferBefore: true,
            bufferAfter: true,
          },
        }),
        prisma.doctorSchedule.findMany({
          where: {
            doctorId: parsedQuery.data.doctorId,
            facilityId: context.facilityId,
            dayOfWeek,
          },
          select: {
            startTime: true,
            endTime: true,
          },
          orderBy: {
            startTime: "asc",
          },
        }),
        prisma.doctorFacility.findMany({
          where: {
            doctorId: parsedQuery.data.doctorId,
          },
          select: {
            facilityId: true,
            bufferBefore: true,
            bufferAfter: true,
          },
        }),
      ]);

    if (!doctorFacility) {
      return jsonError("Doctor is not assigned to this facility", 404);
    }

    const availability = resolveDoctorAvailabilityConfig({
      facilityId: doctorFacility.facilityId,
      organizationId: doctorFacility.organizationId,
      consultationDuration: doctorFacility.consultationDuration,
      bufferBefore: doctorFacility.bufferBefore,
      bufferAfter: doctorFacility.bufferAfter,
      consultationStartTime: doctorFacility.consultationStartTime,
      consultationEndTime: doctorFacility.consultationEndTime,
      schedules,
    });

    if (!availability) {
      return jsonError("Doctor schedule is not configured for this facility", 400);
    }

    const sessionIntervals = buildSessionIntervals({
      date: parsedQuery.data.date,
      timeZone,
      sessions: availability.sessions,
    });

    if (sessionIntervals.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const dayRange = buildUtcDayRangeForTimeZone(parsedQuery.data.date, timeZone);
    if (!dayRange) {
      return jsonError("Invalid date", 400);
    }

    const maxBufferWindow = getMaxBufferWindow(
      allDoctorFacilityConfigs.map((config) => ({
        bufferBefore: config.bufferBefore,
        bufferAfter: config.bufferAfter,
      })),
    );

    const queryWindow = buildAppointmentQueryWindow({
      rangeStart: sessionIntervals[0].start,
      rangeEnd: sessionIntervals[sessionIntervals.length - 1].end,
      maxBufferBefore: maxBufferWindow.maxBufferBefore,
      maxBufferAfter: maxBufferWindow.maxBufferAfter,
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: parsedQuery.data.doctorId,
        status: "BOOKED",
        startTime: {
          lt: queryWindow.rangeEnd,
        },
        endTime: {
          gt: queryWindow.rangeStart,
        },
      },
      select: {
        id: true,
        facilityId: true,
        startTime: true,
        endTime: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const bufferConfigByFacilityId = new Map(
      allDoctorFacilityConfigs.map((config) => [
        config.facilityId,
        {
          bufferBefore: config.bufferBefore,
          bufferAfter: config.bufferAfter,
        },
      ]),
    );

    const availableSlots = generateAvailableSlots({
      date: parsedQuery.data.date,
      timeZone,
      availability,
      appointments,
      bufferConfigByFacilityId,
    });

    await setCachedAppointmentSlots(cacheKey, availableSlots);

    return NextResponse.json({
      success: true,
      data: availableSlots,
      meta: {
        date: parsedQuery.data.date,
        timezone: timeZone,
        rangeStartUtc: dayRange.start.toISOString(),
        rangeEndUtc: dayRange.end.toISOString(),
      },
    });
  } catch (error) {
    console.error("Fetch appointment slots failed:", error);
    return jsonError("Failed to fetch appointment slots", 500);
  }
}
