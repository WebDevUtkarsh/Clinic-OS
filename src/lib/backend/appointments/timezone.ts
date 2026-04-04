const DEFAULT_TIME_ZONE = "UTC";

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();

export function resolveTimeZone(
  value: string | null | undefined,
): string | null {
  const candidate = value?.trim();
  if (!candidate) {
    return DEFAULT_TIME_ZONE;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return null;
  }
}

export function parseClientDateTimeToUtc(
  value: string,
  timeZone: string,
): Date | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (hasExplicitOffset(normalized)) {
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parts = parseNaiveDateTime(normalized);
  if (!parts) {
    return null;
  }

  return zonedDateTimePartsToUtc(parts, timeZone);
}

export function buildUtcDayRangeForTimeZone(
  date: string,
  timeZone: string,
) {
  const start = parseClientDateTimeToUtc(`${date}T00:00:00`, timeZone);
  const nextDate = addCalendarDays(date, 1);
  const end = nextDate
    ? parseClientDateTimeToUtc(`${nextDate}T00:00:00`, timeZone)
    : null;

  if (!start || !end) {
    return null;
  }

  return { start, end };
}

export function formatUtcToTimeZoneIso(
  date: Date,
  timeZone: string,
): string {
  const parts = getTimeZoneDateTimeParts(date, timeZone);
  const offsetMs = getTimeZoneOffsetMilliseconds(date, timeZone);

  return (
    `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}` +
    `T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}` +
    formatOffset(offsetMs)
  );
}

export function formatUtcDateForTimeZone(date: Date, timeZone: string): string {
  const parts = getTimeZoneDateTimeParts(date, timeZone);
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getDayOfWeekForDate(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getUTCDay();
}

function zonedDateTimePartsToUtc(
  input: DateTimeParts,
  timeZone: string,
): Date | null {
  const initialUtc = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    input.second,
    input.millisecond,
  );

  let candidate = new Date(initialUtc - getTimeZoneOffsetMilliseconds(new Date(initialUtc), timeZone));
  let offset = getTimeZoneOffsetMilliseconds(candidate, timeZone);
  candidate = new Date(initialUtc - offset);
  offset = getTimeZoneOffsetMilliseconds(candidate, timeZone);
  candidate = new Date(initialUtc - offset);

  const roundTrip = getTimeZoneDateTimeParts(candidate, timeZone);

  if (!sameDateTimeParts(roundTrip, input)) {
    return null;
  }

  return candidate;
}

function parseNaiveDateTime(value: string): DateTimeParts | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;
  const millisecond = match[7]
    ? Number(match[7].padEnd(3, "0"))
    : 0;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
  };
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const parts = getTimeZoneDateTimeParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  );

  return asUtc - date.getTime();
}

function getTimeZoneDateTimeParts(date: Date, timeZone: string): DateTimeParts {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);

  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  const hour = getPart(parts, "hour");
  const minute = getPart(parts, "minute");
  const second = getPart(parts, "second");

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond: Number(date.getUTCMilliseconds()),
  };
}

function getFormatter(timeZone: string) {
  const cached = dateTimeFormatCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });

  dateTimeFormatCache.set(timeZone, formatter);
  return formatter;
}

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  return Number(parts.find((part) => part.type === type)?.value ?? "0");
}

function sameDateTimeParts(left: DateTimeParts, right: DateTimeParts) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute &&
    left.second === right.second
  );
}

function hasExplicitOffset(value: string) {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
}

function formatOffset(offsetMs: number) {
  const sign = offsetMs >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMs);
  const hours = Math.floor(absolute / (60 * 60 * 1000));
  const minutes = Math.floor((absolute % (60 * 60 * 1000)) / (60 * 1000));

  return `${sign}${pad(hours)}:${pad(minutes)}`;
}

function pad(value: number, length = 2) {
  return String(value).padStart(length, "0");
}

function addCalendarDays(date: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }

  const utc = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days),
  );

  if (Number.isNaN(utc.getTime())) {
    return null;
  }

  return `${pad(utc.getUTCFullYear(), 4)}-${pad(utc.getUTCMonth() + 1)}-${pad(
    utc.getUTCDate(),
  )}`;
}
