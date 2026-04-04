import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";
import type { Prisma } from "@/generated/tenant/client";

export async function GET(req: NextRequest) {
  const error = requireAccess(req, {
    permission: "audit:read",
    facilityScoped: false,
  });

  if (error) return error;

  try {
    const tenantId = req.headers.get("x-tenant-id")!;
    const isSuperAdmin = req.headers.get("x-super-admin") === "true";

    const facilityIds = JSON.parse(
      req.headers.get("x-facilities") || "[]"
    ) as string[];

    const { searchParams } = new URL(req.url);

    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const cursor = searchParams.get("cursor");

    const where: Prisma.AuditLogWhereInput = {};

    if (searchParams.get("action"))
      where.action = searchParams.get("action")!;

    if (searchParams.get("userId"))
      where.userId = searchParams.get("userId")!;

    if (searchParams.get("permission"))
      where.permissionUsed = searchParams.get("permission")!;

    if (searchParams.get("from") || searchParams.get("to")) {
      where.createdAt = {};
      if (searchParams.get("from"))
        where.createdAt.gte = new Date(searchParams.get("from")!);
      if (searchParams.get("to"))
        where.createdAt.lte = new Date(searchParams.get("to")!);
    }

    // 🔐 Facility isolation
    if (!isSuperAdmin) {
      where.OR = [
        { facilityId: null },
        { facilityId: { in: facilityIds } },
      ];
    }

    const prisma = await getTenantPrisma(tenantId);

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    const hasNextPage = logs.length > limit;
    const data = hasNextPage ? logs.slice(0, -1) : logs;

    return NextResponse.json({
      success: true,
      data,
      nextCursor: hasNextPage ? data[data.length - 1].id : null,
    });
  } catch (error) {
    console.error("Fetch audit logs failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
