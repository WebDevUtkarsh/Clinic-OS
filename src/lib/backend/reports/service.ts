import { NextRequest, NextResponse } from "next/server";
import {
  Prisma,
  type PrismaClient,
} from "@/generated/tenant/client";
import {
  buildUtcDayRangeForTimeZone,
  formatUtcDateForTimeZone,
  resolveTimeZone,
} from "@/lib/backend/appointments/timezone";
import {
  computeDailyFinancials,
  emptyRevenueSummary,
  fromAggregateDate,
  serializeRevenueSummary,
  toAggregateDate,
} from "@/lib/backend/reports/aggregator";
import {
  toMoneyDecimal,
  toMoneyNumber,
} from "@/lib/backend/billing/service";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import type {
  DoctorEarningsReportItem,
  FinancialTrendPoint,
  OutstandingDuesReport,
  PaymentMethodReport,
  ReportDateRange,
  ReportScope,
  RevenueSummaryReport,
} from "@/lib/backend/reports/types";

const DEFAULT_REPORT_RANGE_DAYS = 30;
const MAX_REPORT_RANGE_DAYS = 366;
const DEFAULT_REPORT_TIME_ZONE = "UTC";

type ReportDbClient = PrismaClient | Prisma.TransactionClient;

type RawTrendRow = {
  date: Date | string;
  type: string;
  amount: Prisma.Decimal;
};

type RawDoctorRow = {
  doctorId: string;
  firstName: string | null;
  lastName: string | null;
  totalRevenue: Prisma.Decimal;
  netRevenue: Prisma.Decimal;
  totalAppointments: bigint | number;
};

type RawCountRow = {
  count: bigint | number;
};

type RawPaymentRow = {
  method: string;
  amount: Prisma.Decimal;
};

type RawDuesRow = {
  totalPendingAmount: Prisma.Decimal | null;
};

function parseStringArrayHeader(value: string | null): string[] {
  try {
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  );
}

export async function resolveReportScope(
  req: NextRequest,
  requestedFacilityId?: string,
): Promise<
  | { error: NextResponse; scope: null }
  | { error: null; scope: ReportScope }
