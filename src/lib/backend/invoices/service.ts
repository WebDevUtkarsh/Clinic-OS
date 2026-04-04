import { Prisma, type PrismaClient } from "@/generated/tenant/client";
import {
  billingDetailSelect,
  calculateLineAmount,
  getBillingTotals,
  toMoneyDecimal,
} from "@/lib/backend/billing/service";
import { invoiceSnapshotSchema } from "@/lib/backend/invoices/schemas";
import type {
  InvoiceResponse,
  InvoiceSnapshot,
  InvoiceSnapshotPayment,
  InvoiceTaxSummary,
} from "@/lib/backend/invoices/types";

export const invoiceSelect = {
  id: true,
  billingId: true,
  facilityId: true,
  invoiceNumber: true,
  snapshot: true,
  createdAt: true,
} satisfies Prisma.InvoiceSelect;

type InvoiceRecord = Prisma.InvoiceGetPayload<{
  select: typeof invoiceSelect;
}>;

type BillingForInvoice = Prisma.BillingGetPayload<{
  select: typeof billingDetailSelect;
}>;

export function serializeInvoice(invoice: InvoiceRecord): InvoiceResponse {
  const parsedSnapshot = invoiceSnapshotSchema.parse(invoice.snapshot);

  return {
    id: invoice.id,
    billingId: invoice.billingId,
    facilityId: invoice.facilityId,
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt.toISOString(),
    snapshot: parsedSnapshot,
  };
}

export async function getInvoiceById(
  prisma: PrismaClient,
  input: {
    invoiceId: string;
    facilityId: string;
  },
) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: input.invoiceId,
      facilityId: input.facilityId,
    },
    select: invoiceSelect,
  });

  return invoice ? serializeInvoice(invoice) : null;
}

export async function buildInvoiceSnapshot(
  prisma: Prisma.TransactionClient,
  input: {
    tenantId: string;
    billingId: string;
    facilityId: string;
    generatedBy: string;
  },
) {
  const billing = await prisma.billing.findFirst({
    where: {
      id: input.billingId,
      facilityId: input.facilityId,
    },
    select: {
      ...billingDetailSelect,
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
        },
      },
      doctor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          specialization: true,
        },
      },
    },
  });

  if (!billing) {
    throw new Error("BILLING_NOT_FOUND");
  }

  const existingInvoice = await prisma.invoice.findUnique({
    where: {
      billingId: billing.id,
    },
    select: {
      id: true,
    },
  });

  if (existingInvoice) {
    throw new Error("INVOICE_ALREADY_EXISTS");
  }

  const facility = await prisma.facility.findFirst({
    where: {
      id: input.facilityId,
    },
    select: {
      id: true,
      name: true,
      type: true,
      code: true,
      gstNumber: true,
      address: true,
      organizationId: true,
    },
  });

  if (!facility) {
    throw new Error("FACILITY_NOT_FOUND");
  }

  const totals = await getBillingTotals(prisma, billing.id, input.facilityId);
  const year = new Date().getUTCFullYear();
  const nextNumber = await getNextInvoiceNumber(prisma, {
    facilityId: input.facilityId,
    year,
  });
  const facilityCode = sanitizeFacilityCode(facility.code) ?? buildFacilityCode(facility.name);
  const invoiceNumber = `${facilityCode}-${year}-${String(nextNumber).padStart(4, "0")}`;
  const invoiceId = crypto.randomUUID();

  const taxSummary = buildTaxSummary(billing.ledgerEntries);
  const snapshot: InvoiceSnapshot = {
    invoiceId,
    invoiceNumber,
    generatedAt: new Date().toISOString(),
    billing: {
      id: billing.id,
      status: billing.status,
      appointmentId: billing.appointmentId,
      createdAt: billing.createdAt.toISOString(),
    },
    patient: {
      id: billing.patient.id,
      name: billing.patient.name,
      email: billing.patient.email,
      phone: billing.patient.phone,
      address: billing.patient.address,
    },
    doctor: billing.doctor
      ? {
          id: billing.doctor.id,
          fullName: `${billing.doctor.firstName} ${billing.doctor.lastName}`.trim(),
          specialization: billing.doctor.specialization,
          email: billing.doctor.email,
          phone: billing.doctor.phone,
        }
      : null,
    facility: {
      id: facility.id,
      code: facilityCode,
      name: facility.name,
      type: facility.type,
      address: facility.address,
      organizationId: facility.organizationId,
      gstNumber: facility.gstNumber ?? extractFacilityGstNumber(billing.items),
    },
    items: billing.items.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      quantity: item.quantity,
      unitPrice: toMoneyDecimal(item.unitPrice).toFixed(2),
      lineTotal: calculateLineAmount(item.quantity, item.unitPrice).toFixed(2),
      metadata: toSerializableMetadata(item.metadata),
    })),
    payments: billing.payments.map<InvoiceSnapshotPayment>((payment) => ({
      id: payment.id,
      amount: toMoneyDecimal(payment.amount).toFixed(2),
      method: payment.method,
      referenceId: payment.referenceId,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    })),
    totals: {
      subtotal: toMoneyDecimal(totals.subtotal).toFixed(2),
      discount: toMoneyDecimal(totals.discount).toFixed(2),
      tax: toMoneyDecimal(totals.tax).toFixed(2),
      total: toMoneyDecimal(totals.total).toFixed(2),
      paid: toMoneyDecimal(totals.paid).toFixed(2),
      refund: toMoneyDecimal(totals.refund).toFixed(2),
      writeOff: toMoneyDecimal(totals.writeOff).toFixed(2),
      due: toMoneyDecimal(totals.due).toFixed(2),
    },
    taxSummary,
    metadata: {
      tenantId: input.tenantId,
      facilityId: input.facilityId,
      organizationId: facility.organizationId,
      generatedBy: input.generatedBy,
      terms: [
        "This invoice is an immutable snapshot generated from the billing ledger.",
        "Payments recorded after invoice generation will not alter this document.",
        "Please retain this copy for compliance and reconciliation records.",
      ],
      gstNote:
        "GST values reflect ledger entries captured at invoice generation time. CGST and SGST splits are shown when supplied in tax metadata.",
    },
  };

  const invoice = await prisma.invoice.create({
    data: {
      id: invoiceId,
      billingId: billing.id,
      facilityId: input.facilityId,
      invoiceNumber,
      snapshot: snapshot as Prisma.InputJsonValue,
    },
    select: invoiceSelect,
  });

  return serializeInvoice(invoice);
}

