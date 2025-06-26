// Jest test - using global test functions
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EventSourcingService, EventType } from '@/services/event-sourcing.service';
import { EquipmentEventDrivenRepository } from '@/repositories/equipment-event-driven.repository';
import { ProductionEventDrivenRepository } from '@/repositories/production-event-driven.repository';
import { CacheService } from '@/services/cache.service';
import { PrismaProductionService } from '@/services/prisma-production.service';

describe('Event-Driven Architecture Integration Tests', () => {
  let prisma: PrismaProductionService;
  let eventService: EventSourcingService;
  let equipmentRepo: EquipmentEventDrivenRepository;
  let productionRepo: ProductionEventDrivenRepository;
  let cacheService: CacheService;
  let redis: Redis;

  beforeAll(async () => {
    // Initialize services
    prisma = new PrismaProductionService();
    await prisma.connect();
    
    eventService = new EventSourcingService(prisma);
    equipmentRepo = new EquipmentEventDrivenRepository(prisma, eventService);
    productionRepo = new ProductionEventDrivenRepository(prisma, eventService);
    
    cacheService = new CacheService();
    await cacheService.connect();
    
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  });

  afterAll(async () => {
    await eventService.cleanup();
    await cacheService.close();
    await redis.quit();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear test data
    await prisma.$executeRaw`TRUNCATE TABLE audit.audit_event CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE audit_log CASCADE`;
    await redis.flushdb();
  });

  describe('Equipment Event-Driven Operations', () => {
    it('should create equipment and publish events', async () => {
      // Arrange
      const equipmentData = {
        code: 'TEST-EQ-001',
        name: 'Test Equipment',
        type: 'CNC',
        workCenter: {
          connect: { id: 1 }, // Assuming work center exists
        },
      };

      let eventReceived = false;
      const unsubscribe = eventService.subscribe(EventType.EQUIPMENT_CREATED, async (event) => {
        eventReceived = true;
        expect(event.eventType).toBe(EventType.EQUIPMENT_CREATED);
        expect(event.eventData.code).toBe('TEST-EQ-001');
      });

      // Act
      const equipment = await equipmentRepo.create(equipmentData, 'test-user');

      // Wait for async event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(equipment).toBeDefined();
      expect(equipment.code).toBe('TEST-EQ-001');
      expect(eventReceived).toBe(true);

      // Check audit log was created
      const auditLogs = await prisma.auditLog.findMany({
        where: { tableName: 'dim_equipment' },
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('INSERT');

      // Check event store
      const events = await prisma.auditEvent.findMany({
        where: { eventType: EventType.EQUIPMENT_CREATED },
      });
      expect(events).toHaveLength(1);

      unsubscribe();
    });

    it('should update equipment and trigger state change events', async () => {
      // Create equipment first
      const equipment = await equipmentRepo.create({
        code: 'TEST-EQ-002',
        name: 'Test Equipment 2',
        workCenter: { connect: { id: 1 } },
      });

      let updateEventReceived = false;
      let deactivationEventReceived = false;

      const unsubscribeUpdate = eventService.subscribe(EventType.EQUIPMENT_UPDATED, async (event) => {
        updateEventReceived = true;
        expect(event.eventData.before.isActive).toBe(true);
        expect(event.eventData.after.isActive).toBe(false);
      });

      const unsubscribeDeactivation = eventService.subscribe(EventType.EQUIPMENT_DEACTIVATED, async (event) => {
        deactivationEventReceived = true;
        expect(event.eventData.equipmentCode).toBe('TEST-EQ-002');
      });

      // Act - deactivate equipment
      await equipmentRepo.update(equipment.id, { isActive: false }, 'test-user');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(updateEventReceived).toBe(true);
      expect(deactivationEventReceived).toBe(true);

      unsubscribeUpdate();
      unsubscribeDeactivation();
    });

    it('should handle batch updates with correlation IDs', async () => {
      // Create multiple equipment
      const equipment1 = await equipmentRepo.create({
        code: 'BATCH-001',
        name: 'Batch Equipment 1',
        workCenter: { connect: { id: 1 } },
      });

      const equipment2 = await equipmentRepo.create({
        code: 'BATCH-002',
        name: 'Batch Equipment 2',
        workCenter: { connect: { id: 1 } },
      });

      const updates = [
        { id: equipment1.id, data: { name: 'Updated Batch Equipment 1' } },
        { id: equipment2.id, data: { name: 'Updated Batch Equipment 2' } },
      ];

      // Act
      const results = await equipmentRepo.batchUpdate(updates, 'test-user');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(results).toHaveLength(2);

      // Check events have correlation IDs
      const events = await prisma.auditEvent.findMany({
        where: { eventType: EventType.EQUIPMENT_UPDATED },
        orderBy: { createdAt: 'asc' },
      });

      expect(events).toHaveLength(2);
      const correlationId = events[0].correlationId;
      expect(correlationId).toMatch(/^batch-\d+$/);
      expect(events[1].correlationId).toBe(correlationId);
    });
  });

  describe('Production Event-Driven Operations', () => {
    let equipmentId: number;
    let productId: number;
    let shiftId: number;

    beforeEach(async () => {
      // Create test data
      const equipment = await prisma.dimEquipment.create({
        data: {
          code: 'PROD-EQ-001',
          name: 'Production Equipment',
          workCenter: { connect: { id: 1 } },
        },
      });
      equipmentId = equipment.id;

      const product = await prisma.dimProduct.create({
        data: {
          code: 'PROD-001',
          name: 'Test Product',
        },
      });
      productId = product.id;

      const shift = await prisma.dimShift.create({
        data: {
          name: 'Day Shift',
          startTime: '08:00',
          endTime: '16:00',
          site: { connect: { id: 1 } },
        },
      });
      shiftId = shift.id;
    });

    it('should handle complete production lifecycle with events', async () => {
      let productionStartedEvent = false;
      let productionCompletedEvent = false;
      let oeeThresholdEvent = false;

      // Subscribe to events
      const unsubscribeStart = eventService.subscribe(EventType.PRODUCTION_STARTED, async (event) => {
        productionStartedEvent = true;
        expect(event.eventData.plannedQuantity).toBe(100);
      });

      const unsubscribeComplete = eventService.subscribe(EventType.PRODUCTION_COMPLETED, async (event) => {
        productionCompletedEvent = true;
        expect(event.eventData.metrics.goodParts).toBe(80);
      });

      const unsubscribeOEE = eventService.subscribe(EventType.OEE_THRESHOLD_BREACHED, async (event) => {
        oeeThresholdEvent = true;
        expect(event.eventData.oeeValue).toBeLessThan(0.6);
      });

      // Act - Start production
      const production = await productionRepo.startProduction({
        equipmentId,
        productId,
        shiftId,
        plannedQuantity: 100,
        operatorId: 'OP001',
      }, 'test-user');

      // Complete production with poor OEE
      await productionRepo.completeProduction(
        production.id,
        {
          totalPartsProduced: 100,
          goodParts: 80, // Low quality
          scrapParts: 20,
        },
        'test-user'
      );

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Assert
      expect(productionStartedEvent).toBe(true);
      expect(productionCompletedEvent).toBe(true);
      expect(oeeThresholdEvent).toBe(true);

      // Verify event order and correlation
      const events = await prisma.auditEvent.findMany({
        where: {
          aggregateId: production.id.toString(),
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(events).toHaveLength(3); // START, COMPLETE, THRESHOLD_BREACH
      expect(events[0].eventType).toBe(EventType.PRODUCTION_STARTED);
      expect(events[1].eventType).toBe(EventType.PRODUCTION_COMPLETED);
      expect(events[2].eventType).toBe(EventType.OEE_THRESHOLD_BREACHED);

      unsubscribeStart();
      unsubscribeComplete();
      unsubscribeOEE();
    });

    it('should handle concurrent production updates without data loss', async () => {
      // Start production
      const production = await productionRepo.startProduction({
        equipmentId,
        productId,
        shiftId,
        plannedQuantity: 1000,
      });

      // Simulate concurrent updates
      const updatePromises = Array.from({ length: 10 }, (_, i) =>
        productionRepo.updateProgress(
          production.id,
          { additionalGoodParts: 10, additionalScrapParts: 1 },
          `operator-${i}`
        )
      );

      // Act
      await Promise.all(updatePromises);

      // Wait for all events to be processed
      await new Promise(resolve => setTimeout(resolve, 300));

      // Assert - verify final state
      const finalProduction = await prisma.factProduction.findUnique({
        where: { id: production.id },
      });

      expect(finalProduction!.goodParts).toBe(100); // 10 * 10
      expect(finalProduction!.scrapParts).toBe(10); // 1 * 10
      expect(finalProduction!.totalPartsProduced).toBe(110);

      // Check all update events were recorded
      const updateEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: EventType.PRODUCTION_UPDATED,
          aggregateId: production.id.toString(),
        },
      });

      expect(updateEvents).toHaveLength(10);
    });
  });

  describe('Cache Integration', () => {
    it('should cache and retrieve OEE calculations', async () => {
      const equipmentId = 1;
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02'),
      };

      const oeeData = {
        availability: 0.85,
        performance: 0.90,
        quality: 0.95,
        oee: 0.727,
      };

      // Act - Cache data
      await cacheService.cacheOEE(equipmentId, timeRange, oeeData);

      // Retrieve from cache
      const cached = await cacheService.getCachedOEE(equipmentId, timeRange);

      // Assert
      expect(cached).toBeDefined();
      expect(cached.oee).toBe(0.727);
      expect(cached.cachedAt).toBeDefined();
    });

    it('should invalidate equipment cache on updates', async () => {
      const equipmentId = 1;
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02'),
      };

      // Cache some data
      await cacheService.cacheOEE(equipmentId, timeRange, { oee: 0.8 });
      await cacheService.cacheEquipment({ id: equipmentId, name: 'Test' });

      // Verify cache exists
      let cached = await cacheService.getCachedOEE(equipmentId, timeRange);
      expect(cached).toBeDefined();

      // Invalidate cache
      await cacheService.invalidateEquipmentCache(equipmentId);

      // Verify cache is cleared
      cached = await cacheService.getCachedOEE(equipmentId, timeRange);
      expect(cached).toBeNull();

      const equipmentCached = await cacheService.getCachedEquipment(equipmentId);
      expect(equipmentCached).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-frequency events without blocking', async () => {
      const startTime = Date.now();
      
      // Create equipment for testing
      const equipment = await prisma.dimEquipment.create({
        data: {
          code: 'PERF-TEST-001',
          name: 'Performance Test Equipment',
          workCenter: { connect: { id: 1 } },
        },
      });

      // Generate many state change events
      const stateChangePromises = Array.from({ length: 100 }, (_, i) =>
        equipmentRepo.recordStateChange(equipment.id, {
          stateCode: `STATE-${i % 5}`,
          stateCategory: 'Productive',
          reasonCode: 'NORMAL',
        })
      );

      // Act
      await Promise.all(stateChangePromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert - should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify events were recorded
      const events = await prisma.auditEvent.findMany({
        where: {
          eventType: EventType.EQUIPMENT_STATE_CHANGED,
          aggregateId: equipment.id.toString(),
        },
      });

      expect(events).toHaveLength(100);
    });

    it('should maintain sub-100ms response time for cached queries', async () => {
      const equipmentId = 1;
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02'),
      };

      // Pre-populate cache
      await cacheService.cacheOEE(equipmentId, timeRange, {
        availability: 0.85,
        performance: 0.90,
        quality: 0.95,
        oee: 0.727,
      });

      // Measure response time
      const times: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await cacheService.getCachedOEE(equipmentId, timeRange);
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      // Assert - sub-100ms response time
      expect(avgTime).toBeLessThan(100);
      expect(maxTime).toBeLessThan(100);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Redis connection failures gracefully', async () => {
      // Disconnect Redis temporarily
      await redis.disconnect();

      // Operations should still work without cache
      const equipment = await equipmentRepo.create({
        code: 'ERROR-TEST-001',
        name: 'Error Test Equipment',
        workCenter: { connect: { id: 1 } },
      });

      expect(equipment).toBeDefined();

      // Reconnect Redis
      await redis.connect();
    });

    it('should handle event processing failures without breaking main flow', async () => {
      // Subscribe with a failing handler
      const unsubscribe = eventService.subscribe(EventType.EQUIPMENT_CREATED, async () => {
        throw new Error('Test error in event handler');
      });

      // Should not throw despite failing event handler
      const equipment = await equipmentRepo.create({
        code: 'ERROR-TEST-002',
        name: 'Error Test Equipment 2',
        workCenter: { connect: { id: 1 } },
      });

      expect(equipment).toBeDefined();

      unsubscribe();
    });
  });
});