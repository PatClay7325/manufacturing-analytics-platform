/**
 * Database Module Exports
 * Central export point for all database-related utilities
 */

export { prisma } from './prisma'
export type { PrismaClient, Prisma } from '@prisma/client'

// Re-export commonly used Prisma types for convenience
export { 
  WorkUnit, 
  Equipment, 
  Alert, 
  Metric,
  User,
  Team,
  Dashboard,
  ManufacturingSite,
  ManufacturingArea,
  WorkCenter
} from '@prisma/client'