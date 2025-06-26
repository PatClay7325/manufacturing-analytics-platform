/**
 * SAP Connector Implementation
 * Handles connection pooling, error handling, and BAPI calls
 */

import { loadSAPConfig, systemStatus, type SAPConfig } from '@/config/external-systems';
import { AppError, ExternalServiceError } from '@/lib/error-handler';

// SAP Connection State
interface SAPConnection {
  id: string;
  inUse: boolean;
  lastUsed: Date;
  errorCount: number;
}

// Mock BAPI response types (replace with actual SAP types when available)
export interface Equipment {
  equipmentNumber: string;
  description: string;
  category: string;
  plant: string;
  status: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
}

export interface WorkOrder {
  orderNumber: string;
  equipmentNumber: string;
  orderType: string;
  description: string;
  priority: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

export interface ProductionOrder {
  orderNumber: string;
  material: string;
  plant: string;
  plannedQuantity: number;
  actualQuantity: number;
  startDate: Date;
  endDate: Date;
  status: string;
}

/**
 * SAP Connector with connection pooling and error handling
 */
export class SAPConnector {
  private config: SAPConfig | null;
  private connectionPool: Map<string, SAPConnection> = new Map();
  private isInitialized = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.config = loadSAPConfig();
    systemStatus.sap.configured = !!this.config;
  }

  /**
   * Initialize connection pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.config) {
      return;
    }

    try {
      // In production, initialize actual SAP RFC connections here
      // For now, create mock connection pool
      for (let i = 0; i < this.config.poolSize; i++) {
        const connection: SAPConnection = {
          id: `sap-conn-${i}`,
          inUse: false,
          lastUsed: new Date(),
          errorCount: 0,
        };
        this.connectionPool.set(connection.id, connection);
      }

      this.isInitialized = true;
      systemStatus.sap.connected = true;
      systemStatus.sap.lastCheck = new Date();
      systemStatus.sap.error = null;

      console.log(`SAP connection pool initialized with ${this.config.poolSize} connections`);
    } catch (error) {
      systemStatus.sap.connected = false;
      systemStatus.sap.error = error instanceof Error ? error.message : 'Unknown error';
      throw new ExternalServiceError('SAP', 'Failed to initialize connection pool');
    }
  }

  /**
   * Get available connection from pool
   */
  private async getConnection(): Promise<SAPConnection> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Find available connection
    for (const [id, conn] of this.connectionPool) {
      if (!conn.inUse && conn.errorCount < 3) {
        conn.inUse = true;
        conn.lastUsed = new Date();
        return conn;
      }
    }

    // All connections in use, wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getConnection();
  }

  /**
   * Release connection back to pool
   */
  private releaseConnection(connection: SAPConnection, hadError = false): void {
    connection.inUse = false;
    if (hadError) {
      connection.errorCount++;
    } else {
      connection.errorCount = 0;
    }
  }

  /**
   * Execute BAPI call with retry logic
   */
  private async executeBAPI<T>(
    bapiName: string,
    params: Record<string, any>,
    retries = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      const connection = await this.getConnection();

      try {
        // In production, execute actual BAPI call here
        // For now, return mock data based on BAPI name
        const result = await this.mockBAPICall<T>(bapiName, params);
        
        this.releaseConnection(connection);
        return result;
      } catch (error) {
        this.releaseConnection(connection, true);
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < retries - 1) {
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw new ExternalServiceError(
      'SAP',
      `BAPI ${bapiName} failed after ${retries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Mock BAPI implementation (replace with actual SAP RFC calls)
   */
  private async mockBAPICall<T>(bapiName: string, params: Record<string, any>): Promise<T> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('SAP connection timeout');
    }

    // Return mock data based on BAPI
    switch (bapiName) {
      case 'PM_EQUIPMENT_GET_LIST':
        return this.mockEquipmentList(params) as T;
      case 'PM_ORDER_GET_LIST':
        return this.mockWorkOrderList(params) as T;
      case 'BAPI_PRODORD_GET_DETAIL':
        return this.mockProductionOrder(params) as T;
      default:
        throw new Error(`Unknown BAPI: ${bapiName}`);
    }
  }

  /**
   * Get equipment master data from SAP
   */
  async getEquipmentList(plant?: string): Promise<Equipment[]> {
    const params = {
      PLANT: plant || '*',
      EQUIPMENT_TYPE: '*',
    };

    return this.executeBAPI<Equipment[]>('PM_EQUIPMENT_GET_LIST', params);
  }

  /**
   * Get work orders from SAP
   */
  async getWorkOrders(equipmentNumber?: string, dateFrom?: Date): Promise<WorkOrder[]> {
    const params = {
      EQUIPMENT: equipmentNumber || '*',
      DATE_FROM: dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };

    return this.executeBAPI<WorkOrder[]>('PM_ORDER_GET_LIST', params);
  }

  /**
   * Get production order details
   */
  async getProductionOrder(orderNumber: string): Promise<ProductionOrder> {
    const params = {
      ORDER_NUMBER: orderNumber,
    };

    return this.executeBAPI<ProductionOrder>('BAPI_PRODORD_GET_DETAIL', params);
  }

  /**
   * Test SAP connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.initialize();
      // Try a simple BAPI call
      await this.executeBAPI('BAPI_USER_GET_DETAIL', { USERNAME: 'TEST' });
      return true;
    } catch (error) {
      console.error('SAP connection test failed:', error);
      return false;
    }
  }

  /**
   * Close all connections
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.connectionPool.clear();
    this.isInitialized = false;
    systemStatus.sap.connected = false;
  }

  // Mock data generators
  private mockEquipmentList(params: any): Equipment[] {
    return [
      {
        equipmentNumber: 'EQ-001',
        description: 'CNC Milling Machine',
        category: 'PRODUCTION',
        plant: params.PLANT === '*' ? 'PLANT01' : params.PLANT,
        status: 'OPERATIONAL',
        manufacturer: 'HAAS',
        model: 'VF-2',
        serialNumber: 'SN12345',
      },
      {
        equipmentNumber: 'EQ-002',
        description: 'Welding Robot',
        category: 'PRODUCTION',
        plant: params.PLANT === '*' ? 'PLANT01' : params.PLANT,
        status: 'MAINTENANCE',
        manufacturer: 'ABB',
        model: 'IRB 6700',
        serialNumber: 'SN67890',
      },
    ];
  }

  private mockWorkOrderList(params: any): WorkOrder[] {
    return [
      {
        orderNumber: 'WO-001',
        equipmentNumber: params.EQUIPMENT === '*' ? 'EQ-001' : params.EQUIPMENT,
        orderType: 'PM01',
        description: 'Preventive Maintenance',
        priority: 'MEDIUM',
        startDate: new Date(),
        endDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
        status: 'RELEASED',
      },
    ];
  }

  private mockProductionOrder(params: any): ProductionOrder {
    return {
      orderNumber: params.ORDER_NUMBER,
      material: 'MAT-001',
      plant: 'PLANT01',
      plannedQuantity: 1000,
      actualQuantity: 850,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(),
      status: 'PARTIAL',
    };
  }
}

// Singleton instance
let sapConnector: SAPConnector | null = null;

export function getSAPConnector(): SAPConnector {
  if (!sapConnector) {
    sapConnector = new SAPConnector();
  }
  return sapConnector;
}