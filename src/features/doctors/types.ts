import { z } from "zod";

// ─────────────────────────────────────────────
// API Response Types (match backend serialization)
// ─────────────────────────────────────────────

export type DoctorFacility = {
  id: string;
  name: string;
  type: string;
  organizationId: string;
  mappingId: string;
  consultationFee: number | null;
  consultationDuration: number | null;
  consultationStartTime: string | null;
  consultationEndTime: string | null;
  createdAt: string;
};

export type Doctor = {
  id: string;
  userId: string | null;
  salutation: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  licenseNumber: string | null;
  councilName: string | null;
  yearsOfExperience: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  facilities: DoctorFacility[];
};

export type DoctorListItem = Doctor & {
  currentFacility: DoctorFacility | null;
};

// ─────────────────────────────────────────────
// Status Derivation
// ─────────────────────────────────────────────

export type DoctorStatus = "ACTIVE" | "INVITED" | "NOT_INVITED" | "DISABLED";

export function deriveDoctorStatus(doctor: Pick<Doctor, "userId" | "isActive">): DoctorStatus {
  if (!doctor.isActive) return "DISABLED";
  if (doctor.userId) return "ACTIVE";
  return "NOT_INVITED";
}

// ─────────────────────────────────────────────
// API Envelopes
// ─────────────────────────────────────────────

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
  details?: Record<string, unknown>;
};

export type PaginatedResponse<T> = {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

// ─────────────────────────────────────────────
// Form Schemas (aligned with backend Zod)
// ─────────────────────────────────────────────

export const facilityAssignmentSchema = z.object({
  facilityId: z.string().min(1, "Facility is required"),
  consultationFee: z.number().min(0).nullable().optional(),
  consultationDuration: z.number().int().min(1).max(480).nullable().optional(),
  consultationStartTime: z.string().nullable().optional(),
  consultationEndTime: z.string().nullable().optional(),
});

export const createDoctorSchema = z.object({
  salutation: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  councilName: z.string().optional(),
  yearsOfExperience: z.number().int().min(0).max(80).nullable().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  facilities: z.array(facilityAssignmentSchema).min(1, "At least one facility must be assigned"),
});

export type CreateDoctorPayload = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = z.object({
  salutation: z.string().nullable().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  specialization: z.string().nullable().optional(),
  licenseNumber: z.string().nullable().optional(),
  councilName: z.string().nullable().optional(),
  yearsOfExperience: z.number().int().min(0).max(80).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
});

export type UpdateDoctorPayload = z.infer<typeof updateDoctorSchema>;

export type UpdateDoctorFacilitiesPayload = {
  assign: Array<z.infer<typeof facilityAssignmentSchema>>;
  remove: string[];
};

export type DoctorInviteResponse = {
  inviteId: string;
  email: string;
  expiresAt: string;
};
