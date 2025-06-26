// Jest test - using global test functions
import { IntentClassifierAgent } from '@/lib/agents/IntentClassifierAgent';
import * as embeddingService from '@/lib/embeddings/embeddingService';
import { prisma } from '@/lib/database';

// Mock dependencies
jest.mock('@/lib/embeddings/embeddingService');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditTrail: {
      create: jest.fn(),
    },
    sessionMemory: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

describe('IntentClassifierAgent', () => {
  let agent: IntentClassifierAgent;

  beforeEach(() => {
    agent = IntentClassifierAgent.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('classify', () => {
    it('should classify OEE intent with high confidence', async () => {
      const input = {
        sessionId: 'test-session',
        userId: 'test-user',
        input: 'Show me the OEE for production line 1',
      };

      jest.mocked(embeddingService.classifyIntent).mockResolvedValue('analyze-oee');
      jest.mocked(prisma.sessionMemory.findUnique).mockResolvedValue(null);
      jest.mocked(prisma.sessionMemory.upsert).mockResolvedValue({} as any);
      jest.mocked(prisma.auditTrail.create).mockResolvedValue({} as any);

      const result = await agent.classify(input);

      expect(result).toMatchObject({
        intent: 'analyze-oee',
        confidence: 0.95, // High confidence for keyword match
        description: expect.stringContaining('Overall Equipment Effectiveness'),
        suggestedActions: expect.arrayContaining(['View OEE dashboard']),
        requiresAuth: true,
        isoStandards: ['ISO 22400-2'],
      });

      expect(embeddingService.classifyIntent).toHaveBeenCalledWith(input.input);
    });

    it('should classify quality intent correctly', async () => {
      const input = {
        sessionId: 'test-session',
        input: 'Analyze defect rates for last month',
      };

      jest.mocked(embeddingService.classifyIntent).mockResolvedValue('quality-analysis');
      jest.mocked(prisma.sessionMemory.findUnique).mockResolvedValue(null);

      const result = await agent.classify(input);

      expect(result).toMatchObject({
        intent: 'quality-analysis',
        confidence: 0.95,
        isoStandards: expect.arrayContaining(['ISO 9001', 'ISO 22400-2']),
      });
    });

    it('should handle unknown intent', async () => {
      const input = {
        sessionId: 'test-session',
        input: 'What is the weather today?',
      };

      jest.mocked(embeddingService.classifyIntent).mockResolvedValue('unknown-intent');

      const result = await agent.classify(input);

      expect(result).toMatchObject({
        intent: 'unknown-intent',
        confidence: 0,
        suggestedActions: expect.arrayContaining(['Please rephrase your request']),
        requiresAuth: false,
        isoStandards: [],
      });
    });

    it('should update session memory', async () => {
      const input = {
        sessionId: 'test-session',
        userId: 'test-user',
        input: 'Check equipment downtime',
      };

      jest.mocked(embeddingService.classifyIntent).mockResolvedValue('track-downtime');
      jest.mocked(prisma.sessionMemory.findUnique).mockResolvedValue({
        sessionId: 'test-session',
        context: { intents: [] },
        metadata: null,
        updatedAt: new Date(),
      });

      await agent.classify(input);

      expect(prisma.sessionMemory.upsert).toHaveBeenCalledWith({
        where: { sessionId: 'test-session' },
        update: expect.objectContaining({
          context: expect.objectContaining({
            lastIntent: 'track-downtime',
            intents: expect.arrayContaining([
              expect.objectContaining({
                intent: 'track-downtime',
              }),
            ]),
          }),
        }),
        create: expect.any(Object),
      });
    });

    it('should create audit trail', async () => {
      const input = {
        sessionId: 'test-session',
        userId: 'test-user',
        input: 'Monitor energy consumption',
      };

      jest.mocked(embeddingService.classifyIntent).mockResolvedValue('energy-monitoring');

      await agent.classify(input);

      expect(prisma.auditTrail.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 'test-session',
          userId: 'test-user',
          intent: 'energy-monitoring',
          request: expect.any(Object),
          response: expect.any(Object),
        }),
      });
    });

    it('should handle classification errors gracefully', async () => {
      const input = {
        sessionId: 'test-session',
        input: 'Test error handling',
      };

      jest.mocked(embeddingService.classifyIntent).mockRejectedValue(
        new Error('Embedding service error')
      );

      const result = await agent.classify(input);

      expect(result).toMatchObject({
        intent: 'unknown-intent',
        confidence: 0,
      });
    });

    it('should validate input', async () => {
      const invalidInput = {
        sessionId: '', // Invalid: empty
        input: 'Test',
      };

      await expect(agent.classify(invalidInput as any)).rejects.toThrow();
    });

    it('should limit session memory to 10 intents', async () => {
      const existingIntents = Array(10).fill(null).map((_, i) => ({
        intent: `intent-${i}`,
        timestamp: new Date().toISOString(),
      }));

      jest.mocked(prisma.sessionMemory.findUnique).mockResolvedValue({
        sessionId: 'test-session',
        context: { intents: existingIntents },
        metadata: null,
        updatedAt: new Date(),
      });

      jest.mocked(embeddingService.classifyIntent).mockResolvedValue('analyze-oee');

      await agent.classify({
        sessionId: 'test-session',
        input: 'Show OEE',
      });

      const upsertCall = jest.mocked(prisma.sessionMemory.upsert).mock.calls[0][0];
      const updatedIntents = upsertCall.update.context.intents;

      expect(updatedIntents).toHaveLength(10);
      expect(updatedIntents[0].intent).not.toBe('intent-0'); // First one removed
      expect(updatedIntents[9].intent).toBe('analyze-oee'); // New one added
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = IntentClassifierAgent.getInstance();
      const instance2 = IntentClassifierAgent.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});