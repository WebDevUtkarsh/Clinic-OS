import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/backend/audit/logger";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";
import { Prisma } from "@/generated/tenant/client";

const schema = z.object({
  name: z.string().min(1),
  gender: z.enum(["Male", "Female", "Other"]),
  dob: z.string().datetime().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const accessError = requireAccess(req, {
    permission: "patients:create",
  });

  if (accessError) {
    return accessError;
  }

  try {
    const facilityResult = await requireFacilityContext(req);

    const { error: facilityError, context } = facilityResult;

    if (facilityError) {
      return facilityError;
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    const { facilityId } = context;

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    const prisma = await getTenantPrisma(facilityResult.context.tenantId);

    const existing = await prisma.patient.findFirst({
      where: {
        facilityId,
        isDeleted: false,
        OR: [
          { phone: parsed.data.phone || undefined },
          {
            AND: [
              { name: parsed.data.name },
              { dob: parsed.data.dob ? new Date(parsed.data.dob) : undefined },
            ],
          },
        ],
      },
      select: { id: true, name: true, phone: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Possible duplicate patient", duplicate: existing}
      )
    }

    const patient = await prisma.patient.create({
      data: {
        facilityId: facilityResult.context.facilityId,
        name: parsed.data.name,
        gender: parsed.data.gender,
        dob: parsed.data.dob ? new Date(parsed.data.dob) : null,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        address: parsed.data.address ?? null,
      },
    });

    await auditLog(req, {
      action: "patients:create",
      resource: "Patient",
      resourceId: patient.id,
      permissionUsed: "patients:create",
      facilityId: facilityResult.context.facilityId,
      organizationId: facilityResult.context.organizationId,
    });

    return NextResponse.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error("Create patient failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create patient" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const error = requireAccess(req, {
    permission: "patients:read",
    facilityScoped: true,
  });

  const { error: facilityError, context } = await requireFacilityContext(req);

  if (error) return error;
  if (facilityError) return facilityError;

  const { facilityId } = context;

  try {
    const tenantId = req.headers.get("x-tenant-id");
    const prisma = await getTenantPrisma(tenantId!);

    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const search = searchParams.get("search");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const normalized = search?.trim().toLowerCase();

    const where: Prisma.PatientWhereInput = {
      facilityId,
      isDeleted: false,
    };

    if (normalized) {
      where.OR = [
        { name: { contains: normalized, mode: "insensitive" } },
        { phone: { contains: normalized, mode: "insensitive" } },
        { email: { contains: normalized, mode: "insensitive" } },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    const hasNextPage = patients.length > limit;
    const data = hasNextPage ? patients.slice(0, -1) : patients;

    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return NextResponse.json({ success: true, data, nextCursor });
  } catch (error) {
    console.error("Fetch patients failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch patients" },
      { status: 500 },
    );
  }
}
