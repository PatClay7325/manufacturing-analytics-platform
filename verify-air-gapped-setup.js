const http = require('http');

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => reject(new Error('Request timeout')));
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testAirGappedSetup() {
  console.log('🔍 Verifying Air-Gapped Chat Setup');
  console.log('==================================\n');
  
  const tests = [
    {
      name: 'Ollama Health Check',
      test: async () => {
        const result = await makeRequest({
          hostname: 'localhost',
          port: 11434,
          path: '/api/tags',
          method: 'GET'
        });
        
        if (result.status === 200) {
          const models = result.data.models || [];
          console.log(`✅ Ollama is running with ${models.length} models`);
          models.forEach(model => console.log(`   - ${model.name}`));
          return true;
        } else {
          console.log(`❌ Ollama health check failed: ${result.status}`);
          return false;
        }
      }
    },
    
    {
      name: 'Next.js Server Check',
      test: async () => {
        const result = await makeRequest({
          hostname: 'localhost',
          port: 3003,
          path: '/',
          method: 'GET'
        });
        
        if (result.status === 200) {
          console.log('✅ Next.js development server is running');
          return true;
        } else {
          console.log(`❌ Next.js server check failed: ${result.status}`);
          return false;
        }
      }
    },
    
    {
      name: 'Chat API Endpoint Check',
      test: async () => {
        const testPayload = JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }]
        });
        
        const result = await makeRequest({
          hostname: 'localhost',
          port: 3003,
          path: '/api/chat/conversational',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(testPayload)
          }
        }, testPayload);
        
        if (result.status === 200 && result.headers['content-type']?.includes('text/event-stream')) {
          console.log('✅ Chat API endpoint is working (streaming)');
          return true;
        } else if (result.status === 200) {
          console.log('✅ Chat API endpoint is working');
          return true;
        } else {
          console.log(`❌ Chat API check failed: ${result.status}`);
          console.log(`   Response: ${JSON.stringify(result.data).substring(0, 200)}...`);
          return false;
        }
      }
    },
    
    {
      name: 'Air-Gapped Chat Page Check',
      test: async () => {
        const result = await makeRequest({
          hostname: 'localhost',
          port: 3003,
          path: '/air-gapped-chat',
          method: 'GET'
        });
        
        if (result.status === 200 && result.data.includes('Air-Gapped Manufacturing Assistant')) {
          console.log('✅ Air-gapped chat page is accessible');
          return true;
        } else {
          console.log(`❌ Air-gapped chat page check failed: ${result.status}`);
          return false;
        }
      }
    },
    
    {
      name: 'Dependencies Check',
      test: async () => {
        try {
          // Check if required modules are available
          require('ollama');
          require('better-sqlite3');
          console.log('✅ Required dependencies are installed');
          return true;
        } catch (error) {
          console.log(`❌ Missing dependencies: ${error.message}`);
          return false;
        }
      }
    }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    console.log(`Testing: ${test.name}...`);
    try {
      const result = await test.test();
      if (result) passedTests++;
    } catch (error) {
      console.log(`❌ ${test.name} failed: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('📊 Test Results Summary');
  console.log('=======================');
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All systems operational! Air-gapped chat is ready to use.');
    console.log('\nNext steps:');
    console.log('1. Navigate to: http://localhost:3003/air-gapped-chat');
    console.log('2. Start chatting with your air-gapped manufacturing assistant');
    console.log('3. No internet connection required!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
    
    if (passedTests >= 3) {
      console.log('\n💡 Core functionality appears to be working.');
      console.log('You can still try accessing: http://localhost:3003/air-gapped-chat');
    }
  }
  
  return passedTests === totalTests;
}

// Run the verification
testAirGappedSetup()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });