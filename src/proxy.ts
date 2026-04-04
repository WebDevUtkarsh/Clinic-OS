import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/backend/auth/jwt";
import { resolveAuthContext } from "@/lib/backend/auth/context";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/api/invites/accept" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    return unauthorized();
  }

  try {
    const payload = verifyAuthToken(token);
    const context = await resolveAuthContext(payload.activeTenantId, payload.userId);

    const headers = new Headers(req.headers);
    headers.set("x-user-id", payload.userId);
    headers.set("x-tenant-id", payload.activeTenantId);
    headers.set("x-permissions", JSON.stringify(context.permissions));
    headers.set("x-facilities", JSON.stringify(context.facilityIds));
    headers.set("x-super-admin", String(context.isSuperAdmin));

    return NextResponse.next({
      request: { headers },
    });
  } catch (error) {
    console.error("Proxy auth error:", error);
    return unauthorized();
  }
}

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
}

export const config = {
  matcher: ["/api/:path*"],
};
