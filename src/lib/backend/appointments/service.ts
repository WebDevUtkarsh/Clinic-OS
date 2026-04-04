import { Prisma } from "@/generated/tenant/client";
import type {
  AppointmentResponse,
  AppointmentSlotResponse,
} from "@/lib/backend/appointments/types";
import {
  buildUtcDayRangeForTimeZone,
  formatUtcDateForTimeZone,
  formatUtcToTimeZoneIso,
  parseClientDateTimeToUtc,
} from "@/lib/backend/appointments/timezone";

type DoctorSession = {
  startTime: string;
  endTime: string;
};

type SessionInterval = {
  start: Date;
  end: Date;
};

type BufferConfig = {
  bufferBefore: number;
  bufferAfter: number;
};

type AppointmentInterval = {
  id: string;
  facilityId: string;
  startTime: Date;
  endTime: Date;
};

export type DoctorAvailabilityConfig = {
  facilityId: string;
  organizationId: string;
  consultationDuration: number;
  bufferBefore: number;
  bufferAfter: number;
  sessions: DoctorSession[];
};

export const appointmentSelect = {
  id: true,
  patientId: true,
  doctorId: true,
  facilityId: true,
  startTime: true,
  endTime: true,
  status: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      name: true,
    },
  },
  doctor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.AppointmentSelect;

export function serializeAppointment(appointment: {
  id: string;
  patientId: string;
  doctorId: string;
  facilityId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentResponse["status"];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: string;
    name: string;
  };
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
  };
}): AppointmentResponse {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    facilityId: appointment.facilityId,
    startTime: appointment.startTime.toISOString(),
    endTime: appointment.endTime.toISOString(),
    status: appointment.status,
    createdBy: appointment.createdBy,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    patient: appointment.patient,
    doctor: appointment.doctor,
  };
}

export function buildUtcDayRange(date: string) {
  return buildUtcDayRangeForTimeZone(date, "UTC");
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function subtractMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() - minutes * 60 * 1000);
}

export function overlaps(
  left: { startTime: Date; endTime: Date },
  right: { startTime: Date; endTime: Date },
) {
  return left.startTime < right.endTime && left.endTime > right.startTime;
}

export function resolveDoctorAvailabilityConfig(input: {
  facilityId: string;
  organizationId: string;
  consultationDuration: number | null;
  bufferBefore: number | null;
  bufferAfter: number | null;
  consultationStartTime: string | null;
  consultationEndTime: string | null;
  schedules: DoctorSession[];
}): DoctorAvailabilityConfig | null {
  if (!input.consultationDuration || input.consultationDuration <= 0) {
    return null;
  }

  const sessions = normalizeDoctorSessions({
    schedules: input.schedules,
    legacyStartTime: input.consultationStartTime,
    legacyEndTime: input.consultationEndTime,
  });

  if (sessions.length === 0) {
    return null;
  }

  return {
    facilityId: input.facilityId,
    organizationId: input.organizationId,
    consultationDuration: input.consultationDuration,
    bufferBefore: input.bufferBefore ?? 0,
    bufferAfter: input.bufferAfter ?? 0,
    sessions,
  };
}

export function buildSessionIntervals(input: {
  date: string;
  timeZone: string;
  sessions: DoctorSession[];
}): SessionInterval[] {
  return input.sessions
    .map((session) => {
      const start = parseLocalSessionDateTime(
        input.date,
        session.startTime,
        input.timeZone,
      );
      const end = parseLocalSessionDateTime(
        input.date,
        session.endTime,
        input.timeZone,
      );

      if (!start || !end || start >= end) {
        return null;
      }

      return { start, end };
    })
    .filter((session): session is SessionInterval => Boolean(session))
    .sort((left, right) => left.start.getTime() - right.start.getTime());
}

