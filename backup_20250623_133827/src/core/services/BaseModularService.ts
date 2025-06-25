/**
 * Base Modular Service Implementation
 * 
 * This abstract class implements the ModularService interface and provides
 * common functionality for all modular services.
 */

import { AbstractBaseService } from './architecture/BaseService';
import { BaseConfig, HealthCheckResult } from './architecture/types';
import { ModularService } from './interfaces';
import { ServiceCapability, ServiceConfig, ServiceDependencies, ServiceMetrics } from './types';

/**
 * Abstract base class for all modular services
 */
export abstract class BaseModularService extends AbstractBaseService implements ModularService {
  /**
   * Service configuration
   */
  public readonly config: ServiceConfig;
  
  /**
   * Service dependencies
   */
  public readonly dependencies: ServiceDependencies;
  
  /**
   * Service capabilities
   */
  public readonly capabilities: ServiceCapability[];
  
  /**
   * Service start time
   */
  private serviceStartTime: number = 0;
  
  /**
   * Request counter
   */
  private requestCounter: number = 0;
  
  /**
   * Response time accumulator
   */
  private responseTimeAccumulator: number = 0;
  
  /**
   * Error counter
   */
  private errorCounter: number = 0;
  
  /**
   * Create a new modular service
   * @param name Service name
   * @param version Service version
   * @param dependencies Service dependencies
   * @param capabilities Service capabilities
   */
  constructor(
    name: string,
    version: string,
    dependencies: ServiceDependencies = { required: [], optional: [] },
    capabilities: ServiceCapability[] = []
  ) {
    super(name, version);
    
    this.config = {
      name,
      version,
      environment: 'development',
      debug: true,
      logLevel: 'info',
      tracing: false,
      settings: {},
    };
    
    this.dependencies = dependencies;
    this.capabilities = capabilities;
  }
  
  /**
   * Initialize the service
   * @param config Service configuration
   */
  public async initialize(config: BaseConfig): Promise<void> {
    // Update config with provided values
    this.config.environment = config.environment;
    this.config.debug = config.debug;
    this.config.logLevel = config.logLevel;
    this.config.tracing = config.tracing;
    
    // Apply service-specific settings if provided
    if ((config as ServiceConfig).settings) {
      this.config.settings = {
        ...this.config.settings,
        ...(config as ServiceConfig).settings,
      };
    }
    
    // Call parent initialize
    await super.initialize(config);
  }
  
  /**
   * Start the service
   */
  public async start(): Promise<void> {
    // Reset metrics
    this.serviceStartTime = Date.now();
    this.requestCounter = 0;
    this.responseTimeAccumulator = 0;
    this.errorCounter = 0;
    
    // Call parent start
    await super.start();
  }
  
  /**
   * Get service metrics
   */
  public async getMetrics(): Promise<ServiceMetrics> {
    const uptime = Date.now() - this.serviceStartTime;
    
    // Get memory usage
    const memoryUsage = process.memoryUsage().heapUsed;
    
    // Get CPU usage - this is a placeholder; real implementation would use a proper CPU usage measurement
    const cpuUsage = Math.random() * 10; // Simulated CPU usage percentage
    
    // Calculate average response time
    const averageResponseTime = this.requestCounter > 0
      ? this.responseTimeAccumulator / this.requestCounter
      : 0;
    
    // Calculate error rate
    const errorRate = this.requestCounter > 0
      ? (this.errorCounter / this.requestCounter) * 100
      : 0;
    
    // Get custom metrics
    const customMetrics = await this.getCustomMetrics();
    
    return {
      timestamp: new Date(),
      uptime,
      memoryUsage,
      cpuUsage,
      activeConnections: 0, // Placeholder
      requestsProcessed: this.requestCounter,
      averageResponseTime,
      errorRate,
      custom: customMetrics,
    };
  }
  
  /**
   * Check if a capability is enabled
   * @param capabilityName Name of the capability to check
   */
  public hasCapability(capabilityName: string): boolean {
    return this.capabilities.some(
      cap => cap.name === capabilityName && cap.enabled
    );
  }
  
  /**
   * Get service documentation
   */
  public async getDocumentation(): Promise<string> {
    return `
# ${this.name} (v${this.version})

## Overview

${await this.getServiceDescription()}

## Capabilities

${this.capabilities.map(cap => `- ${cap.name} (v${cap.version}): ${cap.description} ${cap.enabled ? '[Enabled]' : '[Disabled]'}`).join('\n')}

## Dependencies

### Required
${this.dependencies.required.map(dep => `- ${dep}`).join('\n') || '- None'}

### Optional
${this.dependencies.optional.map(dep => `- ${dep}`).join('\n') || '- None'}

## API Documentation

${await this.getApiDocumentation()}
`;
  }
  
  /**
   * Track a request
   * @param startTime Request start time
   * @param success Whether the request was successful
   */
  protected trackRequest(startTime: number, success: boolean): void {
    const duration = Date.now() - startTime;
    
    this.requestCounter++;
    this.responseTimeAccumulator += duration;
    
    if (!success) {
      this.errorCounter++;
    }
  }
  
  /**
   * Get health check result
   */
  public async getHealth(): Promise<HealthCheckResult> {
    const result = await super.getHealth();
    
    // Add service-specific health details
    return {
      ...result,
      details: {
        ...result.details,
        capabilities: this.capabilities.length,
        enabledCapabilities: this.capabilities.filter(cap => cap.enabled).length,
        requiredDependencies: this.dependencies.required.length,
        optionalDependencies: this.dependencies.optional.length,
      },
    };
  }
  
  /**
   * Get service-specific description
   * Should be implemented by subclasses
   */
  protected abstract getServiceDescription(): Promise<string>;
  
  /**
   * Get API documentation
   * Should be implemented by subclasses
   */
  protected abstract getApiDocumentation(): Promise<string>;
  
  /**
   * Get custom metrics
   * Can be overridden by subclasses
   */
  protected async getCustomMetrics(): Promise<Record<string, unknown>> {
    return {};
  }
}