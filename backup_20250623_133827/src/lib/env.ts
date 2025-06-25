import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_DATABASE_URL: z.string().url().optional(),
  
  // Agent System
  CRON_SCHEDULE: z.string().default('0 2 * * *'),
  OPENAI_API_KEY: z.string().min(1),
  OTEL_EXPORTER_ENDPOINT: z.string().url().optional(),
  
  // Auth & Security
  AUTH_TOKEN_SALT: z.string().min(32),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  
  // Ollama (existing)
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('gemma2:2b'),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Redis Configuration
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  // Message Queue
  RABBITMQ_URL: z.string().url().optional(),
  
  // Manufacturing Systems
  OPC_UA_SERVER_URL: z.string().url().optional(),
  MQTT_BROKER_URL: z.string().url().optional(),
  TIMESCALEDB_URL: z.string().url().optional(),
  
  // Memory Pruning
  MEMORY_RETENTION_DAYS: z.string().transform(Number).default('30'),
  
  // Monitoring
  ENABLE_TRACING: z.string().transform(val => val === 'true').default('false'),
  ENABLE_METRICS: z.string().transform(val => val === 'true').default('false'),
  
  // Security
  CORS_ALLOWED_ORIGINS: z.string().optional(),
});

// Type inference
export type Env = z.infer<typeof envSchema>;

// Validate and export environment variables
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // In test environment, use defaults instead of exiting
      if (process.env.NODE_ENV === 'test') {
        return {
          DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
          DIRECT_DATABASE_URL: undefined,
          CRON_SCHEDULE: '0 2 * * *',
          OPENAI_API_KEY: 'test-api-key',
          OTEL_EXPORTER_ENDPOINT: undefined,
          AUTH_TOKEN_SALT: 'test-auth-token-salt-minimum-32-characters',
          NEXTAUTH_SECRET: 'test-nextauth-secret-minimum-32-characters',
          NEXTAUTH_URL: 'http://localhost:3000',
          OLLAMA_BASE_URL: 'http://localhost:11434',
          OLLAMA_MODEL: 'gemma2:2b',
          NODE_ENV: 'test',
          RATE_LIMIT_WINDOW_MS: 60000,
          RATE_LIMIT_MAX_REQUESTS: 100,
          REDIS_URL: 'redis://localhost:6379',
          REDIS_PASSWORD: undefined,
          RABBITMQ_URL: undefined,
          OPC_UA_SERVER_URL: undefined,
          MQTT_BROKER_URL: undefined,
          TIMESCALEDB_URL: undefined,
          MEMORY_RETENTION_DAYS: 30,
          ENABLE_TRACING: false,
          ENABLE_METRICS: false,
          CORS_ALLOWED_ORIGINS: undefined,
        } as Env;
      }
      
      console.error('❌ Invalid environment variables:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// Export validated environment
export const env = validateEnv();

// Helper to check if we're in production
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';