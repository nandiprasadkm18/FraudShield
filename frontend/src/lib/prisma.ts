/**
 * Prisma 7 singleton — PostgreSQL (local) using @prisma/adapter-pg.
 *
 * This uses the pg driver adapter, consistent with Prisma 7's driverAdapters
 * preview feature and the previous SQLite setup.
 *
 * The singleton pattern prevents connection pool exhaustion in Next.js dev mode
 * where modules are hot-reloaded on every change.
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Add it to .env: postgresql://user:pass@host:5432/dbname"
    );
  }

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
