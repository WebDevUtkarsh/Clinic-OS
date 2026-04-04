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

export const createAppointmentSchema = z.object({
  patientId: z.string().trim().min(1).max(191),
  doctorId: z.string().trim().min(1).max(191),
  startTime: z.string().trim().min(1).max(64),
  timezone: z.string().trim().min(1).max(100).optional(),
});

export const appointmentSlotsQuerySchema = z.object({
  doctorId: z.string().trim().min(1).max(191),
  date: z.string().regex(DATE_PATTERN, "Invalid date"),
  timezone: z.preprocess(
    preprocessOptionalText,
    z.string().min(1).max(100).optional(),
  ),
});

export const listAppointmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  date: z.preprocess(
    preprocessOptionalText,
    z.string().regex(DATE_PATTERN, "Invalid date").optional(),
  ),
  doctorId: z.preprocess(
    preprocessOptionalText,
    z.string().min(1).max(191).optional(),
  ),
  status: z.preprocess(
    preprocessOptionalText,
    z.enum(["BOOKED", "CANCELLED", "COMPLETED"]).optional(),
  ),
  timezone: z.preprocess(
    preprocessOptionalText,
    z.string().min(1).max(100).optional(),
  ),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["CANCELLED", "COMPLETED"]),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type AppointmentSlotsQueryInput = z.infer<typeof appointmentSlotsQuerySchema>;
export type ListAppointmentsQueryInput = z.infer<typeof listAppointmentsQuerySchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
