import { NextRequest, NextResponse } from "next/server";
import { logControlAuditEvent } from "@/lib/backend/audit/control";
import { verifyAuthToken } from "@/lib/backend/auth/jwt";
import { invalidateAuthCache } from "@/lib/backend/cache/invalidate";

function buildLogoutResponse() {
  const response = NextResponse.json(
    {
      success: true,
      message: "Logged out successfully",
    },
    { status: 200 },
  );

  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  response.headers.set("Cache-Control", "no-store");

  return response;
}

export async function POST(req: NextRequest) {
  const response = buildLogoutResponse();
  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    return response;
  }

  try {
    const payload = verifyAuthToken(token);

    await Promise.all([
      invalidateAuthCache(payload.activeTenantId, payload.userId),
      logControlAuditEvent({
        action: "AUTH_LOGOUT_SUCCESS",
        req,
        userId: payload.userId,
        tenantId: payload.activeTenantId,
        metadata: {
          reason: "USER_INITIATED",
        },
      }),
    ]);
  } catch (error) {
    console.error("Logout token handling failed:", error);
  }

  return response;
}
