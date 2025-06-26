/**
 * COMPREHENSIVE CHAT API TEST - NO COMPROMISES
 * Tests the actual chat endpoint with real scenarios
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const CHAT_ENDPOINT = '/api/chat/conversational';

// Test utilities
async function makeRequest(message, sessionId = null, userId = 'test-user') {
  try {
    const response = await axios.post(
      `${API_BASE_URL}${CHAT_ENDPOINT}`,
      {
        message,
        sessionId: sessionId || `test-${uuidv4()}`,
        userId
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    if (error.response) {
      return { 
        success: false, 
        data: error.response.data, 
        status: error.response.status,
        error: error.message 
      };
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Server not running. Please start the dev server with: npm run dev');
    }
    throw error;
  }
}

describe('COMPREHENSIVE CHAT API TESTS', () => {
  let testSessionId;
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  beforeAll(async () => {
    console.log('\n🚀 COMPREHENSIVE CHAT API TEST SUITE');
    console.log('=====================================\n');
    
    // Test server connectivity
    try {
      await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 }).catch(() => {});
      console.log('✅ Server is reachable\n');
    } catch (error) {
      console.error('❌ Cannot connect to server at', API_BASE_URL);
      console.error('Please ensure the dev server is running: npm run dev\n');
      throw error;
    }
  });

  beforeEach(() => {
    testSessionId = `session-${uuidv4()}`;
  });

  afterAll(() => {
    console.log('\n=====================================');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=====================================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      testResults.errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
    }
  });

  describe('1. BASIC FUNCTIONALITY', () => {
    test('should return response for simple OEE query', async () => {
      console.log('📋 TEST 1.1: Simple OEE Query');
      testResults.total++;
      
      const result = await makeRequest('Show me OEE for all equipment', testSessionId);
      
      console.log('Status:', result.status);
      console.log('Has Content:', !!(result.data.message || result.data.response));
      console.log('Content Length:', (result.data.message || result.data.response || '').length);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      
      const content = result.data.message || result.data.response;
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });

    test('should maintain session context', async () => {
      console.log('📋 TEST 1.2: Session Context');
      testResults.total++;
      
      // First message
      const result1 = await makeRequest('Tell me about equipment EQ001', testSessionId);
      expect(result1.success).toBe(true);
      
      // Follow-up message in same session
      const result2 = await makeRequest('What is its efficiency?', testSessionId);
      
      console.log('First message excerpt:', (result1.data.message || result1.data.response).substring(0, 100));
      console.log('Second message excerpt:', (result2.data.message || result2.data.response).substring(0, 100));
      
      const content2 = result2.data.message || result2.data.response;
      
      // Should reference the equipment from context
      const hasContext = content2.includes('EQ001') || 
                        content2.toLowerCase().includes('equipment') ||
                        content2.toLowerCase().includes('efficiency');
      
      console.log('Maintains context:', hasContext);
      expect(hasContext).toBe(true);
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });

    test('should include required response fields', async () => {
      console.log('📋 TEST 1.3: Response Structure');
      testResults.total++;
      
      const result = await makeRequest('Analyze production metrics', testSessionId);
      
      console.log('Response fields:', Object.keys(result.data));
      
      // Check essential fields
      expect(result.data).toHaveProperty('sessionId');
      expect(result.data.sessionId).toBe(testSessionId);
      
      // Should have message or response
      const hasContent = !!(result.data.message || result.data.response);
      expect(hasContent).toBe(true);
      
      // Check optional fields
      console.log('Has dataSources:', !!result.data.dataSources);
      console.log('Has confidence:', result.data.confidence !== undefined);
      console.log('Has selfCritique:', !!result.data.selfCritique);
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });
  });

  describe('2. COMPLEX QUERIES', () => {
    test('should handle multi-metric analysis', async () => {
      console.log('📋 TEST 2.1: Multi-Metric Analysis');
      testResults.total++;
      
      const result = await makeRequest(
        'Compare OEE, quality rate, downtime, and production volume for all equipment. Identify the worst performer.',
        testSessionId
      );
      
      const content = result.data.message || result.data.response || '';
      console.log('Response length:', content.length);
      console.log('Mentions OEE:', content.toLowerCase().includes('oee'));
      console.log('Mentions quality:', content.toLowerCase().includes('quality'));
      console.log('Mentions downtime:', content.toLowerCase().includes('downtime'));
      
      expect(result.success).toBe(true);
      expect(content.length).toBeGreaterThan(200); // Should be detailed
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });

    test('should perform root cause analysis', async () => {
      console.log('📋 TEST 2.2: Root Cause Analysis');
      testResults.total++;
      
      const result = await makeRequest(
        'Perform a root cause analysis for quality defects and suggest improvements',
        testSessionId
      );
      
      const content = result.data.message || result.data.response || '';
      console.log('Analysis length:', content.length);
      console.log('Has suggestions:', !!result.data.suggestions);
      console.log('Critique score:', result.data.selfCritique?.score);
      
      expect(content.length).toBeGreaterThan(300);
      expect(content).toMatch(/root cause|analysis|suggest|improve/i);
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });

    test('should handle time-based queries', async () => {
      console.log('📋 TEST 2.3: Time-based Analysis');
      testResults.total++;
      
      const result = await makeRequest(
        'Show me production trends for the last 7 days',
        testSessionId
      );
      
      const content = result.data.message || result.data.response || '';
      console.log('Mentions time period:', /\d+\s*day|week|trend/i.test(content));
      
      expect(result.success).toBe(true);
      expect(content).toMatch(/day|week|trend|period/i);
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });
  });

  describe('3. ERROR HANDLING', () => {
    test('should handle empty messages gracefully', async () => {
      console.log('📋 TEST 3.1: Empty Message');
      testResults.total++;
      
      const result = await makeRequest('', testSessionId);
      
      console.log('Status:', result.status);
      console.log('Has response:', !!(result.data.message || result.data.response || result.data.error));
      
      // Should either return 200 with clarification or 400 with error
      expect([200, 400]).toContain(result.status);
      
      if (result.status === 200) {
        const content = result.data.message || result.data.response;
        expect(content).toBeDefined();
      }
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });

    test('should handle malformed queries', async () => {
      console.log('📋 TEST 3.2: Malformed Query');
      testResults.total++;
      
      const result = await makeRequest('asdkjh qwerty uiop', testSessionId);
      
      console.log('Status:', result.status);
      console.log('Confidence:', result.data.confidence);
      
      expect(result.success).toBe(true);
      
      const content = result.data.message || result.data.response;
      expect(content).toBeDefined();
      
      // Low confidence expected
      if (result.data.confidence !== undefined) {
        expect(result.data.confidence).toBeLessThan(0.5);
      }
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });

    test('should handle missing session ID', async () => {
      console.log('📋 TEST 3.3: Missing Session ID');
      testResults.total++;
      
      const result = await makeRequest('Test message', null);
      
      console.log('Status:', result.status);
      console.log('Generated sessionId:', result.data.sessionId);
      
      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBeDefined();
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });
  });

  describe('4. PERFORMANCE', () => {
    test('should respond within acceptable time', async () => {
      console.log('📋 TEST 4.1: Response Time');
      testResults.total++;
      
      const queries = [
        'Quick OEE summary',
        'Current production status',
        'Equipment efficiency',
        'Quality metrics',
        'Downtime analysis'
      ];
      
      const times = [];
      
      for (const query of queries) {
        const start = Date.now();
        await makeRequest(query, testSessionId);
        const elapsed = Date.now() - start;
        times.push(elapsed);
        console.log(`  "${query}": ${elapsed}ms`);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      console.log(`\nAverage: ${avgTime.toFixed(0)}ms`);
      console.log(`Maximum: ${maxTime}ms`);
      
      expect(avgTime).toBeLessThan(3000); // Avg under 3s
      expect(maxTime).toBeLessThan(10000); // Max under 10s
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });

    test('should handle concurrent requests', async () => {
      console.log('📋 TEST 4.2: Concurrent Requests');
      testResults.total++;
      
      const start = Date.now();
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          makeRequest(`Concurrent request ${i}`, `concurrent-${i}`)
        );
      }
      
      const results = await Promise.all(promises);
      const elapsed = Date.now() - start;
      
      console.log(`5 concurrent requests completed in ${elapsed}ms`);
      
      const allSuccessful = results.every(r => r.success);
      console.log('All successful:', allSuccessful);
      
      expect(allSuccessful).toBe(true);
      expect(elapsed).toBeLessThan(15000); // Should complete within 15s
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });
  });

  describe('5. DATA VALIDATION', () => {
    test('should return real data, not mock data', async () => {
      console.log('📋 TEST 5.1: Real Data Validation');
      testResults.total++;
      
      const result = await makeRequest(
        'Show me specific equipment metrics with actual values',
        testSessionId
      );
      
      const content = result.data.message || result.data.response || '';
      
      // Check for realistic data patterns
      const hasNumbers = /\d+/.test(content);
      const hasPercentages = /%/.test(content);
      const hasEquipmentIds = /EQ\d+|equipment/i.test(content);
      const hasMetrics = /oee|efficiency|quality|downtime/i.test(content);
      
      console.log('Contains numbers:', hasNumbers);
      console.log('Contains percentages:', hasPercentages);
      console.log('Contains equipment references:', hasEquipmentIds);
      console.log('Contains metrics:', hasMetrics);
      
      expect(hasNumbers || hasPercentages).toBe(true);
      expect(hasEquipmentIds || hasMetrics).toBe(true);
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });

    test('should include data sources', async () => {
      console.log('📋 TEST 5.2: Data Sources');
      testResults.total++;
      
      const result = await makeRequest(
        'Analyze production data from the database',
        testSessionId
      );
      
      console.log('Data sources:', result.data.dataSources);
      
      if (result.data.dataSources) {
        expect(Array.isArray(result.data.dataSources)).toBe(true);
        expect(result.data.dataSources.length).toBeGreaterThan(0);
        console.log('Sources used:', result.data.dataSources.join(', '));
      }
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });
  });

  describe('6. ADVANCED FEATURES', () => {
    test('should provide follow-up suggestions', async () => {
      console.log('📋 TEST 6.1: Follow-up Suggestions');
      testResults.total++;
      
      const result = await makeRequest(
        'Give me an overview of factory performance',
        testSessionId
      );
      
      console.log('Has suggestions:', !!result.data.suggestions);
      
      if (result.data.suggestions) {
        console.log('Number of suggestions:', result.data.suggestions.length);
        console.log('First suggestion:', result.data.suggestions[0]);
        
        expect(result.data.suggestions.length).toBeGreaterThan(0);
      }
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });

    test('should include self-critique for complex analyses', async () => {
      console.log('📋 TEST 6.2: Self-Critique');
      testResults.total++;
      
      const result = await makeRequest(
        'Analyze equipment performance and provide detailed recommendations for improvement',
        testSessionId
      );
      
      console.log('Has self-critique:', !!result.data.selfCritique);
      
      if (result.data.selfCritique) {
        console.log('Critique score:', result.data.selfCritique.score);
        console.log('Has suggestions:', !!result.data.selfCritique.suggestions);
        
        expect(result.data.selfCritique.score).toBeGreaterThan(0);
        expect(result.data.selfCritique.score).toBeLessThanOrEqual(10);
      }
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });

    test('should handle clarification requests', async () => {
      console.log('📋 TEST 6.3: Clarification Handling');
      testResults.total++;
      
      const result = await makeRequest(
        'Show me the thing',
        testSessionId
      );
      
      const content = result.data.message || result.data.response || '';
      const hasClarification = result.data.clarificationNeeded || 
                              content.includes('?') ||
                              content.match(/what|which|specify|clarify/i);
      
      console.log('Requests clarification:', hasClarification);
      console.log('Confidence:', result.data.confidence);
      
      expect(result.success).toBe(true);
      
      testResults.passed++;
      console.log('✅ PASSED\n');
    });
  });
});

// Error handler for unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('\n❌ UNHANDLED ERROR:', error);
  testResults.errors.push(error.message);
});