import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";

type FacilityAccessContext = {
  tenantId: string;
  facilityId: string;
  organizationId: string;
};

type FacilityAccessResult =
  | { error: NextResponse; context: null }
  | { error: null; context: FacilityAccessContext };

function parseStringArrayHeader(value: string | null): string[] {
  try {
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
}

function forbidden(message: string) {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 },
  );
}

function badRequest(message: string) {
  return NextResponse.json(
    { success: false, error: message },
    { status: 400 },
  );
}

function facilitySetupRequired() {
  return NextResponse.json(
    { success: false, error: "Facility setup required" },
    { status: 409 },
  );
}

export async function requireFacilityContext(
  req: NextRequest,
): Promise<FacilityAccessResult> {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return { error: unauthorized(), context: null };
  }

  const prisma = await getTenantPrisma(tenantId);
  const facilityId = req.headers.get("x-facility-id");
  const isSuperAdmin = req.headers.get("x-super-admin") === "true";
  const accessibleFacilityIds = parseStringArrayHeader(req.headers.get("x-facilities"));

  if (!facilityId) {
    if (!(await hasAnyFacility(prisma))) {
      return { error: facilitySetupRequired(), context: null };
    }

    return { error: badRequest("Facility context required"), context: null };
  }

  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!facility) {
    if (!(await hasAnyFacility(prisma))) {
      return { error: facilitySetupRequired(), context: null };
    }

    return { error: forbidden("Access denied for this facility"), context: null };
  }

  if (!isSuperAdmin && !accessibleFacilityIds.includes(facilityId)) {
    return { error: forbidden("Access denied for this facility"), context: null };
  }

  return {
    error: null,
    context: {
      tenantId,
      facilityId: facility.id,
      organizationId: facility.organizationId,
    },
  };
}

async function hasAnyFacility(prisma: Awaited<ReturnType<typeof getTenantPrisma>>) {
  const facility = await prisma.facility.findFirst({
    select: { id: true },
  });

  return Boolean(facility);
}
