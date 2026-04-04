import { NextRequest, NextResponse } from "next/server";

type AccessOptions = {
  permission: string;
  facilityScoped?: boolean;
};

type AuthContext = {
  userId: string;
  tenantId: string;
  permissions: string[];
  facilityIds: string[];
  isSuperAdmin: boolean;
};

//
// 🔍 Extract context from headers
//
function getAuthContext(req: NextRequest): AuthContext | null {
  const userId = req.headers.get("x-user-id");
  const tenantId = req.headers.get("x-tenant-id");

  if (!userId || !tenantId) {
    return null;
  }

  try {
    const permissions = JSON.parse(
      req.headers.get("x-permissions") || "[]"
    ) as string[];

    const facilityIds = JSON.parse(
      req.headers.get("x-facilities") || "[]"
    ) as string[];

    const isSuperAdmin =
      req.headers.get("x-super-admin") === "true";

    return {
      userId,
      tenantId,
      permissions,
      facilityIds,
      isSuperAdmin,
    };
  } catch {
    return null;
  }
}

//
// 🔐 MAIN GUARD
//
export function requireAccess(
  req: NextRequest,
  options: AccessOptions
) {
  const context = getAuthContext(req);

  if (!context) {
    return unauthorized();
  }

  // 🔥 SUPER ADMIN BYPASS
  if (context.isSuperAdmin) {
    return null;
  }

  // 🔐 PERMISSION CHECK
  if (!context.permissions.includes(options.permission)) {
    return forbidden(`Missing permission: ${options.permission}`);
  }

  // 🏥 FACILITY-LEVEL CHECK
  if (options.facilityScoped) {
    const facilityId = req.headers.get("x-facility-id");

    if (!facilityId) {
      return forbidden("Facility context missing");
    }

    if (!context.facilityIds.includes(facilityId)) {
      return forbidden("Access denied for this facility");
    }
  }

  return null; // ✅ Access granted
}

//
// ❌ RESPONSES
//
function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

function forbidden(message?: string) {
  return NextResponse.json(
    {
      success: false,
      error: message || "Forbidden",
    },
    { status: 403 }
  );
}
