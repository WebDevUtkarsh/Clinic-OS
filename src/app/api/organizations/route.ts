import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/backend/audit/logger";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";
import { enforceRateLimit, getRequestIp } from "@/lib/backend/security/rate-limit";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function POST(req: NextRequest) {
  const accessError = requireAccess(req, {
    permission: "organizations:create",
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
    key: `rate:onboarding:organizations:${tenantId}:${userId}:${getRequestIp(req)}`,
    limit: 20,
    windowSeconds: 60,
    message: "Too many organization creation attempts",
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
    const organization = await prisma.organization.create({
      data: {
        name: parsed.data.name,
      },
    });

    await auditLog(req, {
      action: "organizations:create",
      resource: "Organization",
      resourceId: organization.id,
      permissionUsed: "organizations:create",
      organizationId: organization.id,
    });

    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("Create organization failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create organization" },
      { status: 500 },
    );
  }
}
