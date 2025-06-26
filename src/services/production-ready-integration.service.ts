/**
 * Production-Ready Integration Service
 * Demonstrates integration of all four patterns:
 * - Event Store Partitioning
 * - Circuit Breaker Pattern
 * - Distributed Locking
 * - Saga Pattern
 */

import { PrismaProductionService } from './prisma-production.service';
import { EventSourcingService, EventType } from './event-sourcing.service';
import { CircuitBreaker, manufacturingCircuitBreakers } from './circuit-breaker.service';
import { manufacturingLocks } from './distributed-lock.service';
import { SagaOrchestrator, ManufacturingSagas } from './saga.service';
import { CacheService } from './cache.service';

/**
 * Production-Ready OEE Calculation Service
 * Integrates all reliability patterns
 */
export class ProductionReadyOEEService {
  private cacheCircuitBreaker: CircuitBreaker;
  private dbCircuitBreaker: CircuitBreaker;

  constructor(
    private prisma: PrismaProductionService,
    private eventService: EventSourcingService,
    private cacheService: CacheService
  ) {
    this.cacheCircuitBreaker = manufacturingCircuitBreakers.getCacheCircuitBreaker();
    this.dbCircuitBreaker = manufacturingCircuitBreakers.getDatabaseCircuitBreaker();
  }

  /**
   * Calculate OEE with full reliability patterns
   */
  async calculateOEE(
    equipmentId: number,
    timeRange: { start: Date; end: Date },
    userId?: string
  ) {
    // Use distributed lock to prevent duplicate calculations
    return manufacturingLocks.withOEECalculationLock(
      equipmentId,
      timeRange,
      async () => {
        // Try cache first with circuit breaker protection
        try {
          const cached = await this.cacheCircuitBreaker.execute(async () => {
            return this.cacheService.getCachedOEE(equipmentId, timeRange);
          });

          if (cached) {
            console.log(`[OEE] Cache hit for equipment ${equipmentId}`);
            return {
              ...cached,
              source: 'cache',
              calculatedAt: new Date(),
            };
          }
        } catch (error) {
          console.warn(`[OEE] Cache unavailable for equipment ${equipmentId}:`, error.message);
          // Continue with database calculation
        }

        // Calculate from database with circuit breaker protection
        const oeeData = await this.dbCircuitBreaker.execute(async () => {
          return this.calculateOEEFromDatabase(equipmentId, timeRange);
        });

        // Try to cache the result (fail silently if cache is down)
        try {
          await this.cacheCircuitBreaker.execute(async () => {
            await this.cacheService.cacheOEE(equipmentId, timeRange, oeeData);
          });
        } catch (error) {
          console.warn(`[OEE] Failed to cache result for equipment ${equipmentId}:`, error.message);
        }

        // Publish OEE calculated event
        await this.eventService.publish({
          eventType: EventType.OEE_CALCULATED,
          aggregateId: equipmentId.toString(),
          aggregateType: 'equipment',
          eventData: {
            equipmentId,
            timeRange,
            oee: oeeData.oee,
            availability: oeeData.availability,
            performance: oeeData.performance,
            quality: oeeData.quality,
          },
          eventMetadata: {
            userId,
            timestamp: new Date(),
            version: 1,
          },
        });

        return {
          ...oeeData,
          source: 'database',
          calculatedAt: new Date(),
        };
      }
    );
  }

  /**
   * Calculate OEE from database with optimized queries
   */
  private async calculateOEEFromDatabase(
    equipmentId: number,
    timeRange: { start: Date; end: Date }
  ) {
    // Use partitioned query for better performance
    const productionData = await this.prisma.$queryRaw<any[]>`
      SELECT 
        SUM(fp.planned_production_time) as total_planned_time,
        SUM(fp.operating_time) as total_operating_time,
        SUM(fp.total_parts_produced) as total_parts,
        SUM(fp.good_parts) as good_parts,
        COUNT(DISTINCT fp.production_id) as production_runs,
        AVG(de.theoretical_rate) as avg_theoretical_rate
      FROM fact_production fp
      JOIN dim_equipment de ON fp.equipment_id = de.equipment_id
      WHERE fp.equipment_id = ${equipmentId}
        AND fp.start_time >= ${timeRange.start}
        AND fp.start_time <= ${timeRange.end}
        AND fp.start_time >= DATE_TRUNC('month', ${timeRange.start}::date) -- Partition pruning
      GROUP BY fp.equipment_id
    `;

    if (!productionData.length) {
      return {
        availability: 0,
        performance: 0,
        quality: 0,
        oee: 0,
        productionRuns: 0,
      };
    }

    const data = productionData[0];
    const plannedTime = Number(data.total_planned_time || 0);
    const operatingTime = Number(data.total_operating_time || 0);
    const totalParts = Number(data.total_parts || 0);
    const goodParts = Number(data.good_parts || 0);
    const theoreticalRate = Number(data.avg_theoretical_rate || 1);

    // Calculate OEE components
    const availability = plannedTime > 0 ? operatingTime / plannedTime : 0;
    const actualRate = operatingTime > 0 ? totalParts / (operatingTime / 3600) : 0;
    const performance = theoreticalRate > 0 ? actualRate / theoreticalRate : 0;
    const quality = totalParts > 0 ? goodParts / totalParts : 0;
    const oee = availability * performance * quality;

    return {
      availability: Math.min(availability, 1),
      performance: Math.min(performance, 1),
      quality: Math.min(quality, 1),
      oee: Math.min(oee, 1),
      productionRuns: Number(data.production_runs || 0),
      totalParts,
      goodParts,
    };
  }
}

