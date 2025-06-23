/**
 * Integration Configuration Management
 * 
 * Provides configuration management, validation, and security for integrations
 * in the Manufacturing AnalyticsPlatform.
 */

import { LoggerService } from './architecture/interfaces';
import { IntegrationConfig, IntegrationSystemType } from './types';

/**
 * Credential encryption options
 */
export interface CredentialEncryptionOptions {
  /**
   * Enable/disable encryption
   */
  enabled: boolean;
  
  /**
   * Encryption algorithm to use
   */
  algorithm: string;
  
  /**
   * Environment variable containing encryption key
   */
  keyEnvVar: string;
  
  /**
   * Initialization vector (IV) if needed
   */
  iv?: string;
}

/**
 * Integration configuration validation error
 */
export interface ConfigValidationError {
  /**
   * Error code
   */
  code: string;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Field path that caused the error
   */
  field?: string;
  
  /**
   * Validation rule that failed
   */
  rule?: string;
  
  /**
   * Value that failed validation
   */
  value?: unknown;
}

/**
 * Integration configuration validation result
 */
export interface ConfigValidationResult {
  /**
   * Whether the validation was successful
   */
  valid: boolean;
  
  /**
   * Validation errors if validation failed
   */
  errors?: ConfigValidationError[];
  
  /**
   * Warnings that don't invalidate the configuration
   */
  warnings?: ConfigValidationError[];
}

/**
 * Integration configuration schema
 */
export interface IntegrationConfigSchema {
  /**
   * Schema ID
   */
  id: string;
  
  /**
   * Schema version
   */
  version: string;
  
  /**
   * Integration type this schema applies to
   */
  type: IntegrationSystemType;
  
  /**
   * Required fields
   */
  required: string[];
  
  /**
   * Field definitions
   */
  fields: Record<string, {
    /**
     * Field type
     */
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    
    /**
     * Field description
     */
    description?: string;
    
    /**
     * Default value
     */
    default?: unknown;
    
    /**
     * Minimum value (for numbers)
     */
    min?: number;
    
    /**
     * Maximum value (for numbers)
     */
    max?: number;
    
    /**
     * Allowed values (for enum-like fields)
     */
    enum?: unknown[];
    
    /**
     * Pattern (for strings)
     */
    pattern?: string;
    
    /**
     * Whether this field contains sensitive information
     */
    sensitive?: boolean;
    
    /**
     * For object types, nested field definitions
     */
    fields?: Record<string, any>;
    
    /**
     * For array types, item definition
     */
    items?: any;
  }>;
}

/**
 * Environment-specific configuration options
 */
export interface EnvironmentConfig {
  /**
   * Environment name (e.g., development, staging, production)
   */
  name: string;
  
  /**
   * Environment-specific configuration overrides
   */
  config: Partial<IntegrationConfig>;
}

/**
 * Integration configuration manager
 */
export class IntegrationConfigManager {
  /**
   * Map of configuration schemas by ID
   */
  private schemas: Map<string, IntegrationConfigSchema> = new Map();
  
  /**
   * Map of configuration schemas by integration type
   */
  private schemasByType: Map<IntegrationSystemType, IntegrationConfigSchema[]> = new Map();
  
  /**
   * Credential encryption options
   */
  private encryptionOptions: CredentialEncryptionOptions;
  
  /**
   * Current environment
   */
  private environment: string;
  
  /**
   * Map of environment-specific configurations
   */
  private environmentConfigs: Map<string, Map<string, EnvironmentConfig>> = new Map();
  
  /**
   * Constructor
   * @param logger Logger service
   * @param encryptionOptions Credential encryption options
   * @param environment Current environment name
   */
  constructor(
    private readonly logger: LoggerService,
    encryptionOptions?: Partial<CredentialEncryptionOptions>,
    environment?: string
  ) {
    // Default encryption options
    this.encryptionOptions = {
      enabled: false,
      algorithm: 'aes-256-gcm',
      keyEnvVar: 'INTEGRATION_ENCRYPTION_KEY',
      ...encryptionOptions
    };
    
    // Default to 'development' environment if not specified
    this.environment = environment || process.env.NODE_ENV || 'development';
  }
  
  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Integration Configuration Manager');
    
    // Register built-in schemas
    this.registerBuiltInSchemas();
    
