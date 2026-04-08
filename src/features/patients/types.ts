import { z } from "zod";

export const patientSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  name: z.string(),
  gender: z.enum(["Male", "Female", "Other"]),
  dob: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Patient = z.infer<typeof patientSchema>;

export const createPatientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.enum(["Male", "Female", "Other"]),
  dob: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
});

export type CreatePatientPayload = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial();
export type UpdatePatientPayload = z.infer<typeof updatePatientSchema>;

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
  nextCursor?: string | null;
  count?: number;
  duplicate?: Partial<Patient>;
};
