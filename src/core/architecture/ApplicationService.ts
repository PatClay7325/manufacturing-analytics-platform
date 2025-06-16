/**
 * Application Service for the Hybrid Manufacturing Intelligence Platform
 * 
 * This class serves as the main entry point for the application and manages
 * the lifecycle of all services.
 */

import { AbstractBaseService } from './BaseService';
import { BaseService } from './interfaces';
import { ServiceRegistry } from './ServiceRegistry';
import { ConfigurationService } from './ConfigService';
import { BaseConfig, ServiceStatus } from './types';
import { IntegrationService } from '../integration/service/IntegrationService';

/**
 * Application service for managing the application lifecycle
 */
export class ApplicationService extends AbstractBaseService {
  /**
   * Singleton instance
   */
  private static instance: ApplicationService;
  
  /**
   * List of registered services
   */
  private services: BaseService[] = [];
  
  /**
   * Service registry instance
   */
  private serviceRegistry: ServiceRegistry;
  
  /**
   * Configuration service instance
   */
  private configService: ConfigurationService;
  
  /**
   * Flag indicating if the application is shutting down
   */
  private isShuttingDown = false;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super('ApplicationService', '1.0.0');
    this.serviceRegistry = ServiceRegistry.getInstance();
    this.configService = ConfigurationService.getInstance();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ApplicationService {
    if (!ApplicationService.instance) {
      ApplicationService.instance = new ApplicationService();
    }
    return ApplicationService.instance;
  }
  
  /**
   * Initialize the application service
   */
  protected async doInitialize(): Promise<void> {
    console.log('Initializing Application Service...');
    
    // Register core services
    this.services.push(this.configService);
    
    // Initialize core services
    await this.configService.initialize(this.config as BaseConfig);
    
    // Register the application service itself
    await this.serviceRegistry.register(this);
    
    // Set up signal handlers for graceful shutdown
    this.setupSignalHandlers();
    
    console.log('Application Service initialized');
  }
  
  /**
   * Start the application service
   */
  protected async doStart(): Promise<void> {
    console.log('Starting Application Service...');
    
    // Start core services
    await this.configService.start();
    
    // Register all services with the service registry
    for (const service of this.services) {
      await this.serviceRegistry.register(service);
    }
    
    console.log('Application Service started');
  }
  
  /**
   * Stop the application service
   */
  protected async doStop(): Promise<void> {
    console.log('Stopping Application Service...');
    
    // Stop all services in reverse order
    for (let i = this.services.length - 1; i >= 0; i--) {
      const service = this.services[i];
      try {
        await service.stop();
      } catch (error) {
        console.error(`Error stopping service ${service.name}:`, error);
      }
    }
    
    console.log('Application Service stopped');
  }
  
  /**
   * Register a service with the application
   * @param service Service to register
   */
  public registerService(service: BaseService): void {
    this.services.push(service);
    
    // If the application is already running, register the service with the registry
    if (this.status === ServiceStatus.READY) {
      this.serviceRegistry.register(service).catch(error => {
        console.error(`Error registering service ${service.name}:`, error);
      });
    }
    
    console.log(`Service registered with application: ${service.name}`);
  }
  
  /**
   * Initialize and start all registered services
   */
  public async startAllServices(): Promise<void> {
    console.log('Starting all services...');
    
    // Get configuration for services
    const serviceConfig = this.configService.get<BaseConfig>('serviceConfig', this.config as BaseConfig);
    
    // Initialize and start each service
    for (const service of this.services) {
      try {
        await service.initialize(serviceConfig);
        await service.start();
        console.log(`Service started: ${service.name}`);
      } catch (error) {
        console.error(`Error starting service ${service.name}:`, error);
        throw error;
      }
    }
    
    console.log('All services started successfully');
  }
  
  /**
   * Get a registered service by name
   * @param name Service name
   */
  public getServiceByName(name: string): BaseService | undefined {
    return this.services.find(service => service.name === name);
  }
  
  /**
   * Set up signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    // Handle process termination signals
    process.on('SIGTERM', this.handleShutdownSignal.bind(this, 'SIGTERM'));
    process.on('SIGINT', this.handleShutdownSignal.bind(this, 'SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', this.handleUncaughtException.bind(this));
    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
  }
  
  /**
   * Handle shutdown signal
   * @param signal Signal name
   */
  private async handleShutdownSignal(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    console.log(`Received ${signal} signal. Shutting down gracefully...`);
    
    try {
      // Ensure integration service is shut down properly
      const integrationService = this.getServiceByName('IntegrationService') as IntegrationService;
      if (integrationService) {
        console.log('Shutting down Integration Service...');
        await integrationService.shutdown();
      }
      
      await this.shutdown();
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }
  
  /**
   * Handle uncaught exception
   * @param error Uncaught exception
   */
  private handleUncaughtException(error: Error): void {
    console.error('Uncaught exception:', error);
    this.handleFatalError(error);
  }
  
  /**
   * Handle unhandled rejection
   * @param reason Rejection reason
   */
  private handleUnhandledRejection(reason: unknown): void {
    console.error('Unhandled rejection:', reason);
    this.handleFatalError(reason instanceof Error ? reason : new Error(String(reason)));
  }
  
  /**
   * Handle fatal error
   * @param error Fatal error
   */
  private handleFatalError(error: Error): void {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    console.error('Fatal error occurred. Shutting down...', error);
    
    // Attempt graceful shutdown
    (async () => {
      try {
        // Ensure integration service is shut down properly
        const integrationService = this.getServiceByName('IntegrationService') as IntegrationService;
        if (integrationService) {
          console.log('Shutting down Integration Service...');
          await integrationService.shutdown();
        }
        
        await this.shutdown();
      } catch (shutdownError) {
        console.error('Error during shutdown after fatal error:', shutdownError);
      } finally {
        process.exit(1);
      }
    })();
  }
  
  /**
   * Get additional health details
   */
  protected async getHealthDetails(): Promise<Record<string, unknown>> {
    const baseDetails = await super.getHealthDetails();
    return {
      ...baseDetails,
      servicesCount: this.services.length,
      servicesStatus: this.services.map(service => ({
        name: service.name,
        status: service.status,
      })),
    };
  }
}