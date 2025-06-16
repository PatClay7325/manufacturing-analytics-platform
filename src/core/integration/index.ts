/**
 * Integration Framework for the Manufacturing Analytics Platform
 * 
 * This module provides a flexible, extensible architecture for connecting to
 * various external manufacturing systems like MQTT, OPC UA, REST APIs, databases,
 * and file systems.
 */

// Export type definitions
export * from './types';

// Export interfaces
export { IntegrationAdapter } from './interfaces/IntegrationAdapter';
export { 
  DataTransformer, 
  TransformationResult, 
  TransformationRule 
} from './interfaces/DataTransformer';
export { 
  DataValidator, 
  ValidationResult, 
  ValidationRule, 
  ValidationSchema 
} from './interfaces/DataValidator';

// Export abstract classes
export { AbstractIntegrationAdapter } from './abstract/AbstractIntegrationAdapter';

// Export manager
export { IntegrationManager, IntegrationManagerConfig } from './IntegrationManager';

// Export transformers
export * from './transformers';

// Export schema mapping
export * from './mapping';

// Export integration service
export * from './service/IntegrationService';
export * from './service/IntegrationServiceImpl';