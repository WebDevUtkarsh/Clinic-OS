import type { NextRequest } from "next/server";
import { Prisma, PrismaClient } from "@/generated/tenant/client";
import type { CreateDoctorInput } from "@/lib/backend/doctors/schemas";
import type {
  DoctorFacilityResponse,
  DoctorListItemResponse,
  DoctorResponse,
} from "@/lib/backend/doctors/types";

export const doctorBaseSelect = {
  id: true,
  userId: true,
  salutation: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  specialization: true,
  licenseNumber: true,
  councilName: true,
  yearsOfExperience: true,
  address: true,
  city: true,
  state: true,
  postalCode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DoctorSelect;

export const doctorFacilitySelect = {
  id: true,
  facilityId: true,
  organizationId: true,
  consultationFee: true,
  consultationDuration: true,
  consultationStartTime: true,
  consultationEndTime: true,
  createdAt: true,
  facility: {
    select: {
      id: true,
      organizationId: true,
      name: true,
      type: true,
    },
  },
} satisfies Prisma.DoctorFacilitySelect;

export const doctorDetailSelect = {
  ...doctorBaseSelect,
  facilities: {
    select: doctorFacilitySelect,
    orderBy: [
      { facility: { name: "asc" } },
      { createdAt: "asc" },
    ],
  },
} satisfies Prisma.DoctorSelect;

export function getDoctorListSelect(currentFacilityId: string) {
  return {
    ...doctorBaseSelect,
    facilities: {
      where: {
        facilityId: currentFacilityId,
      },
      select: doctorFacilitySelect,
      take: 1,
    },
  } satisfies Prisma.DoctorSelect;
}

export function parseAccessibleFacilityIds(req: NextRequest): string[] {
  return parseStringArrayHeader(req.headers.get("x-facilities"));
}

export function isSuperAdmin(req: NextRequest): boolean {
  return req.headers.get("x-super-admin") === "true";
}

export function buildDoctorSearchWhere(search: string | null | undefined) {
  const normalizedSearch = search?.trim();

  if (!normalizedSearch) {
    return undefined;
  }

  const terms = normalizedSearch
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (terms.length === 0) {
    return undefined;
  }

  return {
    AND: terms.map((term) => ({
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
        { specialization: { contains: term, mode: "insensitive" } },
        { licenseNumber: { contains: term, mode: "insensitive" } },
      ],
    })),
  } satisfies Prisma.DoctorWhereInput;
}

export async function getAccessibleDoctorById(
  prisma: PrismaClient,
  input: {
    doctorId: string;
    accessibleFacilityIds: string[];
    superAdmin: boolean;
  },
) {
  return prisma.doctor.findFirst({
    where: {
      id: input.doctorId,
      ...(input.superAdmin
        ? {}
        : {
            facilities: {
              some: {
                facilityId: {
                  in: input.accessibleFacilityIds,
                },
              },
            },
          }),
    },
    select: {
      ...doctorDetailSelect,
    },
  });
}

export async function getFacilityRecordsByIds(
  prisma: PrismaClient,
  facilityIds: string[],
) {
  if (facilityIds.length === 0) {
    return [];
  }

  return prisma.facility.findMany({
    where: {
      id: {
        in: facilityIds,
      },
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      type: true,
    },
  });
}

export function ensureFacilityAccess(
  facilityIds: string[],
  accessibleFacilityIds: string[],
) {
  if (facilityIds.length === 0) {
    return true;
  }

  const accessibleSet = new Set(accessibleFacilityIds);
  return facilityIds.every((facilityId) => accessibleSet.has(facilityId));
}

