import { NextRequest, NextResponse } from "next/server";
import { BillingStatus, Prisma } from "@/generated/tenant/client";
import { auditLog } from "@/lib/backend/audit/logger";
import {
  billingBaseSelect,
  billingDetailSelect,
  buildBillingListWhere,
  getBillingTotalsMap,
  serializeBillingDetail,
  serializeBillingListItem,
} from "@/lib/backend/billing/service";
import {
  createBillingSchema,
  listBillingQuerySchema,
} from "@/lib/backend/billing/schemas";
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
    permission: "billing:create",
    facilityScoped: true,
  });

  if (accessError) {
    return accessError;
  }

  const { error: facilityError, context } = await requireFacilityContext(req);
  if (facilityError) {
    return facilityError;
  }

  const createdBy = req.headers.get("x-user-id");
  if (!createdBy) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const parsed = createBillingSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid input", 400, {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const prisma = await getTenantPrisma(context.tenantId);
    const billing = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: {
          id: parsed.data.patientId,
          facilityId: context.facilityId,
          isDeleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!patient) {
        throw new Error("PATIENT_NOT_FOUND");
      }

      let doctorId = parsed.data.doctorId ?? null;
      let appointmentId = parsed.data.appointmentId ?? null;

      if (appointmentId) {
        const appointment = await tx.appointment.findFirst({
          where: {
            id: appointmentId,
            facilityId: context.facilityId,
          },
          select: {
            id: true,
            patientId: true,
            doctorId: true,
          },
        });

        if (!appointment) {
          throw new Error("APPOINTMENT_NOT_FOUND");
        }

        if (appointment.patientId !== parsed.data.patientId) {
          throw new Error("APPOINTMENT_PATIENT_MISMATCH");
        }

        if (doctorId && doctorId !== appointment.doctorId) {
          throw new Error("APPOINTMENT_DOCTOR_MISMATCH");
        }

        doctorId = appointment.doctorId;
        appointmentId = appointment.id;
      }

      if (doctorId) {
        const doctorFacility = await tx.doctorFacility.findFirst({
          where: {
            doctorId,
            facilityId: context.facilityId,
            doctor: {
              is: {
                isActive: true,
              },
            },
          },
          select: {
            doctorId: true,
          },
        });

        if (!doctorFacility) {
          throw new Error("DOCTOR_NOT_FOUND");
        }
      }

      return tx.billing.create({
        data: {
          patientId: parsed.data.patientId,
          doctorId,
          facilityId: context.facilityId,
          appointmentId,
          status: "DRAFT",
          createdBy,
        },
        select: billingDetailSelect,
      });
    });

    await auditLog(req, {
      action: "billing:create",
      resource: "Billing",
      resourceId: billing.id,
      permissionUsed: "billing:create",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        patientId: billing.patientId,
        doctorId: billing.doctorId,
        appointmentId: billing.appointmentId,
        status: billing.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBillingDetail(billing, {
        subtotal: 0,
        discount: 0,
        tax: 0,
        paid: 0,
        refund: 0,
        writeOff: 0,
        total: 0,
        due: 0,
      }),
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "PATIENT_NOT_FOUND":
          return jsonError("Patient not found in this facility", 404);
        case "DOCTOR_NOT_FOUND":
          return jsonError("Doctor is not assigned to this facility", 404);
        case "APPOINTMENT_NOT_FOUND":
          return jsonError("Appointment not found in this facility", 404);
        case "APPOINTMENT_PATIENT_MISMATCH":
          return jsonError("Appointment does not belong to the provided patient", 400);
        case "APPOINTMENT_DOCTOR_MISMATCH":
          return jsonError("Appointment doctor does not match the provided doctor", 400);
        default:
          break;
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("Billing already exists for this appointment", 409);
    }

    console.error("Create billing failed:", error);
    return jsonError("Failed to create billing", 500);
  }
}

export async function GET(req: NextRequest) {
  const accessError = requireAccess(req, {
    permission: "billing:read",
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
  const parsedQuery = listBillingQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    patientId: url.searchParams.get("patientId") ?? undefined,
    doctorId: url.searchParams.get("doctorId") ?? undefined,
    date: url.searchParams.get("date") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });

  if (!parsedQuery.success) {
    return jsonError("Invalid query parameters", 400, {
      fields: parsedQuery.error.flatten().fieldErrors,
    });
  }

  try {
    const prisma = await getTenantPrisma(context.tenantId);
    const where = buildBillingListWhere({
      facilityId: context.facilityId,
      status: parsedQuery.data.status as BillingStatus | undefined,
      patientId: parsedQuery.data.patientId,
      doctorId: parsedQuery.data.doctorId,
      date: parsedQuery.data.date,
      search: parsedQuery.data.search,
    });
    const skip = (parsedQuery.data.page - 1) * parsedQuery.data.pageSize;

    const [total, billings] = await prisma.$transaction([
      prisma.billing.count({ where }),
      prisma.billing.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: parsedQuery.data.pageSize,
        select: billingBaseSelect,
      }),
    ]);

    const totalsMap = await getBillingTotalsMap(prisma, {
      billingIds: billings.map((billing) => billing.id),
      facilityId: context.facilityId,
    });

    return NextResponse.json({
      success: true,
      data: billings.map((billing) =>
        serializeBillingListItem(
          billing,
          totalsMap.get(billing.id) ?? {
            subtotal: 0,
            discount: 0,
            tax: 0,
            paid: 0,
            refund: 0,
            writeOff: 0,
            total: 0,
            due: 0,
          },
        ),
      ),
      pagination: {
        page: parsedQuery.data.page,
        pageSize: parsedQuery.data.pageSize,
        total,
        totalPages: Math.ceil(total / parsedQuery.data.pageSize),
      },
    });
  } catch (error) {
    console.error("Fetch billing failed:", error);
    return jsonError("Failed to fetch billing", 500);
  }
}
