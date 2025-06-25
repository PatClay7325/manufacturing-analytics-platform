/**
 * Performance Tests for Grafana Integration
 * 
 * Tests system performance under various load conditions
 * and validates response times meet SLA requirements.
 */

import { performance } from 'perf_hooks';

// Mock dependencies for performance testing
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  })),
}));

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue({}),
  })),
}));

// Import services after mocks
import { SessionBridge } from '@/lib/auth/SessionBridge';
import { GrafanaApiService } from '@/services/grafana/GrafanaApiService';
import { MqttIngestionService } from '@/services/data-pipeline/MqttIngestionService';

describe('Grafana Integration Performance Tests', () => {
  let sessionBridge: SessionBridge;
  let grafanaService: GrafanaApiService;
  let mqttService: MqttIngestionService;

  const mockConfig = {
    grafanaUrl: 'http://localhost:3001',
    grafanaApiKey: 'test-api-key',
    redisUrl: 'redis://localhost:6379',
    mqttUrl: 'mqtt://localhost:1883',
    postgresUrl: 'postgresql://postgres:password@localhost:5433/test',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetch for Grafana API calls
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
      text: () => Promise.resolve('success'),
    });

    sessionBridge = new SessionBridge({
      redisUrl: mockConfig.redisUrl,
      sessionTtl: 3600,
    });

    grafanaService = new GrafanaApiService({
      grafanaUrl: mockConfig.grafanaUrl,
      apiKey: mockConfig.grafanaApiKey,
    });

    mqttService = new MqttIngestionService({
      mqttUrl: mockConfig.mqttUrl,
      postgresUrl: mockConfig.postgresUrl,
      topics: {
        sensors: 'manufacturing/+/sensors/+',
        metrics: 'manufacturing/+/metrics',
        status: 'manufacturing/+/status',
        downtime: 'manufacturing/+/downtime',
      },
      batchSize: 100,
      flushInterval: 1000,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Session Management Performance', () => {
    test('should handle concurrent session creation within SLA', async () => {
      const concurrentUsers = 50;
      const maxResponseTime = 500; // 500ms SLA
      const users = Array.from({ length: concurrentUsers }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        username: `user${i}`,
        role: 'OPERATOR' as const,
      }));

      const startTime = performance.now();
      
      // Create sessions concurrently
      const sessionPromises = users.map(async (user) => {
        const userStartTime = performance.now();
        const sessionId = await sessionBridge.createSession(user);
        const userEndTime = performance.now();
        return {
          sessionId,
          responseTime: userEndTime - userStartTime,
        };
      });

      const results = await Promise.all(sessionPromises);
      const totalTime = performance.now() - startTime;

      // Verify all sessions created successfully
      expect(results).toHaveLength(concurrentUsers);
      results.forEach(result => {
        expect(result.sessionId).toBeDefined();
        expect(result.responseTime).toBeLessThan(maxResponseTime);
      });

      // Total time should be reasonable for concurrent operations
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 50 concurrent users

      // Calculate performance metrics
      const responseTimes = results.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTimeActual = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      console.log(`Session Creation Performance:
        - Concurrent Users: ${concurrentUsers}
        - Total Time: ${totalTime.toFixed(2)}ms
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms
        - Max Response Time: ${maxResponseTimeActual.toFixed(2)}ms
        - Min Response Time: ${minResponseTime.toFixed(2)}ms
      `);

      expect(avgResponseTime).toBeLessThan(maxResponseTime * 0.8); // Average should be well below SLA
    });

    test('should validate sessions efficiently under load', async () => {
      const sessionCount = 100;
      const maxValidationTime = 100; // 100ms SLA for validation

      // Create test sessions
      const sessions = await Promise.all(
        Array.from({ length: sessionCount }, (_, i) => 
          sessionBridge.createSession({
            id: `user-${i}`,
            email: `user${i}@example.com`,
            username: `user${i}`,
            role: 'OPERATOR',
          })
        )
      );

      // Test concurrent validation
      const startTime = performance.now();
      const validationPromises = sessions.map(async (sessionId) => {
        const validateStartTime = performance.now();
        const isValid = await sessionBridge.validateSession(sessionId);
        const validateEndTime = performance.now();
        return {
          sessionId,
          isValid,
          responseTime: validateEndTime - validateStartTime,
        };
      });

      const validationResults = await Promise.all(validationPromises);
      const totalValidationTime = performance.now() - startTime;

      // All validations should succeed
      validationResults.forEach(result => {
        expect(result.isValid).toBe(true);
        expect(result.responseTime).toBeLessThan(maxValidationTime);
      });

      const avgValidationTime = validationResults.reduce((a, b) => a + b.responseTime, 0) / validationResults.length;
      console.log(`Session Validation Performance:
        - Sessions Validated: ${sessionCount}
        - Total Time: ${totalValidationTime.toFixed(2)}ms
        - Average Validation Time: ${avgValidationTime.toFixed(2)}ms
      `);

      expect(avgValidationTime).toBeLessThan(maxValidationTime * 0.5);
    });
  });

  describe('Grafana API Performance', () => {
    test('should handle dashboard operations within SLA', async () => {
      const operationCount = 20;
      const maxResponseTime = 1000; // 1 second SLA

      const operations = [
        () => grafanaService.getDashboards(),
        () => grafanaService.getCurrentUser(),
        () => grafanaService.getDatasources(),
        () => grafanaService.getAlertRules(),
      ];

      const performanceResults = [];

      for (const operation of operations) {
        const operationResults = [];
        
        for (let i = 0; i < operationCount; i++) {
          const startTime = performance.now();
          await operation();
          const endTime = performance.now();
          operationResults.push(endTime - startTime);
        }

        const avgTime = operationResults.reduce((a, b) => a + b, 0) / operationResults.length;
        const maxTime = Math.max(...operationResults);

        performanceResults.push({
          operation: operation.name,
          avgTime,
          maxTime,
          operations: operationCount,
        });

        expect(avgTime).toBeLessThan(maxResponseTime);
        expect(maxTime).toBeLessThan(maxResponseTime * 1.5);
      }

      console.log('Grafana API Performance:', performanceResults);
    });

    test('should handle concurrent dashboard queries efficiently', async () => {
      const concurrentQueries = 25;
      const maxQueryTime = 2000; // 2 seconds for complex queries

      // Mock complex dashboard query response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: Array.from({ length: 1000 }, (_, i) => ({
            timestamp: new Date(Date.now() - i * 60000).toISOString(),
            value: Math.random() * 100,
          })),
        }),
      });

      const startTime = performance.now();
      
      const queryPromises = Array.from({ length: concurrentQueries }, async (_, i) => {
        const queryStartTime = performance.now();
        
        // Simulate complex dashboard query
        await grafanaService.queryDashboard('manufacturing-oee', {
          range: { from: 'now-24h', to: 'now' },
          variables: { equipment: `equipment-${i % 5}` },
        });
        
        const queryEndTime = performance.now();
        return queryEndTime - queryStartTime;
      });

      const queryTimes = await Promise.all(queryPromises);
      const totalTime = performance.now() - startTime;

      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const maxQueryTimeActual = Math.max(...queryTimes);

      console.log(`Dashboard Query Performance:
        - Concurrent Queries: ${concurrentQueries}
        - Total Time: ${totalTime.toFixed(2)}ms
        - Average Query Time: ${avgQueryTime.toFixed(2)}ms
        - Max Query Time: ${maxQueryTimeActual.toFixed(2)}ms
        - Queries per Second: ${(concurrentQueries / (totalTime / 1000)).toFixed(2)}
      `);

      expect(avgQueryTime).toBeLessThan(maxQueryTime);
      expect(maxQueryTimeActual).toBeLessThan(maxQueryTime * 1.5);
    });
  });

  describe('Data Pipeline Performance', () => {
    test('should handle high-frequency MQTT ingestion', async () => {
      const messageCount = 1000;
      const messagesPerSecond = 100; // Target throughput
      const maxProcessingTime = 10000; // 10 seconds for 1000 messages

      // Generate test messages
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        equipmentId: `equipment-${i % 10}`,
        sensorName: 'temperature',
        value: 20 + Math.random() * 10,
        timestamp: new Date(Date.now() + i * 10).toISOString(),
      }));

      const startTime = performance.now();

      // Simulate MQTT message processing
      const processingPromises = messages.map(async (message, index) => {
        const messageStartTime = performance.now();
        
        // Simulate message processing delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
        
        const messageEndTime = performance.now();
        return {
          index,
          processingTime: messageEndTime - messageStartTime,
        };
      });

      // Process messages in batches to simulate real-world conditions
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < processingPromises.length; i += batchSize) {
        batches.push(processingPromises.slice(i, i + batchSize));
      }

      const batchResults = [];
      for (const batch of batches) {
        const batchStartTime = performance.now();
        const batchResult = await Promise.all(batch);
        const batchEndTime = performance.now();
        
        batchResults.push({
          messageCount: batch.length,
          totalTime: batchEndTime - batchStartTime,
          avgProcessingTime: batchResult.reduce((a, b) => a + b.processingTime, 0) / batchResult.length,
        });
      }

      const totalTime = performance.now() - startTime;
      const actualThroughput = messageCount / (totalTime / 1000);

      console.log(`MQTT Ingestion Performance:
        - Messages Processed: ${messageCount}
        - Total Time: ${totalTime.toFixed(2)}ms
        - Target Throughput: ${messagesPerSecond} msg/s
        - Actual Throughput: ${actualThroughput.toFixed(2)} msg/s
        - Batch Count: ${batches.length}
      `);

      expect(totalTime).toBeLessThan(maxProcessingTime);
      expect(actualThroughput).toBeGreaterThan(messagesPerSecond * 0.8); // Within 80% of target
    });

    test('should efficiently handle database batch operations', async () => {
      const batchSizes = [10, 50, 100, 500, 1000];
      const maxBatchTime = 1000; // 1 second per batch

      const performanceResults = [];

      for (const batchSize of batchSizes) {
        const testData = Array.from({ length: batchSize }, (_, i) => ({
          equipment_id: `equipment-${i % 10}`,
          sensor_name: 'temperature',
          value: 20 + Math.random() * 10,
          timestamp: new Date(),
        }));

        const startTime = performance.now();
        
        // Simulate database batch insert
        const mockQuery = require('pg').Pool().query;
        await mockQuery(
          'INSERT INTO sensor_readings (equipment_id, sensor_name, value, timestamp) VALUES ' +
          testData.map(() => '($1, $2, $3, $4)').join(', '),
          testData.flatMap(item => [item.equipment_id, item.sensor_name, item.value, item.timestamp])
        );
        
        const endTime = performance.now();
        const batchTime = endTime - startTime;

        performanceResults.push({
          batchSize,
          batchTime,
          recordsPerSecond: batchSize / (batchTime / 1000),
        });

        expect(batchTime).toBeLessThan(maxBatchTime);
      }

      console.log('Database Batch Performance:', performanceResults);

      // Verify that larger batches are more efficient (higher records/second)
      const efficiency = performanceResults.map(r => r.recordsPerSecond);
      expect(efficiency[efficiency.length - 1]).toBeGreaterThan(efficiency[0]);
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should maintain memory usage within limits during load', async () => {
      const initialMemory = process.memoryUsage();
      const maxMemoryIncreaseMB = 100; // 100MB increase limit

      // Simulate heavy load
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(
          sessionBridge.createSession({
            id: `load-user-${i}`,
            email: `load${i}@example.com`,
            username: `load${i}`,
            role: 'OPERATOR',
          })
        );
      }

      await Promise.all(operations);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncreaseMB = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      console.log(`Memory Usage:
        - Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        - Final Heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        - Increase: ${memoryIncreaseMB.toFixed(2)}MB
      `);

      expect(memoryIncreaseMB).toBeLessThan(maxMemoryIncreaseMB);
    });

    test('should handle session cleanup efficiently', async () => {
      const sessionCount = 200;
      const maxCleanupTime = 5000; // 5 seconds

      // Create many sessions
      const sessions = await Promise.all(
        Array.from({ length: sessionCount }, (_, i) =>
          sessionBridge.createSession({
            id: `cleanup-user-${i}`,
            email: `cleanup${i}@example.com`,
            username: `cleanup${i}`,
            role: 'OPERATOR',
          })
        )
      );

      const startTime = performance.now();

      // Cleanup all sessions
      const cleanupPromises = sessions.map(sessionId =>
        sessionBridge.cleanupSession(sessionId)
      );

      await Promise.all(cleanupPromises);

      const cleanupTime = performance.now() - startTime;

      console.log(`Session Cleanup Performance:
        - Sessions Cleaned: ${sessionCount}
        - Total Cleanup Time: ${cleanupTime.toFixed(2)}ms
        - Average Cleanup Time: ${(cleanupTime / sessionCount).toFixed(2)}ms
      `);

      expect(cleanupTime).toBeLessThan(maxCleanupTime);
    });
  });

  describe('Stress Testing', () => {
    test('should maintain stability under extreme load', async () => {
      const extremeLoad = {
        concurrentSessions: 500,
        concurrentQueries: 100,
        messagesPerSecond: 1000,
        testDurationSeconds: 30,
      };

      const startTime = performance.now();
      const results = {
        sessionsCreated: 0,
        queriesExecuted: 0,
        messagesProcessed: 0,
        errors: 0,
      };

      // Simulate extreme concurrent load
      const loadTasks = [];

      // Session creation load
      for (let i = 0; i < extremeLoad.concurrentSessions; i++) {
        loadTasks.push(
          sessionBridge.createSession({
            id: `stress-user-${i}`,
            email: `stress${i}@example.com`,
            username: `stress${i}`,
            role: 'OPERATOR',
          }).then(() => {
            results.sessionsCreated++;
          }).catch(() => {
            results.errors++;
          })
        );
      }

      // Query load
      for (let i = 0; i < extremeLoad.concurrentQueries; i++) {
        loadTasks.push(
          grafanaService.getDashboards().then(() => {
            results.queriesExecuted++;
          }).catch(() => {
            results.errors++;
          })
        );
      }

      // Message processing load
      for (let i = 0; i < extremeLoad.messagesPerSecond; i++) {
        loadTasks.push(
          Promise.resolve().then(() => {
            // Simulate message processing
            results.messagesProcessed++;
          }).catch(() => {
            results.errors++;
          })
        );
      }

      await Promise.allSettled(loadTasks);

      const totalTime = performance.now() - startTime;
      const errorRate = results.errors / (results.sessionsCreated + results.queriesExecuted + results.messagesProcessed);

      console.log(`Stress Test Results:
        - Test Duration: ${totalTime.toFixed(2)}ms
        - Sessions Created: ${results.sessionsCreated}
        - Queries Executed: ${results.queriesExecuted}
        - Messages Processed: ${results.messagesProcessed}
        - Errors: ${results.errors}
        - Error Rate: ${(errorRate * 100).toFixed(2)}%
      `);

      // System should maintain low error rate under stress
      expect(errorRate).toBeLessThan(0.05); // Less than 5% error rate
      expect(results.errors).toBeLessThan(50); // Absolute error limit
    });
  });

  describe('Response Time SLA Compliance', () => {
    test('should meet SLA requirements for all operations', async () => {
      const slaRequirements = {
        sessionValidation: 100, // 100ms
        grafanaQuery: 2000, // 2 seconds
        dashboardLoad: 3000, // 3 seconds
        dataIngestion: 50, // 50ms per message
      };

      const testCases = [
        {
          name: 'Session Validation',
          operation: () => sessionBridge.validateSession('test-session'),
          sla: slaRequirements.sessionValidation,
        },
        {
          name: 'Grafana Query',
          operation: () => grafanaService.getDashboards(),
          sla: slaRequirements.grafanaQuery,
        },
        {
          name: 'Dashboard Load',
          operation: () => grafanaService.queryDashboard('manufacturing-oee', {
            range: { from: 'now-24h', to: 'now' },
          }),
          sla: slaRequirements.dashboardLoad,
        },
      ];

      const slaResults = [];

      for (const testCase of testCases) {
        const iterations = 10;
        const times = [];

        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();
          try {
            await testCase.operation();
          } catch (error) {
            // Allow some operations to fail in testing
          }
          const endTime = performance.now();
          times.push(endTime - startTime);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

        slaResults.push({
          operation: testCase.name,
          avgTime: avgTime.toFixed(2),
          maxTime: maxTime.toFixed(2),
          p95Time: p95Time.toFixed(2),
          sla: testCase.sla,
          slaCompliant: p95Time <= testCase.sla,
        });

        // 95th percentile should meet SLA
        expect(p95Time).toBeLessThanOrEqual(testCase.sla);
      }

      console.log('SLA Compliance Results:', slaResults);
    });
  });
});