/**
 * Equipment Service Implementation
 * 
 * This class implements the EquipmentService interface and provides
 * functionality for managing equipment entities.
 */

import { PrismaClient } from '@prisma/client';
import { BaseModularService } from '../BaseModularService';
import { EquipmentService } from '../interfaces';
import { ServiceCapability, ServiceDependencies, ServiceResult } from '../types';
import { EquipmentEventProducer } from '../../events/EventProducer';

/**
 * Equipment service implementation
 */
export class EquipmentServiceImpl extends BaseModularService implements EquipmentService {
  /**
   * Prisma client instance
   */
  private prisma: PrismaClient;
  
  /**
   * Event producer for equipment events
   */
  private eventProducer: EquipmentEventProducer;
  
  /**
   * Create a new equipment service
   */
  constructor() {
    // Define capabilities
    const capabilities: ServiceCapability[] = [
      {
        name: 'equipment.basic',
        description: 'Basic equipment management (CRUD operations)',
        version: '1.0.0',
        enabled: true,
      },
      {
        name: 'equipment.status',
        description: 'Equipment status management',
        version: '1.0.0',
        enabled: true,
      },
      {
        name: 'equipment.history',
        description: 'Equipment history tracking',
        version: '1.0.0',
        enabled: true,
      },
      {
        name: 'equipment.predictive',
        description: 'Predictive maintenance recommendations',
        version: '1.0.0',
        enabled: false, // Not enabled by default
        dependencies: ['ai.prediction'],
      },
    ];
    
    // Define dependencies
    const dependencies: ServiceDependencies = {
      required: ['database', 'events'],
      optional: ['ai', 'alerts'],
    };
    
    super('EquipmentService', '1.0.0', dependencies, capabilities);
    
    // Initialize Prisma client
    this.prisma = new PrismaClient();
    
    // Initialize event producer
    this.eventProducer = new EquipmentEventProducer();
  }
  
  /**
   * Initialize the service
   */
  protected async doInitialize(): Promise<void> {
    // Connect to the database
    await this.prisma.$connect();
    
    console.log('Equipment service initialized');
  }
  
  /**
   * Start the service
   */
  protected async doStart(): Promise<void> {
    console.log('Equipment service started');
  }
  
  /**
   * Stop the service
   */
  protected async doStop(): Promise<void> {
    // Disconnect from the database
    await this.prisma.$disconnect();
    
    console.log('Equipment service stopped');
  }
  
