import { z } from "zod";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function preprocessRequiredText(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}

function preprocessOptionalText(value: unknown) {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function preprocessBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return value;
}

function requiredText(maxLength: number) {
  return z.preprocess(
    preprocessRequiredText,
    z.string().min(1).max(maxLength),
  );
}

function optionalNullableText(maxLength: number) {
  return z.preprocess(
    preprocessOptionalText,
    z.string().max(maxLength).nullable().optional(),
  );
}

function optionalNullableTime() {
  return z.preprocess(
    preprocessOptionalText,
    z.string().regex(TIME_PATTERN, "Invalid time").nullable().optional(),
  );
}

function validateConsultationWindow(
  data: {
    consultationStartTime?: string | null;
    consultationEndTime?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  const { consultationStartTime, consultationEndTime } = data;

  if (!consultationStartTime || !consultationEndTime) {
    return;
  }

  if (consultationStartTime >= consultationEndTime) {
    ctx.addIssue({
      code: "custom",
      path: ["consultationEndTime"],
      message: "Consultation end time must be after start time",
    });
  }
}

export const doctorFacilityAssignmentSchema = z
  .object({
    facilityId: requiredText(191),
    consultationFee: z.number().finite().min(0).nullable().optional(),
    consultationDuration: z.number().int().min(1).max(480).nullable().optional(),
    consultationStartTime: optionalNullableTime(),
    consultationEndTime: optionalNullableTime(),
  })
  .superRefine(validateConsultationWindow);

export const createDoctorSchema = z
  .object({
    salutation: optionalNullableText(40),
    firstName: requiredText(120),
    lastName: requiredText(120),
    email: z.preprocess(
      preprocessRequiredText,
      z.string().email().max(255).transform((value) => value.toLowerCase()),
    ),
    phone: optionalNullableText(32),
    specialization: optionalNullableText(120),
    licenseNumber: optionalNullableText(120),
    councilName: optionalNullableText(120),
    yearsOfExperience: z.number().int().min(0).max(80).nullable().optional(),
    address: optionalNullableText(240),
    city: optionalNullableText(120),
    state: optionalNullableText(120),
    postalCode: optionalNullableText(32),
    facilities: z.array(doctorFacilityAssignmentSchema).min(1).max(100),
  })
  .superRefine((data, ctx) => {
    const facilityIds = new Set<string>();

    for (const [index, facility] of data.facilities.entries()) {
      if (facilityIds.has(facility.facilityId)) {
        ctx.addIssue({
          code: "custom",
          path: ["facilities", index, "facilityId"],
          message: "Duplicate facility mapping is not allowed",
        });
      }

      facilityIds.add(facility.facilityId);
    }
  });

export const updateDoctorSchema = z
  .object({
    salutation: optionalNullableText(40),
    firstName: z.preprocess(
      preprocessRequiredText,
      z.string().min(1).max(120).optional(),
    ),
    lastName: z.preprocess(
      preprocessRequiredText,
      z.string().min(1).max(120).optional(),
    ),
    email: z.preprocess(
      preprocessRequiredText,
      z.string().email().max(255).transform((value) => value.toLowerCase()).optional(),
    ),
    phone: optionalNullableText(32),
    specialization: optionalNullableText(120),
    licenseNumber: optionalNullableText(120),
    councilName: optionalNullableText(120),
    yearsOfExperience: z.number().int().min(0).max(80).nullable().optional(),
    address: optionalNullableText(240),
    city: optionalNullableText(120),
    state: optionalNullableText(120),
    postalCode: optionalNullableText(32),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const updateDoctorFacilitiesSchema = z
  .object({
    assign: z.array(doctorFacilityAssignmentSchema).max(100).default([]),
    remove: z.array(requiredText(191)).max(100).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.assign.length === 0 && data.remove.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "At least one facility change is required",
      });
    }

    const assignedIds = new Set<string>();
    for (const [index, facility] of data.assign.entries()) {
      if (assignedIds.has(facility.facilityId)) {
        ctx.addIssue({
          code: "custom",
          path: ["assign", index, "facilityId"],
          message: "Duplicate facility assignment is not allowed",
        });
      }

      assignedIds.add(facility.facilityId);
    }

    const removedIds = new Set<string>();
    for (const [index, facilityId] of data.remove.entries()) {
      if (removedIds.has(facilityId)) {
        ctx.addIssue({
          code: "custom",
          path: ["remove", index],
          message: "Duplicate facility removal is not allowed",
        });
      }

      if (assignedIds.has(facilityId)) {
        ctx.addIssue({
          code: "custom",
          path: ["remove", index],
          message: "The same facility cannot be assigned and removed together",
        });
      }

      removedIds.add(facilityId);
    }
  });

export const doctorListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.preprocess(
    preprocessOptionalText,
    z.string().max(120).nullable().optional(),
  ),
  includeInactive: z.preprocess(preprocessBoolean, z.boolean().default(false)),
});

export const acceptDoctorInviteSchema = z.object({
  token: z.string().trim().min(1).max(512),
  password: z.string().min(8).max(72),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type UpdateDoctorFacilitiesInput = z.infer<typeof updateDoctorFacilitiesSchema>;
export type DoctorListQueryInput = z.infer<typeof doctorListQuerySchema>;
export type AcceptDoctorInviteInput = z.infer<typeof acceptDoctorInviteSchema>;