/**
 * Production-Ready Equipment Management Service
 */
export class ProductionReadyEquipmentService {
  constructor(
    private prisma: PrismaProductionService,
    private eventService: EventSourcingService,
    private sagaOrchestrator: SagaOrchestrator,
    private manufacturingSagas: ManufacturingSagas
  ) {}

  /**
   * Decommission equipment with saga pattern
   */
  async decommissionEquipment(
    equipmentId: number,
    userId: string,
    reason: string
  ): Promise<string> {
    // Use distributed lock to prevent concurrent decommission operations
    return manufacturingLocks.withEquipmentStateLock(equipmentId, async () => {
      // Verify equipment exists and is active
      const equipment = await this.prisma.dimEquipment.findUnique({
        where: { id: equipmentId },
      });

      if (!equipment) {
        throw new Error(`Equipment ${equipmentId} not found`);
      }

      if (!equipment.isActive) {
        throw new Error(`Equipment ${equipmentId} is already inactive`);
      }

      // Start decommission saga
      const sagaId = await this.manufacturingSagas.startEquipmentDecommission({
        equipmentId,
        userId,
        reason,
        equipmentCode: equipment.code,
        equipmentName: equipment.name,
      });

      // Publish equipment deactivation event
      await this.eventService.publish({
        eventType: EventType.EQUIPMENT_DEACTIVATED,
        aggregateId: equipmentId.toString(),
        aggregateType: 'equipment',
        eventData: {
          equipmentId,
          equipmentCode: equipment.code,
          reason,
          sagaId,
          decommissionStarted: true,
        },
        eventMetadata: {
          userId,
          correlationId: sagaId,
          timestamp: new Date(),
          version: 1,
        },
      });

      return sagaId;
    });
  }

  /**
   * Schedule maintenance with reliability patterns
   */
  async scheduleMaintenance(
    equipmentId: number,
    maintenanceData: {
      type: string;
      scheduledDate: Date;
      estimatedDuration: number;
      technicianId?: string;
      description?: string;
    },
    userId: string
  ): Promise<string> {
    // Use distributed lock for maintenance scheduling
    return manufacturingLocks.withMaintenanceScheduleLock(equipmentId, async () => {
      // Check if equipment has conflicting maintenance
      const conflictingMaintenance = await this.prisma.factMaintenance.findFirst({
        where: {
          equipmentId,
          startTime: {
            lte: new Date(maintenanceData.startTime.getTime() + maintenanceData.estimatedDuration),
          },
          endTime: {
            gte: maintenanceData.startTime,
          },
        },
      });

      if (conflictingMaintenance) {
        throw new Error(`Conflicting maintenance already scheduled for equipment ${equipmentId}`);
      }

      // Start maintenance workflow saga
      const sagaId = await this.manufacturingSagas.startMaintenanceWorkflow({
        equipmentId,
        ...maintenanceData,
        userId,
      });

      // Publish maintenance scheduled event
      await this.eventService.publish({
        eventType: EventType.MAINTENANCE_SCHEDULED,
        aggregateId: equipmentId.toString(),
        aggregateType: 'equipment',
        eventData: {
          equipmentId,
          maintenanceType: maintenanceData.type,
          startTime: maintenanceData.startTime,
          estimatedDuration: maintenanceData.estimatedDuration,
          sagaId,
        },
        eventMetadata: {
          userId,
          correlationId: sagaId,
          timestamp: new Date(),
          version: 1,
        },
      });

      return sagaId;
    });
  }
}

/**
 * Production-Ready Quality Management Service
 */
export class ProductionReadyQualityService {
  private eventCircuitBreaker: CircuitBreaker;

  constructor(
    private prisma: PrismaProductionService,
    private eventService: EventSourcingService,
    private manufacturingSagas: ManufacturingSagas
  ) {
    this.eventCircuitBreaker = manufacturingCircuitBreakers.getEventPublishingCircuitBreaker();
  }

  /**
   * Handle quality incident with saga pattern
   */
  async handleQualityIncident(
    incidentData: {
      equipmentId: number;
      productionId?: number;
      defectType: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      description: string;
      affectedBatches?: string[];
    },
    userId: string
  ): Promise<string> {
    // Use distributed lock to prevent duplicate incident handling
    const lockKey = `quality-incident:${incidentData.equipmentId}:${Date.now()}`;
    
    return manufacturingLocks.withSystemConfigLock('quality-incident', async () => {
      // Create incident record first
      const incident = await this.prisma.$executeRaw`
        INSERT INTO quality_incidents (
          equipment_id, production_id, defect_type, severity, 
          description, affected_batches, created_by, created_at
        ) VALUES (
          ${incidentData.equipmentId}, ${incidentData.productionId}, 
          ${incidentData.defectType}, ${incidentData.severity},
          ${incidentData.description}, ${JSON.stringify(incidentData.affectedBatches)},
          ${userId}, NOW()
        ) RETURNING incident_id
      `;

      // Start quality incident response saga
      const sagaId = await this.manufacturingSagas.startQualityIncidentResponse({
        ...incidentData,
        userId,
      });

      // Publish quality incident event with circuit breaker protection
      try {
        await this.eventCircuitBreaker.execute(async () => {
          await this.eventService.publish({
            eventType: EventType.QUALITY_ISSUE_DETECTED,
            aggregateId: incidentData.equipmentId.toString(),
            aggregateType: 'equipment',
            eventData: {
              ...incidentData,
              sagaId,
              incidentCreated: true,
            },
            eventMetadata: {
              userId,
              correlationId: sagaId,
              timestamp: new Date(),
              version: 1,
            },
          });
        });
      } catch (error) {
        console.error('Failed to publish quality incident event:', error);
        // Continue with saga even if event publishing fails
      }

      return sagaId;
    });
  }
}

/**
 * Integrated Service Manager
 * Orchestrates all production-ready services
 */
export class IntegratedServiceManager {
  public readonly oeeService: ProductionReadyOEEService;
  public readonly equipmentService: ProductionReadyEquipmentService;
  public readonly qualityService: ProductionReadyQualityService;

  constructor(
    private prisma: PrismaProductionService,
    private eventService: EventSourcingService,
    private cacheService: CacheService
  ) {
    // Initialize saga orchestrator
    const sagaOrchestrator = new SagaOrchestrator(this.prisma, this.eventService);
    const manufacturingSagas = new ManufacturingSagas(sagaOrchestrator, this.prisma);

    // Initialize services
    this.oeeService = new ProductionReadyOEEService(
      this.prisma,
      this.eventService,
      this.cacheService
    );

    this.equipmentService = new ProductionReadyEquipmentService(
      this.prisma,
      this.eventService,
      sagaOrchestrator,
      manufacturingSagas
    );

    this.qualityService = new ProductionReadyQualityService(
      this.prisma,
      this.eventService,
      manufacturingSagas
    );
  }

  /**
   * Get system health status
   */
  async getSystemHealth() {
    const circuitBreakerStats = manufacturingCircuitBreakers.getCacheCircuitBreaker().getStats();
    const dbCircuitBreakerStats = manufacturingCircuitBreakers.getDatabaseCircuitBreaker().getStats();
    
    return {
      timestamp: new Date(),
      services: {
        cache: {
          status: circuitBreakerStats.state,
          errorPercentage: circuitBreakerStats.errorPercentage,
          totalCalls: circuitBreakerStats.totalCalls,
          averageResponseTime: circuitBreakerStats.averageResponseTime,
        },
        database: {
          status: dbCircuitBreakerStats.state,
          errorPercentage: dbCircuitBreakerStats.errorPercentage,
          totalCalls: dbCircuitBreakerStats.totalCalls,
          averageResponseTime: dbCircuitBreakerStats.averageResponseTime,
        },
      },
      patterns: {
        eventStorePartitioning: 'ACTIVE',
        circuitBreakers: 'ACTIVE',
        distributedLocking: 'ACTIVE',
        sagaPattern: 'ACTIVE',
      },
    };
  }
}

// Export singleton for application use
let integratedServiceManager: IntegratedServiceManager;

export function getIntegratedServiceManager(
  prisma: PrismaProductionService,
  eventService: EventSourcingService,
  cacheService: CacheService
): IntegratedServiceManager {
  if (!integratedServiceManager) {
    integratedServiceManager = new IntegratedServiceManager(prisma, eventService, cacheService);
  }
  return integratedServiceManager;
}