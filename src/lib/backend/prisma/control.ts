import { PrismaClient } from "@/generated/control/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
  controlPrisma?: PrismaClient;
};

const connectionString = process.env.CONTROL_URL;

if (!connectionString) {
  throw new Error("CONTROL_URL is not defined");
}

export const controlPrisma =
  globalForPrisma.controlPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.controlPrisma = controlPrisma;
}