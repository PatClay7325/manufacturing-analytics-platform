/**
 * Prisma Client Singleton with Connection Pooling
 * Production-ready database connection management
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

// Global singleton storage
let prismaInstance: PrismaClient | undefined;

// Connection pool configuration
const POOL_CONFIG = {
  // Connection pool size
  connection_limit: parseInt(process.env.DB_POOL_SIZE || '10'),
  
  // Pool timeout settings
  pool_timeout: parseInt(process.env.DB_POOL_TIMEOUT || '10'),
  
  // Query timeout
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '20000'),
  
  // Idle timeout
  idle_in_transaction_session_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'),
};

// Create URL with pool parameters
function buildDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || '';
  const url = new URL(baseUrl);
  
  // Add pool configuration to connection string
  Object.entries(POOL_CONFIG).forEach(([key, value]) => {
    url.searchParams.set(key, value.toString());
  });
  
  // Add schema if specified
  if (process.env.DB_SCHEMA) {
    url.searchParams.set('schema', process.env.DB_SCHEMA);
  }
  
  return url.toString();
}

// Performance monitoring
const queryMetrics = {
  count: 0,
  totalTime: 0,
  slowQueries: [] as Array<{ query: string; duration: number; timestamp: Date }>,
};

/**
 * Get or create Prisma client instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const datasourceUrl = buildDatabaseUrl();
    
    prismaInstance = new PrismaClient({
      datasources: {
        db: { url: datasourceUrl },
      },
      log: [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
        ...(process.env.NODE_ENV === 'development'
          ? [{ level: 'query' as const, emit: 'event' as const }]
          : []),
      ],
      errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
    });

    // Add error handlers
    prismaInstance.$on('error', (e) => {
      console.error('Prisma error:', {
        message: e.message,
        timestamp: e.timestamp,
        target: e.target,
      });
    });

    prismaInstance.$on('warn', (e) => {
      console.warn('Prisma warning:', {
        message: e.message,
        timestamp: e.timestamp,
        target: e.target,
      });
    });

    // Query performance monitoring in development
    if (process.env.NODE_ENV === 'development') {
      prismaInstance.$on('query', (e) => {
        const duration = e.duration;
        queryMetrics.count++;
        queryMetrics.totalTime += duration;

        // Track slow queries (> 1000ms)
        if (duration > 1000) {
          queryMetrics.slowQueries.push({
            query: e.query,
            duration,
            timestamp: new Date(e.timestamp),
          });

          // Keep only last 100 slow queries
          if (queryMetrics.slowQueries.length > 100) {
            queryMetrics.slowQueries.shift();
          }

          console.warn(`Slow query detected (${duration}ms):`, e.query);
        }
      });
    }

    // Add middleware for soft deletes
    prismaInstance.$use(async (params, next) => {
      // Soft delete handling
      if (params.model && params.action === 'delete') {
        // Change action to update and set deletedAt
        params.action = 'update';
        params.args['data'] = { deletedAt: new Date() };
      }

      if (params.model && params.action === 'deleteMany') {
        // Change action to updateMany and set deletedAt
        params.action = 'updateMany';
        params.args['data'] = { deletedAt: new Date() };
      }

      // Add default where clause to exclude soft deleted records
      if (params.model && ['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
        if (!params.args) {
          params.args = {};
        }
        if (!params.args.where) {
          params.args.where = {};
        }
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      }

      // Performance tracking
      const start = performance.now();
      const result = await next(params);
      const duration = performance.now() - start;

      // Log slow operations
      if (duration > 500) {
        console.warn(`Slow database operation (${duration.toFixed(2)}ms):`, {
          model: params.model,
          action: params.action,
        });
      }

      return result;
    });

    // Connection lifecycle hooks
    prismaInstance.$connect()
      .then(() => {
        console.log('Database connected successfully');
      })
      .catch((error) => {
        console.error('Failed to connect to database:', error);
        process.exit(1);
      });
  }

  return prismaInstance;
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const client = getPrismaClient();
  const start = performance.now();

  try {
    await client.$queryRaw`SELECT 1`;
    const latency = performance.now() - start;
    
    return {
      connected: true,
      latency,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get database statistics
 */
export function getDatabaseStats() {
  return {
    queries: {
      total: queryMetrics.count,
      averageTime: queryMetrics.count > 0 
        ? queryMetrics.totalTime / queryMetrics.count 
        : 0,
      slowQueries: queryMetrics.slowQueries.length,
    },
    pool: {
      size: POOL_CONFIG.connection_limit,
      timeout: POOL_CONFIG.pool_timeout,
    },
  };
}

/**
 * Graceful shutdown
 */
export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = undefined;
    console.log('Database disconnected');
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectPrisma();
  process.exit(0);
});

// Export singleton instance
export const prisma = getPrismaClient();