  /**
   * Get equipment by ID
   * @param id Equipment ID
   */
  public async getEquipmentById(id: string): Promise<ServiceResult<any>> {
    const startTime = Date.now();
    
    try {
      // Get equipment from database
      const equipment = await this.prisma.equipment.findUnique({
        where: { id },
        include: {
          maintenanceRecords: {
            orderBy: {
              startTime: 'desc',
            },
            take: 5,
          },
          performanceMetrics: {
            orderBy: {
              timestamp: 'desc',
            },
            take: 10,
          },
        },
      });
      
      if (!equipment) {
        this.trackRequest(startTime, false);
        return {
          success: false,
          error: `Equipment not found: ${id}`,
          errorCode: 'EQUIPMENT_NOT_FOUND',
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }
      
      this.trackRequest(startTime, true);
      return {
        success: true,
        data: equipment,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.trackRequest(startTime, false);
      return {
        success: false,
        error: `Error getting equipment: ${error instanceof Error ? error.message : String(error)}`,
        errorCode: 'DATABASE_ERROR',
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Get equipment list
   * @param filter Optional filter criteria
   * @param pagination Optional pagination parameters
   */
  public async getEquipmentList(
    filter?: Record<string, unknown>,
    pagination?: { page: number; limit: number }
  ): Promise<ServiceResult<any[]>> {
    const startTime = Date.now();
    
    try {
      // Build where clause from filter
      const where: any = {};
      
      if (filter) {
        if (filter.status) {
          where.status = filter.status;
        }
        
        if (filter.type) {
          where.type = filter.type;
        }
        
        if (filter.location) {
          where.location = filter.location;
        }
        
        if (filter.search) {
          where.OR = [
            { name: { contains: filter.search as string, mode: 'insensitive' } },
            { serialNumber: { contains: filter.search as string, mode: 'insensitive' } },
            { manufacturerCode: { contains: filter.search as string, mode: 'insensitive' } },
          ];
        }
      }
      
      // Calculate pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const skip = (page - 1) * limit;
      
      // Get equipment from database
      const [equipment, total] = await Promise.all([
        this.prisma.equipment.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            name: 'asc',
          },
        }),
        this.prisma.equipment.count({ where }),
      ]);
      
      this.trackRequest(startTime, true);
      return {
        success: true,
        data: equipment,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.trackRequest(startTime, false);
      return {
        success: false,
        error: `Error getting equipment list: ${error instanceof Error ? error.message : String(error)}`,
        errorCode: 'DATABASE_ERROR',
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Create new equipment
   * @param data Equipment data
   */
  public async createEquipment(data: any): Promise<ServiceResult<any>> {
    const startTime = Date.now();
    
    try {
      // Validate required fields
      if (!data.name || !data.type || !data.manufacturerCode || !data.serialNumber) {
        this.trackRequest(startTime, false);
        return {
          success: false,
          error: 'Missing required fields: name, type, manufacturerCode, serialNumber',
          errorCode: 'VALIDATION_ERROR',
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }
      
      // Check if equipment with same serial number already exists
      const existing = await this.prisma.equipment.findUnique({
        where: { serialNumber: data.serialNumber },
      });
      
      if (existing) {
        this.trackRequest(startTime, false);
        return {
          success: false,
          error: `Equipment with serial number ${data.serialNumber} already exists`,
          errorCode: 'DUPLICATE_SERIAL_NUMBER',
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }
      
      // Create equipment in database
      const equipment = await this.prisma.equipment.create({
        data: {
          name: data.name,
          type: data.type,
          manufacturerCode: data.manufacturerCode,
          serialNumber: data.serialNumber,
          installationDate: data.installationDate || new Date(),
          status: data.status || 'operational',
          location: data.location,
          description: data.description,
          model: data.model,
        },
      });
      
      // Emit equipment created event
      await this.eventProducer.createAndPublishEvent(
        'equipment.created',
        { equipment }
      );
      
      this.trackRequest(startTime, true);
      return {
        success: true,
        data: equipment,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.trackRequest(startTime, false);
      return {
        success: false,
        error: `Error creating equipment: ${error instanceof Error ? error.message : String(error)}`,
        errorCode: 'DATABASE_ERROR',
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Update equipment
   * @param id Equipment ID
   * @param data Equipment data
   */
  public async updateEquipment(id: string, data: any): Promise<ServiceResult<any>> {
    const startTime = Date.now();
    
    try {
      // Check if equipment exists
      const existing = await this.prisma.equipment.findUnique({
        where: { id },
      });
      
      if (!existing) {
        this.trackRequest(startTime, false);
        return {
          success: false,
          error: `Equipment not found: ${id}`,
          errorCode: 'EQUIPMENT_NOT_FOUND',
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }
      
      // Check if serial number is being changed and if it would conflict
      if (data.serialNumber && data.serialNumber !== existing.serialNumber) {
        const conflicting = await this.prisma.equipment.findUnique({
          where: { serialNumber: data.serialNumber },
        });
        
        if (conflicting && conflicting.id !== id) {
          this.trackRequest(startTime, false);
          return {
            success: false,
            error: `Equipment with serial number ${data.serialNumber} already exists`,
            errorCode: 'DUPLICATE_SERIAL_NUMBER',
            timestamp: new Date(),
            duration: Date.now() - startTime,
          };
        }
      }
      
      // Capture old status for event
      const oldStatus = existing.status;
      
      // Update equipment in database
      const equipment = await this.prisma.equipment.update({
        where: { id },
        data,
      });
      
      // If status changed, emit status change event
      if (data.status && data.status !== oldStatus) {
        await this.eventProducer.emitStatusChange(
          id,
          data.status,
          oldStatus,
          { priority: 'high' }
        );
      }
      
      // Emit equipment updated event
      await this.eventProducer.createAndPublishEvent(
        'equipment.updated',
        { equipment, changes: data }
      );
      
      this.trackRequest(startTime, true);
      return {
        success: true,
        data: equipment,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.trackRequest(startTime, false);
      return {
        success: false,
        error: `Error updating equipment: ${error instanceof Error ? error.message : String(error)}`,
        errorCode: 'DATABASE_ERROR',
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Delete equipment
   * @param id Equipment ID
   */
  public async deleteEquipment(id: string): Promise<ServiceResult<boolean>> {
    const startTime = Date.now();
    
    try {
      // Check if equipment exists
      const existing = await this.prisma.equipment.findUnique({
        where: { id },
        include: {
          maintenanceRecords: { select: { id: true }, take: 1 },
          performanceMetrics: { select: { id: true }, take: 1 },
          qualityMetrics: { select: { id: true }, take: 1 },
          alerts: { select: { id: true }, take: 1 },
        },
      });
      
      if (!existing) {
        this.trackRequest(startTime, false);
        return {
          success: false,
          error: `Equipment not found: ${id}`,
          errorCode: 'EQUIPMENT_NOT_FOUND',
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }
      
      // Check if equipment has related records
      const hasRelatedRecords = 
        existing.maintenanceRecords.length > 0 ||
        existing.performanceMetrics.length > 0 ||
        existing.qualityMetrics.length > 0 ||
        existing.alerts.length > 0;
      
      if (hasRelatedRecords) {
        this.trackRequest(startTime, false);
        return {
          success: false,
          error: 'Cannot delete equipment with related records',
          errorCode: 'HAS_RELATED_RECORDS',
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }
      
      // Delete equipment from database
      await this.prisma.equipment.delete({
        where: { id },
      });
      
      // Emit equipment deleted event
      await this.eventProducer.createAndPublishEvent(
        'equipment.deleted',
        { id, name: existing.name }
      );
      
      this.trackRequest(startTime, true);
      return {
        success: true,
        data: true,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.trackRequest(startTime, false);
      return {
        success: false,
        error: `Error deleting equipment: ${error instanceof Error ? error.message : String(error)}`,
        errorCode: 'DATABASE_ERROR',
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Update equipment status
   * @param id Equipment ID
   * @param status New status
   * @param reason Status change reason
   */
  public async updateEquipmentStatus(
    id: string,
    status: string,
    reason?: string
  ): Promise<ServiceResult<any>> {
    const startTime = Date.now();
    
    try {
      // Check if equipment exists
      const existing = await this.prisma.equipment.findUnique({
        where: { id },
      });
      
      if (!existing) {
        this.trackRequest(startTime, false);
        return {
          success: false,
          error: `Equipment not found: ${id}`,
          errorCode: 'EQUIPMENT_NOT_FOUND',
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }
      
      // Validate status
      const validStatuses = ['operational', 'maintenance', 'offline', 'error'];
      
      if (!validStatuses.includes(status)) {
        this.trackRequest(startTime, false);
        return {
          success: false,
          error: `Invalid status: ${status}. Valid values are: ${validStatuses.join(', ')}`,
          errorCode: 'INVALID_STATUS',
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }
      
      // Capture old status for event
      const oldStatus = existing.status;
      
      // Update equipment status in database
      const equipment = await this.prisma.equipment.update({
        where: { id },
        data: { status },
      });
      
      // Emit status change event
      await this.eventProducer.emitStatusChange(
        id,
        status,
        oldStatus,
        {
          priority: status === 'error' ? 'critical' : 'high',
          metadata: { reason },
        }
      );
      
      this.trackRequest(startTime, true);
      return {
        success: true,
        data: equipment,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.trackRequest(startTime, false);
      return {
        success: false,
        error: `Error updating equipment status: ${error instanceof Error ? error.message : String(error)}`,
        errorCode: 'DATABASE_ERROR',
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Get service description
   */
  protected async getServiceDescription(): Promise<string> {
    return `
The Equipment Service manages the lifecycle of equipment entities in the manufacturing environment.
It provides capabilities for creating, reading, updating, and deleting equipment records,
as well as managing equipment status and tracking equipment history.
`;
  }
  
  /**
   * Get API documentation
   */
  protected async getApiDocumentation(): Promise<string> {
    return `
## Equipment API

### Get Equipment by ID
\`\`\`
GET /api/equipment/:id
\`\`\`

### Get Equipment List
\`\`\`
GET /api/equipment
Query parameters:
- status: Filter by status
- type: Filter by type
- location: Filter by location
- search: Search in name, serialNumber, manufacturerCode
- page: Page number
- limit: Items per page
\`\`\`

### Create Equipment
\`\`\`
POST /api/equipment
Body: Equipment data
\`\`\`

### Update Equipment
\`\`\`
PUT /api/equipment/:id
Body: Equipment data
\`\`\`

### Delete Equipment
\`\`\`
DELETE /api/equipment/:id
\`\`\`

### Update Equipment Status
\`\`\`
PUT /api/equipment/:id/status
Body: { status: string, reason?: string }
\`\`\`
`;
  }
  
  /**
   * Get custom metrics
   */
  protected async getCustomMetrics(): Promise<Record<string, unknown>> {
    // Get equipment counts by status
    const statusCounts = await this.prisma.equipment.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });
    
    // Convert to record
    const equipmentByStatus: Record<string, number> = {};
    for (const { status, _count } of statusCounts) {
      equipmentByStatus[status] = _count.status;
    }
    
    // Get total equipment count
    const totalEquipment = await this.prisma.equipment.count();
    
    return {
      totalEquipment,
      equipmentByStatus,
    };
  }
}