export async function withInvoiceGenerationLock<T>(
  prisma: PrismaClient,
  input: {
    billingId: string;
    facilityId: string;
    year: number;
  },
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${input.billingId}), 21)
      `;
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${input.facilityId}), ${input.year})
      `;

      return callback(tx);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

async function getNextInvoiceNumber(
  prisma: Prisma.TransactionClient,
  input: {
    facilityId: string;
    year: number;
  },
) {
  const updated = await prisma.invoiceSequence.upsert({
    where: {
      facilityId_year: {
        facilityId: input.facilityId,
        year: input.year,
      },
    },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
    create: {
      facilityId: input.facilityId,
      year: input.year,
      lastNumber: 1,
    },
    select: {
      lastNumber: true,
    },
  });

  return updated.lastNumber;
}

function buildFacilityCode(name: string) {
  const tokens = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length >= 3) {
    return tokens.slice(0, 4).map((token) => token[0]).join("");
  }

  const compact = tokens.join("");
  return (compact.slice(0, 4) || "FAC").padEnd(3, "X");
}

function sanitizeFacilityCode(code: string | null) {
  if (!code) {
    return null;
  }

  const normalized = code
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);

  return normalized.length >= 3 ? normalized : null;
}

function buildTaxSummary(
  ledgerEntries: BillingForInvoice["ledgerEntries"],
): InvoiceTaxSummary[] {
  return ledgerEntries
    .filter((entry) => entry.type === "TAX")
    .map((entry, index) => {
      const metadata = toSerializableMetadata(entry.metadata);
      const label =
        typeof metadata?.name === "string" && metadata.name.length > 0
          ? metadata.name
          : `Tax ${index + 1}`;

      return {
        label,
        amount: toMoneyDecimal(entry.amount).toFixed(2),
        rate:
          typeof metadata?.rate === "number" || typeof metadata?.rate === "string"
            ? String(metadata.rate)
            : null,
        cgstAmount:
          typeof metadata?.cgstAmount === "number" ||
          typeof metadata?.cgstAmount === "string"
            ? toMoneyDecimal(metadata.cgstAmount).toFixed(2)
            : null,
        sgstAmount:
          typeof metadata?.sgstAmount === "number" ||
          typeof metadata?.sgstAmount === "string"
            ? toMoneyDecimal(metadata.sgstAmount).toFixed(2)
            : null,
      };
    });
}

function extractFacilityGstNumber(items: BillingForInvoice["items"]) {
  for (const item of items) {
    const metadata = toSerializableMetadata(item.metadata);
    if (typeof metadata?.facilityGstNumber === "string" && metadata.facilityGstNumber) {
      return metadata.facilityGstNumber;
    }
  }

  return null;
}

function toSerializableMetadata(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
