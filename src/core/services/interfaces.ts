/**
 * Service Interfaces for the Hybrid Manufacturing Intelligence Platform
 * 
 * This file defines the interfaces for the modular services architecture.
 */

import { BaseService } from '../architecture/interfaces';
import { ServiceCapability, ServiceConfig, ServiceDependencies, ServiceMetrics, ServiceResult } from './types';

/**
 * Extended service interface
 * Extends the base service interface with additional features
 */
export interface ModularService extends BaseService {
  /**
   * Service configuration
   */
  readonly config: ServiceConfig;
  
  /**
   * Service dependencies
   */
  readonly dependencies: ServiceDependencies;
  
  /**
   * Service capabilities
   */
  readonly capabilities: ServiceCapability[];
  
  /**
   * Get service metrics
   */
  getMetrics(): Promise<ServiceMetrics>;
  
  /**
   * Check if a capability is enabled
   * @param capabilityName Name of the capability to check
   */
  hasCapability(capabilityName: string): boolean;
  
  /**
   * Get service documentation
   */
  getDocumentation(): Promise<string>;
}

/**
 * Equipment service interface
 * Manages equipment entities and their lifecycle
 */
export interface EquipmentService extends ModularService {
  /**
   * Get equipment by ID
   * @param id Equipment ID
   */
  getEquipmentById(id: string): Promise<ServiceResult<any>>;
  
  /**
   * Get equipment list
   * @param filter Optional filter criteria
   * @param pagination Optional pagination parameters
   */
  getEquipmentList(
    filter?: Record<string, unknown>,
    pagination?: { page: number; limit: number }
  ): Promise<ServiceResult<any[]>>;
  
  /**
   * Create new equipment
   * @param data Equipment data
   */
  createEquipment(data: any): Promise<ServiceResult<any>>;
  
  /**
   * Update equipment
   * @param id Equipment ID
   * @param data Equipment data
   */
  updateEquipment(id: string, data: any): Promise<ServiceResult<any>>;
  
  /**
   * Delete equipment
   * @param id Equipment ID
   */
  deleteEquipment(id: string): Promise<ServiceResult<boolean>>;
  
  /**
   * Update equipment status
   * @param id Equipment ID
   * @param status New status
   * @param reason Status change reason
   */
  updateEquipmentStatus(
    id: string,
    status: string,
    reason?: string
  ): Promise<ServiceResult<any>>;
}

/**
 * Metrics service interface
 * Manages performance metrics and OEE calculations
 */
export interface MetricsService extends ModularService {
  /**
   * Get metrics by ID
   * @param id Metrics record ID
   */
  getMetricsById(id: string): Promise<ServiceResult<any>>;
  
