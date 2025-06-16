/**
 * Core Module for the Hybrid Manufacturing Intelligence Platform
 * 
 * This module exports all components of the core platform.
 */

// Export architecture components
export * from './architecture';

// Export event system components
export * from './events';

// Export service system components
export * from './services';

// Export AI components
export * from './ai';

// Export compliance components
export * from './compliance';

// Export API gateway components
export * from './api-gateway';

// Export integration components
export * from './integration';
export * from './integration/service/IntegrationService';
export * from './integration/service/IntegrationServiceImpl';

// Export a function to initialize the entire platform
import { bootstrapApplication } from './architecture';
import { initializeEventSystem } from './events';
import { initializeServiceSystem } from './services';
import { initializeAISystem } from './ai';
import { initializeComplianceSystem } from './compliance';
import { initializeApiGateway } from './api-gateway';
import { IntegrationServiceImpl } from './integration/service/IntegrationServiceImpl';
import { DeploymentEnvironment, LogLevel } from './architecture/types';
import { ApplicationService } from './architecture/ApplicationService';
import { ConfigurationService } from './architecture/ConfigService';

export interface PlatformConfig {
  /**
   * Application name
   */
  name: string;
  
  /**
   * Application version
   */
  version: string;
  
  /**
   * Deployment environment
   */
  environment: DeploymentEnvironment;
  
  /**
   * Debug mode
   */
  debug: boolean;
  
  /**
   * Log level
   */
  logLevel: LogLevel;
  
  /**
   * Enable tracing
   */
  tracing: boolean;
  
  /**
   * Application-specific settings
   */
  settings: Record<string, unknown>;
}

/**
 * Initialize the Hybrid Manufacturing Intelligence Platform
 * @param config Platform configuration
 * @returns Application service instance
 */
export async function initializePlatform(
  config?: Partial<PlatformConfig>
): Promise<ApplicationService> {
  // Create default configuration
  const defaultConfig: PlatformConfig = {
    name: 'HybridManufacturingPlatform',
    version: '1.0.0',
    environment: DeploymentEnvironment.DEVELOPMENT,
    debug: true,
    logLevel: LogLevel.INFO,
    tracing: false,
    settings: {},
  };
  
  // Merge with provided configuration
  const mergedConfig: PlatformConfig = {
    ...defaultConfig,
    ...config,
    settings: {
      ...defaultConfig.settings,
      ...config?.settings,
    },
  };
  
  try {
    console.log(`Initializing ${mergedConfig.name} v${mergedConfig.version} in ${mergedConfig.environment} environment`);
    
    // Bootstrap the application
    const app = await bootstrapApplication(mergedConfig);
    
    // Initialize the event system
    await initializeEventSystem();
    
    // Initialize the service system
    await initializeServiceSystem({
      name: mergedConfig.name,
      version: mergedConfig.version,
      environment: mergedConfig.environment,
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      tracing: mergedConfig.tracing,
      settings: mergedConfig.settings,
    });
    
    // Initialize the AI system
    await initializeAISystem({
      environment: mergedConfig.environment,
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      tracing: mergedConfig.tracing,
      ...mergedConfig.settings.ai,
    });
    
    // Initialize the compliance system
    await initializeComplianceSystem({
      environment: mergedConfig.environment,
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      tracing: mergedConfig.tracing,
      ...mergedConfig.settings.compliance,
    });
    
    // Initialize the API gateway
    await initializeApiGateway({
      environment: mergedConfig.environment,
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      tracing: mergedConfig.tracing,
      ...mergedConfig.settings.apiGateway,
    });
    
    // Initialize the integration framework
    const configService = ConfigurationService.getInstance();
    const integrationService = new IntegrationServiceImpl(
      app.logger,
      configService,
      app.getEventBus(),
      app.getEventProducer()
    );
    
    await integrationService.initialize({
      environment: mergedConfig.environment,
      debug: mergedConfig.debug,
      logLevel: mergedConfig.logLevel,
      tracing: mergedConfig.tracing,
      ...mergedConfig.settings.integration,
    });
    
    // Register the integration service with the application
    app.registerService(integrationService);
    
    console.log(`${mergedConfig.name} v${mergedConfig.version} initialized successfully`);
    
    return app;
  } catch (error) {
    console.error('Error initializing platform:', error);
    throw error;
  }
}