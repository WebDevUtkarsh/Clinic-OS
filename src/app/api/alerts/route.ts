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
    const prisma = await getTenantPrisma(tenantId);

    const { searchParams } = new URL(req.url);

    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const cursor = searchParams.get("cursor");

    const severity = searchParams.get("severity");
    const type = searchParams.get("type");
    const userId = searchParams.get("userId");

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Prisma.AuditAlertWhereInput = {};

    if (severity) where.severity = severity;
    if (type) where.type = type;
    if (userId) where.userId = userId;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const alerts = await prisma.auditAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    const hasNext = alerts.length > limit;
    const data = hasNext ? alerts.slice(0, -1) : alerts;

    return NextResponse.json({
      success: true,
      data,
      nextCursor: hasNext ? data[data.length - 1].id : null,
    });
  } catch (err) {
    console.error("Fetch alerts failed:", err);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}