import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { controlPrisma } from "@/lib/backend/prisma/control";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { auditLog } from "@/lib/backend/audit/logger";
import { invalidateAuthCache } from "@/lib/backend/cache/invalidate";
import { requireAccess } from "@/lib/backend/rbac/guard";
import { enforceRateLimit, getRequestIp } from "@/lib/backend/security/rate-limit";

const schema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  type: z.enum(["CLINIC", "HOSPITAL", "DIAGNOSTIC", "PHARMACY"]),
  address: z.string().trim().min(1).max(240).optional(),
});

export async function POST(req: NextRequest) {
  const accessError = requireAccess(req, {
    permission: "facilities:create",
  });

  if (accessError) {
    return accessError;
  }

  const tenantId = req.headers.get("x-tenant-id");
  const userId = req.headers.get("x-user-id");

  if (!tenantId || !userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const rateLimitResponse = await enforceRateLimit({
    key: `rate:onboarding:facilities:${tenantId}:${userId}:${getRequestIp(req)}`,
    limit: 20,
    windowSeconds: 60,
    message: "Too many facility creation attempts",
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    const prisma = await getTenantPrisma(tenantId);

    const facility = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: parsed.data.organizationId },
        select: { id: true },
      });

      if (!organization) {
        throw new Error("ORGANIZATION_NOT_FOUND");
      }

      const createdFacility = await tx.facility.create({
        data: {
          organizationId: parsed.data.organizationId,
          name: parsed.data.name,
          type: parsed.data.type,
          address: parsed.data.address ?? null,
        },
      });

      const ownerRole = await tx.role.findFirst({
        where: { name: "OWNER" },
        select: { id: true },
      });

      if (!ownerRole) {
        throw new Error("OWNER_ROLE_NOT_FOUND");
      }

      const existingAssignment = await tx.userRole.findFirst({
        where: {
          userId,
          roleId: ownerRole.id,
          facilityId: createdFacility.id,
        },
        select: { id: true },
      });

      if (!existingAssignment) {
        await tx.userRole.create({
          data: {
            userId,
            roleId: ownerRole.id,
            facilityId: createdFacility.id,
          },
        });
      }

      return createdFacility;
    });

    await controlPrisma.tenant.update({
      where: { id: tenantId },
      data: { status: "ACTIVE" },
    });

    await invalidateAuthCache(tenantId, userId);

    await auditLog(req, {
      action: "facilities:create",
      resource: "Facility",
      resourceId: facility.id,
      permissionUsed: "facilities:create",
      facilityId: facility.id,
      organizationId: facility.organizationId,
    });

    return NextResponse.json({
      success: true,
      data: facility,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORGANIZATION_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 400 },
      );
    }

    console.error("Create facility failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create facility" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const accessError = requireAccess(req, {
    permission: "facilities:create",
  });

  if (accessError) {
    return accessError;
  }

  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const prisma = await getTenantPrisma(tenantId);
    const facilities = await prisma.facility.findMany({
      select: {
        id: true,
        organizationId: true,
        name: true,
        type: true,
        address: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: facilities,
    });
  } catch (error) {
    console.error("Fetch facilities failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch facilities" },
      { status: 500 },
    );
  }
}
