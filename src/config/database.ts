/**
 * Database Configuration Module
 * Centralized database settings and utilities
 */

import { config } from './index';

export const databaseConfig = {
  url: config.database.url,
  connectionLimit: config.database.connectionLimit,
  poolTimeout: config.database.poolTimeout,
  
  // Prisma-specific settings
  prisma: {
    log: config.app.env === 'development' 
      ? ['error', 'warn'] as const
      : ['error'] as const,
  },
  
  // Connection string helpers
  getConnectionString: (database?: string) => {
    const url = new URL(config.database.url);
    if (database) {
      url.pathname = `/${database}`;
    }
    return url.toString();
  },
  
  // Test database URL
  getTestDatabaseUrl: () => {
    const url = new URL(config.database.url);
    url.pathname = '/manufacturing_test';
    return url.toString();
  },
};