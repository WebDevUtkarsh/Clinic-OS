import { z } from "zod";

const metadataJsonSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(metadataJsonSchema),
    z.record(z.string(), metadataJsonSchema),
  ]),
);

const metadataRecordSchema = z.record(z.string(), metadataJsonSchema).nullable();

export const invoiceSnapshotSchema = z.object({
  invoiceId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  generatedAt: z.string().datetime(),
  billing: z.object({
    id: z.string().min(1),
    status: z.enum(["DRAFT", "GENERATED", "PARTIALLY_PAID", "PAID", "CANCELLED"]),
    appointmentId: z.string().nullable(),
    createdAt: z.string().datetime(),
  }),
  patient: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
  }),
  doctor: z
    .object({
      id: z.string().min(1),
      fullName: z.string().min(1),
      specialization: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
    })
    .nullable(),
  facility: z.object({
    id: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1),
    type: z.string().min(1),
    address: z.string().nullable(),
    organizationId: z.string().min(1),
    gstNumber: z.string().nullable(),
  }),
  items: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum([
        "CONSULTATION",
        "TREATMENT",
        "LAB",
        "MEDICATION",
        "PACKAGE",
        "OTHER",
      ]),
      name: z.string().min(1),
      quantity: z.number().int().min(1),
      unitPrice: z.string().min(1),
      lineTotal: z.string().min(1),
      metadata: metadataRecordSchema,
    }),
  ),
  payments: z.array(
    z.object({
      id: z.string().min(1),
      amount: z.string().min(1),
      method: z.enum(["CASH", "CARD", "UPI", "ONLINE"]),
      referenceId: z.string().nullable(),
      status: z.enum(["SUCCESS", "FAILED", "REFUNDED"]),
      createdAt: z.string().datetime(),
    }),
  ),
  totals: z.object({
    subtotal: z.string().min(1),
    discount: z.string().min(1),
    tax: z.string().min(1),
    total: z.string().min(1),
    paid: z.string().min(1),
    refund: z.string().min(1),
    writeOff: z.string().min(1),
    due: z.string().min(1),
  }),
  taxSummary: z.array(
    z.object({
      label: z.string().min(1),
      amount: z.string().min(1),
      rate: z.string().nullable(),
      cgstAmount: z.string().nullable(),
      sgstAmount: z.string().nullable(),
    }),
  ),
  metadata: z.object({
    tenantId: z.string().min(1),
    facilityId: z.string().min(1),
    organizationId: z.string().min(1),
    generatedBy: z.string().min(1),
    terms: z.array(z.string().min(1)).min(1),
    gstNote: z.string().min(1),
  }),
});
