import { PrismaClient } from "@/generated/tenant/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { controlPrisma } from "./control";

type PrismaOptions = ConstructorParameters<typeof PrismaClient>[0];

const tenantClients = new Map<string, PrismaClient>();
const pendingTenantClients = new Map<string, Promise<PrismaClient>>();

function createTenantPrismaClient(dbUrl: string): PrismaClient {
  const prismaOptions: PrismaOptions = {
    adapter: new PrismaPg({ connectionString: dbUrl }),
    log: ["error", "warn"],
  };

  return new PrismaClient(prismaOptions);
}

export async function getTenantPrisma(tenantId: string): Promise<PrismaClient> {
  // 1. Return cached client if exists
  const cachedClient = tenantClients.get(tenantId);
  if (cachedClient) {
    return cachedClient;
  }

  // 2. Reuse in-flight initializer to avoid duplicate clients per tenant
  const pendingClient = pendingTenantClients.get(tenantId);
  if (pendingClient) {
    return pendingClient;
  }

  const tenantClientPromise = (async () => {
    // 3. Fetch tenant from control DB
    const tenant = await controlPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        dbUrl: true,
      },
    });

    // 4. Validate tenant
    if (!tenant?.dbUrl) {
      throw new Error("Tenant DB not found or not provisioned");
    }

    // 5. Create and cache client
    const client = createTenantPrismaClient(tenant.dbUrl);
    tenantClients.set(tenantId, client);

    return client;
  })();

  pendingTenantClients.set(tenantId, tenantClientPromise);

  try {
    return await tenantClientPromise;
  } finally {
    pendingTenantClients.delete(tenantId);
  }
}