export function isAppointmentStartAllowed(input: {
  appointmentStartUtc: Date;
  availability: DoctorAvailabilityConfig;
  timeZone: string;
}): boolean {
  const localDate = formatUtcDateForTimeZone(
    input.appointmentStartUtc,
    input.timeZone,
  );
  const sessions = buildSessionIntervals({
    date: localDate,
    timeZone: input.timeZone,
    sessions: input.availability.sessions,
  });

  const blockedDuration =
    input.availability.bufferBefore +
    input.availability.consultationDuration +
    input.availability.bufferAfter;
  const consultationEnd = addMinutes(
    input.appointmentStartUtc,
    input.availability.consultationDuration,
  );
  const blockedStart = subtractMinutes(
    input.appointmentStartUtc,
    input.availability.bufferBefore,
  );
  const blockedEnd = addMinutes(consultationEnd, input.availability.bufferAfter);

  for (const session of sessions) {
    if (blockedStart < session.start || blockedEnd > session.end) {
      continue;
    }

    const minutesFromSessionStart =
      (blockedStart.getTime() - session.start.getTime()) / (60 * 1000);

    if (Number.isInteger(minutesFromSessionStart / blockedDuration)) {
      return true;
    }
  }

  return false;
}

export function buildAppointmentBlockedInterval(input: {
  appointmentStartUtc: Date;
  appointmentEndUtc: Date;
  bufferBefore: number;
  bufferAfter: number;
}) {
  return {
    startTime: subtractMinutes(input.appointmentStartUtc, input.bufferBefore),
    endTime: addMinutes(input.appointmentEndUtc, input.bufferAfter),
  };
}

export function buildAppointmentQueryWindow(input: {
  rangeStart: Date;
  rangeEnd: Date;
  maxBufferBefore: number;
  maxBufferAfter: number;
}) {
  return {
    rangeStart: subtractMinutes(input.rangeStart, input.maxBufferAfter),
    rangeEnd: addMinutes(input.rangeEnd, input.maxBufferBefore),
  };
}

export function getMaxBufferWindow(configs: BufferConfig[]) {
  return configs.reduce(
    (accumulator, config) => ({
      maxBufferBefore: Math.max(accumulator.maxBufferBefore, config.bufferBefore),
      maxBufferAfter: Math.max(accumulator.maxBufferAfter, config.bufferAfter),
    }),
    { maxBufferBefore: 0, maxBufferAfter: 0 },
  );
}

export function findBlockingAppointment(input: {
  candidateStartUtc: Date;
  consultationDuration: number;
  candidateBufferBefore: number;
  candidateBufferAfter: number;
  appointments: AppointmentInterval[];
  bufferConfigByFacilityId: Map<string, BufferConfig>;
}): AppointmentInterval | null {
  const candidateEndUtc = addMinutes(
    input.candidateStartUtc,
    input.consultationDuration,
  );
  const candidateBlocked = buildAppointmentBlockedInterval({
    appointmentStartUtc: input.candidateStartUtc,
    appointmentEndUtc: candidateEndUtc,
    bufferBefore: input.candidateBufferBefore,
    bufferAfter: input.candidateBufferAfter,
  });

  for (const appointment of input.appointments) {
    const config = input.bufferConfigByFacilityId.get(appointment.facilityId) ?? {
      bufferBefore: 0,
      bufferAfter: 0,
    };

    const existingBlocked = buildAppointmentBlockedInterval({
      appointmentStartUtc: appointment.startTime,
      appointmentEndUtc: appointment.endTime,
      bufferBefore: config.bufferBefore,
      bufferAfter: config.bufferAfter,
    });

    if (overlaps(candidateBlocked, existingBlocked)) {
      return appointment;
    }
  }

  return null;
}

