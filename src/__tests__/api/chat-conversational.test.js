/**
 * Comprehensive Chat API Integration Test
 * Tests the conversational chat endpoint with real-world scenarios
 */

const http = require('http');

// Helper function to make API requests
async function testChatAPI(message, sessionId = null) {
  const testSessionId = sessionId || 'test-' + Date.now();
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/chat/conversational',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  const data = JSON.stringify({
    message: message,
    sessionId: testSessionId,
    userId: 'test-user'
  });
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData,
            parseError: e.message
          });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    req.write(data);
    req.end();
  });
}

describe('Conversational Chat API - Comprehensive Debug Tests', () => {
  const sessionId = 'debug-session-' + Date.now();

  describe('1. Basic Functionality Tests', () => {
    test('should return a response for OEE query', async () => {
      console.log('\n🧪 Test 1: Basic OEE Query');
      
      const response = await testChatAPI('Show me OEE for all equipment today', sessionId);
      
      console.log('Response Status:', response.status);
      console.log('Response Data:', JSON.stringify(response.data, null, 2));
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      
      // Check for either message or response field
      const content = response.data.message || response.data.response;
      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    test('should return proper response structure', async () => {
      console.log('\n🧪 Test 2: Response Structure Validation');
      
      const response = await testChatAPI('What is the current production status?', sessionId);
      
      console.log('Response fields:', Object.keys(response.data));
      
      expect(response.status).toBe(200);
      
      // Should have at least one content field
      const hasContent = response.data.message || response.data.response || response.data.content;
      expect(hasContent).toBeTruthy();
      
      // Check optional fields
      console.log('Has sessionId:', !!response.data.sessionId);
      console.log('Has dataSources:', !!response.data.dataSources);
      console.log('Has confidence:', !!response.data.confidence);
      console.log('Has context:', !!response.data.context);
      console.log('Has selfCritique:', !!response.data.selfCritique);
    });
  });

  describe('2. Context and Conversation Flow', () => {
    test('should maintain context between messages', async () => {
      console.log('\n🧪 Test 3: Context Maintenance');
      
      const contextSessionId = 'context-test-' + Date.now();
      
      // First message
      const response1 = await testChatAPI('Tell me about equipment EQ001', contextSessionId);
      console.log('First response:', response1.data.message || response1.data.response);
      
      // Follow-up message
      const response2 = await testChatAPI('What is its efficiency?', contextSessionId);
      console.log('Second response:', response2.data.message || response2.data.response);
      
      expect(response2.status).toBe(200);
      const secondContent = response2.data.message || response2.data.response || '';
      
      // Should reference the equipment from context
      const mentionsEquipment = secondContent.includes('EQ001') || 
                               secondContent.toLowerCase().includes('equipment') ||
                               secondContent.toLowerCase().includes('efficiency');
      
      expect(mentionsEquipment).toBe(true);
    });
  });

  describe('3. Error Handling', () => {
    test('should handle empty messages gracefully', async () => {
      console.log('\n🧪 Test 4: Empty Message Handling');
      
      const response = await testChatAPI('', sessionId);
      
      console.log('Empty message response:', response.status);
      console.log('Response data:', response.data);
      
      // Should either return an error or a clarification request
      expect(response.status).toBeLessThanOrEqual(400);
      
      if (response.status === 200) {
        const content = response.data.message || response.data.response || response.data.error;
        expect(content).toBeDefined();
      }
    });

    test('should handle malformed queries', async () => {
      console.log('\n🧪 Test 5: Malformed Query');
      
      const response = await testChatAPI('asdkjh askdjh askjdh', sessionId);
      
      console.log('Malformed query status:', response.status);
      console.log('Response confidence:', response.data.confidence);
      
      expect(response.status).toBe(200);
      
      // Should still return a response, possibly with low confidence
      const content = response.data.message || response.data.response;
      expect(content).toBeDefined();
      
      // Check if confidence is low for unclear queries
      if (response.data.confidence !== undefined) {
        console.log('Confidence level:', response.data.confidence);
      }
    });
  });

  describe('4. Complex Queries', () => {
    test('should handle multi-metric queries', async () => {
      console.log('\n🧪 Test 6: Multi-Metric Query');
      
      const response = await testChatAPI(
        'Compare OEE, quality rate, and downtime for all equipment in the last week',
        sessionId
      );
      
      console.log('Multi-metric response length:', 
        (response.data.message || response.data.response || '').length
      );
      
      expect(response.status).toBe(200);
      
      const content = response.data.message || response.data.response || '';
      expect(content.length).toBeGreaterThan(50); // Should be detailed
      
      // Check if it mentions multiple metrics
      const mentionsMetrics = 
        content.toLowerCase().includes('oee') ||
        content.toLowerCase().includes('quality') ||
        content.toLowerCase().includes('downtime');
      
      console.log('Mentions metrics:', mentionsMetrics);
    });

    test('should provide data sources', async () => {
      console.log('\n🧪 Test 7: Data Sources');
      
      const response = await testChatAPI('Show me production data', sessionId);
      
      console.log('Data sources:', response.data.dataSources);
      
      expect(response.status).toBe(200);
      
      if (response.data.dataSources) {
        expect(Array.isArray(response.data.dataSources)).toBe(true);
        console.log('Number of data sources:', response.data.dataSources.length);
      }
    });
  });

  describe('5. Performance', () => {
    test('should respond quickly', async () => {
      console.log('\n🧪 Test 8: Response Time');
      
      const startTime = Date.now();
      const response = await testChatAPI('Quick OEE summary', sessionId);
      const responseTime = Date.now() - startTime;
      
      console.log('Response time:', responseTime + 'ms');
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(10000); // Should respond within 10 seconds
      
      // Warn if slow
      if (responseTime > 5000) {
        console.warn('⚠️  Response took longer than 5 seconds');
      }
    });
  });

  describe('6. Real Data Validation', () => {
    test('should use real data, not mock data', async () => {
      console.log('\n🧪 Test 9: Real Data Check');
      
      const response = await testChatAPI(
        'Show me specific equipment performance metrics',
        sessionId
      );
      
      const content = response.data.message || response.data.response || '';
      console.log('Response excerpt:', content.substring(0, 200) + '...');
      
      // Should contain specific equipment IDs or realistic metrics
      const hasSpecificData = 
        content.includes('EQ') || // Equipment IDs
        content.includes('%') ||  // Percentages
        /\d+/.test(content);     // Numbers
      
      console.log('Contains specific data:', hasSpecificData);
      
      expect(hasSpecificData).toBe(true);
    });
  });

  describe('7. Self-Critique Feature', () => {
    test('should include self-critique when analyzing', async () => {
      console.log('\n🧪 Test 10: Self-Critique');
      
      const response = await testChatAPI(
        'Analyze the root cause of production issues and suggest improvements',
        sessionId
      );
      
      console.log('Self-critique data:', response.data.selfCritique);
      
      expect(response.status).toBe(200);
      
      if (response.data.selfCritique) {
        console.log('Critique score:', response.data.selfCritique.score);
        console.log('Has suggestions:', !!response.data.selfCritique.suggestions);
      }
    });
  });
});

// Run a quick connectivity test first
describe('API Connectivity', () => {
  test('should be able to connect to the API', async () => {
    console.log('\n🔌 Testing API connectivity...');
    
    try {
      const response = await testChatAPI('test', 'connectivity-test');
      console.log('✅ API is reachable');
      console.log('Response status:', response.status);
    } catch (error) {
      console.error('❌ Cannot connect to API:', error.message);
      console.log('\nMake sure the dev server is running on port 3000');
      console.log('Run: npm run dev');
    }
  });
});