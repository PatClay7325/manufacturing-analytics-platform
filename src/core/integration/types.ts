/**
 * Integration Types for the Manufacturing Analytics Platform
 * 
 * This file defines the types and enums for the integration framework
 * used to connect with external manufacturing systems.
 */

/**
 * Integration system types
 */
export enum IntegrationSystemType {
  MQTT = 'mqtt',
  OPC_UA = 'opc_ua',
  REST_API = 'rest_api',
  DATABASE = 'database',
  FILE_SYSTEM = 'file_system',
  WEBSOCKET = 'websocket',
  MODBUS = 'modbus',
  SERIAL = 'serial',
  PROFINET = 'profinet',
  CUSTOM = 'custom',
}

/**
 * Integration connection status
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * Integration adapter configuration interface
 */
export interface IntegrationConfig {
  /**
   * Unique identifier for this integration instance
   */
  id: string;
  
  /**
   * Name of the integration
   */
  name: string;
  
  /**
   * Integration system type
   */
  type: IntegrationSystemType;
  
  /**
   * Integration description
   */
  description?: string;
  
  /**
   * Connection parameters specific to the integration type
   */
  connectionParams: Record<string, unknown>;
  
  /**
   * Authentication parameters if required
   */
  authParams?: Record<string, unknown>;
  
  /**
   * Optional retry configuration
   */
  retry?: {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffFactor: number;
  };
  
  /**
   * Data transformation and validation settings
   */
  dataProcessing?: {
    transformationRules?: Record<string, unknown>;
    validationRules?: Record<string, unknown>;
  };
  
  /**
   * Health check settings
   */
  healthCheck?: {
    interval: number;
    timeout: number;
    retries: number;
  };
}

/**
 * Integration data packet
 * Represents a standardized data unit transferred between systems
 */
export interface IntegrationDataPacket<T = unknown> {
  /**
   * Unique identifier for this data packet
   */
  id: string;
  
  /**
   * Source identifier (e.g., device ID, sensor ID)
   */
  source: string;
  
  /**
   * Timestamp when the data was generated
   */
  timestamp: Date;
  
  /**
   * Data payload
   */
  payload: T;
  
  /**
   * Data schema version
   */
  schemaVersion?: string;
  
  /**
   * Data quality indicators
   */
  quality?: {
    reliable: boolean;
    accuracy?: number;
    status?: string;
  };
  
  /**
   * Metadata associated with the data packet
   */
  metadata?: Record<string, unknown>;
}

/**
 * Integration error types
 */
export enum IntegrationErrorType {
  CONNECTION = 'connection_error',
  AUTHENTICATION = 'authentication_error',
  CONFIGURATION = 'configuration_error',
  COMMUNICATION = 'communication_error',
  TRANSFORMATION = 'transformation_error',
  VALIDATION = 'validation_error',
  TIMEOUT = 'timeout_error',
  UNKNOWN = 'unknown_error',
}

/**
 * Integration error interface
 */
export interface IntegrationError {
  /**
   * Error type
   */
  type: IntegrationErrorType;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Original error if available
   */
  originalError?: Error;
  
  /**
   * Timestamp when the error occurred
   */
  timestamp: Date;
  
  /**
   * Integration ID where the error occurred
   */
  integrationId: string;
  
  /**
   * Additional context information
   */
  context?: Record<string, unknown>;
}