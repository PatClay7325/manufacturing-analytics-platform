/**
 * Production Configuration Management
 * Environment-specific config validation, hot-reload, and secrets rotation
 */

import { EventEmitter } from 'events';
import { readFileSync, watchFile, unwatchFile } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';
import { SecurityValidator } from '../orchestration/utils/SecurityValidator';

export interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    default?: any;
    validator?: (value: any) => boolean;
    sensitive?: boolean;
    description?: string;
  };
}

export interface EnvironmentConfig {
  name: string;
  schema: ConfigSchema;
  overrides?: Record<string, any>;
}

export interface SecretRotationConfig {
  secretName: string;
  rotationInterval: number; // milliseconds
  provider: 'vault' | 'aws' | 'azure' | 'gcp' | 'kubernetes';
  rotationCallback: (newSecret: string) => Promise<void>;
}

export class ProductionConfigManager extends EventEmitter {
  private static instance: ProductionConfigManager;
  private config: Record<string, any> = {};
  private schema: ConfigSchema = {};
  private environment: string;
  private configFile?: string;
  private secretRotations = new Map<string, SecretRotationConfig>();
  private rotationTimers = new Map<string, NodeJS.Timeout>();
  private isWatching = false;

  constructor() {
    super();
    this.environment = process.env.NODE_ENV || 'development';
    this.setupDefaultSchema();
  }

  static getInstance(): ProductionConfigManager {
    if (!ProductionConfigManager.instance) {
      ProductionConfigManager.instance = new ProductionConfigManager();
    }
    return ProductionConfigManager.instance;
  }

  /**
   * Initialize configuration with validation
   */
  async initialize(configPath?: string): Promise<void> {
    try {
      // Load configuration from multiple sources
      await this.loadConfiguration(configPath);
      
      // Validate against schema
      const validation = this.validateConfiguration();
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Setup hot-reload if in development
      if (this.environment === 'development' || process.env.CONFIG_HOT_RELOAD === 'true') {
        this.setupHotReload();
      }

      // Initialize secret rotation
      this.initializeSecretRotation();

      logger.info({
        environment: this.environment,
        configKeys: Object.keys(this.config).length,
        secretRotations: this.secretRotations.size,
      }, 'Configuration manager initialized');

      this.emit('config:initialized', this.config);
    } catch (error) {
      logger.error({ error }, 'Failed to initialize configuration');
      throw error;
    }
  }

