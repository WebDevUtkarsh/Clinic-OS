import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/tenant/client";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  invalidateAppointmentSlotsCache,
} from "@/lib/backend/appointments/cache";
import {
  appointmentSelect,
  addMinutes,
  buildAppointmentQueryWindow,
  findBlockingAppointment,
  getMaxBufferWindow,
  isAppointmentStartAllowed,
  resolveDoctorAvailabilityConfig,
  serializeAppointment,
} from "@/lib/backend/appointments/service";
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
} from "@/lib/backend/appointments/schemas";
import {
  parseClientDateTimeToUtc,
  resolveTimeZone,
  buildUtcDayRangeForTimeZone,
  formatUtcDateForTimeZone,
} from "@/lib/backend/appointments/timezone";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

type DoctorFacilityBufferConfig = {
  facilityId: string;
  bufferBefore: number;
  bufferAfter: number;
};

function jsonError(
  message: string,
  status: number,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

const APPOINTMENT_CREATE_RETRIES = 3;

export async function POST(req: NextRequest) {
  const accessError = requireAccess(req, {
    permission: "appointments:create",
    facilityScoped: true,
  });

  if (accessError) {
    return accessError;
  }

  const { error: facilityError, context } = await requireFacilityContext(req);
  if (facilityError) {
    return facilityError;
  }

  const createdBy = req.headers.get("x-user-id");
  if (!createdBy) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const parsed = createAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid input", 400, {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const timeZone = resolveTimeZone(parsed.data.timezone);
    if (!timeZone) {
      return jsonError("Invalid timezone", 400);
    }

    const startTimeUtc = parseClientDateTimeToUtc(
      parsed.data.startTime,
      timeZone,
    );

    if (!startTimeUtc) {
      return jsonError("Invalid appointment start time", 400);
    }

    const prisma = await getTenantPrisma(context.tenantId);
    const localDate = formatUtcDateForTimeZone(startTimeUtc, timeZone);
    const precheck = await loadBookingContext(prisma, {
      doctorId: parsed.data.doctorId,
      facilityId: context.facilityId,
      patientId: parsed.data.patientId,
      localDate,
      timeZone,
      requirePatient: true,
      rangeStart: startTimeUtc,
    });

    if (precheck.error) {
      const response = handleBookingError(precheck.error);
      if (response) {
        return response;
      }

      return jsonError("Failed to create appointment", 500);
    }

    if (
      !isAppointmentStartAllowed({
        appointmentStartUtc: startTimeUtc,
        availability: precheck.availability,
        timeZone,
      })
    ) {
      return jsonError("Appointment time is outside the configured slot window", 400);
    }

    const precheckConflict = findBlockingAppointment({
      candidateStartUtc: startTimeUtc,
      consultationDuration: precheck.availability.consultationDuration,
      candidateBufferBefore: precheck.availability.bufferBefore,
      candidateBufferAfter: precheck.availability.bufferAfter,
      appointments: precheck.appointments,
      bufferConfigByFacilityId: precheck.bufferConfigByFacilityId,
    });

    if (precheckConflict) {
      await logAppointmentConflict(req, context, {
        doctorId: parsed.data.doctorId,
        patientId: parsed.data.patientId,
        startTimeUtc,
        reason: "PRECHECK_OVERLAP",
      });

      return jsonError("Slot already booked", 409);
    }

    for (let attempt = 0; attempt < APPOINTMENT_CREATE_RETRIES; attempt += 1) {
      try {
        const appointment = await prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw`
              SELECT pg_advisory_xact_lock(hashtext(${parsed.data.doctorId}), 0)
            `;

            const bookingContext = await loadBookingContext(tx, {
              doctorId: parsed.data.doctorId,
              facilityId: context.facilityId,
              patientId: parsed.data.patientId,
              localDate,
              timeZone,
              requirePatient: true,
              rangeStart: startTimeUtc,
            });

            if (bookingContext.error) {
              throw new Error(bookingContext.error);
            }

            if (
              !isAppointmentStartAllowed({
                appointmentStartUtc: startTimeUtc,
                availability: bookingContext.availability,
                timeZone,
              })
            ) {
              throw new Error("INVALID_SLOT");
            }

            const afterLockConflict = findBlockingAppointment({
              candidateStartUtc: startTimeUtc,
              consultationDuration: bookingContext.availability.consultationDuration,
              candidateBufferBefore: bookingContext.availability.bufferBefore,
              candidateBufferAfter: bookingContext.availability.bufferAfter,
              appointments: bookingContext.appointments,
              bufferConfigByFacilityId: bookingContext.bufferConfigByFacilityId,
            });

            if (afterLockConflict) {
              throw new Error("SLOT_ALREADY_BOOKED");
            }

            const endTimeUtc = addMinutes(
              startTimeUtc,
              bookingContext.availability.consultationDuration,
            );

            return tx.appointment.create({
              data: {
                patientId: parsed.data.patientId,
                doctorId: parsed.data.doctorId,
                facilityId: context.facilityId,
                startTime: startTimeUtc,
                endTime: endTimeUtc,
                status: "BOOKED",
                createdBy,
              },
              select: appointmentSelect,
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );

        await invalidateAppointmentSlotsCache({
          tenantId: context.tenantId,
          doctorId: appointment.doctorId,
          facilityId: context.facilityId,
        });

        await auditLog(req, {
          action: "appointments:create",
          resource: "Appointment",
          resourceId: appointment.id,
          permissionUsed: "appointments:create",
          facilityId: context.facilityId,
          organizationId: context.organizationId,
          metadata: {
            doctorId: appointment.doctorId,
            patientId: appointment.patientId,
            startTime: appointment.startTime.toISOString(),
            endTime: appointment.endTime.toISOString(),
            timezone: timeZone,
          },
        });

        return NextResponse.json({
          success: true,
          data: serializeAppointment(appointment),
        });
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message === "SLOT_ALREADY_BOOKED" ||
            error.message === "INVALID_SLOT"
          ) {
            if (error.message === "SLOT_ALREADY_BOOKED") {
              await logAppointmentConflict(req, context, {
                doctorId: parsed.data.doctorId,
                patientId: parsed.data.patientId,
                startTimeUtc,
                reason: "POST_LOCK_OVERLAP",
              });

              return jsonError("Slot already booked", 409);
            }

            return jsonError("Appointment time is outside the configured slot window", 400);
          }

          const handled = handleBookingError(error.message);
          if (handled) {
            return handled;
          }
        }

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < APPOINTMENT_CREATE_RETRIES - 1
        ) {
          continue;
        }

        throw error;
      }
    }

    return jsonError("Slot already booked", 409);
  } catch (error) {
    console.error("Create appointment failed:", error);
    return jsonError("Failed to create appointment", 500);
  }
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
  const parsedQuery = listAppointmentsQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    date: url.searchParams.get("date") ?? undefined,
    doctorId: url.searchParams.get("doctorId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    timezone: url.searchParams.get("timezone") ?? undefined,
  });

  if (!parsedQuery.success) {
    return jsonError("Invalid query parameters", 400, {
      fields: parsedQuery.error.flatten().fieldErrors,
    });
  }

  const timeZone = resolveTimeZone(parsedQuery.data.timezone);
  if (!timeZone) {
    return jsonError("Invalid timezone", 400);
  }

  try {
    const prisma = await getTenantPrisma(context.tenantId);
    const where: Prisma.AppointmentWhereInput = {
      facilityId: context.facilityId,
      ...(parsedQuery.data.doctorId
        ? { doctorId: parsedQuery.data.doctorId }
        : {}),
      ...(parsedQuery.data.status
        ? { status: parsedQuery.data.status }
        : {}),
    };

    if (parsedQuery.data.date) {
      const dayRange = buildUtcDayRangeForTimeZone(
        parsedQuery.data.date,
        timeZone,
      );

      if (!dayRange) {
        return jsonError("Invalid date", 400);
      }

      where.startTime = {
        gte: dayRange.start,
        lt: dayRange.end,
      };
    }

    const skip = (parsedQuery.data.page - 1) * parsedQuery.data.pageSize;
    const [total, appointments] = await prisma.$transaction([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        orderBy: [{ startTime: "asc" }, { id: "asc" }],
        skip,
        take: parsedQuery.data.pageSize,
        select: appointmentSelect,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: appointments.map(serializeAppointment),
      pagination: {
        page: parsedQuery.data.page,
        pageSize: parsedQuery.data.pageSize,
        total,
        totalPages: Math.ceil(total / parsedQuery.data.pageSize),
      },
    });
  } catch (error) {
    console.error("Fetch appointments failed:", error);
    return jsonError("Failed to fetch appointments", 500);
  }
}

