/**
 * Unit tests for the conversational chat route
 * Tests the route handler directly without HTTP
 */

// Mock Next.js
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => ({
      ...data,
      _isNextResponse: true,
      status: init?.status || 200
    })
  },
  NextRequest: jest.fn()
}));

// Mock the agent
jest.mock('@/lib/agents/ConversationalManufacturingAgent', () => ({
  ConversationalManufacturingAgent: jest.fn().mockImplementation(() => ({
    chat: jest.fn().mockImplementation(async (message, sessionId, userId) => {
      // Simulate different responses based on the message
      if (message.toLowerCase().includes('oee')) {
        return {
          content: 'Based on the current data, the Overall Equipment Effectiveness (OEE) for all equipment today is:\n\n- CNC Machine 1 (EQ001): 78.5%\n- Assembly Robot 1 (EQ002): 82.3%\n- Packaging Line (EQ003): 91.2%\n\nThe average OEE across all equipment is 84.0%, which is above the target of 80%.',
          suggestions: [
            'Would you like to see the breakdown of Availability, Performance, and Quality for each equipment?',
            'Should I analyze the trends over the past week?'
          ],
          dataSources: ['factProduction', 'dimEquipment', 'factOeeByShift'],
          context: {
            confidence: 0.95,
            intent: 'oee_analysis',
            entities: {
              metrics: ['oee'],
              timeRange: { start: new Date('2024-06-26T00:00:00Z'), end: new Date('2024-06-26T23:59:59Z') }
            },
            analysisType: 'performance_metrics',
            critiqueScore: 8.5
          }
        };
      } else if (message.toLowerCase().includes('downtime')) {
        return {
          content: 'The largest downtime cause is Planned Maintenance (MAINT) with 120 minutes total today.',
          dataSources: ['factDowntime'],
          context: {
            confidence: 0.9,
            intent: 'downtime_analysis',
            entities: { metrics: ['downtime'] },
            analysisType: 'downtime_analysis',
            critiqueScore: 7.5
          }
        };
      } else if (message === '') {
        return {
          content: 'Please provide a question about your manufacturing operations.',
          clarificationNeeded: {
            question: 'What would you like to know?',
            options: ['Equipment performance', 'Quality metrics', 'Production status']
          },
          context: {
            confidence: 0.1,
            intent: 'unclear',
            entities: {},
            analysisType: 'clarification'
          }
        };
      } else {
        return {
          content: 'I can help you analyze manufacturing data. What specific metrics would you like to see?',
          suggestions: ['Show me OEE', 'What is my largest downtime cause?', 'Production summary'],
          context: {
            confidence: 0.3,
            intent: 'general_query',
            entities: {},
            analysisType: 'general'
          }
        };
      }
    })
  }))
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  verifyJWT: jest.fn().mockResolvedValue({ userId: 'test-user' })
}));

// Import the route handler
const { POST } = require('@/app/api/chat/conversational/route');

