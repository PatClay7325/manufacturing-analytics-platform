// Jest test - using global test functions
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EventSourcingService } from '@/services/event-sourcing.service';
import { CircuitBreaker, CircuitState, manufacturingCircuitBreakers } from '@/services/circuit-breaker.service';
import { distributedLock, manufacturingLocks } from '@/services/distributed-lock.service';
import { SagaOrchestrator, ManufacturingSagas, SagaStatus } from '@/services/saga.service';
import { ProductionReadyOEEService, IntegratedServiceManager } from '@/services/production-ready-integration.service';
import { CacheService } from '@/services/cache.service';
import { PrismaProductionService } from '@/services/prisma-production.service';

describe('Production-Ready Patterns Integration Tests', () => {
  let prisma: PrismaProductionService;
  let eventService: EventSourcingService;
  let cacheService: CacheService;
  let redis: Redis;
  let integratedManager: IntegratedServiceManager;

  beforeAll(async () => {
    // Initialize services
    prisma = new PrismaProductionService();
    await prisma.connect();
    
    eventService = new EventSourcingService(prisma);
    cacheService = new CacheService();
    await cacheService.connect();
    
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    integratedManager = new IntegratedServiceManager(prisma, eventService, cacheService);
  });

  afterAll(async () => {
    await eventService.cleanup();
    await cacheService.close();
    await distributedLock.shutdown();
    await redis.quit();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear test data
    await redis.flushdb();
    await prisma.$executeRaw`TRUNCATE TABLE audit.audit_event CASCADE`;
  });

  describe('Event Store Partitioning', () => {
    it('should handle high-volume events across partitions', async () => {
      const startTime = Date.now();
      const eventCount = 1000;
      
      // Generate events across multiple months to test partitioning
      const eventPromises = Array.from({ length: eventCount }, async (_, i) => {
        const eventDate = new Date();
        eventDate.setMonth(eventDate.getMonth() + (i % 3)); // Spread across 3 months
        
        return eventService.publish({
          eventType: 'equipment.created' as any,
          aggregateId: `equipment-${i}`,
          aggregateType: 'equipment',
          eventData: { equipmentId: i, created: true },
          eventMetadata: {
            timestamp: eventDate,
            version: 1,
          },
        });
      });

      // Execute all events in parallel
      await Promise.all(eventPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time even with partitioning
      expect(duration).toBeLessThan(10000); // 10 seconds max

      // Verify events were stored across partitions
      const storedEvents = await prisma.auditEvent.count();
      expect(storedEvents).toBe(eventCount);

      console.log(`[Partitioning] Processed ${eventCount} events in ${duration}ms`);
    });

    it('should efficiently query events from specific partitions', async () => {
      // Create events in current month
      const currentMonth = new Date();
      for (let i = 0; i < 100; i++) {
        await eventService.publish({
          eventType: 'production.started' as any,
          aggregateId: `production-${i}`,
          aggregateType: 'production',
          eventData: { productionId: i },
          eventMetadata: {
            timestamp: currentMonth,
            version: 1,
          },
        });
      }

      const startTime = Date.now();
      
      // Query events from current month (should hit specific partition)
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const events = await prisma.auditEvent.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
          eventType: 'production.started',
        },
      });

      const queryTime = Date.now() - startTime;

      expect(events).toHaveLength(100);
      expect(queryTime).toBeLessThan(100); // Should be fast due to partition pruning

      console.log(`[Partitioning] Queried 100 events in ${queryTime}ms`);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should protect against cascading failures', async () => {
      const circuitBreaker = manufacturingCircuitBreakers.getCacheCircuitBreaker();
      let failureCount = 0;
      let successCount = 0;

      // Create a failing operation
      const failingOperation = async () => {
        throw new Error('Service unavailable');
      };

      // Create a successful operation
      const successfulOperation = async () => {
        return 'success';
      };

      // Generate failures to open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          failureCount++;
        }
      }

      expect(failureCount).toBe(5);
      expect(circuitBreaker.getStats().state).toBe(CircuitState.OPEN);

      // Subsequent calls should fail fast without executing the operation
      const fastFailStart = Date.now();
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        const fastFailTime = Date.now() - fastFailStart;
        expect(fastFailTime).toBeLessThan(10); // Should fail immediately
        expect(error.message).toContain('Circuit breaker');
      }

      // After recovery timeout, circuit should go to HALF_OPEN
      circuitBreaker.forceState(CircuitState.HALF_OPEN);

      // Successful operation should close the circuit
      const result = await circuitBreaker.execute(successfulOperation);
      expect(result).toBe('success');
      expect(circuitBreaker.getStats().state).toBe(CircuitState.CLOSED);
    });

    it('should handle slow calls and timeouts', async () => {
      const circuitBreaker = new CircuitBreaker({
        name: 'slow-call-test',
        failureThreshold: 3,
        recoveryTimeout: 5000,
        monitoringPeriod: 10000,
        volumeThreshold: 5,
        errorPercentageThreshold: 50,
        slowCallThreshold: 2,
        slowCallDurationThreshold: 100, // 100ms
      });

      // Create a slow operation
      const slowOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
        return 'slow-result';
      };

      // Execute slow operations
      let slowCallCount = 0;
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(slowOperation);
        } catch (error) {
          if (error.message.includes('timed out')) {
            slowCallCount++;
          }
        }
      }

      // Circuit should open due to slow calls
      expect(circuitBreaker.getStats().state).toBe(CircuitState.OPEN);
    });
  });

  describe('Distributed Locking', () => {
    it('should prevent concurrent OEE calculations', async () => {
      const equipmentId = 1;
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02'),
      };

      let calculationCount = 0;
      const concurrentCalculations = 5;

      // Simulate concurrent OEE calculations
      const calculationPromises = Array.from({ length: concurrentCalculations }, async (_, i) => {
        return manufacturingLocks.withOEECalculationLock(
          equipmentId,
          timeRange,
          async () => {
            calculationCount++;
            console.log(`[Lock] Calculation ${i + 1} executing (count: ${calculationCount})`);
            
            // Verify only one calculation is running at a time
            expect(calculationCount).toBe(1);
            
            // Simulate calculation work
            await new Promise(resolve => setTimeout(resolve, 100));
            
            calculationCount--;
            return `result-${i}`;
          }
        );
      });

      const results = await Promise.all(calculationPromises);
      
      expect(results).toHaveLength(concurrentCalculations);
      expect(calculationCount).toBe(0); // All calculations completed
    });

    it('should handle lock timeouts and retries', async () => {
      const lockKey = 'test-timeout-lock';
      
      // Acquire lock with long TTL
      const lockValue1 = await distributedLock.acquireLock(lockKey, { ttl: 5000 });
      expect(lockValue1).not.toBeNull();

      // Try to acquire same lock with retries (should timeout)
      const startTime = Date.now();
      const lockValue2 = await distributedLock.acquireLock(lockKey, {
        ttl: 1000,
        retryCount: 3,
        retryDelay: 100,
      });
      const elapsedTime = Date.now() - startTime;

      expect(lockValue2).toBeNull();
      expect(elapsedTime).toBeGreaterThan(300); // Should have retried with delays

      // Release first lock
      const released = await distributedLock.releaseLock(lockKey, lockValue1!);
      expect(released).toBe(true);

      // Now should be able to acquire lock
      const lockValue3 = await distributedLock.acquireLock(lockKey, { ttl: 1000 });
      expect(lockValue3).not.toBeNull();

      await distributedLock.releaseLock(lockKey, lockValue3!);
    });

    it('should extend lock TTL for long-running operations', async () => {
      const lockKey = 'test-extend-lock';
      const initialTtl = 1000; // 1 second
      
      const lockValue = await distributedLock.acquireLock(lockKey, { ttl: initialTtl });
      expect(lockValue).not.toBeNull();

      // Wait for half the TTL
      await new Promise(resolve => setTimeout(resolve, 500));

      // Extend the lock
      const extended = await distributedLock.extendLock(lockKey, lockValue!, 2000);
      expect(extended).toBe(true);

      // Lock should still be valid after original TTL
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const lockInfo = await distributedLock.getLockInfo(lockKey);
      expect(lockInfo.exists).toBe(true);

      await distributedLock.releaseLock(lockKey, lockValue!);
    });
  });

  describe('Saga Pattern', () => {
    it('should complete complex manufacturing workflow', async () => {
      const sagaOrchestrator = new SagaOrchestrator(prisma, eventService);
      const manufacturingSagas = new ManufacturingSagas(sagaOrchestrator, prisma);

      const orderData = {
        orderId: 'ORDER-001',
        productId: 1,
        quantity: 100,
        userId: 'user-123',
      };

      // Start production order saga
      const sagaId = await manufacturingSagas.startProductionOrderProcessing(orderData);
      expect(sagaId).toBeDefined();

      // Wait for saga to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const sagaStatus = sagaOrchestrator.getSagaStatus(sagaId);
      expect(sagaStatus?.status).toBe(SagaStatus.COMPLETED);
      expect(sagaStatus?.completedSteps).toHaveLength(4); // All steps completed
    });

    it('should handle saga compensation on failure', async () => {
      const sagaOrchestrator = new SagaOrchestrator(prisma, eventService);

      // Register a saga with a failing step
      sagaOrchestrator.registerSaga({
        id: 'test-failing-saga',
        name: 'Test Failing Saga',
        steps: [
          {
            id: 'step1',
            name: 'Successful Step',
            execute: async () => {
              console.log('Step 1 executing...');
              return 'step1-result';
            },
            compensate: async () => {
              console.log('Step 1 compensating...');
            },
          },
          {
            id: 'step2',
            name: 'Failing Step',
            execute: async () => {
              console.log('Step 2 executing...');
              throw new Error('Step 2 intentional failure');
            },
            compensate: async () => {
              console.log('Step 2 compensating...');
            },
          },
          {
            id: 'step3',
            name: 'Never Reached',
            execute: async () => {
              console.log('Step 3 executing...');
              return 'step3-result';
            },
            compensate: async () => {
              console.log('Step 3 compensating...');
            },
          },
        ],
      });

      const sagaId = await sagaOrchestrator.startSaga('test-failing-saga', {
        data: { test: true },
      });

      // Wait for saga to fail and compensate
      await new Promise(resolve => setTimeout(resolve, 2000));

      const sagaStatus = sagaOrchestrator.getSagaStatus(sagaId);
      expect(sagaStatus?.status).toBe(SagaStatus.COMPENSATED);
      expect(sagaStatus?.completedSteps).toContain('step1');
      expect(sagaStatus?.failedSteps).toContain('step2');
      expect(sagaStatus?.compensatedSteps).toContain('step1');
    });

    it('should handle saga timeouts', async () => {
      const sagaOrchestrator = new SagaOrchestrator(prisma, eventService);

      // Register a saga with timeout
      sagaOrchestrator.registerSaga({
        id: 'test-timeout-saga',
        name: 'Test Timeout Saga',
        timeout: 1000, // 1 second timeout
        steps: [
          {
            id: 'slow-step',
            name: 'Slow Step',
            execute: async () => {
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
              return 'slow-result';
            },
            compensate: async () => {
              console.log('Slow step compensating...');
            },
          },
        ],
      });

      const sagaId = await sagaOrchestrator.startSaga('test-timeout-saga', {
        data: { test: true },
      });

      // Wait for timeout and compensation
      await new Promise(resolve => setTimeout(resolve, 3000));

      const sagaStatus = sagaOrchestrator.getSagaStatus(sagaId);
      expect(sagaStatus?.status).toBe(SagaStatus.COMPENSATED);
      expect(sagaStatus?.error).toContain('timed out');
    });
  });

  describe('Integrated Pattern Usage', () => {
    it('should handle OEE calculation with all reliability patterns', async () => {
      const equipmentId = 1;
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02'),
      };

      // Create test equipment and production data
      await prisma.dimEquipment.create({
        data: {
          id: equipmentId,
          code: 'EQ-001',
          name: 'Test Equipment',
          workCenter: {
            create: {
              id: 1,
              code: 'WC-001',
              name: 'Test Work Center',
              area: {
                create: {
                  id: 1,
                  code: 'AREA-001',
                  name: 'Test Area',
                  site: {
                    create: {
                      id: 1,
                      code: 'SITE-001',
                      name: 'Test Site',
                    },
                  },
                },
              },
            },
          },
        },
      });

      // First call should hit database and cache result
      const startTime1 = Date.now();
      const result1 = await integratedManager.oeeService.calculateOEE(
        equipmentId,
        timeRange,
        'test-user'
      );
      const duration1 = Date.now() - startTime1;

      expect(result1.source).toBe('database');
      expect(result1.oee).toBeGreaterThanOrEqual(0);

      // Second call should hit cache
      const startTime2 = Date.now();
      const result2 = await integratedManager.oeeService.calculateOEE(
        equipmentId,
        timeRange,
        'test-user'
      );
      const duration2 = Date.now() - startTime2;

      expect(result2.source).toBe('cache');
      expect(duration2).toBeLessThan(duration1); // Should be faster from cache
    });

    it('should handle equipment decommission with saga pattern', async () => {
      const equipmentId = 1;
      const userId = 'admin-user';
      const reason = 'End of lifecycle';

      // Equipment should already exist from previous test
      const sagaId = await integratedManager.equipmentService.decommissionEquipment(
        equipmentId,
        userId,
        reason
      );

      expect(sagaId).toBeDefined();

      // Verify decommission event was published
      await new Promise(resolve => setTimeout(resolve, 1000));

      const events = await prisma.auditEvent.findMany({
        where: {
          eventType: 'equipment.deactivated',
          aggregateId: equipmentId.toString(),
        },
      });

      expect(events).toHaveLength(1);
      expect(events[0].eventData).toMatchObject({
        equipmentId,
        reason,
        sagaId,
      });
    });

    it('should handle concurrent operations without race conditions', async () => {
      const equipmentId = 2;
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02'),
      };

      // Create test equipment
      await prisma.dimEquipment.create({
        data: {
          id: equipmentId,
          code: 'EQ-002',
          name: 'Concurrent Test Equipment',
          workCenterId: 1, // Reuse work center from previous test
        },
      });

      // Start multiple concurrent OEE calculations
      const concurrentCalculations = 10;
      const calculationPromises = Array.from({ length: concurrentCalculations }, (_, i) =>
        integratedManager.oeeService.calculateOEE(
          equipmentId,
          timeRange,
          `user-${i}`
        )
      );

      const results = await Promise.all(calculationPromises);

      // All calculations should succeed
      expect(results).toHaveLength(concurrentCalculations);
      results.forEach(result => {
        expect(result.oee).toBeGreaterThanOrEqual(0);
      });

      // Verify only one database calculation was performed (others from cache)
      const dbCalculations = results.filter(r => r.source === 'database');
      const cacheCalculations = results.filter(r => r.source === 'cache');
      
      expect(dbCalculations).toHaveLength(1);
      expect(cacheCalculations).toHaveLength(concurrentCalculations - 1);
    });

    it('should provide comprehensive system health status', async () => {
      const health = await integratedManager.getSystemHealth();

      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.services.cache.status).toBeDefined();
      expect(health.services.database.status).toBeDefined();
      expect(health.patterns.eventStorePartitioning).toBe('ACTIVE');
      expect(health.patterns.circuitBreakers).toBe('ACTIVE');
      expect(health.patterns.distributedLocking).toBe('ACTIVE');
      expect(health.patterns.sagaPattern).toBe('ACTIVE');

      console.log('[Health] System health check:', JSON.stringify(health, null, 2));
    });
  });
});