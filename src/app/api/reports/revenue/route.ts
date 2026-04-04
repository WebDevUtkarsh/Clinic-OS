import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/backend/audit/logger";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import {
  buildReportCacheKey,
  getCachedReport,
  setCachedReport,
} from "@/lib/backend/reports/cache";
import { reportFiltersSchema } from "@/lib/backend/reports/schemas";
import {
  getRevenueSummaryReport,
  resolveReportDateRange,
  resolveReportScope,
  resolveReportTimeZone,
} from "@/lib/backend/reports/service";
import type { RevenueSummaryReport } from "@/lib/backend/reports/types";
import { requireAccess } from "@/lib/backend/rbac/guard";

function jsonError(
  message: string,
  status: number,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

export async function GET(req: NextRequest) {
  const accessError = requireAccess(req, {
    permission: "reports:read",
  });

  if (accessError) {
    return accessError;
  }

  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return jsonError("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const parsed = reportFiltersSchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    facilityId: url.searchParams.get("facilityId") ?? undefined,
    doctorId: url.searchParams.get("doctorId") ?? undefined,
    timezone: url.searchParams.get("timezone") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError("Invalid query parameters", 400, {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const timeZone = resolveReportTimeZone(parsed.data.timezone);
  if (!timeZone) {
    return jsonError("Invalid timezone", 400);
  }

  let dateRange;
  try {
    dateRange = resolveReportDateRange({
      from: parsed.data.from,
      to: parsed.data.to,
      timeZone,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Invalid report range",
      400,
    );
  }

  const scopeResult = await resolveReportScope(req, parsed.data.facilityId);
  if (scopeResult.error) {
    return scopeResult.error;
  }

  const scope = scopeResult.scope;
  const cacheKey = buildReportCacheKey({
    tenantId,
    facilityId: scope.facilityId ?? "all",
    type: "revenue",
    filters: {
      from: dateRange.from,
      to: dateRange.to,
      doctorId: parsed.data.doctorId ?? null,
      timeZone,
    },
  });

  let data = await getCachedReport<RevenueSummaryReport>(cacheKey);

  if (!data) {
    const prisma = await getTenantPrisma(tenantId);
    data = await getRevenueSummaryReport(prisma, {
      tenantId,
      facilityIds: scope.facilityIds,
      dateRange,
      doctorId: parsed.data.doctorId,
    });

    await setCachedReport(cacheKey, data, 180);
  }

  await auditLog(req, {
    action: "reports:view",
    resource: "FinancialReport",
    permissionUsed: "reports:read",
    facilityId: scope.facilityId ?? undefined,
    organizationId: scope.organizationId ?? undefined,
    metadata: {
      reportType: "revenue",
      filters: {
        from: dateRange.from,
        to: dateRange.to,
        facilityId: scope.facilityId ?? null,
        doctorId: parsed.data.doctorId ?? null,
        timeZone,
      },
    },
  });

  return NextResponse.json({
    success: true,
    data,
  });
}
