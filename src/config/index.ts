/**
 * Centralized Configuration Module
 * Single source of truth for all application configuration
 */

import { z } from 'zod';

// Configuration schema for type safety and validation
const ConfigSchema = z.object({
  // Database
  database: z.object({
    url: z.string().min(1),
    connectionLimit: z.number().min(1).default(10),
    poolTimeout: z.number().min(1).default(20),
  }),

  // Authentication
  auth: z.object({
    jwtSecret: z.string().min(32),
    jwtRefreshSecret: z.string().min(32),
    jwtExpiry: z.string().default('15m'),
    jwtRefreshExpiry: z.string().default('7d'),
    sessionTimeout: z.string().default('24h'),
    apiKeySalt: z.string().optional(),
  }),

  // AI/Ollama
  ai: z.object({
    ollamaUrl: z.string().url().default('http://localhost:11434'),
    ollamaModel: z.string().default('gemma:2b'),
    ollamaTimeout: z.number().default(30000),
    openaiApiKey: z.string().optional(),
  }),

  // Application
  app: z.object({
    env: z.enum(['development', 'test', 'production']).default('development'),
    url: z.string().url().default('http://localhost:3000'),
    port: z.number().default(3000),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),

  // Email (optional)
  email: z.object({
    host: z.string().optional(),
    port: z.number().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    from: z.string().email().optional(),
  }).optional(),

  // Monitoring (optional)
  monitoring: z.object({
    prometheusUrl: z.string().url().optional(),
    sentryDsn: z.string().optional(),
  }).optional(),

  // Feature flags
  features: z.object({
    mqtt: z.boolean().default(false),
    websocket: z.boolean().default(true),
    emailNotifications: z.boolean().default(false),
    aiChat: z.boolean().default(true),
  }),

  // External integrations (optional)
  integrations: z.object({
    mqtt: z.object({
      brokerUrl: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    }).optional(),
    elasticsearch: z.object({
      node: z.string().optional(),
      apiKey: z.string().optional(),
    }).optional(),
  }).optional(),
});

type Config = z.infer<typeof ConfigSchema>;

// Load and validate configuration
function loadConfig(): Config {
  const config = {
    database: {
      url: process.env.DATABASE_URL!,
      connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10'),
      poolTimeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '20'),
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production',
      jwtExpiry: process.env.JWT_EXPIRY || '15m',
      jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
      sessionTimeout: process.env.SESSION_TIMEOUT || '24h',
      apiKeySalt: process.env.API_KEY_SALT,
    },
    ai: {
      ollamaUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
      ollamaModel: process.env.OLLAMA_MODEL || 'gemma:2b',
      ollamaTimeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000'),
      openaiApiKey: process.env.OPENAI_API_KEY,
    },
    app: {
      env: (process.env.NODE_ENV as 'development' | 'test' | 'production') || 'development',
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      port: parseInt(process.env.PORT || '3000'),
      logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    },
    email: process.env.SMTP_HOST ? {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.SMTP_FROM,
    } : undefined,
    monitoring: {
      prometheusUrl: process.env.PROMETHEUS_URL,
      sentryDsn: process.env.SENTRY_DSN,
    },
    features: {
      mqtt: process.env.ENABLE_MQTT === 'true',
      websocket: process.env.ENABLE_WEBSOCKET !== 'false',
      emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
      aiChat: process.env.ENABLE_AI_CHAT !== 'false',
    },
    integrations: {
      mqtt: process.env.MQTT_BROKER_URL ? {
        brokerUrl: process.env.MQTT_BROKER_URL,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
      } : undefined,
      elasticsearch: process.env.ELASTICSEARCH_NODE ? {
        node: process.env.ELASTICSEARCH_NODE,
        apiKey: process.env.ELASTICSEARCH_API_KEY,
      } : undefined,
    },
  };

  // Validate configuration
  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:', error.errors);
      throw new Error(`Invalid configuration: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

// Export singleton config instance
export const config = loadConfig();

// Helper functions for common checks
export const isDevelopment = () => config.app.env === 'development';
export const isProduction = () => config.app.env === 'production';
export const isTest = () => config.app.env === 'test';

// Feature flag helpers
export const isFeatureEnabled = (feature: keyof typeof config.features) => config.features[feature];

// Re-export config type for use in other modules
export type { Config };