describe('Conversational Chat Route - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Request/Response Handling', () => {
    test('should handle valid OEE query', async () => {
      console.log('\n🧪 Test 1: Valid OEE Query');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          message: 'Show me OEE for all equipment today',
          sessionId: 'test-session-1',
          userId: 'test-user'
        }),
        headers: new Map([['authorization', 'Bearer test-token']])
      };

      const response = await POST(mockRequest);
      
      console.log('Response:', JSON.stringify(response, null, 2));
      
      expect(response._isNextResponse).toBe(true);
      expect(response.status).toBe(200);
      expect(response.message || response.response).toBeDefined();
      
      // Check content
      const content = response.message || response.response;
      expect(content).toContain('OEE');
      expect(content).toContain('%');
      
      // Verify data sources
      expect(response.dataSources).toBeDefined();
      expect(response.dataSources).toContain('factProduction');
      
      // Check confidence
      expect(response.confidence).toBeGreaterThan(0.9);
    });

    test('should handle downtime query', async () => {
      console.log('\n🧪 Test 2: Downtime Query');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          message: 'What is my largest downtime cause?',
          sessionId: 'test-session-2'
        }),
        headers: new Map()
      };

      const response = await POST(mockRequest);
      
      console.log('Downtime response:', response.message || response.response);
      
      expect(response._isNextResponse).toBe(true);
      const content = response.message || response.response;
      expect(content).toContain('downtime');
      expect(content).toContain('Maintenance');
    });

    test('should handle empty message', async () => {
      console.log('\n🧪 Test 3: Empty Message');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          message: '',
          sessionId: 'test-session-3'
        }),
        headers: new Map()
      };

      const response = await POST(mockRequest);
      
      console.log('Empty message response:', response);
      
      expect(response._isNextResponse).toBe(true);
      expect(response.message || response.response).toBeDefined();
      expect(response.confidence).toBeLessThan(0.5);
    });

    test('should include sessionId in response', async () => {
      console.log('\n🧪 Test 4: Session ID Handling');
      
      const testSessionId = 'test-session-persistence';
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          message: 'test message',
          sessionId: testSessionId
        }),
        headers: new Map()
      };

      const response = await POST(mockRequest);
      
      console.log('Session ID in response:', response.sessionId);
      
      expect(response.sessionId).toBe(testSessionId);
    });

    test('should handle missing sessionId', async () => {
      console.log('\n🧪 Test 5: Missing Session ID');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          message: 'test without session'
        }),
        headers: new Map()
      };

      const response = await POST(mockRequest);
      
      console.log('Generated session ID:', response.sessionId);
      
      expect(response.sessionId).toBeDefined();
      expect(response.sessionId).toContain('anon-');
    });

    test('should include self-critique data', async () => {
      console.log('\n🧪 Test 6: Self-Critique Data');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          message: 'Show me OEE analysis',
          sessionId: 'test-critique'
        }),
        headers: new Map()
      };

      const response = await POST(mockRequest);
      
      console.log('Self-critique:', response.selfCritique);
      
      expect(response.selfCritique).toBeDefined();
      expect(response.selfCritique.score).toBe(8.5);
    });

    test('should handle request errors', async () => {
      console.log('\n🧪 Test 7: Error Handling');
      
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Map()
      };

      const response = await POST(mockRequest);
      
      console.log('Error response:', response);
      
      expect(response._isNextResponse).toBe(true);
      expect(response.status).toBe(400);
      expect(response.error).toContain('Invalid request');
    });
  });

  describe('Response Format Compatibility', () => {
    test('should include both message and response fields', async () => {
      console.log('\n🧪 Test 8: Backward Compatibility');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          message: 'Show me production data',
          sessionId: 'test-compat'
        }),
        headers: new Map()
      };

      const response = await POST(mockRequest);
      
      console.log('Response fields:', Object.keys(response));
      
      // Should have both for compatibility
      expect(response.message).toBeDefined();
      expect(response.response).toBeDefined();
      expect(response.message).toBe(response.response);
    });

    test('should include all expected fields', async () => {
      console.log('\n🧪 Test 9: Complete Response Structure');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          message: 'Analyze OEE',
          sessionId: 'test-structure'
        }),
        headers: new Map()
      };

      const response = await POST(mockRequest);
      
      console.log('Response structure:', {
        hasSessionId: !!response.sessionId,
        hasMessage: !!response.message,
        hasResponse: !!response.response,
        hasDataSources: !!response.dataSources,
        hasConfidence: response.confidence !== undefined,
        hasSelfCritique: !!response.selfCritique,
        hasSuggestions: !!response.suggestions
      });
      
      // Verify all fields are present
      expect(response).toMatchObject({
        sessionId: expect.any(String),
        message: expect.any(String),
        response: expect.any(String),
        dataSources: expect.any(Array),
        confidence: expect.any(Number),
        selfCritique: expect.objectContaining({
          score: expect.any(Number)
        })
      });
    });
  });
});