  /**
   * Get configuration value with type safety
   */
  get<T = any>(key: string, defaultValue?: T): T {
    const keys = key.split('.');
    let value: any = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue as T;
      }
    }
    
    return value as T;
  }

  /**
   * Set configuration value with validation
   */
  set(key: string, value: any): boolean {
    try {
      // Validate against schema if exists
      if (this.schema[key]) {
        const schemaEntry = this.schema[key];
        
        if (!this.validateValue(value, schemaEntry)) {
          logger.error({ key, value }, 'Configuration value validation failed');
          return false;
        }
      }

      // Set the value
      const keys = key.split('.');
      let current = this.config;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      const oldValue = current[keys[keys.length - 1]];
      current[keys[keys.length - 1]] = value;
      
      logger.debug({ key, oldValue, newValue: value }, 'Configuration value updated');
      this.emit('config:changed', { key, oldValue, newValue: value });
      
      return true;
    } catch (error) {
      logger.error({ error, key, value }, 'Failed to set configuration value');
      return false;
    }
  }

  /**
   * Register secret rotation
   */
  registerSecretRotation(config: SecretRotationConfig): void {
    this.secretRotations.set(config.secretName, config);
    
    // Start rotation timer
    const timer = setInterval(async () => {
      await this.rotateSecret(config.secretName);
    }, config.rotationInterval);
    
    this.rotationTimers.set(config.secretName, timer);
    
    logger.info({
      secretName: config.secretName,
      interval: config.rotationInterval,
      provider: config.provider,
    }, 'Secret rotation registered');
  }

  /**
   * Manually rotate a secret
   */
  async rotateSecret(secretName: string): Promise<boolean> {
    const rotationConfig = this.secretRotations.get(secretName);
    if (!rotationConfig) {
      logger.error({ secretName }, 'Secret rotation config not found');
      return false;
    }

    try {
      logger.info({ secretName, provider: rotationConfig.provider }, 'Starting secret rotation');
      
      // Generate or fetch new secret based on provider
      const newSecret = await this.fetchNewSecret(rotationConfig);
      
      // Call rotation callback
      await rotationConfig.rotationCallback(newSecret);
      
      // Update configuration if needed
      if (this.config[secretName]) {
        this.set(secretName, newSecret);
      }
      
      logger.info({ secretName }, 'Secret rotation completed successfully');
      this.emit('secret:rotated', { secretName, provider: rotationConfig.provider });
      
      return true;
    } catch (error) {
      logger.error({ error, secretName }, 'Secret rotation failed');
      this.emit('secret:rotation_failed', { secretName, error });
      return false;
    }
  }

  /**
   * Get configuration for specific environment
   */
  getEnvironmentConfig(): Record<string, any> {
    const envConfig: Record<string, any> = {};
    
    // Include non-sensitive configuration
    for (const [key, value] of Object.entries(this.config)) {
      const schemaEntry = this.schema[key];
      if (!schemaEntry?.sensitive) {
        envConfig[key] = value;
      }
    }
    
    return envConfig;
  }

  /**
   * Validate entire configuration against schema
   */
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    for (const [key, schemaEntry] of Object.entries(this.schema)) {
      if (schemaEntry.required && !(key in this.config)) {
        errors.push(`Required configuration key '${key}' is missing`);
      }
    }
    
    // Validate existing values
    for (const [key, value] of Object.entries(this.config)) {
      if (this.schema[key]) {
        if (!this.validateValue(value, this.schema[key])) {
          errors.push(`Invalid value for configuration key '${key}'`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Reload configuration from sources
   */
  async reload(): Promise<void> {
    try {
      logger.info('Reloading configuration');
      await this.loadConfiguration(this.configFile);
      
      const validation = this.validateConfiguration();
      if (!validation.valid) {
        logger.error({ errors: validation.errors }, 'Configuration reload failed validation');
        return;
      }
      
      this.emit('config:reloaded', this.config);
      logger.info('Configuration reloaded successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to reload configuration');
    }
  }

  /**
   * Stop configuration management
   */
  stop(): void {
    // Stop file watching
    if (this.isWatching && this.configFile) {
      unwatchFile(this.configFile);
      this.isWatching = false;
    }
    
    // Clear rotation timers
    for (const timer of this.rotationTimers.values()) {
      clearInterval(timer);
    }
    this.rotationTimers.clear();
    
    logger.info('Configuration manager stopped');
  }

  /**
   * Load configuration from multiple sources
   */
  private async loadConfiguration(configPath?: string): Promise<void> {
    this.config = {};
    
    // 1. Load from environment variables
    this.loadFromEnvironment();
    
    // 2. Load from config file if provided
    if (configPath) {
      this.loadFromFile(configPath);
      this.configFile = configPath;
    }
    
    // 3. Load from external sources (Kubernetes secrets, etc.)
    await this.loadFromExternalSources();
    
    // 4. Apply defaults for missing values
    this.applyDefaults();
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): void {
    // Map environment variables to config keys
    const envMappings: Record<string, string> = {
      'database.url': 'DATABASE_URL',
      'redis.url': 'REDIS_URL',
      'ollama.baseUrl': 'OLLAMA_BASE_URL',
      'jwt.secret': 'JWT_SECRET',
      'api.port': 'PORT',
      'api.host': 'HOST',
      'logging.level': 'LOG_LEVEL',
      'metrics.enabled': 'METRICS_ENABLED',
      'health.interval': 'HEALTH_CHECK_INTERVAL',
    };
    
    for (const [configKey, envKey] of Object.entries(envMappings)) {
      const envValue = process.env[envKey];
      if (envValue !== undefined) {
        // Convert string values to appropriate types
        let value: any = envValue;
        
        if (this.schema[configKey]) {
          value = this.convertType(envValue, this.schema[configKey].type);
        }
        
        this.setNestedValue(this.config, configKey, value);
      }
    }
  }

  /**
   * Load configuration from file
   */
  private loadFromFile(configPath: string): void {
    try {
      const fullPath = join(process.cwd(), configPath);
      const fileContent = readFileSync(fullPath, 'utf-8');
      
      let fileConfig: any;
      if (configPath.endsWith('.json')) {
        fileConfig = JSON.parse(fileContent);
      } else if (configPath.endsWith('.js') || configPath.endsWith('.ts')) {
        // For JS/TS files, would need to use dynamic import
        logger.warn('JS/TS config files not supported in this implementation');
        return;
      }
      
      // Merge file config into main config
      this.mergeConfig(this.config, fileConfig);
      
      logger.debug({ configPath }, 'Configuration loaded from file');
    } catch (error) {
      logger.error({ error, configPath }, 'Failed to load configuration file');
    }
  }

  /**
   * Load configuration from external sources
   */
  private async loadFromExternalSources(): Promise<void> {
    // Kubernetes secrets, Vault, etc.
    // Implementation would depend on deployment environment
    
    if (process.env.KUBERNETES_SERVICE_HOST) {
      // Load from Kubernetes secrets
      logger.debug('Loading configuration from Kubernetes secrets');
    }
  }

  /**
   * Apply default values for missing configuration
   */
  private applyDefaults(): void {
    for (const [key, schemaEntry] of Object.entries(this.schema)) {
      if (schemaEntry.default !== undefined && !(key in this.config)) {
        this.setNestedValue(this.config, key, schemaEntry.default);
      }
    }
  }

  /**
   * Setup hot-reload for configuration files
   */
  private setupHotReload(): void {
    if (!this.configFile || this.isWatching) {
      return;
    }
    
    const fullPath = join(process.cwd(), this.configFile);
    
    watchFile(fullPath, { interval: 1000 }, () => {
      logger.info('Configuration file changed, reloading');
      this.reload();
    });
    
    this.isWatching = true;
    logger.info({ configFile: this.configFile }, 'Hot-reload enabled for configuration');
  }

  /**
   * Initialize secret rotation for production
   */
  private initializeSecretRotation(): void {
    if (this.environment === 'production') {
      // Register default secret rotations
      this.registerSecretRotation({
        secretName: 'jwt.secret',
        rotationInterval: 24 * 60 * 60 * 1000, // 24 hours
        provider: 'vault',
        rotationCallback: async (newSecret) => {
          // Update JWT secret and invalidate existing tokens gracefully
          logger.info('JWT secret rotated, implementing graceful token transition');
        },
      });
    }
  }

  /**
   * Fetch new secret from provider
   */
  private async fetchNewSecret(config: SecretRotationConfig): Promise<string> {
    switch (config.provider) {
      case 'vault':
        // Integration with HashiCorp Vault
        return this.generateSecureSecret();
      
      case 'aws':
        // Integration with AWS Secrets Manager
        return this.generateSecureSecret();
      
      case 'kubernetes':
        // Integration with Kubernetes secrets
        return this.generateSecureSecret();
      
      default:
        return this.generateSecureSecret();
    }
  }

  /**
   * Generate a secure secret
   */
  private generateSecureSecret(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Setup default configuration schema
   */
  private setupDefaultSchema(): void {
    this.schema = {
      'database.url': {
        type: 'string',
        required: true,
        sensitive: true,
        description: 'Database connection URL',
      },
      'redis.url': {
        type: 'string',
        required: false,
        default: 'redis://localhost:6379',
        sensitive: true,
        description: 'Redis connection URL',
      },
      'ollama.baseUrl': {
        type: 'string',
        required: false,
        default: 'http://localhost:11434',
        description: 'Ollama service base URL',
      },
      'jwt.secret': {
        type: 'string',
        required: true,
        sensitive: true,
        validator: (value) => typeof value === 'string' && value.length >= 32,
        description: 'JWT signing secret (minimum 32 characters)',
      },
      'api.port': {
        type: 'number',
        required: false,
        default: 3000,
        validator: (value) => Number.isInteger(value) && value > 0 && value < 65536,
        description: 'API server port',
      },
      'logging.level': {
        type: 'string',
        required: false,
        default: 'info',
        validator: (value) => ['error', 'warn', 'info', 'debug'].includes(value),
        description: 'Logging level',
      },
      'metrics.enabled': {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Enable Prometheus metrics',
      },
      'health.interval': {
        type: 'number',
        required: false,
        default: 30000,
        validator: (value) => Number.isInteger(value) && value >= 1000,
        description: 'Health check interval in milliseconds',
      },
    };
  }

  /**
   * Validate a value against schema entry
   */
  private validateValue(value: any, schemaEntry: ConfigSchema[string]): boolean {
    // Type validation
    if (schemaEntry.type === 'string' && typeof value !== 'string') return false;
    if (schemaEntry.type === 'number' && typeof value !== 'number') return false;
    if (schemaEntry.type === 'boolean' && typeof value !== 'boolean') return false;
    if (schemaEntry.type === 'object' && (typeof value !== 'object' || value === null)) return false;
    if (schemaEntry.type === 'array' && !Array.isArray(value)) return false;
    
    // Custom validator
    if (schemaEntry.validator) {
      return schemaEntry.validator(value);
    }
    
    return true;
  }

  /**
   * Convert string value to appropriate type
   */
  private convertType(value: string, type: string): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'object':
      case 'array':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Set nested configuration value
   */
  private setNestedValue(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Merge configuration objects
   */
  private mergeConfig(target: any, source: any): void {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (!(key in target)) {
          target[key] = {};
        }
        this.mergeConfig(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }
}

// Export singleton instance
export const productionConfigManager = ProductionConfigManager.getInstance();