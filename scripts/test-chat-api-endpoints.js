const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const ENDPOINTS = [
  {
    path: '/api/chat/conversational',
    method: 'POST',
    body: {
      message: 'Show me OEE for all equipment today',
      sessionId: 'test-session-' + Date.now(),
      userId: 'test-user'
    },
    expectedStatus: 200,
    expectedFields: ['response', 'dataSources', 'confidence']
  },
  {
    path: '/api/chat/conversational',
    method: 'GET',
    expectedStatus: 200,
    expectedFields: ['sessions']
  },
  {
    path: '/api/chat',
    method: 'POST',
    body: {
      sessionId: 'test-' + Date.now(),
      messages: [
        {
          role: 'user',
          content: 'What is the current equipment status?'
        }
      ]
    },
    expectedStatus: 200,
    expectedFields: ['message']
  }
];

async function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint.path);
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (endpoint.method === 'POST' && endpoint.body) {
      req.write(JSON.stringify(endpoint.body));
    }

    req.end();
  });
}

async function testChatEndpoints() {
  console.log('🌐 Testing Chat API Endpoints...\n');
  
  let passedTests = 0;
  let totalTests = ENDPOINTS.length;
  
  // First check if server is running
  try {
    const healthCheck = await makeRequest({ path: '/', method: 'GET' });
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running at', BASE_URL);
    console.error('Please start the server with: npm run dev');
    process.exit(1);
  }
  
  // Test each endpoint
  for (const endpoint of ENDPOINTS) {
    console.log(`\n📍 Testing: ${endpoint.method} ${endpoint.path}`);
    console.log('=' .repeat(60));
    
    if (endpoint.body) {
      console.log('📤 Request Body:', JSON.stringify(endpoint.body, null, 2));
    }
    
    try {
      const response = await makeRequest(endpoint);
      console.log(`📥 Status: ${response.status}`);
      
      let responseData;
      try {
        responseData = JSON.parse(response.body);
        console.log('📥 Response:', JSON.stringify(responseData, null, 2).substring(0, 500) + '...');
      } catch (e) {
        console.log('📥 Response (non-JSON):', response.body.substring(0, 200) + '...');
      }
      
      // Validate response
      const statusMatch = response.status === endpoint.expectedStatus;
      let fieldsMatch = true;
      
      if (endpoint.expectedFields && responseData) {
        for (const field of endpoint.expectedFields) {
          if (!(field in responseData)) {
            fieldsMatch = false;
            console.log(`❌ Missing expected field: ${field}`);
          }
        }
      }
      
      if (statusMatch && fieldsMatch) {
        console.log('✅ Test PASSED');
        passedTests++;
        
        // Additional validation for chat responses
        if (responseData && responseData.response) {
          console.log('\n📊 Response Analysis:');
          console.log(`   - Response length: ${responseData.response.length} characters`);
          console.log(`   - Data sources: ${responseData.dataSources?.join(', ') || 'None'}`);
          console.log(`   - Confidence: ${responseData.confidence || 'N/A'}/5`);
          
          // Check for mock data indicators
          const hasMockData = responseData.response.toLowerCase().includes('mock') ||
                            responseData.response.toLowerCase().includes('fake') ||
                            responseData.response.toLowerCase().includes('sample');
          
          if (hasMockData) {
            console.log('⚠️  WARNING: Response may contain mock data!');
          } else {
            console.log('✅ Response appears to use real data');
          }
        }
      } else {
        console.log('❌ Test FAILED');
        if (!statusMatch) console.log(`   - Expected status ${endpoint.expectedStatus}, got ${response.status}`);
      }
      
    } catch (error) {
      console.log('❌ Test FAILED with error:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 API Test Results: ${passedTests}/${totalTests} tests passed (${(passedTests/totalTests*100).toFixed(0)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All API tests passed!');
  } else {
    console.log('⚠️  Some API tests failed.');
  }
  
  // Test real-time chat conversation
  console.log('\n\n🔄 Testing Real-Time Conversation Flow...');
  console.log('=' .repeat(60));
  
  const sessionId = 'conversation-test-' + Date.now();
  const conversationFlow = [
    "What's the current OEE for our CNC machines?",
    "Which equipment has the most downtime?",
    "Show me recent maintenance activities",
    "Are there any critical alerts?"
  ];
  
  for (let i = 0; i < conversationFlow.length; i++) {
    console.log(`\n💬 Message ${i + 1}: "${conversationFlow[i]}"`);
    
    try {
      const response = await makeRequest({
        path: '/api/chat/conversational',
        method: 'POST',
        body: {
          message: conversationFlow[i],
          sessionId: sessionId,
          userId: 'test-user'
        }
      });
      
      const data = JSON.parse(response.body);
      console.log(`🤖 Response: ${data.response?.substring(0, 150)}...`);
      console.log(`📊 Confidence: ${data.confidence || 'N/A'}/5`);
    } catch (error) {
      console.log('❌ Conversation test failed:', error.message);
    }
  }
  
  console.log('\n✅ Chat API endpoint testing completed!');
}

// Run tests
testChatEndpoints()
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });