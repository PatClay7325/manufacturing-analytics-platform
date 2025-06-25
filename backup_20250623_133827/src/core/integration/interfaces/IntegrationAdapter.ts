/**
 * Integration Adapter Interface
 * 
 * Defines the contract for all integration adapters in the Manufacturing AnalyticsPlatform.
 * Integration adapters are responsible for connecting to external manufacturing systems
 * such as MQTT brokers, OPC UA servers, REST APIs, databases, and file systems.
 */

import { BaseService } from './architecture/interfaces';
import { 
  IntegrationConfig, 
  ConnectionStatus, 
  IntegrationDataPacket, 
  IntegrationError 
} from './types';

/**
 * Integration adapter interface
 * All integration adapters must implement this interface
 */
export interface IntegrationAdapter extends BaseService {
  /**
   * The integration configuration
   */
  readonly config: IntegrationConfig;

  /**
   * Current connection status
   */
  readonly connectionStatus: ConnectionStatus;

  /**
   * Connect to the external system
   * @returns Promise that resolves when connected
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the external system
   * @returns Promise that resolves when disconnected
   */
  disconnect(): Promise<void>;

  /**
   * Send data to the external system
   * @param data The data to send
   * @param options Optional sending options
   * @returns Promise that resolves when data is sent
   */
  sendData<T>(data: IntegrationDataPacket<T>, options?: Record<string, unknown>): Promise<void>;

  /**
   * Receive data from the external system
   * This may be implemented as a streaming or polling interface depending on the adapter
   * @param callback Function to call when data is received
   * @param options Optional receiving options
   * @returns Subscription ID that can be used to unsubscribe
   */
  receiveData<T>(
    callback: (data: IntegrationDataPacket<T>) => void | Promise<void>,
    options?: Record<string, unknown>
  ): Promise<string>;

  /**
   * Stop receiving data for a specific subscription
   * @param subscriptionId The subscription ID to unsubscribe
   * @returns Promise that resolves when unsubscribed
   */
  unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Test the connection to the external system
   * @returns Promise that resolves with a boolean indicating if connected
   */
  testConnection(): Promise<boolean>;

  /**
   * Get the connection latency in milliseconds
   * @returns Promise that resolves with the connection latency
   */
  getLatency(): Promise<number>;

  /**
   * Get the last error if any
   * @returns The last error or null if no error
   */
  getLastError(): IntegrationError | null;

  /**
   * Handle reconnection logic
   * @returns Promise that resolves when reconnection is complete
   */
  reconnect(): Promise<void>;
}