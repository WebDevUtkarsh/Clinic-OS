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

    const data = await prisma.userBehaviorProfile.findMany({
      take: 50,
      orderBy: { avgActionsPerMinute: "desc" },
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Behavior API failed:", err);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}