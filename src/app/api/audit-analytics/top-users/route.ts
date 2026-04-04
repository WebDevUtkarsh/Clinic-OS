import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";
import type { Prisma } from "@/generated/tenant/client";

export async function GET(req: NextRequest) {
  const error = requireAccess(req, {
    permission: "audit:read",
  });

  if (error) return error;

  try {
    const tenantId = req.headers.get("x-tenant-id")!;
    const isSuperAdmin = req.headers.get("x-super-admin") === "true";

    const facilityIds = JSON.parse(
      req.headers.get("x-facilities") || "[]"
    ) as string[];

    const prisma = await getTenantPrisma(tenantId);

    const where: Prisma.AuditLogWhereInput = {};

    if (!isSuperAdmin) {
      where.OR = [
        { facilityId: null },
        { facilityId: { in: facilityIds } },
      ];
    }

    const users = await prisma.auditLog.groupBy({
      by: ["userId"],
      where,
      _count: { userId: true },
      orderBy: {
        _count: { userId: "desc" },
      },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (err) {
    console.error("Top users failed:", err);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
