import {
  BillingStatus,
  Prisma,
  type PrismaClient,
} from "@/generated/tenant/client";
import type {
  BillingListItemResponse,
  BillingResponse,
  BillingTotalsResponse,
} from "@/lib/backend/billing/types";

type BillingDbClient = PrismaClient | Prisma.TransactionClient;

const MONEY_SCALE = 2;
const BILLING_LOCK_NAMESPACE = 11;
const EMPTY_TOTALS: BillingTotalsResponse = {
  subtotal: 0,
  discount: 0,
  tax: 0,
  paid: 0,
  refund: 0,
  writeOff: 0,
  total: 0,
  due: 0,
};

export const billingItemSelect = {
  id: true,
  type: true,
  name: true,
  quantity: true,
  unitPrice: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.BillingItemSelect;

export const paymentSelect = {
  id: true,
  amount: true,
  method: true,
  referenceId: true,
  idempotencyKey: true,
  status: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

export const ledgerEntrySelect = {
  id: true,
  type: true,
  amount: true,
  referenceType: true,
  referenceId: true,
  metadata: true,
  createdBy: true,
  createdAt: true,
} satisfies Prisma.LedgerEntrySelect;

export const billingBaseSelect = {
  id: true,
  patientId: true,
  doctorId: true,
  facilityId: true,
  appointmentId: true,
  status: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      name: true,
      isDeleted: true,
    },
  },
  doctor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  appointment: {
    select: {
      id: true,
      startTime: true,
      status: true,
    },
  },
} satisfies Prisma.BillingSelect;