> {
  const tenantId = req.headers.get("x-tenant-id");

  if (!tenantId) {
    return { error: jsonError("Unauthorized", 401), scope: null };
  }

  const isSuperAdmin = req.headers.get("x-super-admin") === "true";
  const accessibleFacilityIds = parseStringArrayHeader(req.headers.get("x-facilities"));
  const activeFacilityId = req.headers.get("x-facility-id")?.trim();
  const normalizedFacilityId = requestedFacilityId?.trim();
  const prisma = await getTenantPrisma(tenantId);

  if (!normalizedFacilityId) {
    if (!isSuperAdmin) {
      const resolvedFacilityId = activeFacilityId || accessibleFacilityIds[0];

      if (!resolvedFacilityId) {
        return { error: jsonError("Facility context required", 400), scope: null };
      }

      return resolveSingleFacilityScope(prisma, tenantId, resolvedFacilityId, false, accessibleFacilityIds);
    }

    if (activeFacilityId) {
      return resolveSingleFacilityScope(prisma, tenantId, activeFacilityId, true, accessibleFacilityIds);
    }

    const facilities = await prisma.facility.findMany({
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      error: null,
      scope: {
        tenantId,
        facilityId: null,
        facilityIds: facilities.map((facility) => facility.id),
        organizationId: null,
        isSuperAdmin: true,
      },
    };
  }

  return resolveSingleFacilityScope(
    prisma,
    tenantId,
    normalizedFacilityId,
    isSuperAdmin,
    accessibleFacilityIds,
  );
}

export function resolveReportTimeZone(value?: string) {
  return resolveTimeZone(value ?? DEFAULT_REPORT_TIME_ZONE);
}

export function resolveReportDateRange(input: {
  from?: string;
  to?: string;
  timeZone: string;
}): ReportDateRange {
  const today = formatUtcDateForTimeZone(new Date(), input.timeZone);
  const to = input.to ?? today;
  const from = input.from ?? addCalendarDays(to, -(DEFAULT_REPORT_RANGE_DAYS - 1));

  if (from.localeCompare(to) > 0) {
    throw new Error("`from` must be before or equal to `to`");
  }

  const dateKeys = enumerateDateKeys(from, to);
  if (dateKeys.length > MAX_REPORT_RANGE_DAYS) {
    throw new Error(`Report range cannot exceed ${MAX_REPORT_RANGE_DAYS} days`);
  }

  const startRange = buildUtcDayRangeForTimeZone(from, input.timeZone);
  const endRange = buildUtcDayRangeForTimeZone(to, input.timeZone);

  if (!startRange || !endRange) {
    throw new Error("Invalid report date range");
  }

  return {
    from,
    to,
    startUtc: startRange.start,
    endUtc: endRange.end,
    dateKeys,
  };
}

export async function getRevenueSummaryReport(
  prisma: ReportDbClient,
  input: {
    tenantId: string;
    facilityIds: string[];
    dateRange: ReportDateRange;
    doctorId?: string;
  },
): Promise<RevenueSummaryReport> {
  if (input.facilityIds.length === 0) {
    return emptyRevenueSummary();
  }

  if (!input.doctorId) {
    const aggregateRows = await getCoveredAggregateRows(prisma, input);
    if (aggregateRows.complete) {
      return summarizeAggregateRows(aggregateRows.rows);
    }
  }

  const grouped = await prisma.ledgerEntry.groupBy({
    by: ["type"],
    where: buildLedgerWhere(input),
    _sum: {
      amount: true,
    },
  });

  return summarizeLedgerTypeRows(grouped);
}

export async function getFinancialTrendsReport(
  prisma: ReportDbClient,
  input: {
    tenantId: string;
    facilityIds: string[];
    dateRange: ReportDateRange;
    timeZone: string;
    doctorId?: string;
  },
): Promise<FinancialTrendPoint[]> {
  if (input.facilityIds.length === 0) {
    return input.dateRange.dateKeys.map((date) => ({
      date,
      ...emptyRevenueSummary(),
    }));
  }

  if (!input.doctorId) {
    const aggregateRows = await getCoveredAggregateRows(prisma, input);
    if (aggregateRows.complete) {
      return mapAggregateRowsToTrendPoints(
        aggregateRows.rows,
        input.dateRange.dateKeys,
      );
    }
  }

  const rows = await prisma.$queryRaw<RawTrendRow[]>(
    Prisma.sql`
      SELECT
        timezone(${input.timeZone}, le."createdAt")::date AS "date",
        le."type"::text AS "type",
        COALESCE(SUM(le."amount"), 0)::numeric AS "amount"
      FROM "LedgerEntry" AS le
      INNER JOIN "Billing" AS b
        ON b."id" = le."billingId"
      WHERE le."createdAt" >= ${input.dateRange.startUtc}
        AND le."createdAt" < ${input.dateRange.endUtc}
        AND le."facilityId" IN (${Prisma.join(input.facilityIds)})
        ${input.doctorId
          ? Prisma.sql`AND b."doctorId" = ${input.doctorId}`
          : Prisma.empty}
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `,
  );

  return mapLedgerTrendRowsToTrendPoints(rows, input.dateRange.dateKeys);
}

export async function getDoctorEarningsReport(
  prisma: ReportDbClient,
  input: {
    facilityIds: string[];
    dateRange: ReportDateRange;
    doctorId?: string;
    page: number;
    pageSize: number;
  },
): Promise<{
  data: DoctorEarningsReportItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> {
  if (input.facilityIds.length === 0) {
    return {
      data: [],
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const offset = (input.page - 1) * input.pageSize;
  const doctorFilter = input.doctorId
    ? Prisma.sql`AND b."doctorId" = ${input.doctorId}`
    : Prisma.empty;

  const [countRows, rows] = await Promise.all([
    prisma.$queryRaw<RawCountRow[]>(
      Prisma.sql`
        SELECT COUNT(DISTINCT b."doctorId")::bigint AS "count"
        FROM "Billing" AS b
        INNER JOIN "LedgerEntry" AS le
          ON le."billingId" = b."id"
        WHERE b."doctorId" IS NOT NULL
          AND le."createdAt" >= ${input.dateRange.startUtc}
          AND le."createdAt" < ${input.dateRange.endUtc}
          AND b."facilityId" IN (${Prisma.join(input.facilityIds)})
          ${doctorFilter}
      `,
    ),
    prisma.$queryRaw<RawDoctorRow[]>(
      Prisma.sql`
        WITH doctor_rollup AS (
          SELECT
            b."doctorId" AS "doctorId",
            d."firstName" AS "firstName",
            d."lastName" AS "lastName",
            COUNT(DISTINCT CASE
              WHEN b."appointmentId" IS NOT NULL
                AND (a."status" IS NULL OR a."status" <> 'CANCELLED')
              THEN b."appointmentId"
              ELSE NULL
            END)::bigint AS "totalAppointments",
            COALESCE(SUM(CASE WHEN le."type" = 'CHARGE' THEN le."amount" ELSE 0::numeric END), 0)::numeric AS "totalRevenue",
            (
              COALESCE(SUM(CASE WHEN le."type" = 'CHARGE' THEN le."amount" ELSE 0::numeric END), 0)
              - COALESCE(SUM(CASE WHEN le."type" = 'DISCOUNT' THEN ABS(le."amount") ELSE 0::numeric END), 0)
              + COALESCE(SUM(CASE WHEN le."type" = 'TAX' THEN le."amount" ELSE 0::numeric END), 0)
              - COALESCE(SUM(CASE WHEN le."type" = 'REFUND' THEN le."amount" ELSE 0::numeric END), 0)
              - COALESCE(SUM(CASE WHEN le."type" = 'WRITE_OFF' THEN le."amount" ELSE 0::numeric END), 0)
            )::numeric AS "netRevenue"
          FROM "Billing" AS b
          INNER JOIN "LedgerEntry" AS le
            ON le."billingId" = b."id"
          LEFT JOIN "Appointment" AS a
            ON a."id" = b."appointmentId"
          LEFT JOIN "Doctor" AS d
            ON d."id" = b."doctorId"
          WHERE b."doctorId" IS NOT NULL
            AND le."createdAt" >= ${input.dateRange.startUtc}
            AND le."createdAt" < ${input.dateRange.endUtc}
            AND b."facilityId" IN (${Prisma.join(input.facilityIds)})
            ${doctorFilter}
          GROUP BY b."doctorId", d."firstName", d."lastName"
        )
        SELECT
          "doctorId",
          "firstName",
          "lastName",
          "totalRevenue",
          "netRevenue",
          "totalAppointments"
        FROM doctor_rollup
        ORDER BY "netRevenue" DESC, "doctorId" ASC
        OFFSET ${offset}
        LIMIT ${input.pageSize}
      `,
    ),
  ]);

  const total = Number(countRows[0]?.count ?? 0);

  return {
    data: rows.map((row) => ({
      doctorId: row.doctorId,
      firstName: row.firstName,
      lastName: row.lastName,
      totalRevenue: toMoneyNumber(row.totalRevenue),
      netRevenue: toMoneyNumber(row.netRevenue),
      totalAppointments: Number(row.totalAppointments),
    })),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.pageSize),
    },
  };
}

export async function getPaymentMethodReport(
  prisma: ReportDbClient,
  input: {
    facilityIds: string[];
    dateRange: ReportDateRange;
    doctorId?: string;
  },
): Promise<PaymentMethodReport> {
  if (input.facilityIds.length === 0) {
    return {
      cash: 0,
      card: 0,
      upi: 0,
      others: 0,
    };
  }

  const rows = await prisma.$queryRaw<RawPaymentRow[]>(
    Prisma.sql`
      SELECT
        p."method"::text AS "method",
        COALESCE(SUM(p."amount"), 0)::numeric AS "amount"
      FROM "Payment" AS p
      INNER JOIN "Billing" AS b
        ON b."id" = p."billingId"
      WHERE p."createdAt" >= ${input.dateRange.startUtc}
        AND p."createdAt" < ${input.dateRange.endUtc}
        AND p."status" <> 'FAILED'
        AND b."facilityId" IN (${Prisma.join(input.facilityIds)})
        ${input.doctorId
          ? Prisma.sql`AND b."doctorId" = ${input.doctorId}`
          : Prisma.empty}
      GROUP BY p."method"
    `,
  );

  return rows.reduce<PaymentMethodReport>(
    (accumulator, row) => {
      const amount = toMoneyNumber(row.amount);

      switch (row.method) {
        case "CASH":
          accumulator.cash += amount;
          break;
        case "CARD":
          accumulator.card += amount;
          break;
        case "UPI":
          accumulator.upi += amount;
          break;
        default:
          accumulator.others += amount;
          break;
      }

      return accumulator;
    },
    {
      cash: 0,
      card: 0,
      upi: 0,
      others: 0,
    },
  );
}

export async function getOutstandingDuesReport(
  prisma: ReportDbClient,
  input: {
    facilityIds: string[];
    dateRange: ReportDateRange;
    doctorId?: string;
  },
): Promise<OutstandingDuesReport> {
  if (input.facilityIds.length === 0) {
    return {
      totalPendingAmount: 0,
    };
  }

  const rows = await prisma.$queryRaw<RawDuesRow[]>(
    Prisma.sql`
      WITH billing_dues AS (
        SELECT
          b."id" AS "billingId",
          (
            COALESCE(SUM(CASE WHEN le."type" = 'CHARGE' THEN le."amount" ELSE 0::numeric END), 0)
            + COALESCE(SUM(CASE WHEN le."type" = 'TAX' THEN le."amount" ELSE 0::numeric END), 0)
            - COALESCE(SUM(CASE WHEN le."type" = 'DISCOUNT' THEN ABS(le."amount") ELSE 0::numeric END), 0)
            - COALESCE(SUM(CASE WHEN le."type" = 'PAYMENT' THEN le."amount" ELSE 0::numeric END), 0)
            + COALESCE(SUM(CASE WHEN le."type" = 'REFUND' THEN le."amount" ELSE 0::numeric END), 0)
            - COALESCE(SUM(CASE WHEN le."type" = 'WRITE_OFF' THEN le."amount" ELSE 0::numeric END), 0)
          )::numeric AS "dueAmount"
        FROM "Billing" AS b
        LEFT JOIN "LedgerEntry" AS le
          ON le."billingId" = b."id"
        WHERE b."facilityId" IN (${Prisma.join(input.facilityIds)})
          AND b."createdAt" >= ${input.dateRange.startUtc}
          AND b."createdAt" < ${input.dateRange.endUtc}
          AND b."status" <> 'CANCELLED'
          ${input.doctorId
            ? Prisma.sql`AND b."doctorId" = ${input.doctorId}`
            : Prisma.empty}
        GROUP BY b."id"
      )
      SELECT
        COALESCE(SUM(GREATEST("dueAmount", 0::numeric)), 0)::numeric AS "totalPendingAmount"
      FROM billing_dues
    `,
  );

  return {
    totalPendingAmount: toMoneyNumber(rows[0]?.totalPendingAmount ?? 0),
  };
}

function buildLedgerWhere(input: {
  facilityIds: string[];
  dateRange: ReportDateRange;
  doctorId?: string;
}): Prisma.LedgerEntryWhereInput {
  return {
    facilityId: {
      in: input.facilityIds,
    },
    createdAt: {
      gte: input.dateRange.startUtc,
      lt: input.dateRange.endUtc,
    },
    ...(input.doctorId
      ? {
          billing: {
            is: {
              doctorId: input.doctorId,
            },
          },
        }
      : {}),
  };
}

async function resolveSingleFacilityScope(
  prisma: ReportDbClient,
  tenantId: string,
  facilityId: string,
  isSuperAdmin: boolean,
  accessibleFacilityIds: string[],
): Promise<
  | { error: NextResponse; scope: null }
  | { error: null; scope: ReportScope }
> {
  if (!isSuperAdmin && !accessibleFacilityIds.includes(facilityId)) {
    return {
      error: jsonError("Access denied for this facility", 403),
      scope: null,
    };
  }

  const facility = await prisma.facility.findUnique({
    where: {
      id: facilityId,
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!facility) {
    return {
      error: jsonError("Facility not found", 404),
      scope: null,
    };
  }

  return {
    error: null,
    scope: {
      tenantId,
      facilityId: facility.id,
      facilityIds: [facility.id],
      organizationId: facility.organizationId,
      isSuperAdmin,
    },
  };
}

async function getCoveredAggregateRows(
  prisma: ReportDbClient,
  input: {
    tenantId: string;
    facilityIds: string[];
    dateRange: ReportDateRange;
  },
) {
  let rows = await prisma.financialDailyAggregate.findMany({
    where: {
      facilityId: {
        in: input.facilityIds,
      },
      date: {
        gte: toAggregateDate(input.dateRange.from),
        lte: toAggregateDate(input.dateRange.to),
      },
    },
    orderBy: [{ date: "asc" }, { facilityId: "asc" }],
  });

  const expectedRows = input.facilityIds.length * input.dateRange.dateKeys.length;
  if (rows.length === expectedRows || expectedRows === 0) {
    return { rows, complete: true };
  }

  if (input.facilityIds.length === 1 && input.dateRange.dateKeys.length <= 31) {
    const existingDates = new Set(rows.map((row) => fromAggregateDate(row.date)));
    const missingDates = input.dateRange.dateKeys.filter((dateKey) => !existingDates.has(dateKey));

    for (const dateKey of missingDates) {
      await computeDailyFinancials(input.tenantId, input.facilityIds[0], dateKey);
    }

    rows = await prisma.financialDailyAggregate.findMany({
      where: {
        facilityId: input.facilityIds[0],
        date: {
          gte: toAggregateDate(input.dateRange.from),
          lte: toAggregateDate(input.dateRange.to),
        },
      },
      orderBy: [{ date: "asc" }, { facilityId: "asc" }],
    });
  }

  return {
    rows,
    complete: rows.length === expectedRows,
  };
}

function summarizeAggregateRows(
  rows: Array<{
    revenue: Prisma.Decimal;
    tax: Prisma.Decimal;
    discount: Prisma.Decimal;
    refunds: Prisma.Decimal;
    writeOff: Prisma.Decimal;
    netRevenue: Prisma.Decimal;
  }>,
): RevenueSummaryReport {
  return rows.reduce<RevenueSummaryReport>(
    (accumulator, row) => ({
      totalRevenue: accumulator.totalRevenue + toMoneyNumber(row.revenue),
      netRevenue: accumulator.netRevenue + toMoneyNumber(row.netRevenue),
      tax: accumulator.tax + toMoneyNumber(row.tax),
      discount: accumulator.discount + toMoneyNumber(row.discount),
      refunds: accumulator.refunds + toMoneyNumber(row.refunds),
      writeOff: accumulator.writeOff + toMoneyNumber(row.writeOff),
    }),
    emptyRevenueSummary(),
  );
}

function summarizeLedgerTypeRows(
  rows: Array<{
    type: string;
    _sum: { amount: Prisma.Decimal | null };
  }>,
): RevenueSummaryReport {
  const totals = rows.reduce(
    (accumulator, row) => {
      const amount = toMoneyDecimal(row._sum.amount ?? 0);

      switch (row.type) {
        case "CHARGE":
          accumulator.revenue = accumulator.revenue.plus(amount);
          break;
        case "TAX":
          accumulator.tax = accumulator.tax.plus(amount);
          break;
        case "DISCOUNT":
          accumulator.discount = accumulator.discount.plus(amount.abs());
          break;
        case "REFUND":
          accumulator.refunds = accumulator.refunds.plus(amount);
          break;
        case "WRITE_OFF":
          accumulator.writeOff = accumulator.writeOff.plus(amount);
          break;
        default:
          break;
      }

      return accumulator;
    },
    {
      revenue: toMoneyDecimal(0),
      tax: toMoneyDecimal(0),
      discount: toMoneyDecimal(0),
      refunds: toMoneyDecimal(0),
      writeOff: toMoneyDecimal(0),
    },
  );

  return serializeRevenueSummary({
    revenue: totals.revenue,
    tax: totals.tax,
    discount: totals.discount,
    refunds: totals.refunds,
    writeOff: totals.writeOff,
    netRevenue: totals.revenue
      .minus(totals.discount)
      .plus(totals.tax)
      .minus(totals.refunds)
      .minus(totals.writeOff),
  });
}

function mapAggregateRowsToTrendPoints(
  rows: Array<{
    date: Date;
    revenue: Prisma.Decimal;
    tax: Prisma.Decimal;
    discount: Prisma.Decimal;
    refunds: Prisma.Decimal;
    writeOff: Prisma.Decimal;
    netRevenue: Prisma.Decimal;
  }>,
  dateKeys: string[],
): FinancialTrendPoint[] {
  const byDate = new Map<string, RevenueSummaryReport>();

  for (const row of rows) {
    const dateKey = fromAggregateDate(row.date);
    const current = byDate.get(dateKey) ?? emptyRevenueSummary();

    byDate.set(dateKey, {
      totalRevenue: current.totalRevenue + toMoneyNumber(row.revenue),
      netRevenue: current.netRevenue + toMoneyNumber(row.netRevenue),
      tax: current.tax + toMoneyNumber(row.tax),
      discount: current.discount + toMoneyNumber(row.discount),
      refunds: current.refunds + toMoneyNumber(row.refunds),
      writeOff: current.writeOff + toMoneyNumber(row.writeOff),
    });
  }

  return dateKeys.map((date) => ({
    date,
    ...(byDate.get(date) ?? emptyRevenueSummary()),
  }));
}

function mapLedgerTrendRowsToTrendPoints(
  rows: RawTrendRow[],
  dateKeys: string[],
): FinancialTrendPoint[] {
  const grouped = new Map<string, Array<{ type: string; amount: Prisma.Decimal }>>();

  for (const row of rows) {
    const dateKey = String(row.date).slice(0, 10);
    const current = grouped.get(dateKey) ?? [];
    current.push({
      type: row.type,
      amount: row.amount,
    });
    grouped.set(dateKey, current);
  }

  return dateKeys.map((date) => {
    const summary = summarizeLedgerTypeRows(
      (grouped.get(date) ?? []).map((row) => ({
        type: row.type,
        _sum: {
          amount: row.amount,
        },
      })),
    );

    return {
      date,
      ...summary,
    };
  });
}

function enumerateDateKeys(from: string, to: string) {
  const dates: string[] = [];
  let cursor = from;

  while (cursor.localeCompare(to) <= 0) {
    dates.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }

  return dates;
}

function addCalendarDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  cursor.setUTCDate(cursor.getUTCDate() + days);
  return cursor.toISOString().slice(0, 10);
}
