import "dotenv/config";
import { controlPrisma } from "@/lib/backend/prisma/control";
import { rollupAudit } from "@/lib/backend/audit/rollup";

function getDateKey(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return date.toISOString().slice(0, 10);
}

async function run() {
  try {
    console.log("Audit rollup started");

    const tenants = await controlPrisma.tenant.findMany({
      where: {
        status: {
          in: ["ONBOARDING", "ACTIVE"],
        },
      },
      select: { id: true },
    });

    const date = getDateKey(0);

    for (const tenant of tenants) {
      try {
        await rollupAudit(tenant.id, date);
      } catch (error) {
        console.error(`Rollup failed for tenant ${tenant.id}`, error);
      }
    }

    console.log("Audit rollup completed");
  } catch (error) {
    console.error("Rollup worker failed", error);
    process.exit(1);
  }
}

run();
