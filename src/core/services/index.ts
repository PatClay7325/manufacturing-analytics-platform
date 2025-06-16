/**
 * Services Module for the Hybrid Manufacturing Intelligence Platform
 * 
 * This module exports all components of the modular services architecture.
 */

// Export types and interfaces
export * from './types';
export * from './interfaces';

// Export base service implementation
export * from './BaseModularService';

// Export service factory
export * from './ServiceFactory';

// Export service implementations
export * from './equipment/EquipmentServiceImpl';

// Export a function to initialize the service system
import { ServiceFactory } from './ServiceFactory';
import { DeploymentEnvironment, LogLevel } from '../architecture/types';
import { ServiceConfig } from './types';

/**
 * Initialize the service system
 * @param config Optional service configuration
 * @returns Service factory instance
 */
export async function initializeServiceSystem(
  config?: Partial<ServiceConfig>
): Promise<ServiceFactory> {
  // Create default configuration
  const defaultConfig: ServiceConfig = {
    name: 'ServiceSystem',
    version: '1.0.0',
    environment: DeploymentEnvironment.DEVELOPMENT,
    debug: true,
    logLevel: LogLevel.INFO,
    tracing: false,
    settings: {},
  };
  
  // Merge with provided configuration
  const mergedConfig: ServiceConfig = {
    ...defaultConfig,
    ...config,
    settings: {
      ...defaultConfig.settings,
      ...config?.settings,
    },
  };
  
  // Get service factory instance
  const factory = ServiceFactory.getInstance();
  
  try {
    // Initialize and start the factory
    await factory.initialize(mergedConfig);
    await factory.start();
    
    // Initialize and start all services
    await factory.initializeAndStartServices(mergedConfig);
    
    return factory;
  } catch (error) {
    console.error('Error initializing service system:', error);
    throw error;
  }
}