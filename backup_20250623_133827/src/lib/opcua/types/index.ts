/**
 * Production-Ready OPC UA Client Types
 * Comprehensive type definitions for OPC UA manufacturing data collection
 */

import { DataType, SecurityPolicy, MessageSecurityMode } from 'node-opcua';

// Connection Configuration
export interface OPCUAConnectionConfig {
  endpointUrl: string;
  applicationName: string;
  applicationUri?: string;
  productUri?: string;
  clientName?: string;
  connectionTimeout?: number;
  sessionTimeout?: number;
  requestedSessionTimeout?: number;
  keepSessionAlive?: boolean;
  certificateFile?: string;
  privateKeyFile?: string;
  securityMode?: MessageSecurityMode;
  securityPolicy?: SecurityPolicy;
  userName?: string;
  password?: string;
  // Connection pool settings
  maxConnections?: number;
  minConnections?: number;
  connectionIdleTimeout?: number;
  // Retry settings
  maxRetries?: number;
  retryDelay?: number;
  retryBackoffMultiplier?: number;
  maxRetryDelay?: number;
}

// Node Information
export interface OPCUANode {
  nodeId: string;
  browseName: string;
  displayName: string;
  dataType?: DataType;
  value?: any;
  timestamp?: Date;
  statusCode?: number;
  sourceTimestamp?: Date;
  serverTimestamp?: Date;
}

// Subscription Configuration
export interface SubscriptionConfig {
  requestedPublishingInterval: number;
  requestedLifetimeCount: number;
  requestedMaxKeepAliveCount: number;
  maxNotificationsPerPublish: number;
  publishingEnabled: boolean;
  priority: number;
}

// Monitored Item Configuration
export interface MonitoredItemConfig {
  nodeId: string;
  attributeId?: number;
  samplingInterval: number;
  queueSize: number;
  discardOldest: boolean;
  dataChangeFilter?: DataChangeFilter;
}

// Data Change Filter
export interface DataChangeFilter {
  trigger: DataChangeTrigger;
  deadbandType?: DeadbandType;
  deadbandValue?: number;
}

export enum DataChangeTrigger {
  Status = 0,
  StatusValue = 1,
  StatusValueTimestamp = 2
}

export enum DeadbandType {
  None = 0,
  Absolute = 1,
  Percent = 2
}

// Data Value with Manufacturing Context
export interface ManufacturingDataValue {
  nodeId: string;
  value: any;
  timestamp: Date;
  quality: DataQuality;
  equipmentId?: string;
  equipmentName?: string;
  parameterName?: string;
  unit?: string;
  dataType: string;
  metadata?: Record<string, any>;
}

// Data Quality
export interface DataQuality {
  isGood: boolean;
  statusCode: number;
  statusText?: string;
}

// Connection Pool Entry
export interface ConnectionPoolEntry {
  id: string;
  client: any; // OPCUAClient instance
  session: any; // ClientSession instance
  endpointUrl: string;
  isConnected: boolean;
  lastUsed: Date;
  createdAt: Date;
  useCount: number;
  errors: number;
}

// Metrics
export interface OPCUAMetrics {
  connectionsActive: number;
  connectionsTotal: number;
  connectionErrors: number;
  subscriptionsActive: number;
  monitoredItemsActive: number;
  dataValuesReceived: number;
  dataValuesProcessed: number;
  lastDataReceived?: Date;
  averageProcessingTime: number;
  circuitBreakerState: CircuitBreakerState;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

// Event Handlers
export interface OPCUAEventHandlers {
  onDataChange?: (data: ManufacturingDataValue) => void | Promise<void>;
  onConnectionLost?: (error: Error) => void;
  onConnectionRestored?: () => void;
  onSubscriptionCreated?: (subscriptionId: number) => void;
  onError?: (error: Error) => void;
}

// Security Configuration
export interface SecurityConfig {
  certificatePath: string;
  privateKeyPath: string;
  certificateManager?: any; // OPCUACertificateManager
  rejectUnknownCertificates?: boolean;
  trustedCertificatesPath?: string;
  issuerCertificatesPath?: string;
  rejectedCertificatesPath?: string;
}

// Type Mapping Configuration
export interface TypeMappingConfig {
  customMappings?: Record<string, (value: any) => any>;
  enumMappings?: Record<string, Record<number, string>>;
  defaultMapping?: (value: any, dataType: DataType) => any;
}

// Manufacturing Equipment Node Structure
export interface EquipmentNode {
  equipmentId: string;
  equipmentName: string;
  nodes: {
    status?: string;
    temperature?: string;
    pressure?: string;
    vibration?: string;
    speed?: string;
    production?: string;
    quality?: string;
    energy?: string;
    [key: string]: string | undefined;
  };
}

// Batch Read/Write Operations
export interface BatchReadRequest {
  nodeIds: string[];
  attributeIds?: number[];
}

export interface BatchWriteRequest {
  nodeId: string;
  value: any;
  dataType?: DataType;
}

// Error Types
export class OPCUAError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'OPCUAError';
  }
}

export class ConnectionError extends OPCUAError {
  constructor(message: string, details?: any) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

export class SubscriptionError extends OPCUAError {
  constructor(message: string, details?: any) {
    super(message, 'SUBSCRIPTION_ERROR', details);
    this.name = 'SubscriptionError';
  }
}

export class SecurityError extends OPCUAError {
  constructor(message: string, details?: any) {
    super(message, 'SECURITY_ERROR', details);
    this.name = 'SecurityError';
  }
}