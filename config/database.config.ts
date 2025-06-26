/**
 * Production Database Configuration
 * Centralized configuration for all database-related settings
 */

export const databaseConfig = {
  // Connection pooling settings
  pool: {
    // PgBouncer compatible settings
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    min: parseInt(process.env.DB_POOL_MIN || '5'),
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
    statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
  },

  // Prisma-specific settings
  prisma: {
    // Log levels based on environment
    log: process.env.NODE_ENV === 'production' 
      ? ['error'] 
      : ['query', 'info', 'warn', 'error'],
    
    // Error format
    errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
  },

  // Redis cache settings
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_PREFIX || 'mfg:',
    
    // Cache TTLs (in seconds)
    ttl: {
      oee: 300, // 5 minutes for OEE calculations
      equipment: 3600, // 1 hour for equipment data
      production: 60, // 1 minute for production data
      default: 300,
    },
  },

  // Performance settings
  performance: {
    // Query timeout in milliseconds
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
    
    // Slow query threshold for logging (ms)
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
    
    // Maximum records per query
    maxRecordsPerQuery: parseInt(process.env.MAX_RECORDS_PER_QUERY || '1000'),
    
    // Enable query result caching
    enableQueryCache: process.env.ENABLE_QUERY_CACHE !== 'false',
  },

  // Monitoring settings
  monitoring: {
    // Enable performance monitoring
    enabled: process.env.MONITORING_ENABLED !== 'false',
    
    // Metrics flush interval (ms)
    flushInterval: parseInt(process.env.METRICS_FLUSH_INTERVAL || '10000'),
    
    // Maximum metrics buffer size
    maxBufferSize: parseInt(process.env.METRICS_BUFFER_SIZE || '100'),
  },

  // Security settings
  security: {
    // Enable Row Level Security
    enableRLS: process.env.ENABLE_RLS !== 'false',
    
    // Encryption settings
    encryptionEnabled: process.env.ENCRYPTION_ENABLED === 'true',
    encryptionAlgorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    
    // Audit settings
    auditEnabled: process.env.AUDIT_ENABLED !== 'false',
    auditAsync: true, // Always use async audit
  },

  // Migration settings
  migration: {
    // Shadow database for migrations
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
    
    // Migration timeout
    timeout: parseInt(process.env.MIGRATION_TIMEOUT || '600000'), // 10 minutes
  },

  // Replication settings
  replication: {
    // Read replica URLs
    readReplicaUrls: process.env.READ_REPLICA_URLS?.split(',') || [],
    
    // Load balancing strategy
    loadBalancingStrategy: process.env.LB_STRATEGY || 'round-robin',
    
    // Replica lag threshold (ms)
    maxReplicaLag: parseInt(process.env.MAX_REPLICA_LAG || '1000'),
  },
} as const;

// Validate required environment variables
export function validateDatabaseConfig() {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate connection string format
  try {
    new URL(process.env.DATABASE_URL!);
  } catch {
    throw new Error('Invalid DATABASE_URL format');
  }
  
  // Warn about missing optional but recommended settings
  const recommended = ['REDIS_HOST', 'SHADOW_DATABASE_URL'];
  const missingRecommended = recommended.filter(key => !process.env[key]);
  
  if (missingRecommended.length > 0) {
    console.warn(`[Config] Missing recommended environment variables: ${missingRecommended.join(', ')}`);
  }
}