async function loadBookingContext(
  prisma: Prisma.TransactionClient | Awaited<ReturnType<typeof getTenantPrisma>>,
  input: {
    doctorId: string;
    facilityId: string;
    patientId: string;
    localDate: string;
    timeZone: string;
    requirePatient: boolean;
    rangeStart: Date;
  },
) {
  const dayOfWeek = getLocalDayOfWeek(input.localDate);
  if (dayOfWeek === null) {
    return { error: "INVALID_DATE" as const };
  }

  const [patient, doctorFacility, schedules, allDoctorFacilityConfigs] =
    await Promise.all([
      input.requirePatient
        ? prisma.patient.findFirst({
            where: {
              id: input.patientId,
              facilityId: input.facilityId,
              isDeleted: false,
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve({ id: input.patientId }),
      prisma.doctorFacility.findFirst({
        where: {
          doctorId: input.doctorId,
          facilityId: input.facilityId,
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
          doctorId: input.doctorId,
          facilityId: input.facilityId,
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
          doctorId: input.doctorId,
        },
        select: {
          facilityId: true,
          bufferBefore: true,
          bufferAfter: true,
        },
      }),
    ]);

  if (!patient) {
    return { error: "PATIENT_NOT_FOUND" as const };
  }

  if (!doctorFacility) {
    return { error: "DOCTOR_NOT_FOUND" as const };
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
    return { error: "DOCTOR_SCHEDULE_NOT_CONFIGURED" as const };
  }

  const bufferConfigByFacilityId = new Map(
    allDoctorFacilityConfigs.map((config) => [
      config.facilityId,
      {
        bufferBefore: config.bufferBefore,
        bufferAfter: config.bufferAfter,
      },
    ]),
  );

  const maxBufferWindow = getMaxBufferWindow(
    allDoctorFacilityConfigs.map((config) => ({
      bufferBefore: config.bufferBefore,
      bufferAfter: config.bufferAfter,
    })),
  );

  const queryWindow = buildAppointmentQueryWindow({
    rangeStart: input.rangeStart,
    rangeEnd: addMinutes(input.rangeStart, availability.consultationDuration),
    maxBufferBefore: maxBufferWindow.maxBufferBefore,
    maxBufferAfter: maxBufferWindow.maxBufferAfter,
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: input.doctorId,
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

  return {
    error: null,
    availability,
    appointments,
    bufferConfigByFacilityId,
  };
}

function handleBookingError(
  error: string,
): NextResponse | undefined {
  switch (error) {
    case "PATIENT_NOT_FOUND":
      return jsonError("Patient not found in this facility", 404);
    case "DOCTOR_NOT_FOUND":
      return jsonError("Doctor is not assigned to this facility", 404);
    case "DOCTOR_SCHEDULE_NOT_CONFIGURED":
      return jsonError("Doctor schedule is not configured for this facility", 400);
    case "INVALID_DATE":
      return jsonError("Invalid date", 400);
    default:
      return undefined;
  }
}

function getLocalDayOfWeek(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }

  const parsed = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0),
  );

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getUTCDay();
}

async function logAppointmentConflict(
  req: NextRequest,
  context: {
    facilityId: string;
    organizationId: string;
  },
  input: {
    doctorId: string;
    patientId: string;
    startTimeUtc: Date;
    reason: string;
  },
) {
  await auditLog(req, {
    action: "appointments:conflict",
    resource: "Appointment",
    permissionUsed: "appointments:create",
    facilityId: context.facilityId,
    organizationId: context.organizationId,
    metadata: {
      doctorId: input.doctorId,
      patientId: input.patientId,
      startTime: input.startTimeUtc.toISOString(),
      reason: input.reason,
    },
  });
}
