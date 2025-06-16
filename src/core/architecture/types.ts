/**
 * Core types for the Hybrid Manufacturing Intelligence Platform
 * 
 * This file defines the fundamental types and interfaces that form the
 * foundation of the platform architecture.
 */

/**
 * Service status enumeration
 * Used to track the health and state of platform services
 */
export enum ServiceStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  DEGRADED = 'degraded',
  ERROR = 'error',
  OFFLINE = 'offline',
}

/**
 * Deployment environment types
 * Used for environment-specific configurations
 */
export enum DeploymentEnvironment {
  LOCAL = 'local',
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * Priority levels for tasks, alerts, and operations
 */
export enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Manufacturing standards supported by the platform
 */
export enum ManufacturingStandard {
  ISO_14224 = 'ISO_14224',
  ISO_22400 = 'ISO_22400',
  ISA_95 = 'ISA_95',
  ISA_88 = 'ISA_88',
  ANSI_ISA_18_2 = 'ANSI_ISA_18_2',
}

/**
 * Service discovery information
 */
export interface ServiceInfo {
  id: string;
  name: string;
  version: string;
  status: ServiceStatus;
  endpoints: string[];
  healthEndpoint: string;
  dependencies: string[];
  lastHeartbeat?: Date;
  tenantSpecific?: boolean;
  tenantId?: string;
}

/**
 * Base configuration interface
 */
export interface BaseConfig {
  environment: DeploymentEnvironment;
  debug: boolean;
  logLevel: LogLevel;
  tracing: boolean;
}

/**
 * Health check response format
 */
export interface HealthCheckResult {
  service: string;
  status: ServiceStatus;
  version: string;
  timestamp: Date;
  details: Record<string, unknown>;
  dependencies: {
    name: string;
    status: ServiceStatus;
    responseTime?: number;
  }[];
}

/**
 * Feature flag interface
 */
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  dependencies?: string[];
}

/**
 * Tenant information for multi-tenancy support
 */
export interface Tenant {
  id: string;
  name: string;
  tier: 'free' | 'standard' | 'enterprise';
  createdAt: Date;
  settings: Record<string, unknown>;
  features: FeatureFlag[];
}