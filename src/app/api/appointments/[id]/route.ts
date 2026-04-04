import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/backend/audit/logger";
import { invalidateAppointmentSlotsCache } from "@/lib/backend/appointments/cache";
import {
  appointmentSelect,
  serializeAppointment,
} from "@/lib/backend/appointments/service";
import { updateAppointmentStatusSchema } from "@/lib/backend/appointments/schemas";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

type AppointmentRouteContext = {
  params: Promise<{ id: string }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: AppointmentRouteContext,
) {
  const accessError = requireAccess(req, {
    permission: "appointments:update",
    facilityScoped: true,
  });

  if (accessError) {
    return accessError;
  }

  const { error: facilityError, context } = await requireFacilityContext(req);
  if (facilityError) {
    return facilityError;
  }

  try {
    const body = await req.json();
    const parsed = updateAppointmentStatusSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid input", 400);
    }

    const { id } = await params;
    const prisma = await getTenantPrisma(context.tenantId);

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        facilityId: context.facilityId,
      },
      select: {
        id: true,
        status: true,
        doctorId: true,
        facilityId: true,
      },
    });

    if (!existingAppointment) {
      return jsonError("Appointment not found", 404);
    }

    if (
      existingAppointment.status === "COMPLETED" &&
      parsed.data.status === "CANCELLED"
    ) {
      return jsonError("Completed appointments cannot be cancelled", 400);
    }

    if (
      existingAppointment.status === "CANCELLED" &&
      parsed.data.status === "COMPLETED"
    ) {
      return jsonError("Cancelled appointments cannot be completed", 400);
    }

    const appointment = await prisma.appointment.update({
      where: { id: existingAppointment.id },
      data: {
        status: parsed.data.status,
      },
      select: appointmentSelect,
    });

    if (existingAppointment.status === "BOOKED") {
      await invalidateAppointmentSlotsCache({
        tenantId: context.tenantId,
        doctorId: existingAppointment.doctorId,
        facilityId: existingAppointment.facilityId,
      });
    }

    await auditLog(req, {
      action: "appointments:update-status",
      resource: "Appointment",
      resourceId: appointment.id,
      permissionUsed: "appointments:update",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        previousStatus: existingAppointment.status,
        nextStatus: parsed.data.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeAppointment(appointment),
    });
  } catch (error) {
    console.error("Update appointment failed:", error);
    return jsonError("Failed to update appointment", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: AppointmentRouteContext,
) {
  const accessError = requireAccess(req, {
    permission: "appointments:update",
    facilityScoped: true,
  });

  if (accessError) {
    return accessError;
  }

  const { error: facilityError, context } = await requireFacilityContext(req);
  if (facilityError) {
    return facilityError;
  }

  try {
    const { id } = await params;
    const prisma = await getTenantPrisma(context.tenantId);

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        facilityId: context.facilityId,
      },
      select: {
        id: true,
        status: true,
        doctorId: true,
        facilityId: true,
      },
    });

    if (!existingAppointment) {
      return jsonError("Appointment not found", 404);
    }

    if (existingAppointment.status === "COMPLETED") {
      return jsonError("Completed appointments cannot be cancelled", 400);
    }

    const appointment = await prisma.appointment.update({
      where: { id: existingAppointment.id },
      data: {
        status: "CANCELLED",
      },
      select: appointmentSelect,
    });

    if (existingAppointment.status === "BOOKED") {
      await invalidateAppointmentSlotsCache({
        tenantId: context.tenantId,
        doctorId: existingAppointment.doctorId,
        facilityId: existingAppointment.facilityId,
      });
    }

    await auditLog(req, {
      action: "appointments:cancel",
      resource: "Appointment",
      resourceId: appointment.id,
      permissionUsed: "appointments:update",
      facilityId: context.facilityId,
      organizationId: context.organizationId,
      metadata: {
        previousStatus: existingAppointment.status,
        nextStatus: "CANCELLED",
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeAppointment(appointment),
    });
  } catch (error) {
    console.error("Cancel appointment failed:", error);
    return jsonError("Failed to cancel appointment", 500);
  }
}
