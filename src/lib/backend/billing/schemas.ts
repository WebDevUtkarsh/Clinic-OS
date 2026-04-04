import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function preprocessOptionalText(value: unknown) {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function preprocessRequiredText(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}

function preprocessMoney(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return value;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const metadataSchema = z.record(z.string(), jsonValueSchema).optional();
const billingItemTypeSchema = z.enum([
  "CONSULTATION",
  "TREATMENT",
  "LAB",
  "MEDICATION",
  "PACKAGE",
  "OTHER",
]);

export const createBillingSchema = z
  .object({
    patientId: z.preprocess(
      preprocessRequiredText,
      z.string().min(1).max(191),
    ),
    doctorId: z.preprocess(
      preprocessOptionalText,
      z.string().min(1).max(191).optional(),
    ),
    appointmentId: z.preprocess(
      preprocessOptionalText,
      z.string().min(1).max(191).optional(),
    ),
  });

export const listBillingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.preprocess(
    preprocessOptionalText,
    z
      .enum(["DRAFT", "GENERATED", "PARTIALLY_PAID", "PAID", "CANCELLED"])
      .optional(),
  ),
  patientId: z.preprocess(
    preprocessOptionalText,
    z.string().min(1).max(191).optional(),
  ),
  doctorId: z.preprocess(
    preprocessOptionalText,
    z.string().min(1).max(191).optional(),
  ),
  date: z.preprocess(
    preprocessOptionalText,
    z.string().regex(DATE_PATTERN, "Invalid date").optional(),
  ),
  search: z.preprocess(
    preprocessOptionalText,
    z.string().min(1).max(120).optional(),
  ),
});

export const addBillingItemSchema = z
  .object({
    type: billingItemTypeSchema,
    serviceId: z.preprocess(
      preprocessOptionalText,
      z.string().min(1).max(191).optional(),
    ),
    name: z.preprocess(
      preprocessOptionalText,
      z.string().min(1).max(160).optional(),
    ),
    quantity: z.coerce.number().int().min(1).max(1000).default(1),
    unitPrice: z.preprocess(
      preprocessMoney,
      z.number().finite().min(0.01).max(100000000).optional(),
    ),
    metadata: metadataSchema,
  })
  .superRefine((value, ctx) => {
    if (value.serviceId) {
      return;
    }

    if (value.type === "CONSULTATION") {
      return;
    }

    if (!value.name) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Item name is required for manual charges",
      });
    }

    if (value.unitPrice === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["unitPrice"],
        message: "Unit price is required for manual charges",
      });
    }
  });

export const applyDiscountSchema = z.object({
  amount: z.preprocess(
    preprocessMoney,
    z.number().finite().min(0.01).max(100000000),
  ),
  reason: z.preprocess(
    preprocessRequiredText,
    z.string().min(1).max(240),
  ),
  metadata: metadataSchema,
});

const taxLineSchema = z
  .object({
    name: z.preprocess(
      preprocessRequiredText,
      z.string().min(1).max(120),
    ),
    rate: z.preprocess(
      preprocessMoney,
      z.number().finite().min(0.01).max(100).optional(),
    ),
    amount: z.preprocess(
      preprocessMoney,
      z.number().finite().min(0.01).max(100000000).optional(),
    ),
    metadata: metadataSchema,
  })
  .superRefine((value, ctx) => {
    const hasRate = value.rate !== undefined;
    const hasAmount = value.amount !== undefined;

    if (hasRate === hasAmount) {
      ctx.addIssue({
        code: "custom",
        path: ["rate"],
        message: "Provide exactly one of rate or amount",
      });
    }
  });

export const applyTaxSchema = z.object({
  taxes: z.array(taxLineSchema).min(1).max(20),
});

export const makePaymentSchema = z.object({
  amount: z.preprocess(
    preprocessMoney,
    z.number().finite().min(0.01).max(100000000),
  ),
  method: z.enum(["CASH", "CARD", "UPI", "ONLINE"]),
  referenceId: z.preprocess(
    preprocessOptionalText,
    z.string().min(1).max(191).optional(),
  ),
  status: z.enum(["SUCCESS", "FAILED"]).default("SUCCESS"),
  idempotencyKey: z.preprocess(
    preprocessOptionalText,
    z.string().min(1).max(191).optional(),
  ),
});

export const refundBillingSchema = z.object({
  paymentId: z.preprocess(
    preprocessRequiredText,
    z.string().min(1).max(191),
  ),
  amount: z.preprocess(
    preprocessMoney,
    z.number().finite().min(0.01).max(100000000),
  ),
  reason: z.preprocess(
    preprocessRequiredText,
    z.string().min(1).max(240),
  ),
  metadata: metadataSchema,
});

export const writeOffBillingSchema = z.object({
  amount: z.preprocess(
    preprocessMoney,
    z.number().finite().min(0.01).max(100000000),
  ),
  reason: z.preprocess(
    preprocessRequiredText,
    z.string().min(1).max(240),
  ),
  metadata: metadataSchema,
});

export type CreateBillingInput = z.infer<typeof createBillingSchema>;
export type ListBillingQueryInput = z.infer<typeof listBillingQuerySchema>;
export type AddBillingItemInput = z.infer<typeof addBillingItemSchema>;
export type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>;
export type ApplyTaxInput = z.infer<typeof applyTaxSchema>;
export type MakePaymentInput = z.infer<typeof makePaymentSchema>;
export type RefundBillingInput = z.infer<typeof refundBillingSchema>;
export type WriteOffBillingInput = z.infer<typeof writeOffBillingSchema>;
