/**
 * Configuration Service for the Hybrid Manufacturing Intelligence Platform
 * 
 * This class implements the ConfigService interface and provides
 * configuration management capabilities.
 */

import { ConfigService } from './interfaces';
import { AbstractBaseService } from './BaseService';
import { BaseConfig, DeploymentEnvironment, LogLevel, ServiceStatus } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for configuration change event
 */
interface ConfigChangeEvent<T = any> {
  key: string;
  oldValue: T;
  newValue: T;
}

/**
 * Configuration service implementation
 */
export class ConfigurationService extends AbstractBaseService implements ConfigService {
  /**
   * Singleton instance
   */
  private static instance: ConfigurationService;
  
  /**
   * Configuration store
   */
  private configStore: Map<string, any> = new Map();
  
  /**
   * Configuration watchers
   */
  private watchers: Map<string, Set<(newValue: any, oldValue: any) => void>> = new Map();
  
  /**
   * Default configuration
   */
  private defaultConfig: BaseConfig = {
    environment: DeploymentEnvironment.DEVELOPMENT,
    debug: true,
    logLevel: LogLevel.INFO,
    tracing: false,
  };
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super('ConfigurationService', '1.0.0');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }
  
  /**
   * Initialize the configuration service
   */
  protected async doInitialize(): Promise<void> {
    // Load default configuration
    for (const [key, value] of Object.entries(this.defaultConfig)) {
      this.set(key, value);
    }
    
    // Load environment-specific configuration if available
    const env = process.env.NODE_ENV || 'development';
    await this.loadEnvironmentConfig(env);
    
    console.log(`Configuration service initialized for environment: ${env}`);
  }
  
  /**
   * Start the configuration service
   */
  protected async doStart(): Promise<void> {
    // Nothing special to do here
    console.log('Configuration service started');
  }
  
  /**
   * Stop the configuration service
   */
  protected async doStop(): Promise<void> {
    // Clear all watchers
    this.watchers.clear();
    console.log('Configuration service stopped');
  }
  
  /**
   * Get configuration value
   * @param key Configuration key
   * @param defaultValue Default value if key not found
   */
  public get<T>(key: string, defaultValue?: T): T {
    const value = this.configStore.get(key);
    return value !== undefined ? value : (defaultValue as T);
  }
  
  /**
   * Set configuration value
   * @param key Configuration key
   * @param value Configuration value
   */
  public set<T>(key: string, value: T): void {
    const oldValue = this.configStore.get(key);
    this.configStore.set(key, value);
    
    // Notify watchers
    if (oldValue !== value) {
      this.notifyWatchers(key, value, oldValue);
    }
  }
  
  /**
   * Load configuration from source
   * @param source Source to load from )
   */
  public async load(source: string): Promise<void> {
    try {
      if (source.endsWith('.json')) {
        await this.loadFromJsonFile(source);
      } else if (source === 'env') {
        this.loadFromEnvironment();
      } else {
        throw new Error(`Unsupported configuration source: ${source}`);
      }
    } catch (error) {
      console.error(`Error loading configuration from ${source}:`, error);
      throw error;
    }
  }
  
  /**
   * Watch for configuration changes
   * @param key Configuration key to watch
   * @param callback Callback to invoke on change
   */
  public watch<T>(key: string, callback: (newValue: T, oldValue: T) => void): void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    
    this.watchers.get(key)?.add(callback);
  }
  
  /**
   * Load configuration from JSON file
   * @param filePath Path to JSON file
   */
  private async loadFromJsonFile(filePath: string): Promise<void> {
    try {
      // Ensure the file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Configuration file not found: ${filePath}`);
      }
      
      // Read and parse the file
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const config = JSON.parse(fileContent);
      
      // Update configuration store
      for (const [key, value] of Object.entries(config)) {
        this.set(key, value);
      }
      
      console.log(`Configuration loaded from file: ${filePath}`);
    } catch (error) {
      console.error(`Error loading configuration from file ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): void {
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        // Convert environment variables to appropriate types
        let parsedValue: any = value;
        
        // Try to parse as JSON if it looks like a JSON string
        if (value.startsWith('{') || value.startsWith('[')) {
          try {
            parsedValue = JSON.parse(value);
          } catch (e) {
            // Not valid JSON, keep as string
          }
        }
        // Try to parse as boolean
        else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
          parsedValue = value.toLowerCase() === 'true';
        }
        // Try to parse as number
        else if (!isNaN(Number(value))) {
          parsedValue = Number(value);
        }
        
        this.set(key, parsedValue);
      }
    }
    
    console.log('Configuration loaded from environment variables');
  }
  
  /**
   * Load environment-specific configuration
   * @param env Environment name
   */
  private async loadEnvironmentConfig(env: string): Promise<void> {
    const configDir = path.join(process.cwd(), 'config');
    
    // Skip if config directory doesn't exist
    if (!fs.existsSync(configDir)) {
      console.log(`Config directory not found: ${configDir}`);
      return;
    }
    
    const configPath = path.join(configDir, `${env}.json`);
    
    // Skip if environment config doesn't exist
    if (!fs.existsSync(configPath)) {
      console.log(`Environment configuration not found: ${configPath}`);
      return;
    }
    
    // Load environment configuration
    await this.loadFromJsonFile(configPath);
  }
  
  /**
   * Notify watchers of configuration changes
   * @param key Configuration key that changed
   * @param newValue New configuration value
   * @param oldValue Old configuration value
   */
  private notifyWatchers<T>(key: string, newValue: T, oldValue: T): void {
    const keyWatchers = this.watchers.get(key);
    if (keyWatchers) {
      for (const callback of keyWatchers) {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error(`Error in configuration watcher for key ${key}:`, error);
        }
      }
    }
  }
  
  /**
   * Get additional health details
   */
  protected async getHealthDetails(): Promise<Record<string, unknown>> {
    const baseDetails = await super.getHealthDetails();
    return {
      ...baseDetails,
      configCount: this.configStore.size,
      watcherCount: Array.from(this.watchers.values()).reduce((total, set) => total + set.size, 0),
      environment: this.get('environment'),
    };
  }
}