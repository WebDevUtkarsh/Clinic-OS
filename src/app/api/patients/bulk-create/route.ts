import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { requireAccess } from "@/lib/backend/rbac/guard";
import { requireFacilityContext } from "@/lib/backend/facility/context";
import { auditLog } from "@/lib/backend/audit/logger";

const schema = z.object({
  patients: z.array(
    z.object({
      name: z.string().min(1),
      gender: z.enum(["Male", "Female", "Other"]),
      dob: z.string().datetime().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
    })
  ).min(1).max(100),
});

export async function POST(req: NextRequest) {
  const accessError = requireAccess(req, {
    permission: "patients:create",
    facilityScoped: true,
  });
  if (accessError) return accessError;

  const { error: facilityError, context } =
    await requireFacilityContext(req);
  if (facilityError) return facilityError;

  const { facilityId, organizationId, tenantId } = context;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    const prisma = await getTenantPrisma(tenantId);

    const results = [];
    const seen = new Set<string>(); // 🔥 intra-batch duplicate prevention

    for (const p of parsed.data.patients) {
      const key = `${p.phone || ""}-${p.name}-${p.dob || ""}`;

      if (seen.has(key)) {
        results.push({
          success: false,
          error: "Duplicate in batch",
          input: p,
        });
        continue;
      }

      seen.add(key);

      const existing = await prisma.patient.findFirst({
        where: {
          facilityId,
          isDeleted: false,
          OR: [
            { phone: p.phone || undefined },
            {
              AND: [
                { name: p.name },
                { dob: p.dob ? new Date(p.dob) : undefined },
              ],
            },
          ],
        },
        select: { id: true },
      });

      if (existing) {
        results.push({
          success: false,
          error: "Duplicate in DB",
          input: p,
        });
        continue;
      }

      const created = await prisma.patient.create({
        data: {
          facilityId,
          name: p.name,
          gender: p.gender,
          dob: p.dob ? new Date(p.dob) : null,
          phone: p.phone ?? null,
          email: p.email ?? null,
          address: p.address ?? null,
        },
      });

      results.push({
        success: true,
        data: created,
      });
    }

    // 🧾 Single audit (not per row)
    auditLog(req, {
      action: "patients:bulk_create",
      resource: "Patient",
      permissionUsed: "patients:create",
      facilityId,
      organizationId,
      metadata: {
        total: parsed.data.patients.length,
        created: results.filter(r => r.success).length,
      },
    });

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (err) {
    console.error("Bulk create failed:", err);

    return NextResponse.json(
      { success: false, error: "Bulk create failed" },
      { status: 500 }
    );
  }
}