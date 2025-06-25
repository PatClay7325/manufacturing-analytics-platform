/**
 * OPC UA Client for Manufacturing Equipment Data Collection
 * Production-ready implementation with comprehensive features
 */

// Main client
export { OPCUAClient } from './client/opcua-client';
export type { OPCUAClientConfig } from './client/opcua-client';

// Connection pool
export { ConnectionPool } from './client/connection-pool';
export type { ConnectionPoolConfig } from './client/connection-pool';

// Subscription management
export { SubscriptionManager } from './subscriptions/subscription-manager';

// Security
export { SecurityManager } from './security/security-manager';
export type { CertificateInfo } from './security/security-manager';

// Type mapping
export { TypeMapper } from './utils/type-mapper';

// Circuit breaker
export { CircuitBreaker } from './utils/circuit-breaker';
export type { CircuitBreakerConfig } from './utils/circuit-breaker';

// Metrics
export { MetricsCollector } from './monitoring/metrics-collector';
export type { MetricsConfig } from './monitoring/metrics-collector';

// Re-export all types
export * from './types';

// Re-export commonly used node-opcua types
export {
  DataType,
  SecurityPolicy,
  MessageSecurityMode,
  AttributeIds,
  StatusCodes,
  VariantArrayType
} from 'node-opcua';