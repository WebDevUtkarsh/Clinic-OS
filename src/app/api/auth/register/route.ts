import { NextResponse } from "next/server";
import { z } from "zod";
import { logControlAuditEvent } from "@/lib/backend/audit/control";
import { hashPassword } from "@/lib/backend/auth/password";
import { controlPrisma } from "@/lib/backend/prisma/control";
import { provisionTenantInfrastructure } from "@/lib/backend/services/tenant.service";
import { enforceRateLimit, getRequestIp } from "@/lib/backend/security/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  tenantName: z.string().min(1),
});

const GENERIC_ERROR = "Registration failed";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      await logControlAuditEvent({
        action: "AUTH_REGISTER_FAILED",
        req,
        metadata: {
          reason: "INVALID_INPUT",
        },
      });

      return NextResponse.json(
        { success: false, error: GENERIC_ERROR },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const rateLimitResponse = await enforceRateLimit({
      key: `rate:auth:register:${getRequestIp(req)}:${email}`,
      limit: 5,
      windowSeconds: 300,
      message: "Too many registration attempts",
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const password = await hashPassword(parsed.data.password);

    const created = await controlPrisma
      .$transaction(async (tx) => {
        const existing = await tx.user.findUnique({
          where: { email },
          select: { id: true },
        });

        if (existing) {
          throw new Error("USER_EXISTS");
        }

        const user = await tx.user.create({
          data: { email, password, name: parsed.data.name },
          select: { id: true },
        });

        const tenant = await tx.tenant.create({
          data: {
            name: parsed.data.tenantName,
            slug: parsed.data.tenantName.toLowerCase().replace(/\s+/g, "-"),
            status: "PROVISIONING",
          },
          select: { id: true },
        });

        await tx.tenantMember.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            role: "OWNER",
          },
        });

        return { userId: user.id, tenantId: tenant.id };
      })
      .catch(() => null);

    if (!created) {
      await logControlAuditEvent({
        action: "AUTH_REGISTER_FAILED",
        req,
        metadata: {
          email,
          reason: "USER_EXISTS_OR_TRANSACTION_FAILED",
        },
      });

      return NextResponse.json(
        { success: false, error: GENERIC_ERROR },
        { status: 400 },
      );
    }

    try {
      await provisionTenantInfrastructure(created);
    } catch (error) {
      await logControlAuditEvent({
        action: "AUTH_REGISTER_FAILED",
        req,
        userId: created.userId,
        tenantId: created.tenantId,
        metadata: {
          email,
          reason: "TENANT_PROVISIONING_FAILED",
        },
      });

      await controlPrisma.$transaction(async (tx) => {
        await tx.tenantMember.deleteMany({ where: { tenantId: created.tenantId } });
        await tx.tenant.delete({ where: { id: created.tenantId } });
        await tx.user.delete({ where: { id: created.userId } });
      });

      throw error;
    }

    await logControlAuditEvent({
      action: "AUTH_REGISTER_SUCCESS",
      req,
      userId: created.userId,
      tenantId: created.tenantId,
      metadata: {
        email,
        tenantStatus: "ONBOARDING",
      },
    });

    return NextResponse.json({
      success: true,
      tenantId: created.tenantId,
      tenantStatus: "ONBOARDING",
    });
  } catch (error) {
    console.error(error);

    await logControlAuditEvent({
      action: "AUTH_REGISTER_FAILED",
      req,
      metadata: {
        reason: "UNHANDLED_ERROR",
      },
    });

    return NextResponse.json(
      { success: false, error: GENERIC_ERROR },
      { status: 500 },
    );
  }
}
