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

    // 🔥 1. Suspicious high-activity users
    const suspiciousUsers = await prisma.auditLog.groupBy({
      by: ["userId"],
      where,
      _count: { userId: true },
      having: {
        userId: {
          _count: { gt: 300 }, // configurable threshold
        },
      },
    });

    // 🔥 2. Most used permissions
    const topPermissions = await prisma.auditLog.groupBy({
      by: ["permissionUsed"],
      where,
      _count: { permissionUsed: true },
      orderBy: {
        _count: { permissionUsed: "desc" },
      },
      take: 5,
    });

    // 🔥 3. Sensitive actions spike
    const deletes = await prisma.auditLog.count({
      where: {
        ...where,
        action: "DELETE",
      },
    });

    const insights = {
      suspiciousUsers,
      topPermissions,
      riskFlags: {
        excessiveDeletes: deletes > 100,
      },
    };

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (err) {
    console.error("Audit insights failed:", err);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