export function buildDoctorCreateData(
  input: CreateDoctorInput,
  facilities: Array<{ id: string; organizationId: string }>,
) {
  const facilityMap = new Map(
    facilities.map((facility) => [
      facility.id,
      facility.organizationId,
    ]),
  );

  return {
    salutation: input.salutation ?? null,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone ?? null,
    specialization: input.specialization ?? null,
    licenseNumber: input.licenseNumber ?? null,
    councilName: input.councilName ?? null,
    yearsOfExperience: input.yearsOfExperience ?? null,
    address: input.address ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    postalCode: input.postalCode ?? null,
    facilities: {
      create: input.facilities.map((facility) => ({
        facilityId: facility.facilityId,
        organizationId: facilityMap.get(facility.facilityId) ?? "",
        consultationFee: facility.consultationFee ?? null,
        consultationDuration: facility.consultationDuration ?? null,
        consultationStartTime: facility.consultationStartTime ?? null,
        consultationEndTime: facility.consultationEndTime ?? null,
      })),
    },
  } satisfies Prisma.DoctorCreateInput;
}

export function serializeDoctor(
  doctor: {
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
    createdAt: Date;
    updatedAt: Date;
    facilities: Array<{
      id: string;
      facilityId: string;
      organizationId: string;
      consultationFee: number | null;
      consultationDuration: number | null;
      consultationStartTime: string | null;
      consultationEndTime: string | null;
      createdAt: Date;
      facility: {
        id: string;
        organizationId: string;
        name: string;
        type: DoctorFacilityResponse["facility"]["type"];
      };
    }>;
  },
  options?: {
    allowedFacilityIds?: string[];
  },
): DoctorResponse {
  const allowedFacilityIds = options?.allowedFacilityIds
    ? new Set(options.allowedFacilityIds)
    : null;

  const facilities = doctor.facilities
    .filter((facility) =>
      allowedFacilityIds ? allowedFacilityIds.has(facility.facilityId) : true,
    )
    .map(serializeDoctorFacility);

  return {
    id: doctor.id,
    userId: doctor.userId,
    salutation: doctor.salutation,
    firstName: doctor.firstName,
    lastName: doctor.lastName,
    email: doctor.email,
    phone: doctor.phone,
    specialization: doctor.specialization,
    licenseNumber: doctor.licenseNumber,
    councilName: doctor.councilName,
    yearsOfExperience: doctor.yearsOfExperience,
    address: doctor.address,
    city: doctor.city,
    state: doctor.state,
    postalCode: doctor.postalCode,
    isActive: doctor.isActive,
    createdAt: doctor.createdAt.toISOString(),
    updatedAt: doctor.updatedAt.toISOString(),
    facilities,
  };
}

export function serializeDoctorListItem(
  doctor: {
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
    createdAt: Date;
    updatedAt: Date;
    facilities: Array<{
      id: string;
      facilityId: string;
      organizationId: string;
      consultationFee: number | null;
      consultationDuration: number | null;
      consultationStartTime: string | null;
      consultationEndTime: string | null;
      createdAt: Date;
      facility: {
        id: string;
        organizationId: string;
        name: string;
        type: DoctorFacilityResponse["facility"]["type"];
      };
    }>;
  },
  currentFacilityId: string,
): DoctorListItemResponse {
  const serialized = serializeDoctor(doctor);
  const currentFacility =
    serialized.facilities.find(
      (facility) => facility.facilityId === currentFacilityId,
    ) ?? null;

  return {
    ...serialized,
    currentFacility,
  };
}

function serializeDoctorFacility(facility: {
  id: string;
  facilityId: string;
  organizationId: string;
  consultationFee: number | null;
  consultationDuration: number | null;
  consultationStartTime: string | null;
  consultationEndTime: string | null;
  createdAt: Date;
  facility: {
    id: string;
    organizationId: string;
    name: string;
    type: DoctorFacilityResponse["facility"]["type"];
  };
}): DoctorFacilityResponse {
  return {
    id: facility.id,
    facilityId: facility.facilityId,
    organizationId: facility.organizationId,
    consultationFee: facility.consultationFee,
    consultationDuration: facility.consultationDuration,
    consultationStartTime: facility.consultationStartTime,
    consultationEndTime: facility.consultationEndTime,
    createdAt: facility.createdAt.toISOString(),
    facility: {
      id: facility.facility.id,
      organizationId: facility.facility.organizationId,
      name: facility.facility.name,
      type: facility.facility.type,
    },
  };
}

function parseStringArrayHeader(value: string | null): string[] {
  try {
    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