    this.logger.info('Integration Configuration Manager initialized');
  }
  
  /**
   * Register a configuration schema
   * @param schema The schema to register
   */
  registerSchema(schema: IntegrationConfigSchema): void {
    if (this.schemas.has(schema.id)) {
      throw new Error(`Schema with ID ${schema.id} already exists`);
    }
    
    this.logger.debug(`Registering integration config schema: ${schema.id}`, {
      schemaType: schema.type,
      schemaVersion: schema.version
    });
    
    // Register the schema
    this.schemas.set(schema.id, schema);
    
    // Index by type
    if (!this.schemasByType.has(schema.type)) {
      this.schemasByType.set(schema.type, []);
    }
    
    this.schemasByType.get(schema.type)!.push(schema);
    
    // Sort schemas by version (descending) so newer versions come first
    this.schemasByType.get(schema.type)!.sort((a, b) => {
      return this.compareVersions(b.version, a.version);
    });
  }
  
  /**
   * Deregister a configuration schema
   * @param schemaId The ID of the schema to deregister
   */
  deregisterSchema(schemaId: string): void {
    const schema = this.schemas.get(schemaId);
    
    if (!schema) {
      throw new Error(`Schema with ID ${schemaId} does not exist`);
    }
    
    this.logger.debug(`Deregistering integration config schema: ${schemaId}`);
    
    // Remove from type index
    const schemas = this.schemasByType.get(schema.type);
    if (schemas) {
      const index = schemas.findIndex(s => s.id === schemaId);
      if (index !== -1) {
        schemas.splice(index, 1);
      }
    }
    
    // Remove the schema
    this.schemas.delete(schemaId);
  }
  
  /**
   * Get a schema by ID
   * @param schemaId The ID of the schema to retrieve
   * @returns The schema or null if not found
   */
  getSchema(schemaId: string): IntegrationConfigSchema | null {
    return this.schemas.get(schemaId) || null;
  }
  
  /**
   * Get the latest schema for a specific integration type
   * @param type The integration type
   * @returns The latest schema or null if no schema exists for the type
   */
  getLatestSchemaForType(type: IntegrationSystemType): IntegrationConfigSchema | null {
    const schemas = this.schemasByType.get(type);
    return schemas && schemas.length > 0 ? schemas[0] : null;
  }
  
  /**
   * Get all schemas for a specific integration type
   * @param type The integration type
   * @returns Array of schemas for the type
   */
  getAllSchemasForType(type: IntegrationSystemType): IntegrationConfigSchema[] {
    return this.schemasByType.get(type) || [];
  }
  
  /**
   * Validate an integration configuration against its schema
   * @param config The configuration to validate
   * @param schemaId Optional specific schema ID to validate against
   * @returns Validation result
   */
  validateConfig(
    config: IntegrationConfig,
    schemaId?: string
  ): ConfigValidationResult {
    // Get the schema to validate against
    let schema: IntegrationConfigSchema | null = null;
    
    if (schemaId) {
      schema = this.getSchema(schemaId);
      if (!schema) {
        return {
          valid: false,
          errors: [{
            code: 'SCHEMA_NOT_FOUND',
            message: `Schema with ID ${schemaId} not found`
          }]
        };
      }
    } else {
      schema = this.getLatestSchemaForType(config.type);
      if (!schema) {
        return {
          valid: false,
          errors: [{
            code: 'NO_SCHEMA_FOR_TYPE',
            message: `No schema found for integration type ${config.type}`
          }]
        };
      }
    }
    
    // Validate the configuration
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationError[] = [];
    
    // Validate required fields
    for (const field of schema.required) {
      // Handle nested fields with dot notation
      const value = this.getNestedValue(config, field);
      
      if (value === undefined) {
        errors.push({
          code: 'REQUIRED_FIELD_MISSING',
          message: `Required field '${field}' is missing`,
          field
        });
      }
    }
    
    // Validate field types and constraints
    this.validateFields(config, schema.fields, '', errors, warnings);
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * Securely store an integration configuration
   * @param config The configuration to store
   * @returns The stored configuration with sensitive fields encrypted
   */
  secureConfig(config: IntegrationConfig): IntegrationConfig {
    if (!this.encryptionOptions.enabled) {
      // If encryption is disabled, just mark sensitive fields
      this.logger.warn('Credential encryption is disabled, sensitive data will be stored in plaintext');
      return this.markSensitiveFields(config);
    }
    
    try {
      // Get the schema
      const schema = this.getLatestSchemaForType(config.type);
      
      if (!schema) {
        this.logger.warn(`No schema found for integration type ${config.type}, cannot identify sensitive fields`);
        return config;
      }
      
      // Clone the config to avoid modifying the original
      const securedConfig = JSON.parse(JSON.stringify(config)) as IntegrationConfig;
      
      // Encrypt sensitive fields
      this.encryptSensitiveFields(securedConfig, schema.fields, '');
      
      return securedConfig;
    } catch (error) {
      this.logger.error('Failed to secure configuration', error);
      throw new Error(`Failed to secure configuration: ${error.message}`);
    }
  }
  
  /**
   * Load a secured configuration and decrypt sensitive fields
   * @param config The secured configuration to load
   * @returns The configuration with sensitive fields decrypted
   */
  loadSecuredConfig(config: IntegrationConfig): IntegrationConfig {
    if (!this.encryptionOptions.enabled) {
      // If encryption is disabled, just return the config as is
      return config;
    }
    
    try {
      // Get the schema
      const schema = this.getLatestSchemaForType(config.type);
      
      if (!schema) {
        this.logger.warn(`No schema found for integration type ${config.type}, cannot identify sensitive fields`);
        return config;
      }
      
      // Clone the config to avoid modifying the original
      const decryptedConfig = JSON.parse(JSON.stringify(config)) as IntegrationConfig;
      
      // Decrypt sensitive fields
      this.decryptSensitiveFields(decryptedConfig, schema.fields, '');
      
      return decryptedConfig;
    } catch (error) {
      this.logger.error('Failed to load secured configuration', error);
      throw new Error(`Failed to load secured configuration: ${error.message}`);
    }
  }
  
  /**
   * Register an environment-specific configuration
   * @param integrationId Integration ID
   * @param environmentConfig Environment-specific configuration
   */
  registerEnvironmentConfig(
    integrationId: string,
    environmentConfig: EnvironmentConfig
  ): void {
    if (!this.environmentConfigs.has(environmentConfig.name)) {
      this.environmentConfigs.set(environmentConfig.name, new Map());
    }
    
    this.environmentConfigs.get(environmentConfig.name)!.set(integrationId, environmentConfig);
    
    this.logger.debug(`Registered environment config for integration ${integrationId} in environment ${environmentConfig.name}`);
  }
  
  /**
   * Get the environment-specific configuration for an integration
   * @param integrationId Integration ID
   * @param environment Optional environment name (defaults to current environment)
   * @returns The environment-specific configuration or null if not found
   */
  getEnvironmentConfig(
    integrationId: string,
    environment?: string
  ): EnvironmentConfig | null {
    const env = environment || this.environment;
    
    if (!this.environmentConfigs.has(env)) {
      return null;
    }
    
    return this.environmentConfigs.get(env)!.get(integrationId) || null;
  }
  
  /**
   * Apply environment-specific configuration to a base configuration
   * @param baseConfig Base configuration
   * @param environment Optional environment name (defaults to current environment)
   * @returns The merged configuration
   */
  applyEnvironmentConfig(
    baseConfig: IntegrationConfig,
    environment?: string
  ): IntegrationConfig {
    const envConfig = this.getEnvironmentConfig(baseConfig.id, environment || this.environment);
    
    if (!envConfig) {
      return baseConfig;
    }
    
    // Deep merge the configurations
    return this.deepMerge(baseConfig, envConfig.config);
  }
  
  /**
   * Generate a configuration template for a specific integration type
   * @param type Integration type
   * @returns A template configuration with default values
   */
  generateConfigTemplate(type: IntegrationSystemType): IntegrationConfig {
    const schema = this.getLatestSchemaForType(type);
    
    if (!schema) {
      throw new Error(`No schema found for integration type ${type}`);
    }
    
    // Generate a template with default values
    const template: any = {
      id: '',
      name: '',
      type,
      description: '',
      connectionParams: {},
      authParams: {}
    };
    
    // Add default values for fields
    this.addDefaultValues(template, schema.fields);
    
    return template as IntegrationConfig;
  }
  
  /**
   * Set the current environment
   * @param environment Environment name
   */
  setEnvironment(environment: string): void {
    this.logger.info(`Changing environment from environment} to ${environment}`);
    this.environment = environment;
  }
  
  /**
   * Get the current environment
   * @returns Current environment name
   */
  getCurrentEnvironment(): string {
    return this.environment;
  }
  
  /**
   * Register built-in schemas for common integration types
   */
  private registerBuiltInSchemas(): void {
    // Register MQTT schema
    this.registerSchema({
      id: 'mqtt-integration-schema',
      version: '1.0.0',
      type: IntegrationSystemType.MQTT,
      required: ['id', 'name', 'type', 'connectionParams.brokerUrl'],
      fields: {
        id: {
          type: 'string',
          description: 'Unique identifier for this integration'
        },
        name: {
          type: 'string',
          description: 'Human-readable name for this integration'
        },
        type: {
          type: 'string',
          enum: [IntegrationSystemType.MQTT],
          description: 'Integration type'
        },
        description: {
          type: 'string',
          description: 'Optional description'
        },
        connectionParams: {
          type: 'object',
          fields: {
            brokerUrl: {
              type: 'string',
              description: 'MQTT broker URL'
            },
            port: {
              type: 'number',
              default: 1883,
              description: 'MQTT broker port'
            },
            clientId: {
              type: 'string',
              description: 'MQTT client ID'
            },
            protocol: {
              type: 'string',
              enum: ['mqtt', 'mqtts', 'ws', 'wss'],
              default: 'mqtt',
              description: 'MQTT protocol'
            },
            topics: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Topics to subscribe to'
            },
            qos: {
              type: 'number',
              enum: [0, 1, 2],
              default: 0,
              description: 'MQTT quality of service'
            },
            clean: {
              type: 'boolean',
              default: true,
              description: 'Whether to use a clean session'
            },
            keepalive: {
              type: 'number',
              default: 60,
              description: 'Keepalive interval in seconds'
            }
          }
        },
        authParams: {
          type: 'object',
          fields: {
            username: {
              type: 'string',
              description: 'MQTT username',
              sensitive: true
            },
            password: {
              type: 'string',
              description: 'MQTT password',
              sensitive: true
            },
            certPath: {
              type: 'string',
              description: 'Path to client certificate'
            },
            keyPath: {
              type: 'string',
              description: 'Path to client key'
            },
            caPath: {
              type: 'string',
              description: 'Path to CA certificate'
            }
          }
        }
      }
    });
    
    // Register OPC UA schema
    this.registerSchema({
      id: 'opcua-integration-schema',
      version: '1.0.0',
      type: IntegrationSystemType.OPC_UA,
      required: ['id', 'name', 'type', 'connectionParams.endpointUrl'],
      fields: {
        id: {
          type: 'string',
          description: 'Unique identifier for this integration'
        },
        name: {
          type: 'string',
          description: 'Human-readable name for this integration'
        },
        type: {
          type: 'string',
          enum: [IntegrationSystemType.OPC_UA],
          description: 'Integration type'
        },
        description: {
          type: 'string',
          description: 'Optional description'
        },
        connectionParams: {
          type: 'object',
          fields: {
            endpointUrl: {
              type: 'string',
              description: 'OPC UA server endpoint URL'
            },
            securityMode: {
              type: 'string',
              enum: ['None', 'Sign', 'SignAndEncrypt'],
              default: 'None',
              description: 'Security mode'
            },
            securityPolicy: {
              type: 'string',
              enum: ['None', 'Basic128', 'Basic256', 'Basic256Sha256'],
              default: 'None',
              description: 'Security policy'
            },
            nodeIds: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Node IDs to monitor'
            },
            samplingInterval: {
              type: 'number',
              default: 1000,
              description: 'Sampling interval in milliseconds'
            },
            publishingInterval: {
              type: 'number',
              default: 1000,
              description: 'Publishing interval in milliseconds'
            }
          }
        },
        authParams: {
          type: 'object',
          fields: {
            username: {
              type: 'string',
              description: 'OPC UA username',
              sensitive: true
            },
            password: {
              type: 'string',
              description: 'OPC UA password',
              sensitive: true
            },
            applicationName: {
              type: 'string',
              default: 'Manufacturing AnalyticsPlatform',
              description: 'Application name to identify the client'
            },
            applicationUri: {
              type: 'string',
              description: 'Application URI'
            },
            certPath: {
              type: 'string',
              description: 'Path to client certificate'
            },
            keyPath: {
              type: 'string',
              description: 'Path to client key'
            }
          }
        }
      }
    });
    
    // Register REST API schema
    this.registerSchema({
      id: 'restapi-integration-schema',
      version: '1.0.0',
      type: IntegrationSystemType.REST_API,
      required: ['id', 'name', 'type', 'connectionParams.baseUrl'],
      fields: {
        id: {
          type: 'string',
          description: 'Unique identifier for this integration'
        },
        name: {
          type: 'string',
          description: 'Human-readable name for this integration'
        },
        type: {
          type: 'string',
          enum: [IntegrationSystemType.REST_API],
          description: 'Integration type'
        },
        description: {
          type: 'string',
          description: 'Optional description'
        },
        connectionParams: {
          type: 'object',
          fields: {
            baseUrl: {
              type: 'string',
              description: 'Base URL for the REST API'
            },
            headers: {
              type: 'object',
              description: 'Default headers to include with requests'
            },
            timeout: {
              type: 'number',
              default: 30000,
              description: 'Request timeout in milliseconds'
            },
            endpoints: {
              type: 'array',
              items: {
                type: 'object',
                fields: {
                  id: {
                    type: 'string',
                    description: 'Endpoint identifier'
                  },
                  path: {
                    type: 'string',
                    description: 'Endpoint path'
                  },
                  method: {
                    type: 'string',
                    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                    default: 'GET',
                    description: 'HTTP method'
                  },
                  pollInterval: {
                    type: 'number',
                    description: 'Polling interval in milliseconds (for polling endpoints)'
                  }
                }
              }
            }
          }
        },
        authParams: {
          type: 'object',
          fields: {
            type: {
              type: 'string',
              enum: ['none', 'basic', 'bearer', 'apiKey', 'oauth2'],
              default: 'none',
              description: 'Authentication type'
            },
            username: {
              type: 'string',
              description: 'Username for basic auth',
              sensitive: true
            },
            password: {
              type: 'string',
              description: 'Password for basic auth',
              sensitive: true
            },
            token: {
              type: 'string',
              description: 'Token for bearer auth',
              sensitive: true
            },
            apiKey: {
              type: 'string',
              description: 'API key',
              sensitive: true
            },
            apiKeyHeaderName: {
              type: 'string',
              default: 'X-API-Key',
              description: 'Header name for API key'
            },
            oauth2Config: {
              type: 'object',
              fields: {
                tokenUrl: {
                  type: 'string',
                  description: 'OAuth2 token URL'
                },
                clientId: {
                  type: 'string',
                  description: 'OAuth2 client ID',
                  sensitive: true
                },
                clientSecret: {
                  type: 'string',
                  description: 'OAuth2 client secret',
                  sensitive: true
                },
                scope: {
                  type: 'string',
                  description: 'OAuth2 scope'
                }
              }
            }
          }
        }
      }
    });
  }
  
  /**
   * Validate fields recursively against a schema
   * @param config Configuration object or sub-object
   * @param fieldDefs Field definitions from schema
   * @param path Current path for nested fields
   * @param errors Array to collect validation errors
   * @param warnings Array to collect validation warnings
   */
  private validateFields(
    config: any,
    fieldDefs: Record<string, any>,
    path: string,
    errors: ConfigValidationError[],
    warnings: ConfigValidationError[]
  ): void {
    for (const [key, def] of Object.entries(fieldDefs)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const value = this.getNestedValue(config, fieldPath);
      
      // Skip validation if the value is undefined and not required
      if (value === undefined) {
        continue;
      }
      
      // Validate type
      if (!this.validateType(value, def.type)) {
        errors.push({
          code: 'INVALID_TYPE',
          message: `Field '${fieldPath}' has invalid type, expected ${def.type}`,
          field: fieldPath,
          rule: 'type',
          value
        });
        continue; // Skip further validation for this field
      }
      
      // Validate enum values
      if (def.enum && !def.enum.includes(value)) {
        errors.push({
          code: 'INVALID_ENUM_VALUE',
          message: `Field '${fieldPath}' must be one of: ${def.enum.join(', ')}`,
          field: fieldPath,
          rule: 'enum',
          value
        });
      }
      
      // Validate min/max for numbers
      if (def.type === 'number') {
        if (def.min !== undefined && value < def.min) {
          errors.push({
            code: 'VALUE_TOO_SMALL',
            message: `Field '${fieldPath}' must be at least ${def.min}`,
            field: fieldPath,
            rule: 'min',
            value
          });
        }
        
        if (def.max !== undefined && value > def.max) {
          errors.push({
            code: 'VALUE_TOO_LARGE',
            message: `Field '${fieldPath}' must be at most ${def.max}`,
            field: fieldPath,
            rule: 'max',
            value
          });
        }
      }
      
      // Validate pattern for strings
      if (def.type === 'string' && def.pattern && !new RegExp(def.pattern).test(value)) {
        errors.push({
          code: 'PATTERN_MISMATCH',
          message: `Field '${fieldPath}' must match pattern: ${def.pattern}`,
          field: fieldPath,
          rule: 'pattern',
          value
        });
      }
      
      // Validate nested fields for objects
      if (def.type === 'object' && def.fields && typeof value === 'object' && value !== null) {
        this.validateFields(value, def.fields, fieldPath, errors, warnings);
      }
      
      // Validate array items
      if (def.type === 'array' && def.items && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const itemPath = `${fieldPath}[${i}]`;
          const item = value[i];
          
          if (def.items.type && !this.validateType(item, def.items.type)) {
            errors.push({
              code: 'INVALID_ARRAY_ITEM_TYPE',
              message: `Item at ${itemPath} has invalid type, expected ${def.items.type}`,
              field: itemPath,
              rule: 'type',
              value: item
            });
          }
          
          // Validate nested fields for object items
          if (def.items.type === 'object' && def.items.fields && typeof item === 'object' && item !== null) {
            this.validateFields(item, def.items.fields, itemPath, errors, warnings);
          }
        }
      }
    }
  }
  
  /**
   * Validate a value against a type
   * @param value Value to validate
   * @param type Expected type
   * @returns Whether the value matches the expected type
   */
  private validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true; // Unknown type, assume valid
    }
  }
  
  /**
   * Get a nested value from an object using dot notation
   * @param obj The object to get the value from
   * @param path The path to the value (e.g., 'connectionParams.brokerUrl')
   * @returns The value or undefined if not found
   */
  private getNestedValue(obj: any, path: string): unknown {
    // Handle array indexes in path (e.g., 'endpoints[0].path')
    const parts = path.split(/\.|\[|\]/).filter(Boolean);
    let current = obj;
    
    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current;
  }
  
  /**
   * Set a nested value in an object using dot notation
   * @param obj The object to set the value in
   * @param path The path to set the value at
   * @param value The value to set
   */
  private setNestedValue(obj: any, path: string, value: unknown): void {
    const parts = path.split(/\.|\[|\]/).filter(Boolean);
    
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (current[part] === undefined) {
        // Create empty object or array based on next part
        const nextPart = parts[i + 1];
        current[part] = /^\d+$/.test(nextPart) ? [] : {};
      }
      
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  /**
   * Mark sensitive fields in a configuration
   * @param config The configuration to mark
   * @returns The configuration with sensitive fields marked
   */
  private markSensitiveFields(config: IntegrationConfig): IntegrationConfig {
    const schema = this.getLatestSchemaForType(config.type);
    
    if (!schema) {
      return config;
    }
    
    // Clone the config to avoid modifying the original
    const markedConfig = JSON.parse(JSON.stringify(config)) as IntegrationConfig;
    
    // Add a comment to sensitive fields
    this.processSensitiveFields(markedConfig, schema.fields, '', (path, value) => {
      // Just return the value since we can't actually mark it in JSON
      return value;
    });
    
    return markedConfig;
  }
  
  /**
   * Encrypt sensitive fields in a configuration
   * @param config The configuration to encrypt
   * @param fieldDefs Field definitions from schema
   * @param path Current path for nested fields
   */
  private encryptSensitiveFields(
    config: any,
    fieldDefs: Record<string, any>,
    path: string
  ): void {
    this.processSensitiveFields(config, fieldDefs, path, (path, value) => {
      if (typeof value !== 'string') {
        return value;
      }
      
      // Encrypt the value
      return this.encryptValue(value);
    });
  }
  
  /**
   * Decrypt sensitive fields in a configuration
   * @param config The configuration to decrypt
   * @param fieldDefs Field definitions from schema
   * @param path Current path for nested fields
   */
  private decryptSensitiveFields(
    config: any,
    fieldDefs: Record<string, any>,
    path: string
  ): void {
    this.processSensitiveFields(config, fieldDefs, path, (path, value) => {
      if (typeof value !== 'string' || !value.startsWith('encrypted:')) {
        return value;
      }
      
      // Decrypt the value
      return this.decryptValue(value);
    });
  }
  
  /**
   * Process sensitive fields in a configuration
   * @param config The configuration to process
   * @param fieldDefs Field definitions from schema
   * @param path Current path for nested fields
   * @param processor Function to process sensitive values
   */
  private processSensitiveFields(
    config: any,
    fieldDefs: Record<string, any>,
    path: string,
    processor: (path: string, value: unknown) => unknown
  ): void {
    for (const [key, def] of Object.entries(fieldDefs)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const value = this.getNestedValue(config, fieldPath);
      
      // Skip if the value is undefined
      if (value === undefined) {
        continue;
      }
      
      // Process sensitive fields
      if (def.sensitive === true) {
        const processedValue = processor(fieldPath, value);
        this.setNestedValue(config, fieldPath, processedValue);
      }
      
      // Process nested fields for objects
      if (def.type === 'object' && def.fields && typeof value === 'object' && value !== null) {
        this.processSensitiveFields(config, def.fields, fieldPath, processor);
      }
      
      // Process array items
      if (def.type === 'array' && def.items && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const itemPath = `${fieldPath}[${i}]`;
          const item = value[i];
          
          // Process nested fields for object items
          if (def.items.type === 'object' && def.items.fields && typeof item === 'object' && item !== null) {
            this.processSensitiveFields(item, def.items.fields, itemPath, processor);
          }
        }
      }
    }
  }
  
  /**
   * Encrypt a sensitive value
   * @param value The value to encrypt
   * @returns The encrypted value
   */
  private encryptValue(value: string): string {
    // This is a placeholder. In a real implementation, you would use a proper
    // encryption algorithm like AES-GCM with a secure key management system.
    // Here we're just base64 encoding as a demonstration.
    
    if (!value) {
      return '';
    }
    
    try {
      // Simple base64 encoding for demo purposes
      const encoded = Buffer.from(value).toString('base64');
      return `encrypted:${encoded}`;
    } catch (error) {
      this.logger.error('Failed to encrypt value', error);
      throw new Error(`Failed to encrypt value: ${error.message}`);
    }
  }
  
  /**
   * Decrypt a sensitive value
   * @param value The encrypted value
   * @returns The decrypted value
   */
  private decryptValue(value: string): string {
    // This is a placeholder. In a real implementation, you would use a proper
    // decryption algorithm matching the encryption used.
    
    if (!value || !value.startsWith('encrypted:')) {
      return value;
    }
    
    try {
      // Simple base64 decoding for demo purposes
      const encoded = value.replace('encrypted:', '');
      return Buffer.from(encoded, 'base64').toString('utf8');
    } catch (error) {
      this.logger.error('Failed to decrypt value', error);
      throw new Error(`Failed to decrypt value: ${error.message}`);
    }
  }
  
  /**
   * Add default values to a configuration template
   * @param template The template to add default values to
   * @param fieldDefs Field definitions from schema
   */
  private addDefaultValues(
    template: any,
    fieldDefs: Record<string, any>
  ): void {
    for (const [key, def] of Object.entries(fieldDefs)) {
      // Set default value if defined
      if (def.default !== undefined) {
        if (!template[key]) {
          template[key] = def.default;
        }
      }
      
      // Handle nested objects
      if (def.type === 'object' && def.fields) {
        if (!template[key]) {
          template[key] = {};
        }
        
        this.addDefaultValues(template[key], def.fields);
      }
      
      // Handle arrays
      if (def.type === 'array' && def.items) {
        if (!template[key]) {
          template[key] = [];
        }
      }
    }
  }
  
  /**
   * Compare version strings (semver-like)
   * @param version1 First version string
   * @param version2 Second version string
   * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
   */
  private compareVersions(version1: string, version2: string): number {
    const parts1 = version1.split('.').map(Number);
    const parts2 = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = i < parts1.length ? parts1[i] : 0;
      const part2 = i < parts2.length ? parts2[i] : 0;
      
      if (part1 > part2) {
        return 1;
      }
      
      if (part1 < part2) {
        return -1;
      }
    }
    
    return 0;
  }
  
  /**
   * Deep merge two objects
   * @param target Target object
   * @param source Source object
   * @returns Merged object
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
  
  /**
   * Check if a value is an object
   * @param item The value to check
   * @returns Whether the value is an object
   */
  private isObject(item: any): boolean {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
}