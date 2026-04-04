import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/control/client";
import { verifyAuthToken } from "@/lib/backend/auth/jwt";
import { isAccessibleTenantStatus } from "@/lib/backend/auth/tenant-state";
import { controlPrisma } from "@/lib/backend/prisma/control";

function unauthorizedResponse(clearToken = false) {
  const response = NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );

  if (clearToken) {
    response.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}

function forbiddenResponse() {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 },
  );
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return unauthorizedResponse();
    }

    let payload: ReturnType<typeof verifyAuthToken>;
    try {
      payload = verifyAuthToken(token);
    } catch {
      return unauthorizedResponse(true);
    }

    const { userId, activeTenantId } = payload;

    const membership = await controlPrisma.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: activeTenantId,
        },
      },
      select: {
        role: true,
        tenant: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!membership || !isAccessibleTenantStatus(membership.tenant.status)) {
      return unauthorizedResponse(true);
    }

    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const cursor = searchParams.get("cursor");

    const where: Prisma.AuditLogWhereInput = {
      tenantId: activeTenantId,
    };

    if (searchParams.get("action")) {
      where.action = searchParams.get("action")!;
    }

    if (searchParams.get("userId")) {
      where.userId = searchParams.get("userId")!;
    }

    if (searchParams.get("from") || searchParams.get("to")) {
      where.createdAt = {};
      if (searchParams.get("from")) {
        where.createdAt.gte = new Date(searchParams.get("from")!);
      }
      if (searchParams.get("to")) {
        where.createdAt.lte = new Date(searchParams.get("to")!);
      }
    }

    const logs = await controlPrisma.auditLog.findMany({
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
    console.error("Fetch control audit logs failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch control audit logs" },
      { status: 500 },
    );
  }
}
