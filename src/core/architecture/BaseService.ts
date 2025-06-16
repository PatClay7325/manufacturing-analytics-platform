/**
 * Base Service Implementation for the Hybrid Manufacturing Intelligence Platform
 * 
 * This abstract class implements the BaseService interface and provides
 * common functionality for all platform services.
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseService, ServiceLifecycle } from './interfaces';
import { 
  ServiceStatus, 
  HealthCheckResult, 
  BaseConfig 
} from './types';

/**
 * Abstract base class that provides core functionality for all services
 */
export abstract class AbstractBaseService implements BaseService, ServiceLifecycle {
  /**
   * Unique service identifier
   */
  public readonly id: string;
  
  /**
   * Service name
   */
  public readonly name: string;
  
  /**
   * Service version
   */
  public readonly version: string;
  
  /**
   * Current service status
   */
  public status: ServiceStatus;
  
  /**
   * Service configuration
   */
  protected config: BaseConfig | null = null;
  
  /**
   * Dependencies of this service
   */
  protected dependencies: string[] = [];
  
  /**
   * Service start timestamp
   */
  protected startTime: Date | null = null;
  
  /**
   * Service initialization timestamp
   */
  protected initTime: Date | null = null;
  
  /**
   * Creates a new base service
   * @param name Service name
   * @param version Service version
   * @param id Optional service ID (auto-generated if not provided)
   */
  constructor(name: string, version: string, id?: string) {
    this.id = id || uuidv4();
    this.name = name;
    this.version = version;
    this.status = ServiceStatus.INITIALIZING;
  }
  
  /**
   * Initialize the service
   * @param config Service configuration
   */
  public async initialize(config: BaseConfig): Promise<void> {
    try {
      // Call beforeInit lifecycle hook if implemented
      if (this.beforeInit) {
        await this.beforeInit();
      }
      
      this.config = config;
      this.status = ServiceStatus.INITIALIZING;
      this.initTime = new Date();
      
      // Perform service-specific initialization
      await this.doInitialize();
      
      // Call afterInit lifecycle hook if implemented
      if (this.afterInit) {
        await this.afterInit();
      }
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      throw error;
    }
  }
  
  /**
   * Start the service
   */
  public async start(): Promise<void> {
    try {
      // Call beforeStart lifecycle hook if implemented
      if (this.beforeStart) {
        await this.beforeStart();
      }
      
      if (!this.config) {
        throw new Error(`Service ${this.name} must be initialized before starting`);
      }
      
      await this.doStart();
      this.status = ServiceStatus.READY;
      this.startTime = new Date();
      
      // Call afterStart lifecycle hook if implemented
      if (this.afterStart) {
        await this.afterStart();
      }
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      throw error;
    }
  }
  
  /**
   * Stop the service
   */
  public async stop(): Promise<void> {
    try {
      // Call beforeStop lifecycle hook if implemented
      if (this.beforeStop) {
        await this.beforeStop();
      }
      
      await this.doStop();
      this.status = ServiceStatus.OFFLINE;
      
      // Call afterStop lifecycle hook if implemented
      if (this.afterStop) {
        await this.afterStop();
      }
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      throw error;
    }
  }
  
  /**
   * Get service health status
   */
  public async getHealth(): Promise<HealthCheckResult> {
    const details = await this.getHealthDetails();
    
    return {
      service: this.name,
      status: this.status,
      version: this.version,
      timestamp: new Date(),
      details,
      dependencies: await this.getDependenciesHealth(),
    };
  }
  
  /**
   * Graceful shutdown handling
   */
  public async shutdown(): Promise<void> {
    try {
      // Log shutdown start
      console.log(`Shutting down service: ${this.name}`);
      
      // Perform service-specific cleanup
      await this.doShutdown();
      
      // Stop the service
      await this.stop();
      
      // Log successful shutdown
      console.log(`Service ${this.name} shut down successfully`);
    } catch (error) {
      console.error(`Error shutting down service ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Service-specific initialization
   * Must be implemented by subclasses
   */
  protected abstract doInitialize(): Promise<void>;
  
  /**
   * Service-specific start logic
   * Must be implemented by subclasses
   */
  protected abstract doStart(): Promise<void>;
  
  /**
   * Service-specific stop logic
   * Must be implemented by subclasses
   */
  protected abstract doStop(): Promise<void>;
  
  /**
   * Service-specific shutdown logic
   * Can be overridden by subclasses
   */
  protected async doShutdown(): Promise<void> {
    // Default implementation does nothing
  }
  
  /**
   * Get additional health details
   * Can be overridden by subclasses
   */
  protected async getHealthDetails(): Promise<Record<string, unknown>> {
    return {
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      initialized: !!this.initTime,
    };
  }
  
  /**
   * Get health of dependencies
   * Can be overridden by subclasses
   */
  protected async getDependenciesHealth(): Promise<{ name: string; status: ServiceStatus; responseTime?: number }[]> {
    // Default implementation returns empty array
    return [];
  }
}