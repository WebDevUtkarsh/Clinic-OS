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

export const reportFiltersSchema = z
  .object({
    from: z.preprocess(
      preprocessOptionalText,
      z.string().regex(DATE_PATTERN, "Invalid from date").optional(),
    ),
    to: z.preprocess(
      preprocessOptionalText,
      z.string().regex(DATE_PATTERN, "Invalid to date").optional(),
    ),
    facilityId: z.preprocess(
      preprocessOptionalText,
      z.string().min(1).max(191).optional(),
    ),
    doctorId: z.preprocess(
      preprocessOptionalText,
      z.string().min(1).max(191).optional(),
    ),
    timezone: z.preprocess(
      preprocessOptionalText,
      z.string().min(1).max(100).optional(),
    ),
  })
  .refine(
    (value) =>
      !value.from ||
      !value.to ||
      value.from.localeCompare(value.to) <= 0,
    {
      message: "`from` must be before or equal to `to`",
      path: ["from"],
    },
  );

export const doctorEarningsQuerySchema = reportFiltersSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ReportFiltersInput = z.infer<typeof reportFiltersSchema>;
export type DoctorEarningsQueryInput = z.infer<typeof doctorEarningsQuerySchema>;