export function generateAvailableSlots(input: {
  date: string;
  timeZone: string;
  availability: DoctorAvailabilityConfig;
  appointments: AppointmentInterval[];
  bufferConfigByFacilityId: Map<string, BufferConfig>;
}): AppointmentSlotResponse[] {
  const sessionIntervals = buildSessionIntervals({
    date: input.date,
    timeZone: input.timeZone,
    sessions: input.availability.sessions,
  });

  const slots: AppointmentSlotResponse[] = [];
  const blockedDuration =
    input.availability.bufferBefore +
    input.availability.consultationDuration +
    input.availability.bufferAfter;

  for (const session of sessionIntervals) {
    const blockedAppointments = input.appointments
      .map((appointment) => {
        const config =
          input.bufferConfigByFacilityId.get(appointment.facilityId) ?? {
            bufferBefore: 0,
            bufferAfter: 0,
          };

        return clampIntervalToSession(
          session,
          buildAppointmentBlockedInterval({
            appointmentStartUtc: appointment.startTime,
            appointmentEndUtc: appointment.endTime,
            bufferBefore: config.bufferBefore,
            bufferAfter: config.bufferAfter,
          }),
        );
      })
      .filter((interval): interval is SessionInterval => Boolean(interval));

    const mergedBusyIntervals = mergeIntervals(blockedAppointments);
    let cursor = new Date(session.start.getTime());

    for (const busy of mergedBusyIntervals) {
      cursor = fillAvailableSlotsUntil({
        cursor,
        limit: busy.start,
        blockedDuration,
        consultationDuration: input.availability.consultationDuration,
        bufferBefore: input.availability.bufferBefore,
        timeZone: input.timeZone,
        slots,
      });

      if (busy.end > cursor) {
        cursor = new Date(busy.end.getTime());
      }
    }

    fillAvailableSlotsUntil({
      cursor,
      limit: session.end,
      blockedDuration,
      consultationDuration: input.availability.consultationDuration,
      bufferBefore: input.availability.bufferBefore,
      timeZone: input.timeZone,
      slots,
    });
  }

  return slots;
}

function normalizeDoctorSessions(input: {
  schedules: DoctorSession[];
  legacyStartTime: string | null;
  legacyEndTime: string | null;
}) {
  const sourceSessions =
    input.schedules.length > 0
      ? input.schedules
      : input.legacyStartTime && input.legacyEndTime
        ? [
            {
              startTime: input.legacyStartTime,
              endTime: input.legacyEndTime,
            },
          ]
        : [];

  return sourceSessions
    .filter(
      (session) =>
        isValidTimeValue(session.startTime) &&
        isValidTimeValue(session.endTime) &&
        session.startTime < session.endTime,
    )
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
}

function parseLocalSessionDateTime(
  date: string,
  time: string,
  timeZone: string,
) {
  return parseClientDateTimeToUtc(`${date}T${time}:00`, timeZone);
}

function clampIntervalToSession(
  session: SessionInterval,
  interval: { startTime: Date; endTime: Date },
): SessionInterval | null {
  const start = interval.startTime > session.start ? interval.startTime : session.start;
  const end = interval.endTime < session.end ? interval.endTime : session.end;

  if (start >= end) {
    return null;
  }

  return { start, end };
}

function mergeIntervals(intervals: SessionInterval[]) {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = [...intervals].sort(
    (left, right) => left.start.getTime() - right.start.getTime(),
  );
  const merged: SessionInterval[] = [sorted[0]];

  for (const interval of sorted.slice(1)) {
    const previous = merged[merged.length - 1];

    if (interval.start <= previous.end) {
      previous.end =
        interval.end > previous.end ? interval.end : previous.end;
      continue;
    }

    merged.push({ ...interval });
  }

  return merged;
}

function fillAvailableSlotsUntil(input: {
  cursor: Date;
  limit: Date;
  blockedDuration: number;
  consultationDuration: number;
  bufferBefore: number;
  timeZone: string;
  slots: AppointmentSlotResponse[];
}) {
  let cursor = new Date(input.cursor.getTime());

  while (addMinutes(cursor, input.blockedDuration) <= input.limit) {
    const consultationStart = addMinutes(cursor, input.bufferBefore);
    const consultationEnd = addMinutes(
      consultationStart,
      input.consultationDuration,
    );

    input.slots.push({
      startTime: formatUtcToTimeZoneIso(consultationStart, input.timeZone),
      endTime: formatUtcToTimeZoneIso(consultationEnd, input.timeZone),
    });

    cursor = addMinutes(cursor, input.blockedDuration);
  }

  return cursor;
}

function isValidTimeValue(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}
