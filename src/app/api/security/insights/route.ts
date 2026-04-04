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

    const [alerts, risks, topUsers] = await Promise.all([
      prisma.auditAlert.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      prisma.userRiskScore.findMany({
        take: 5,
        orderBy: { score: "desc" },
      }),

      prisma.auditLog.groupBy({
        by: ["userId"],
        _count: true,
        orderBy: {
          _count: { userId: "desc" },
        },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        recentAlerts: alerts,
        topRiskUsers: risks,
        highActivityUsers: topUsers,
      },
    });
  } catch (err) {
    console.error("Insights failed:", err);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}