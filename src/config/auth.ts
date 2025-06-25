/**
 * Authentication Configuration Module
 * Centralized auth settings and constants
 */

import { config } from './index';

export const authConfig = {
  jwt: {
    secret: config.auth.jwtSecret,
    refreshSecret: config.auth.jwtRefreshSecret,
    expiry: config.auth.jwtExpiry,
    refreshExpiry: config.auth.jwtRefreshExpiry,
  },
  
  session: {
    timeout: config.auth.sessionTimeout,
    secret: config.auth.jwtSecret, // Reuse JWT secret for session encryption
  },
  
  api: {
    keySalt: config.auth.apiKeySalt,
  },
  
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '@$!%*?&',
  },
  
  // Rate limiting
  rateLimit: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 5,
    },
    api: {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 100,
    },
  },
};