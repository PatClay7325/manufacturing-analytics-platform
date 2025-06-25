import { PrismaClient } from '@prisma/client';

// Production-ready Prisma Client configuration
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: 
      process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
  });
};

// Prevent multiple instances of Prisma Client in development
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Production middleware for connection pooling and monitoring
prisma.$use(async (params, next) => {
  const before = Date.now();
  
  try {
    const result = await next(params);
    const after = Date.now();
    
    // Log slow queries in production
    if (process.env.NODE_ENV === 'production' && (after - before) > 1000) {
      console.warn(`Slow query: ${params.model}.${params.action} took ${after - before}ms`);
    }
    
    return result;
  } catch (error) {
    const after = Date.now();
    
    // Log errors with context
    console.error({
      model: params.model,
      action: params.action,
      duration: after - before,
      error,
    });
    
    throw error;
  }
});

// Graceful shutdown
const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default prisma;