// Prisma Client with environment-based connection
const { PrismaClient } = require('@prisma/client');

// Use environment variable for database URL
const databaseUrl = process.env.DATABASE_URL || "postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public";

const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = { prisma };
exports.prisma = prisma;
