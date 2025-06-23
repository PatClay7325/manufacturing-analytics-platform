// Fixed Prisma Client with hardcoded connection
import { PrismaClient } from '@prisma/client';

// Force correct database URL
process.env.DATABASE_URL = "postgresql://postgres:password@localhost:5432/manufacturing?schema=public";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: "postgresql://postgres:password@localhost:5432/manufacturing?schema=public"
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
