/**
 * Integration Service Interface
 * 
 * This interface defines the contract for the Integration Service
 * which is responsible for managing integrations with external systems.
 */

import { ModularService } from './services/interfaces';
import { ServiceResult } from './services/types';
import { IntegrationAdapter } from './interfaces/IntegrationAdapter';
import { IntegrationConfig, IntegrationDataPacket, IntegrationSystemType } from './types';
import { IntegrationPipeline } from './pipeline/IntegrationPipeline';
import { AdapterHealthStatus } from './IntegrationManager';

/**
 * Integration service interface
 * Manages integrations with external manufacturing systems
 */
export interface IntegrationService extends ModularService {
  /**
   * Register a new integration adapter
   * @param adapter Integration adapter to register
   */
  registerAdapter(adapter: IntegrationAdapter): Promise<ServiceResult<void>>;
  
  /**
   * Register a new integration from configuration
   * @param config Integration configuration
   * @returns The registered adapter
   */
  registerIntegrationConfig(config: IntegrationConfig): Promise<ServiceResult<IntegrationAdapter>>;
  
  /**
   * Deregister an integration adapter
   * @param integrationId Integration ID to deregister
   */
  deregisterAdapter(integrationId: string): Promise<ServiceResult<void>>;
  
  /**
   * Get an integration adapter by ID
   * @param integrationId Integration ID
   * @returns The integration adapter or null if not found
   */
  getAdapter(integrationId: string): Promise<ServiceResult<IntegrationAdapter | null>>;
  
  /**
   * Get all registered integration adapters
   * @returns Array of registered adapters
   */
  getAllAdapters(): Promise<ServiceResult<IntegrationAdapter[]>>;
  
  /**
   * Get all adapters of a specific type
   * @param type Integration system type
   * @returns Array of adapters of the specified type
   */
  getAdaptersByType(type: IntegrationSystemType): Promise<ServiceResult<IntegrationAdapter[]>>;
  
  /**
   * Get all connected adapters
   * @returns Array of connected adapters
   */
  getConnectedAdapters(): Promise<ServiceResult<IntegrationAdapter[]>>;
  
  /**
   * Send data to a specific integration
   * @param integrationId Integration ID
   * @param data Data to send
   * @param options Optional sending options
   */
  sendData<T>(
    integrationId: string,
    data: IntegrationDataPacket<T>,
    options?: Record<string, unknown>
  ): Promise<ServiceResult<void>>;
  
  /**
   * Receive data from a specific integration
   * @param integrationId Integration ID
   * @param callback Function to call when data is received
   * @param options Optional receiving options
   * @returns Subscription ID
   */
  receiveData<T>(
    integrationId: string,
    callback: (data: IntegrationDataPacket<T>) => void | Promise<void>,
    options?: Record<string, unknown>
  ): Promise<ServiceResult<string>>;
  
  /**
   * Connect to a specific integration
   * @param integrationId Integration ID
   */
  connect(integrationId: string): Promise<ServiceResult<void>>;
  
  /**
   * Disconnect from a specific integration
   * @param integrationId Integration ID
   */
  disconnect(integrationId: string): Promise<ServiceResult<void>>;
  
  /**
   * Reconnect to a specific integration
   * @param integrationId Integration ID
   */
  reconnect(integrationId: string): Promise<ServiceResult<void>>;
  
  /**
   * Create a new integration pipeline
   * @param id Pipeline ID
   * @param name Pipeline name
   * @param config Pipeline configuration
   * @returns The created pipeline
   */
  createPipeline(
    id: string,
    name: string,
    config: Record<string, unknown>
  ): Promise<ServiceResult<IntegrationPipeline>>;
  
  /**
   * Get a pipeline by ID
   * @param pipelineId Pipeline ID
   * @returns The pipeline or null if not found
   */
  getPipeline(pipelineId: string): Promise<ServiceResult<IntegrationPipeline | null>>;
  
  /**
   * Delete a pipeline
   * @param pipelineId Pipeline ID
   */
  deletePipeline(pipelineId: string): Promise<ServiceResult<void>>;
  
  /**
   * Get all pipelines
   * @returns Array of all pipelines
   */
  getAllPipelines(): Promise<ServiceResult<IntegrationPipeline[]>>;
  
  /**
   * Get health status for a specific adapter
   * @param integrationId Integration ID
   * @returns The health status or null if not found
   */
  getAdapterHealthStatus(integrationId: string): Promise<ServiceResult<AdapterHealthStatus | null>>;
  
  /**
   * Reset circuit breaker for an adapter
   * @param integrationId Integration ID
   */
  resetCircuitBreaker(integrationId: string): Promise<ServiceResult<void>>;
}