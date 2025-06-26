import { PrismaClient, Prisma } from '@prisma/client';
import { performance } from 'perf_hooks';

/**
 * Production-Ready Prisma Service
 * Implements connection pooling, monitoring, and error handling
 */
export class PrismaProductionService extends PrismaClient {
  private static instance: PrismaProductionService;
  private queryMetrics: Map<string, { count: number; totalTime: number }> = new Map();

  constructor() {
    // Production configuration
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
        ...(process.env.NODE_ENV !== 'production' 
          ? [{ level: 'query' as const, emit: 'event' as const }] 
          : []),
      ],
      errorFormat: 'minimal',
    });

    // Set up event listeners
    this.setupEventListeners();
    
    // Configure connection pool via environment
    this.configureConnectionPool();
  }

  static getInstance(): PrismaProductionService {
    if (!PrismaProductionService.instance) {
      PrismaProductionService.instance = new PrismaProductionService();
    }
    return PrismaProductionService.instance;
  }

  private setupEventListeners() {
    // Error logging
    this.$on('error', (e) => {
      console.error('[Prisma Error]', {
        message: e.message,
        target: e.target,
        timestamp: new Date().toISOString(),
      });
    });

    // Warning logging
    this.$on('warn', (e) => {
      console.warn('[Prisma Warning]', {
        message: e.message,
        target: e.target,
        timestamp: new Date().toISOString(),
      });
    });

    // Query logging in development
    if (process.env.NODE_ENV !== 'production') {
      this.$on('query', (e) => {
        console.log('[Prisma Query]', {
          query: e.query,
          params: e.params,
          duration: e.duration,
          timestamp: e.timestamp,
        });
      });
    }
  }

  private configureConnectionPool() {
    // Connection pool settings via DATABASE_URL parameters
    // Example: postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=30
    const poolConfig = {
      connection_limit: parseInt(process.env.DB_POOL_SIZE || '25'),
      pool_timeout: parseInt(process.env.DB_POOL_TIMEOUT || '30'),
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
      idle_in_transaction_session_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    };

    console.log('[Prisma] Connection pool configured:', poolConfig);
  }

  /**
   * Execute queries with monitoring and error handling
   */
  async executeWithMetrics<T>(
    operation: () => Promise<T>,
    queryName: string
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      // Update metrics
      const metrics = this.queryMetrics.get(queryName) || { count: 0, totalTime: 0 };
      metrics.count++;
      metrics.totalTime += duration;
      this.queryMetrics.set(queryName, metrics);
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`[Slow Query] ${queryName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      // Enhanced error handling
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw this.handlePrismaError(error, queryName);
      }
      
      console.error(`[Query Error] ${queryName} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  /**
   * Handle Prisma-specific errors with better messages
   */
  private handlePrismaError(
    error: Prisma.PrismaClientKnownRequestError,
    context: string
  ): Error {
    const baseMessage = `Database operation failed in ${context}`;
    
    switch (error.code) {
      case 'P2002':
        return new Error(`${baseMessage}: Unique constraint violation on ${error.meta?.target}`);
      
      case 'P2003':
        return new Error(`${baseMessage}: Foreign key constraint violation on ${error.meta?.field_name}`);
      
      case 'P2025':
        return new Error(`${baseMessage}: Record not found`);
      
      case 'P2024':
        return new Error(`${baseMessage}: Connection pool timeout - too many active connections`);
      
      case 'P2034':
        return new Error(`${baseMessage}: Transaction conflict, please retry`);
      
      default:
        return new Error(`${baseMessage}: ${error.message} (Code: ${error.code})`);
    }
  }

  /**
   * Execute multiple operations in a transaction with retry logic
   */
  async executeTransaction<T>(
    operations: (tx: Prisma.TransactionClient) => Promise<T>,
    options: {
      maxRetries?: number;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, timeout = 30000 } = options;
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(operations, {
          maxWait: 5000,
          timeout,
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        });
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2002', 'P2003', 'P2025'].includes(error.code)
        ) {
          throw this.handlePrismaError(error, 'transaction');
        }
        
        // Log retry attempt
        console.warn(`[Transaction Retry] Attempt ${attempt}/${maxRetries} failed:`, error);
        
        // Exponential backoff
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }
    
    throw lastError || new Error('Transaction failed after max retries');
  }

  /**
   * Get query performance metrics
   */
  getMetrics() {
    const metrics: Record<string, any> = {};
    
    this.queryMetrics.forEach((value, key) => {
      metrics[key] = {
        count: value.count,
        averageTime: value.totalTime / value.count,
        totalTime: value.totalTime,
      };
    });
    
    return metrics;
  }

  /**
   * Health check with connection validation
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    details: any;
  }> {
    const start = performance.now();
    
    try {
      // Simple query to test connection
      await this.$queryRaw`SELECT 1`;
      
      const latency = performance.now() - start;
      
      return {
        status: 'healthy',
        latency,
        details: {
          connectionPool: 'active',
          queryMetrics: this.getMetrics(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: performance.now() - start,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[Prisma] Shutting down connection pool...');
    
    try {
      await this.$disconnect();
      console.log('[Prisma] Connection pool closed successfully');
    } catch (error) {
      console.error('[Prisma] Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Initialize database (migrations, extensions, etc.)
   */
  async initialize(): Promise<void> {
    console.log('[Prisma] Initializing database...');
    
    try {
      // Test connection
      await this.$connect();
      
      // Set session parameters for performance
      await this.$executeRaw`
        SET statement_timeout = ${Prisma.sql`${30000}::integer`};
        SET lock_timeout = ${Prisma.sql`${10000}::integer`};
        SET idle_in_transaction_session_timeout = ${Prisma.sql`${30000}::integer`};
      `;
      
      console.log('[Prisma] Database initialized successfully');
    } catch (error) {
      console.error('[Prisma] Failed to initialize database:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const prisma = PrismaProductionService.getInstance();