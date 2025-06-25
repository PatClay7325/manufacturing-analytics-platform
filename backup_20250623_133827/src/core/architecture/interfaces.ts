/**
 * Core interfaces for the Hybrid Manufacturing Intelligence Platform
 * 
 * This file defines the fundamental service interfaces that form the
 * foundation of the platform's modular architecture.
 */

import { ServiceStatus, HealthCheckResult, BaseConfig } from './types';

/**
 * Base service interface that all platform services must implement
 */
export interface BaseService {
  /**
   * Unique identifier for the service
   */
  readonly id: string;
  
  /**
   * Human-readable name of the service
   */
  readonly name: string;
  
  /**
   * Service version
   */
  readonly version: string;
  
  /**
   * Current status of the service
   */
  status: ServiceStatus;
  
  /**
   * Initialize the service
   * @param config Service configuration
   */
  initialize(config: BaseConfig): Promise<void>;
  
  /**
   * Start the service
   */
  start(): Promise<void>;
  
  /**
   * Stop the service
   */
  stop(): Promise<void>;
  
  /**
   * Get the health status of the service
   */
  getHealth(): Promise<HealthCheckResult>;
  
  /**
   * Handle graceful shutdown
   */
  shutdown(): Promise<void>;
}

/**
 * Lifecycle hooks for services
 */
export interface ServiceLifecycle {
  /**
   * Hook called before service initialization
   */
  beforeInit?(): Promise<void>;
  
  /**
   * Hook called after service initialization
   */
  afterInit?(): Promise<void>;
  
  /**
   * Hook called before service start
   */
  beforeStart?(): Promise<void>;
  
  /**
   * Hook called after service start
   */
  afterStart?(): Promise<void>;
  
  /**
   * Hook called before service stop
   */
  beforeStop?(): Promise<void>;
  
  /**
   * Hook called after service stop
   */
  afterStop?(): Promise<void>;
}

/**
 * Service discovery interface
 */
export interface ServiceDiscovery {
  /**
   * Register a service with the discovery system
   * @param service Service to register
   */
  register(service: BaseService): Promise<void>;
  
  /**
   * Deregister a service from the discovery system
   * @param serviceId ID of service to deregister
   */
  deregister(serviceId: string): Promise<void>;
  
  /**
   * Discover a service by ID
   * @param serviceId ID of service to discover
   */
  discover(serviceId: string): Promise<BaseService | null>;
  
  /**
   * Discover all services of a specific type
   * @param serviceType Type of services to discover
   */
  discoverAll(serviceType: string): Promise<BaseService[]>;
  
  /**
   * Update service status
   * @param serviceId ID of service to update
   * @param status New service status
   */
  updateStatus(serviceId: string, status: ServiceStatus): Promise<void>;
}

/**
 * Configuration service interface
 */
export interface ConfigService {
  /**
   * Get configuration value
   * @param key Configuration key
   * @param defaultValue Default value if key not found
   */
  get<T>(key: string, defaultValue?: T): T;
  
  /**
   * Set configuration value
   * @param key Configuration key
   * @param value Configuration value
   */
  set<T>(key: string, value: T): void;
  
  /**
   * Load configuration from source
   * @param source Source to load from )
   */
  load(source: string): Promise<void>;
  
  /**
   * Watch for configuration changes
   * @param key Configuration key to watch
   * @param callback Callback to invoke on change
   */
  watch<T>(key: string, callback: (newValue: T, oldValue: T) => void): void;
}

/**
 * Logger service interface
 */
export interface LoggerService {
  /**
   * Log debug message
   * @param message Message to log
   * @param context Optional context data
   */
  debug(message: string, context?: Record<string, unknown>): void;
  
  /**
   * Log info message
   * @param message Message to log
   * @param context Optional context data
   */
  info(message: string, context?: Record<string, unknown>): void;
  
  /**
   * Log warning message
   * @param message Message to log
   * @param context Optional context data
   */
  warn(message: string, context?: Record<string, unknown>): void;
  
  /**
   * Log error message
   * @param message Message to log
   * @param error Optional error object
   * @param context Optional context data
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
  
  /**
   * Log fatal message
   * @param message Message to log
   * @param error Optional error object
   * @param context Optional context data
   */
  fatal(message: string, error?: Error, context?: Record<string, unknown>): void;
}