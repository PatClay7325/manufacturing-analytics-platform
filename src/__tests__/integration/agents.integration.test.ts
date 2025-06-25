import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IntentClassifierAgentV2 } from '@/lib/agents/IntentClassifierAgentV2';
import { ISOComplianceEngine } from '@/lib/compliance/ISOComplianceEngine';
import { MemoryPrunerAgent } from '@/lib/agents/MemoryPrunerAgent';
import { prisma } from '@/lib/database';
import { getRedisClient, closeRedisConnections } from '@/lib/redis/redisClient';
import { initializeAgentSystem, shutdownAgentSystem } from '@/lib/startup/initializeAgentSystem';

describe('Agent System Integration Tests', () => {
  beforeAll(async () => {
    // Initialize the agent system
    await initializeAgentSystem();
  });

  afterAll(async () => {
    // Cleanup
    await shutdownAgentSystem();
    await closeRedisConnections();
    await prisma.$disconnect();
  });

  describe('IntentClassifierAgentV2', () => {
    it('should classify manufacturing intents with real embeddings', async () => {
      const agent = IntentClassifierAgentV2.getInstance();
      await agent.initialize();

      const testCases = [
        {
          input: 'What is the OEE for production line 1?',
          expectedIntent: 'analyze-oee',
          minConfidence: 0.7,
        },
        {
          input: 'Show me quality defect analysis',
          expectedIntent: 'quality-analysis',
          minConfidence: 0.7,
        },
        {
          input: 'Track equipment downtime patterns',
          expectedIntent: 'track-downtime',
          minConfidence: 0.7,
        },
      ];

      for (const testCase of testCases) {
        const result = await agent.classify({
          sessionId: 'test-session',
          input: testCase.input,
        });

        expect(result.intent).toBe(testCase.expectedIntent);
        expect(result.confidence).toBeGreaterThanOrEqual(testCase.minConfidence);
        expect(result.isoStandards).toBeDefined();
        expect(result.suggestedActions).toHaveLength(4);
      }
    });

    it('should cache classification results', async () => {
      const agent = IntentClassifierAgentV2.getInstance();
      const input = {
        sessionId: 'test-cache-session',
        input: 'Analyze OEE metrics',
      };

      // First call - should hit the API
      const start1 = Date.now();
      const result1 = await agent.classify(input);
      const duration1 = Date.now() - start1;

      // Second call - should hit cache
      const start2 = Date.now();
      const result2 = await agent.classify(input);
      const duration2 = Date.now() - start2;

      expect(result1).toEqual(result2);
      expect(duration2).toBeLessThan(duration1 / 2); // Cache should be much faster
    });

    it('should handle session memory correctly', async () => {
      const agent = IntentClassifierAgentV2.getInstance();
      const sessionId = 'test-memory-session';

      // Classify multiple intents
      const intents = ['analyze-oee', 'quality-analysis', 'track-downtime'];
      
      for (let i = 0; i < intents.length; i++) {
        await agent.classify({
          sessionId,
          input: `Test input for ${intents[i]}`,
        });
      }

      // Check session memory
      const session = await prisma.sessionMemory.findUnique({
        where: { sessionId },
      });

      expect(session).toBeDefined();
      const context = session?.context as any;
      expect(context.intents).toHaveLength(3);
      expect(context.lastIntent).toBe('track-downtime');
      expect(context.intentFrequency).toBeDefined();
    });
  });

  describe('ISOComplianceEngine', () => {
    it('should perform real compliance checks', async () => {
      const engine = new ISOComplianceEngine();
      
      // Seed some test data
      await prisma.performanceMetric.create({
        data: {
          equipmentId: 'EQ-TEST-1',
        plantCode: 'PLANT-TEST',
        assetTag: 'ASSET-TEST-1',
        workCenterId: 'test-unit-1',
          availability: 85,
          performance: 90,
          quality: 98,
          oeeScore: 75.03,
          timestamp: new Date(),
        },
      });

      const result = await engine.checkCompliance('ISO22400-2', {
        equipmentId: 'EQ-TEST-1',
        plantCode: 'PLANT-TEST',
        assetTag: 'ASSET-TEST-1',
        workCenterId: 'test-unit-1',
      });

      expect(result.standardId).toBe('ISO22400-2');
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.results).toHaveLength(3); // Number of ISO22400-2 rules
      expect(result.summary.totalRules).toBe(3);
      expect(result.recommendations).toBeDefined();
    });

    it('should cache compliance results', async () => {
      const engine = new ISOComplianceEngine();
      const redis = getRedisClient();

      const context = { testContext: true };
      
      // First call
      const result1 = await engine.checkCompliance('ISO9001', context);
      
      // Check Redis cache
      const cacheKey = `compliance:ISO9001:${JSON.stringify(context)}`;
      const cached = await redis.get(cacheKey);
      expect(cached).toBeDefined();

      // Second call should use cache
      const result2 = await engine.checkCompliance('ISO9001', context);
      expect(result1).toEqual(result2);
    });

    it('should generate compliance reports', async () => {
      const engine = new ISOComplianceEngine();
      
      const report = await engine.generateComplianceReport(
        ['ISO22400-2', 'ISO9001'],
        { scope: 'test' }
      );

      expect(report.reportId).toBeDefined();
      expect(report.standards).toHaveLength(2);
      expect(report.overallCompliance).toBeGreaterThanOrEqual(0);
      expect(report.executiveSummary).toContain('Compliance assessment completed');
    });
  });

  describe('MemoryPrunerAgent', () => {
    it('should prune old records', async () => {
      const agent = MemoryPrunerAgent.getInstance();
      
      // Create old test data
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      
      await prisma.sessionMemory.create({
        data: {
          sessionId: 'old-session',
          context: {},
          updatedAt: oldDate,
        },
      });

      await prisma.auditTrail.create({
        data: {
          intent: 'test',
          request: {},
          response: {},
          createdAt: oldDate,
        },
      });

      // Run pruning
      const result = await agent.prune({
        retentionDays: 30,
        pruneSessionMemory: true,
        pruneAuditTrail: true,
      });

      expect(result.totalDeleted).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);

      // Verify old data was deleted
      const oldSession = await prisma.sessionMemory.findUnique({
        where: { sessionId: 'old-session' },
      });
      expect(oldSession).toBeNull();
    });

    it('should respect batch size limits', async () => {
      const agent = MemoryPrunerAgent.getInstance();
      
      // Create multiple old records
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          prisma.auditTrail.create({
            data: {
              intent: 'test-batch',
              request: { index: i },
              response: {},
              createdAt: oldDate,
            },
          })
        );
      }
      
      await Promise.all(promises);

      const result = await agent.prune({
        retentionDays: 30,
        batchSize: 2, // Small batch size
        pruneAuditTrail: true,
      });

      expect(result.auditTrailDeleted).toBe(5);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('End-to-End Agent Workflow', () => {
    it('should handle complete agent workflow', async () => {
      const sessionId = 'e2e-test-session';
      const userId = 'test-user';

      // 1. Classify intent
      const classifier = IntentClassifierAgentV2.getInstance();
      const classificationResult = await classifier.classify({
        sessionId,
        userId,
        input: 'I need to check our quality metrics and ensure ISO compliance',
      });

      expect(classificationResult.intent).toBe('quality-analysis');
      
      // 2. Get ISO compliance information
      const complianceEngine = new ISOComplianceEngine();
      const isoStandards = classificationResult.isoStandards || [];
      
      const complianceResults = await Promise.all(
        isoStandards.map(std => 
          complianceEngine.checkCompliance(std, { userId })
        )
      );

      expect(complianceResults).toHaveLength(2); // ISO9001 and ISO22400-2
      expect(complianceResults[0].standardId).toBe('ISO9001');

      // 3. Check audit trail
      const auditRecords = await prisma.auditTrail.findMany({
        where: {
          sessionId,
          intent: classificationResult.intent,
        },
      });

      expect(auditRecords).toHaveLength(1);
      expect(auditRecords[0].userId).toBe(userId);

      // 4. Verify session memory
      const session = await prisma.sessionMemory.findUnique({
        where: { sessionId },
      });

      expect(session).toBeDefined();
      const context = session?.context as any;
      expect(context.lastIntent).toBe('quality-analysis');
    });
  });
});