export const billingDetailSelect = {
  ...billingBaseSelect,
  items: {
    select: billingItemSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  payments: {
    select: paymentSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  ledgerEntries: {
    select: ledgerEntrySelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.BillingSelect;

type BillingListRecord = Prisma.BillingGetPayload<{
  select: typeof billingBaseSelect;
}>;

type BillingDetailRecord = Prisma.BillingGetPayload<{
  select: typeof billingDetailSelect;
}>;

export function toMoneyDecimal(
  value: number | string | Prisma.Decimal,
): Prisma.Decimal {
  const decimalValue =
    value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);

  return decimalValue.toDecimalPlaces(MONEY_SCALE, Prisma.Decimal.ROUND_HALF_UP);
}

export function toMoneyNumber(
  value: number | string | Prisma.Decimal | null | undefined,
): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return toMoneyDecimal(value).toNumber();
}

export function calculateLineAmount(
  quantity: number,
  unitPrice: number | string | Prisma.Decimal,
): Prisma.Decimal {
  return toMoneyDecimal(unitPrice)
    .mul(quantity)
    .toDecimalPlaces(MONEY_SCALE, Prisma.Decimal.ROUND_HALF_UP);
}

export function calculateRateAmount(baseAmount: number, rate: number): Prisma.Decimal {
  return toMoneyDecimal(baseAmount)
    .mul(rate)
    .div(100)
    .toDecimalPlaces(MONEY_SCALE, Prisma.Decimal.ROUND_HALF_UP);
}

export function buildBillingListWhere(input: {
  facilityId: string;
  status?: BillingStatus;
  patientId?: string;
  doctorId?: string;
  date?: string;
  search?: string;
}): Prisma.BillingWhereInput {
  const where: Prisma.BillingWhereInput = {
    facilityId: input.facilityId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.patientId ? { patientId: input.patientId } : {}),
    ...(input.doctorId ? { doctorId: input.doctorId } : {}),
  };

  if (input.date) {
    const dayStart = new Date(`${input.date}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    if (!Number.isNaN(dayStart.getTime())) {
      where.createdAt = {
        gte: dayStart,
        lt: dayEnd,
      };
    }
  }

  const normalizedSearch = input.search?.trim();
  if (normalizedSearch) {
    const terms = normalizedSearch
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (terms.length > 0) {
      where.AND = terms.map((term) => ({
        OR: [
          { id: { contains: term, mode: "insensitive" } },
          { patient: { is: { name: { contains: term, mode: "insensitive" } } } },
          {
            doctor: {
              is: {
                OR: [
                  { firstName: { contains: term, mode: "insensitive" } },
                  { lastName: { contains: term, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      }));
    }
  }

  return where;
}

export async function getBillingTotalsMap(
  prisma: BillingDbClient,
  input: {
    billingIds: string[];
    facilityId: string;
  },
) {
  const totalsMap = new Map<string, BillingTotalsResponse>();

  for (const billingId of input.billingIds) {
    totalsMap.set(billingId, { ...EMPTY_TOTALS });
  }

  if (input.billingIds.length === 0) {
    return totalsMap;
  }

  const grouped = await prisma.ledgerEntry.groupBy({
    by: ["billingId", "type"],
    where: {
      facilityId: input.facilityId,
      billingId: {
        in: input.billingIds,
      },
    },
    _sum: {
      amount: true,
    },
  });

  for (const row of grouped) {
    const current = totalsMap.get(row.billingId) ?? { ...EMPTY_TOTALS };
    const amount = toMoneyNumber(row._sum.amount);

    switch (row.type) {
      case "CHARGE":
        current.subtotal = amount;
        break;
      case "DISCOUNT":
        current.discount = amount;
        break;
      case "TAX":
        current.tax = amount;
        break;
      case "PAYMENT":
        current.paid = amount;
        break;
      case "REFUND":
        current.refund = amount;
        break;
      case "WRITE_OFF":
        current.writeOff = amount;
        break;
      default:
        break;
    }

    current.total = sumMoney([
      current.subtotal,
      current.tax,
      current.discount,
    ]);
    current.due = sumMoney([
      current.total,
      current.refund,
      -current.paid,
      -current.writeOff,
    ]);

    totalsMap.set(row.billingId, current);
  }

  return totalsMap;
}

export async function getBillingTotals(
  prisma: BillingDbClient,
  billingId: string,
  facilityId: string,
) {
  const totals = (await getBillingTotalsMap(prisma, {
    billingIds: [billingId],
    facilityId,
  })).get(billingId);

  return totals ?? { ...EMPTY_TOTALS };
}

export async function withBillingLock<T>(
  prisma: PrismaClient,
  billingId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${billingId}), ${BILLING_LOCK_NAMESPACE})
      `;

      return callback(tx);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function syncBillingStatus(
  prisma: BillingDbClient,
  input: {
    billingId: string;
    facilityId: string;
    currentStatus: BillingStatus;
    preserveDraft?: boolean;
  },
) {
  const totals = await getBillingTotals(prisma, input.billingId, input.facilityId);
  const nextStatus = deriveBillingStatus({
    currentStatus: input.currentStatus,
    totals,
    preserveDraft: input.preserveDraft ?? input.currentStatus === "DRAFT",
  });

  if (nextStatus !== input.currentStatus) {
    await prisma.billing.update({
      where: { id: input.billingId },
      data: {
        status: nextStatus,
      },
      select: {
        id: true,
      },
    });
  }

  return {
    totals,
    status: nextStatus,
  };
}

export async function getBillingDetail(
  prisma: PrismaClient,
  billingId: string,
  facilityId: string,
) {
  const billing = await prisma.billing.findFirst({
    where: {
      id: billingId,
      facilityId,
    },
    select: billingDetailSelect,
  });

  if (!billing) {
    return null;
  }

  const totals = await getBillingTotals(prisma, billing.id, facilityId);
  return serializeBillingDetail(billing, totals);
}

export function serializeBillingListItem(
  billing: BillingListRecord,
  totals: BillingTotalsResponse,
): BillingListItemResponse {
  return {
    id: billing.id,
    patientId: billing.patientId,
    doctorId: billing.doctorId,
    facilityId: billing.facilityId,
    appointmentId: billing.appointmentId,
    status: billing.status,
    createdBy: billing.createdBy,
    createdAt: billing.createdAt.toISOString(),
    updatedAt: billing.updatedAt.toISOString(),
    patient: {
      id: billing.patient.id,
      name: billing.patient.name,
      isDeleted: billing.patient.isDeleted,
    },
    doctor: billing.doctor
      ? {
          id: billing.doctor.id,
          firstName: billing.doctor.firstName,
          lastName: billing.doctor.lastName,
        }
      : null,
    appointment: billing.appointment
      ? {
          id: billing.appointment.id,
          startTime: billing.appointment.startTime.toISOString(),
          status: billing.appointment.status,
        }
      : null,
    totals,
  };
}

export function serializeBillingDetail(
  billing: BillingDetailRecord,
  totals: BillingTotalsResponse,
): BillingResponse {
  return {
    ...serializeBillingListItem(billing, totals),
    items: billing.items.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      quantity: item.quantity,
      unitPrice: toMoneyNumber(item.unitPrice),
      metadata: toSerializableMetadata(item.metadata),
      createdAt: item.createdAt.toISOString(),
    })),
    payments: billing.payments.map((payment) => ({
      id: payment.id,
      amount: toMoneyNumber(payment.amount),
      method: payment.method,
      referenceId: payment.referenceId,
      idempotencyKey: payment.idempotencyKey,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    })),
    ledgerEntries: billing.ledgerEntries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      amount: toMoneyNumber(entry.amount),
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      metadata: toSerializableMetadata(entry.metadata),
      createdBy: entry.createdBy,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export function ensureBillingExistsForMutation(input: {
  billing: {
    id: string;
    status: BillingStatus;
    facilityId: string;
  } | null;
}) {
  if (!input.billing) {
    return "Billing not found";
  }

  if (input.billing.status === "CANCELLED") {
    return "Cancelled bills cannot be modified";
  }

  return null;
}

export function ensureBillingCanChangeCharges(status: BillingStatus) {
  if (status === "CANCELLED") {
    return "Cancelled bills cannot be modified";
  }

  if (status === "PAID") {
    return "Paid bills cannot be modified";
  }

  return null;
}

export function ensureBillingCanFinalize(status: BillingStatus) {
  if (status === "CANCELLED") {
    return "Cancelled bills cannot be finalized";
  }

  if (status !== "DRAFT") {
    return "Only draft bills can be finalized";
  }

  return null;
}

export function ensureBillingCanDelete(status: BillingStatus) {
  if (status === "CANCELLED") {
    return "Billing is already cancelled";
  }

  return null;
}

export function ensureBillingCanAcceptPayment(status: BillingStatus) {
  if (status === "CANCELLED") {
    return "Cancelled bills cannot accept payments";
  }

  return null;
}

export function deriveBillingStatus(input: {
  currentStatus: BillingStatus;
  totals: BillingTotalsResponse;
  preserveDraft: boolean;
}) {
  if (input.currentStatus === "CANCELLED") {
    return "CANCELLED" satisfies BillingStatus;
  }

  if (input.preserveDraft) {
    return "DRAFT" satisfies BillingStatus;
  }

  if (
    input.totals.due <= 0 &&
    (
      input.totals.total > 0 ||
      input.totals.paid > 0 ||
      input.totals.writeOff > 0
    )
  ) {
    return "PAID" satisfies BillingStatus;
  }

  if (
    input.totals.paid > 0 ||
    input.totals.refund > 0 ||
    input.totals.writeOff > 0
  ) {
    return "PARTIALLY_PAID" satisfies BillingStatus;
  }

  return "GENERATED" satisfies BillingStatus;
}

function sumMoney(values: number[]) {
  let total = new Prisma.Decimal(0);

  for (const value of values) {
    total = total.plus(toMoneyDecimal(value));
  }

  return total.toDecimalPlaces(MONEY_SCALE, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}

function toSerializableMetadata(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
