/**
 * Service Types for the Hybrid Manufacturing Intelligence Platform
 * 
 * This file defines the types and interfaces for the modular services architecture.
 */

import { BaseConfig } from './architecture/types';

/**
 * Service configuration
 * Extends the base configuration with service-specific settings
 */
export interface ServiceConfig extends BaseConfig {
  /**
   * Service name
   */
  name: string;
  
  /**
   * Service version
   */
  version: string;
  
  /**
   * Service-specific settings
   */
  settings: Record<string, unknown>;
}

/**
 * Service dependencies configuration
 */
export interface ServiceDependencies {
  /**
   * Required services that must be available for this service to function
   */
  required: string[];
  
  /**
   * Optional services that enhance this service if available
   */
  optional: string[];
}

/**
 * Service capability
 * Represents a specific capability provided by a service
 */
export interface ServiceCapability {
  /**
   * Capability name
   */
  name: string;
  
  /**
   * Capability description
   */
  description: string;
  
  /**
   * Capability version
   */
  version: string;
  
  /**
   * Is the capability currently enabled
   */
  enabled: boolean;
  
  /**
   * Required capabilities that must be available for this capability to function
   */
  dependencies?: string[];
}

/**
 * Service metrics
 * Represents the metrics collected by a service
 */
export interface ServiceMetrics {
  /**
   * Timestamp when metrics were collected
   */
  timestamp: Date;
  
  /**
   * Uptime in milliseconds
   */
  uptime: number;
  
  /**
   * Memory usage in bytes
   */
  memoryUsage: number;
  
  /**
   * CPU usage percentage
   */
  cpuUsage: number;
  
  /**
   * Number of active connections
   */
  activeConnections: number;
  
  /**
   * Number of requests processed
   */
  requestsProcessed: number;
  
  /**
   * Average response time in milliseconds
   */
  averageResponseTime: number;
  
  /**
   * Error rate percentage
   */
  errorRate: number;
  
  /**
   * Custom metrics specific to the service
   */
  custom: Record<string, unknown>;
}

/**
 * Service operation result
 * Generic result type for service operations
 */
export interface ServiceResult<T = unknown> {
  /**
   * Operation success flag
   */
  success: boolean;
  
  /**
   * Result data (if operation was successful)
   */
  data?: T;
  
  /**
   * Error message (if operation failed)
   */
  error?: string;
  
  /**
   * Error code (if operation failed)
   */
  errorCode?: string;
  
  /**
   * Operation timestamp
   */
  timestamp: Date;
  
  /**
   * Operation duration in milliseconds
   */
  duration: number;
}