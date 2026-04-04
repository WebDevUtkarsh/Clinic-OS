import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient as TenantClient } from "@/generated/tenant/client";
import { controlPrisma } from "@/lib/backend/prisma/control";
import { invalidateAuthCache } from "@/lib/backend/cache/invalidate";

type CreateTenantInput = {
  email: string;
  password: string;
  name: string;
  tenantName: string;
};

type ProvisionTenantInfrastructureInput = {
  tenantId: string;
  userId: string;
};

export async function createTenantWithUser({
  email,
  password,
  name,
  tenantName,
}: CreateTenantInput) {
  const created = await controlPrisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, password, name },
    });

    const tenant = await tx.tenant.create({
      data: {
        name: tenantName,
        slug: generateSlug(tenantName),
        status: "PROVISIONING",
      },
    });

    await tx.tenantMember.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: "OWNER",
      },
    });

    return {
      userId: user.id,
      tenantId: tenant.id,
    };
  });

  return { success: true, tenantId: created.tenantId };
}

export async function provisionTenantInfrastructure({
  tenantId,
  userId,
}: ProvisionTenantInfrastructureInput): Promise<void> {
  let dbName: string | null = null;
  let tenantPrisma: TenantClient | null = null;

  try {
    const tenant = await controlPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      throw new Error("Tenant not found for provisioning");
    }

    dbName = `tenant_${randomUUID().replace(/-/g, "")}`;
    await createDatabase(dbName);

    const dbUrl = buildTenantDbUrl(dbName);
    await initializeTenantSchema(dbUrl);

    tenantPrisma = new TenantClient({
      adapter: new PrismaPg({ connectionString: dbUrl }),
    });

    await seedPermissions(tenantPrisma);

    const ownerRole = await tenantPrisma.role.findFirst({
      where: { name: "OWNER" },
      select: { id: true },
    });

    if (!ownerRole) {
      throw new Error("OWNER role missing");
    }

    await tenantPrisma.userRole.create({
      data: {
        userId,
        roleId: ownerRole.id,
      },
    });

    await controlPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        dbUrl,
        status: "ONBOARDING",
      },
    });

    await invalidateAuthCache(tenantId, userId);
  } catch (error) {
    console.error("Provisioning failed:", error);

    if (dbName) {
      await dropDatabase(dbName);
    }

    await controlPrisma.tenant.update({
      where: { id: tenantId },
      data: { status: "FAILED" },
    });

    throw error;
  } finally {
    if (tenantPrisma) {
      await tenantPrisma.$disconnect();
    }
  }
}

async function createDatabase(dbName: string): Promise<void> {
  const client = new Client({
    connectionString: process.env.CONTROL_URL,
  });

  await client.connect();
  await client.query(`CREATE DATABASE "${dbName}"`);
  await client.end();
}

async function dropDatabase(dbName: string): Promise<void> {
  const client = new Client({
    connectionString: process.env.CONTROL_URL,
  });

  await client.connect();
  await client.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
    [dbName],
  );
  await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  await client.end();
}

function buildTenantDbUrl(dbName: string): string {
  const base = process.env.POSTGRES_BASE_URL;
  if (!base) {
    throw new Error("POSTGRES_BASE_URL not set");
  }

  return `${base}/${dbName}`;
}

async function initializeTenantSchema(dbUrl: string): Promise<void> {
  const sql = await fs.readFile(
    path.join(process.cwd(), "prisma/tenant/init.sql"),
    "utf-8",
  );

  const client = new Client({
    connectionString: dbUrl,
  });

  await client.connect();

  try {
    await client.query(sql);
  } finally {
    await client.end().catch(() => undefined);
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

async function seedPermissions(prisma: TenantClient): Promise<void> {
  const permissions = [
    "organizations:create",
    "facilities:create",
    "doctors:read",
    "doctors:create",
    "doctors:update",
    "doctors:delete",
    "patients:read",
    "patients:create",
    "patients:update",
    "patients:delete",
    "appointments:read",
    "appointments:create",
    "appointments:update",
    "billing:read",
    "billing:create",
    "billing:update",
    "billing:delete",
    "reports:read",
    "inventory:read",
    "inventory:create",
    "audit:read",
  ];

  for (const key of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  let ownerRole = await prisma.role.findFirst({
    where: { name: "OWNER" },
  });

  if (!ownerRole) {
    ownerRole = await prisma.role.create({
      data: { name: "OWNER" },
    });
  }

  const doctorRole = await prisma.role.findFirst({
    where: { name: "DOCTOR" },
    select: { id: true },
  });

  if (!doctorRole) {
    await prisma.role.create({
      data: { name: "DOCTOR" },
    });
  }

  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: ownerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: ownerRole.id,
        permissionId: permission.id,
      },
    });
  }
}
