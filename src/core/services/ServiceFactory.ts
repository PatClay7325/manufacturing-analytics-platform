/**
 * Service Factory for the Hybrid Manufacturing Intelligence Platform
 * 
 * This class provides a central point for accessing all services.
 */

import { AbstractBaseService } from '../architecture/BaseService';
import { ModularService } from './interfaces';
import { ServiceConfig } from './types';
import { EquipmentServiceImpl } from './equipment/EquipmentServiceImpl';
import { ServiceRegistry } from '../architecture/ServiceRegistry';

/**
 * Service factory for creating and accessing services
 */
export class ServiceFactory extends AbstractBaseService {
  /**
   * Singleton instance
   */
  private static instance: ServiceFactory;
  
  /**
   * Map of services by name
   */
  private services: Map<string, ModularService> = new Map();
  
  /**
   * Service registry instance
   */
  private serviceRegistry: ServiceRegistry;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super('ServiceFactory', '1.0.0');
    this.serviceRegistry = ServiceRegistry.getInstance();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }
  
  /**
   * Initialize the service factory
   */
  protected async doInitialize(): Promise<void> {
    this.services.clear();
    console.log('Service factory initialized');
  }
  
  /**
   * Start the service factory
   */
  protected async doStart(): Promise<void> {
    console.log('Service factory started');
  }
  
  /**
   * Stop the service factory
   */
  protected async doStop(): Promise<void> {
    // Stop all services
    for (const service of this.services.values()) {
      try {
        await service.stop();
      } catch (error) {
        console.error(`Error stopping service ${service.name}:`, error);
      }
    }
    
    console.log('Service factory stopped');
  }
  
  /**
   * Register a service with the factory
   * @param service Service to register
   */
  public registerService(service: ModularService): void {
    this.services.set(service.name, service);
    console.log(`Service registered with factory: ${service.name}`);
  }
  
  /**
   * Get a service by name
   * @param name Service name
   */
  public getService<T extends ModularService>(name: string): T | undefined {
    return this.services.get(name) as T | undefined;
  }
  
  /**
   * Get all registered services
   */
  public getAllServices(): ModularService[] {
    return Array.from(this.services.values());
  }
  
  /**
   * Initialize and start all services
   * @param config Service configuration
   */
  public async initializeAndStartServices(config: ServiceConfig): Promise<void> {
    console.log('Initializing and starting all services...');
    
    // Create and register core services
    await this.createCoreServices(config);
    
    // Initialize and start all services
    for (const service of this.services.values()) {
      try {
        await service.initialize(config);
        await service.start();
        await this.serviceRegistry.register(service);
        console.log(`Service initialized and started: ${service.name}`);
      } catch (error) {
        console.error(`Error initializing/starting service ${service.name}:`, error);
        throw error;
      }
    }
    
    console.log('All services initialized and started');
  }
  
  /**
   * Create core services
   * @param config Service configuration
   */
  private async createCoreServices(config: ServiceConfig): Promise<void> {
    // Create equipment service
    const equipmentService = new EquipmentServiceImpl();
    this.registerService(equipmentService);
    
    // TODO: Create other core services
    // - Metrics service
    // - Maintenance service
    // - Quality service
    // - Alerts service
  }
}