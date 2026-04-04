import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";

export async function GET(req: NextRequest) {
  const error = requireAccess(req, {
    permission: "audit:read",
  });

  if (error) return error;

  try {
    const tenantId = req.headers.get("x-tenant-id")!;
    const prisma = await getTenantPrisma(tenantId);

    const { searchParams } = new URL(req.url);

    const days = Math.min(Number(searchParams.get("days") || 30), 90);

    const data = await prisma.auditDailyAggregate.findMany({
      orderBy: { date: "asc" },
      take: days,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Trends API failed:", err);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}