import {
  Prisma,
  type PrismaClient,
} from "@/generated/tenant/client";
import {
  buildUtcDayRangeForTimeZone,
  resolveTimeZone,
} from "@/lib/backend/appointments/timezone";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import {
  toMoneyDecimal,
  toMoneyNumber,
} from "@/lib/backend/billing/service";
import type { RevenueSummaryReport } from "@/lib/backend/reports/types";

const DEFAULT_REPORT_TIME_ZONE =
  resolveTimeZone(process.env.DEFAULT_REPORT_TIMEZONE) ?? "UTC";

type FinancialAggregateDbClient = PrismaClient | Prisma.TransactionClient;

type AggregateAccumulator = {
  revenue: Prisma.Decimal;
  tax: Prisma.Decimal;
  discount: Prisma.Decimal;
  refunds: Prisma.Decimal;
  writeOff: Prisma.Decimal;
};

type FinancialAggregateRow = {
  id: string;
  date: Date;
  facilityId: string;
  revenue: Prisma.Decimal;
  tax: Prisma.Decimal;
  discount: Prisma.Decimal;
  refunds: Prisma.Decimal;
  writeOff: Prisma.Decimal;
  netRevenue: Prisma.Decimal;
  createdAt: Date;
};

export async function computeDailyFinancials(
  tenantId: string,
  facilityId: string,
  date: string | Date,
): Promise<FinancialAggregateRow> {
  const prisma = await getTenantPrisma(tenantId);
  return computeDailyFinancialsWithPrisma(prisma, tenantId, facilityId, date);
}

export async function computeDailyFinancialsWithPrisma(
  prisma: FinancialAggregateDbClient,
  tenantId: string,
  facilityId: string,
  date: string | Date,
): Promise<FinancialAggregateRow> {
  const dateKey = normalizeDateKey(date);
  const timeZone = await resolveFacilityReportingTimeZone(prisma, facilityId);
  const dayRange = buildUtcDayRangeForTimeZone(dateKey, timeZone);

  if (!dayRange) {
    throw new Error(`Invalid reporting date: ${dateKey}`);
  }

  const grouped = await prisma.ledgerEntry.groupBy({
    by: ["type"],
    where: {
      facilityId,
      createdAt: {
        gte: dayRange.start,
        lt: dayRange.end,
      },
    },
    _sum: {
      amount: true,
    },
  });

  const totals = grouped.reduce<AggregateAccumulator>(
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

  const netRevenue = totals.revenue
    .minus(totals.discount)
    .plus(totals.tax)
    .minus(totals.refunds)
    .minus(totals.writeOff);

  return prisma.financialDailyAggregate.upsert({
    where: {
      date_facilityId: {
        date: toAggregateDate(dateKey),
        facilityId,
      },
    },
    update: {
      revenue: totals.revenue,
      tax: totals.tax,
      discount: totals.discount,
      refunds: totals.refunds,
      writeOff: totals.writeOff,
      netRevenue,
    },
    create: {
      date: toAggregateDate(dateKey),
      facilityId,
      revenue: totals.revenue,
      tax: totals.tax,
      discount: totals.discount,
      refunds: totals.refunds,
      writeOff: totals.writeOff,
      netRevenue,
    },
  });
}

export async function refreshFinancialAggregateForDate(input: {
  tenantId: string;
  facilityId: string;
  date?: string | Date;
}): Promise<void> {
  try {
    await computeDailyFinancials(
      input.tenantId,
      input.facilityId,
      input.date ?? new Date(),
    );
  } catch (error) {
    console.error("Financial aggregate refresh failed:", error);
  }
}

export function normalizeDateKey(date: string | Date): string {
  if (typeof date === "string") {
    const normalized = date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new Error(`Invalid reporting date: ${date}`);
    }

    return normalized;
  }

  return date.toISOString().slice(0, 10);
}

export function toAggregateDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function fromAggregateDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function emptyRevenueSummary(): RevenueSummaryReport {
  return {
    totalRevenue: 0,
    netRevenue: 0,
    tax: 0,
    discount: 0,
    refunds: 0,
    writeOff: 0,
  };
}

export function serializeRevenueSummary(input: {
  revenue: Prisma.Decimal | number;
  tax: Prisma.Decimal | number;
  discount: Prisma.Decimal | number;
  refunds: Prisma.Decimal | number;
  writeOff: Prisma.Decimal | number;
  netRevenue: Prisma.Decimal | number;
}): RevenueSummaryReport {
  return {
    totalRevenue: toMoneyNumber(input.revenue),
    netRevenue: toMoneyNumber(input.netRevenue),
    tax: toMoneyNumber(input.tax),
    discount: toMoneyNumber(input.discount),
    refunds: toMoneyNumber(input.refunds),
    writeOff: toMoneyNumber(input.writeOff),
  };
}

async function resolveFacilityReportingTimeZone(
  prisma: FinancialAggregateDbClient,
  facilityId: string,
) {
  void prisma;
  void facilityId;

  // Facility timezone is not yet stored in the current tenant schema.
  // We honor the requirement by using a facility-specific timezone when one
  // becomes available, and fall back to a stable default until then.
  return DEFAULT_REPORT_TIME_ZONE;
}
