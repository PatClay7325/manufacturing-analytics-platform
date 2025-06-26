import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/database/prisma';
import { ConversationalManufacturingAgent } from '@/lib/agents/ConversationalManufacturingAgent';

// Mock the prisma client
jest.mock('@/lib/database/prisma', () => ({
  prisma: {
    factProduction: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    factDowntime: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    factQualityMetrics: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    dimEquipment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    dimProduct: {
      findMany: jest.fn(),
    },
    factMaintenanceRecords: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    factOeeByShift: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  }
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
  }));
});

// Mock tiktoken
jest.mock('tiktoken', () => ({
  encoding_for_model: jest.fn(() => ({
    encode: jest.fn((text) => ({ length: text.length })),
    decode: jest.fn(),
  })),
}));

describe('Comprehensive Chat Functionality Debug Tests', () => {
  let agent: ConversationalManufacturingAgent;
  const testSessionId = 'test-session-' + Date.now();
  const testUserId = 'test-user';

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new ConversationalManufacturingAgent();
    
    // Setup default mock data
    const mockEquipment = [
      { equipmentId: 'EQ001', equipmentName: 'CNC Machine 1', equipmentType: 'CNC' },
      { equipmentId: 'EQ002', equipmentName: 'Assembly Robot 1', equipmentType: 'Robot' },
    ];
    
    const mockProduction = [
      {
        productionId: 1,
        equipmentId: 'EQ001',
        productId: 'PROD001',
        shiftId: 1,
        plannedQuantity: 100,
        actualQuantity: 95,
        goodQuantity: 90,
        scrapQuantity: 5,
        plannedRuntime: 480,
        actualRuntime: 450,
        downtime: 30,
        dateKey: 20240626,
      },
    ];

    (prisma.dimEquipment.findMany as jest.Mock).mockResolvedValue(mockEquipment);
    (prisma.factProduction.findMany as jest.Mock).mockResolvedValue(mockProduction);
    (prisma.factProduction.aggregate as jest.Mock).mockResolvedValue({
      _avg: { actualQuantity: 95 },
      _sum: { actualQuantity: 950, goodQuantity: 900 },
    });
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  describe('1. Basic Chat Functionality', () => {
    test('should respond to simple OEE query', async () => {
      console.log('\n🧪 Test 1: Simple OEE Query');
      
      const response = await agent.chat(
        'Show me OEE for all equipment today',
        testSessionId,
        testUserId
      );

      console.log('Response:', {
        hasContent: !!response.content,
        contentLength: response.content?.length,
        confidence: response.context?.confidence,
        dataSources: response.dataSources,
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.context).toBeDefined();
      expect(response.context.confidence).toBeGreaterThan(0);
    });

    test('should handle downtime analysis query', async () => {
      console.log('\n🧪 Test 2: Downtime Analysis');
      
      const mockDowntime = [
        {
          downtimeId: 1,
          equipmentId: 'EQ001',
          startTime: new Date('2024-06-26T10:00:00Z'),
          endTime: new Date('2024-06-26T10:30:00Z'),
          duration: 30,
          reasonCode: 'MAINT',
          reasonDescription: 'Planned Maintenance',
        },
      ];

      (prisma.factDowntime.findMany as jest.Mock).mockResolvedValue(mockDowntime);
      (prisma.factDowntime.groupBy as jest.Mock).mockResolvedValue([
        {
          reasonCode: 'MAINT',
          _sum: { duration: 120 },
          _count: { downtimeId: 4 },
        },
      ]);

      const response = await agent.chat(
        'What is my largest downtime cause?',
        testSessionId,
        testUserId
      );

      console.log('Downtime Response:', {
        hasContent: !!response.content,
        mentions: {
          maintenance: response.content.toLowerCase().includes('maintenance'),
          duration: response.content.includes('120') || response.content.includes('2 hours'),
        },
      });

      expect(response.content).toBeDefined();
      expect(response.content.toLowerCase()).toMatch(/maintenance|maint/);
    });

    test('should maintain conversation context', async () => {
      console.log('\n🧪 Test 3: Context Maintenance');
      
      // First message
      const response1 = await agent.chat(
        'Show me equipment EQ001 performance',
        testSessionId,
        testUserId
      );

      console.log('First response context:', response1.context?.entities);

      // Follow-up message
      const response2 = await agent.chat(
        'What about its quality rate?',
        testSessionId,
        testUserId
      );

      console.log('Second response:', {
        mentionsEQ001: response2.content.includes('EQ001'),
        mentionsQuality: response2.content.toLowerCase().includes('quality'),
      });

      expect(response2.content).toBeDefined();
      // Should reference the previously mentioned equipment
      expect(response2.content).toMatch(/EQ001|CNC Machine 1/);
    });
  });

  describe('2. Error Handling and Edge Cases', () => {
    test('should handle database errors gracefully', async () => {
      console.log('\n🧪 Test 4: Database Error Handling');
      
      (prisma.factProduction.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await agent.chat(
        'Show me production data',
        testSessionId,
        testUserId
      );

      console.log('Error response:', {
        hasContent: !!response.content,
        isError: response.content.includes('error') || response.content.includes('issue'),
      });

      expect(response.content).toBeDefined();
      expect(response.content).not.toBe('');
    });

    test('should handle empty result sets', async () => {
      console.log('\n🧪 Test 5: Empty Results');
      
      (prisma.factProduction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.dimEquipment.findMany as jest.Mock).mockResolvedValue([]);

      const response = await agent.chat(
        'Show me production for equipment XYZ999',
        testSessionId,
        testUserId
      );

      console.log('Empty result response:', {
        hasContent: !!response.content,
        mentions: {
          noData: response.content.toLowerCase().includes('no data') || 
                  response.content.toLowerCase().includes('not found'),
        },
      });

      expect(response.content).toBeDefined();
      expect(response.content.toLowerCase()).toMatch(/no data|not found|no equipment/);
    });

    test('should handle malformed queries', async () => {
      console.log('\n🧪 Test 6: Malformed Query');
      
      const response = await agent.chat(
        'ajshdkjahsd aksjdh askjdh',
        testSessionId,
        testUserId
      );

      console.log('Malformed query response:', {
        hasContent: !!response.content,
        confidence: response.context?.confidence,
        hasClarification: !!response.clarificationNeeded,
      });

      expect(response.content).toBeDefined();
      expect(response.context.confidence).toBeLessThan(0.5);
    });
  });

  describe('3. Complex Query Handling', () => {
    test('should handle multi-metric queries', async () => {
      console.log('\n🧪 Test 7: Multi-Metric Query');
      
      const mockQuality = [
        {
          qualityMetricId: 1,
          equipmentId: 'EQ001',
          defectType: 'SCRATCH',
          defectCount: 5,
          totalInspected: 100,
        },
      ];

      (prisma.factQualityMetrics.findMany as jest.Mock).mockResolvedValue(mockQuality);

      const response = await agent.chat(
        'Compare OEE, quality, and downtime for all equipment',
        testSessionId,
        testUserId
      );

      console.log('Multi-metric response:', {
        hasContent: !!response.content,
        mentions: {
          oee: response.content.toLowerCase().includes('oee'),
          quality: response.content.toLowerCase().includes('quality'),
          downtime: response.content.toLowerCase().includes('downtime'),
        },
      });

      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(100); // Should be detailed
    });

    test('should generate suggestions for follow-up', async () => {
      console.log('\n🧪 Test 8: Follow-up Suggestions');
      
      const response = await agent.chat(
        'Show me overall factory performance',
        testSessionId,
        testUserId
      );

      console.log('Suggestions:', {
        hasSuggestions: !!response.suggestions,
        count: response.suggestions?.length,
        examples: response.suggestions?.slice(0, 2),
      });

      expect(response.suggestions).toBeDefined();
      expect(response.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('4. Data Source Validation', () => {
    test('should include data sources in response', async () => {
      console.log('\n🧪 Test 9: Data Source Tracking');
      
      const response = await agent.chat(
        'What is the average production rate?',
        testSessionId,
        testUserId
      );

      console.log('Data sources:', {
        included: !!response.dataSources,
        sources: response.dataSources,
      });

      expect(response.dataSources).toBeDefined();
      expect(response.dataSources).toContain('factProduction');
    });

    test('should validate real data policy', async () => {
      console.log('\n🧪 Test 10: Real Data Policy');
      
      // This should use the mocked data, not generate fake data
      const response = await agent.chat(
        'Show me equipment performance metrics',
        testSessionId,
        testUserId
      );

      console.log('Real data validation:', {
        hasSpecificEquipment: response.content.includes('EQ001') || 
                              response.content.includes('CNC Machine'),
        hasRealMetrics: /\d+/.test(response.content),
      });

      expect(response.content).toMatch(/EQ001|EQ002|CNC Machine|Assembly Robot/);
    });
  });

  describe('5. Performance and Response Time', () => {
    test('should respond within acceptable time', async () => {
      console.log('\n🧪 Test 11: Response Time');
      
      const startTime = Date.now();
      
      const response = await agent.chat(
        'Show me quick OEE summary',
        testSessionId,
        testUserId
      );
      
      const responseTime = Date.now() - startTime;

      console.log('Performance:', {
        responseTime: `${responseTime}ms`,
        acceptable: responseTime < 5000,
      });

      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
      expect(response.content).toBeDefined();
    });
  });

  describe('6. Self-Critique Integration', () => {
    test('should include critique scores', async () => {
      console.log('\n🧪 Test 12: Self-Critique');
      
      const response = await agent.chat(
        'Analyze equipment efficiency and suggest improvements',
        testSessionId,
        testUserId
      );

      console.log('Critique:', {
        hasScore: !!response.context?.critiqueScore,
        score: response.context?.critiqueScore,
      });

      expect(response.context.critiqueScore).toBeDefined();
      expect(response.context.critiqueScore).toBeGreaterThan(0);
      expect(response.context.critiqueScore).toBeLessThanOrEqual(10);
    });
  });
});

// Additional test for the API route
describe('Chat API Route Tests', () => {
  test('should handle POST request to conversational chat endpoint', async () => {
    console.log('\n🧪 API Route Test');
    
    // This would typically use supertest or similar
    // For now, we'll test the agent directly
    const agent = new ConversationalManufacturingAgent();
    
    const mockRequest = {
      message: 'Test API message',
      sessionId: 'api-test-session',
      userId: 'api-test-user',
    };

    const response = await agent.chat(
      mockRequest.message,
      mockRequest.sessionId,
      mockRequest.userId
    );

    console.log('API Response structure:', {
      hasContent: !!response.content,
      hasContext: !!response.context,
      hasDataSources: !!response.dataSources,
    });

    expect(response).toMatchObject({
      content: expect.any(String),
      context: expect.objectContaining({
        confidence: expect.any(Number),
        intent: expect.any(String),
      }),
    });
  });
});