  /**
   * Get metrics for equipment
   * @param equipmentId Equipment ID
   * @param timeRange Time range for metrics
   */
  getEquipmentMetrics(
    equipmentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<ServiceResult<any[]>>;
  
  /**
   * Get metrics for production line
   * @param lineId Production line ID
   * @param timeRange Time range for metrics
   */
  getProductionLineMetrics(
    lineId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<ServiceResult<any[]>>;
  
  /**
   * Record new metrics
   * @param data Metrics data
   */
  recordMetrics(data: any): Promise<ServiceResult<any>>;
  
  /**
   * Calculate OEE
   * @param equipmentId Equipment ID
   * @param timeRange Time range for calculation
   */
  calculateOEE(
    equipmentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<ServiceResult<any>>;
  
  /**
   * Get metrics trend
   * @param metricType Metric type
   * @param entityId Equipment or production line ID
   * @param timeRange Time range for trend
   * @param interval Interval for trend points
   */
  getTrend(
    metricType: string,
    entityId: string,
    timeRange: { start: Date; end: Date },
    interval: string
  ): Promise<ServiceResult<any[]>>;
}

/**
 * Maintenance service interface
 * Manages maintenance records and schedules
 */
export interface MaintenanceService extends ModularService {
  /**
   * Get maintenance record by ID
   * @param id Maintenance record ID
   */
  getMaintenanceById(id: string): Promise<ServiceResult<any>>;
  
  /**
   * Get maintenance records for equipment
   * @param equipmentId Equipment ID
   * @param filter Optional filter criteria
   */
  getEquipmentMaintenance(
    equipmentId: string,
    filter?: Record<string, unknown>
  ): Promise<ServiceResult<any[]>>;
  
  /**
   * Schedule maintenance
   * @param data Maintenance data
   */
  scheduleMaintenance(data: any): Promise<ServiceResult<any>>;
  
  /**
   * Complete maintenance
   * @param id Maintenance record ID
   * @param data Completion data
   */
  completeMaintenance(
    id: string,
    data: any
  ): Promise<ServiceResult<any>>;
  
  /**
   * Cancel maintenance
   * @param id Maintenance record ID
   * @param reason Cancellation reason
   */
  cancelMaintenance(
    id: string,
    reason: string
  ): Promise<ServiceResult<any>>;
  
  /**
   * Get due maintenance
   * @param timeFrame Time frame for due maintenance
   */
  getDueMaintenance(
    timeFrame: { start: Date; end: Date }
  ): Promise<ServiceResult<any[]>>;
}

/**
 * Quality service interface
 * Manages quality checks and measurements
 */
export interface QualityService extends ModularService {
  /**
   * Get quality check by ID
   * @param id Quality check ID
   */
  getQualityCheckById(id: string): Promise<ServiceResult<any>>;
  
  /**
   * Get quality checks for production order
   * @param orderId Production order ID
   */
  getOrderQualityChecks(orderId: string): Promise<ServiceResult<any[]>>;
  
  /**
   * Record quality check
   * @param data Quality check data
   */
  recordQualityCheck(data: any): Promise<ServiceResult<any>>;
  
  /**
   * Get quality metrics
   * @param filter Optional filter criteria
   * @param timeRange Time range for metrics
   */
  getQualityMetrics(
    filter: Record<string, unknown>,
    timeRange: { start: Date; end: Date }
  ): Promise<ServiceResult<any>>;
  
  /**
   * Get defect Pareto
   * @param timeRange Time range for analysis
   * @param limit Maximum number of defect types to return
   */
  getDefectPareto(
    timeRange: { start: Date; end: Date },
    limit?: number
  ): Promise<ServiceResult<any[]>>;
}

/**
 * Alerts service interface
 * Manages alerts and notifications
 */
export interface AlertsService extends ModularService {
  /**
   * Get alert by ID
   * @param id Alert ID
   */
  getAlertById(id: string): Promise<ServiceResult<any>>;
  
  /**
   * Get active alerts
   * @param filter Optional filter criteria
   */
  getActiveAlerts(
    filter?: Record<string, unknown>
  ): Promise<ServiceResult<any[]>>;
  
  /**
   * Create alert
   * @param data Alert data
   */
  createAlert(data: any): Promise<ServiceResult<any>>;
  
  /**
   * Acknowledge alert
   * @param id Alert ID
   * @param acknowledgedBy User who acknowledged the alert
   * @param notes Optional notes
   */
  acknowledgeAlert(
    id: string,
    acknowledgedBy: string,
    notes?: string
  ): Promise<ServiceResult<any>>;
  
  /**
   * Resolve alert
   * @param id Alert ID
   * @param resolvedBy User who resolved the alert
   * @param notes Optional notes
   */
  resolveAlert(
    id: string,
    resolvedBy: string,
    notes?: string
  ): Promise<ServiceResult<any>>;
  
  /**
   * Get alert history
   * @param filter Optional filter criteria
   * @param timeRange Time range for history
   * @param pagination Optional pagination parameters
   */
  getAlertHistory(
    filter: Record<string, unknown>,
    timeRange: { start: Date; end: Date },
    pagination?: { page: number; limit: number }
  ): Promise<ServiceResult<any[]>>;
}