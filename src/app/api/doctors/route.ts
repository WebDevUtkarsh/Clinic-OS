import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/tenant/client";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  buildDoctorCreateData,
  buildDoctorSearchWhere,
  doctorDetailSelect,
  ensureFacilityAccess,
  getDoctorListSelect,
  getFacilityRecordsByIds,
  isSuperAdmin,
  parseAccessibleFacilityIds,
  serializeDoctor,
  serializeDoctorListItem,
} from "@/lib/backend/doctors/service";
import {
  createDoctorSchema,
  doctorListQuerySchema,
} from "@/lib/backend/doctors/schemas";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

function jsonError(
  message: string,
  status: number,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

export async function POST(req: NextRequest) {
  const accessError = requireAccess(req, {
    permission: "doctors:create",
    facilityScoped: true,
  });

  if (accessError) {
    return accessError;
  }

  const { error: facilityError, context } = await requireFacilityContext(req);
  if (facilityError) {
    return facilityError;
  }

  const accessibleFacilityIds = parseAccessibleFacilityIds(req);
  const superAdmin = isSuperAdmin(req);

  try {
    const body = await req.json();
    const parsed = createDoctorSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid input", 400, {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const requestedFacilityIds = parsed.data.facilities.map(
      (facility) => facility.facilityId,
    );

    if (
      !superAdmin &&
      !ensureFacilityAccess(requestedFacilityIds, accessibleFacilityIds)
    ) {
      return jsonError("Access denied for one or more facilities", 403);
    }

    const prisma = await getTenantPrisma(context.tenantId);
    const facilities = await getFacilityRecordsByIds(prisma, requestedFacilityIds);

    if (facilities.length !== requestedFacilityIds.length) {
      return jsonError("One or more facilities do not exist", 400);
    }

    const doctor = await prisma.$transaction(async (tx) => {
      const existingDoctor = await tx.doctor.findUnique({
        where: { email: parsed.data.email },
        select: { id: true },
      });

      if (existingDoctor) {
        throw new Error("DOCTOR_EMAIL_EXISTS");
      }

      return tx.doctor.create({
        data: buildDoctorCreateData(parsed.data, facilities),
        select: doctorDetailSelect,
      });
    });

    const organizationIds = Array.from(
      new Set(facilities.map((facility) => facility.organizationId)),
    );

    await auditLog(req, {
      action: "doctors:create",
      resource: "Doctor",
      resourceId: doctor.id,
      permissionUsed: "doctors:create",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        assignedFacilityIds: requestedFacilityIds,
        assignedOrganizationIds: organizationIds,
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeDoctor(
        doctor,
        superAdmin ? undefined : { allowedFacilityIds: accessibleFacilityIds },
      ),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DOCTOR_EMAIL_EXISTS") {
      return jsonError("Doctor email already exists", 409);
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("Doctor email already exists", 409);
    }

    console.error("Create doctor failed:", error);
    return jsonError("Failed to create doctor", 500);
  }
}

export async function GET(req: NextRequest) {
  const accessError = requireAccess(req, {
    permission: "doctors:read",
    facilityScoped: true,
  });

  if (accessError) {
    return accessError;
  }

  const { error: facilityError, context } = await requireFacilityContext(req);
  if (facilityError) {
    return facilityError;
  }

  const url = new URL(req.url);
  const parsedQuery = doctorListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    includeInactive: url.searchParams.get("includeInactive") ?? undefined,
  });

  if (!parsedQuery.success) {
    return jsonError("Invalid query parameters", 400, {
      fields: parsedQuery.error.flatten().fieldErrors,
    });
  }

  try {
    const prisma = await getTenantPrisma(context.tenantId);
    const searchWhere = buildDoctorSearchWhere(parsedQuery.data.search);
    const where: Prisma.DoctorWhereInput = {
      facilities: {
        some: {
          facilityId: context.facilityId,
        },
      },
      ...(parsedQuery.data.includeInactive ? {} : { isActive: true }),
      ...(searchWhere ?? {}),
    };

    const skip = (parsedQuery.data.page - 1) * parsedQuery.data.pageSize;
    const [total, doctors] = await prisma.$transaction([
      prisma.doctor.count({ where }),
      prisma.doctor.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: parsedQuery.data.pageSize,
        select: getDoctorListSelect(context.facilityId),
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: doctors.map((doctor) =>
        serializeDoctorListItem(doctor, context.facilityId),
      ),
      pagination: {
        page: parsedQuery.data.page,
        pageSize: parsedQuery.data.pageSize,
        total,
        totalPages: Math.ceil(total / parsedQuery.data.pageSize),
      },
    });
  } catch (error) {
    console.error("Fetch doctors failed:", error);
    return jsonError("Failed to fetch doctors", 500);
  }
}
