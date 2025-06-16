/**
 * Core Architecture Module for the Hybrid Manufacturing Intelligence Platform
 * 
 * This module exports all components of the core architecture.
 */

// Export types and interfaces
export * from './types';
export * from './interfaces';

// Export base service implementation
export * from './BaseService';

// Export service registry
export * from './ServiceRegistry';

// Export configuration service
export * from './ConfigService';

// Export application service
export * from './ApplicationService';

// Export a function to bootstrap the application
import { ApplicationService } from './ApplicationService';
import { BaseConfig, DeploymentEnvironment, LogLevel } from './types';

/**
 * Bootstrap the application with the provided configuration
 * @param config Application configuration
 */
export async function bootstrapApplication(config?: Partial<BaseConfig>): Promise<ApplicationService> {
  // Create default configuration
  const defaultConfig: BaseConfig = {
    environment: DeploymentEnvironment.DEVELOPMENT,
    debug: true,
    logLevel: LogLevel.INFO,
    tracing: false,
  };
  
  // Merge with provided configuration
  const mergedConfig: BaseConfig = {
    ...defaultConfig,
    ...config,
  };
  
  // Get application service instance
  const app = ApplicationService.getInstance();
  
  try {
    // Initialize and start the application
    await app.initialize(mergedConfig);
    await app.start();
    
    return app;
  } catch (error) {
    console.error('Error bootstrapping application:', error);
    throw error;
  }
}