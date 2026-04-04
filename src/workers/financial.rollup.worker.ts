import "dotenv/config";
import { controlPrisma } from "@/lib/backend/prisma/control";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";
import { computeDailyFinancials } from "@/lib/backend/reports/aggregator";

function getUtcDateKey(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - offsetDays);
  return date.toISOString().slice(0, 10);
}

async function run() {
  try {
    const targetDate = getUtcDateKey(1);
    console.log(`Financial rollup started for ${targetDate}`);

    const tenants = await controlPrisma.tenant.findMany({
      where: {
        status: {
          in: ["ONBOARDING", "ACTIVE"],
        },
      },
      select: {
        id: true,
      },
    });

    for (const tenant of tenants) {
      try {
        const prisma = await getTenantPrisma(tenant.id);
        const facilities = await prisma.facility.findMany({
          select: {
            id: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        for (const facility of facilities) {
          try {
            await computeDailyFinancials(tenant.id, facility.id, targetDate);
          } catch (error) {
            console.error(
              `Financial rollup failed for tenant=${tenant.id} facility=${facility.id} date=${targetDate}`,
              error,
            );
          }
        }
      } catch (error) {
        console.error(`Financial rollup failed for tenant=${tenant.id}`, error);
      }
    }

    console.log(`Financial rollup completed for ${targetDate}`);
  } catch (error) {
    console.error("Financial rollup worker failed", error);
    process.exit(1);
  }
}

run();
