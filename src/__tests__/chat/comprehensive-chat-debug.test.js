const { ConversationalManufacturingAgent } = require('@/lib/agents/ConversationalManufacturingAgent');
const { prisma } = require('@/lib/database/prisma');

// Mock modules
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

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
  }));
});

jest.mock('tiktoken', () => ({
  encoding_for_model: jest.fn(() => ({
    encode: jest.fn((text) => ({ length: text.length })),
    decode: jest.fn(),
  })),
}));

describe('Comprehensive Chat Functionality Debug Tests', () => {
  let agent;
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

    prisma.dimEquipment.findMany.mockResolvedValue(mockEquipment);
    prisma.factProduction.findMany.mockResolvedValue(mockProduction);
    prisma.factProduction.aggregate.mockResolvedValue({
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

      prisma.factDowntime.findMany.mockResolvedValue(mockDowntime);
      prisma.factDowntime.groupBy.mockResolvedValue([
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
      
      prisma.factProduction.findMany.mockRejectedValue(
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
      
      prisma.factProduction.findMany.mockResolvedValue([]);
      prisma.dimEquipment.findMany.mockResolvedValue([]);

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

      prisma.factQualityMetrics.findMany.mockResolvedValue(mockQuality);

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

  describe('4. Response Structure Validation', () => {
    test('should include all required fields in response', async () => {
      console.log('\n🧪 Test 9: Response Structure');
      
      const response = await agent.chat(
        'What is the average production rate?',
        testSessionId,
        testUserId
      );

      console.log('Response structure:', {
        hasContent: !!response.content,
        hasContext: !!response.context,
        hasDataSources: !!response.dataSources,
        contextFields: Object.keys(response.context || {}),
      });

      expect(response).toMatchObject({
        content: expect.any(String),
        context: expect.objectContaining({
          confidence: expect.any(Number),
          intent: expect.any(String),
          entities: expect.any(Object),
          analysisType: expect.any(String),
        }),
      });
      expect(response.dataSources).toBeDefined();
      expect(Array.isArray(response.dataSources)).toBe(true);
    });
  });

  describe('5. Performance Tests', () => {
    test('should respond within acceptable time', async () => {
      console.log('\n🧪 Test 10: Response Time');
      
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

      expect(responseTime).toBeLessThan(5000);
      expect(response.content).toBeDefined();
    });
  });
});