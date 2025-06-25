const http = require('http');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
        });
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testHealthCheck() {
  log('\n=== Testing Health Check Endpoint ===', colors.cyan);
  
  try {
    const response = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/health-check',
      method: 'GET',
    });
    
    log(`Status: ${response.statusCode}`, response.statusCode === 200 ? colors.green : colors.red);
    
    if (response.body) {
      const data = JSON.parse(response.body);
      log('Response:', colors.blue);
      console.log(JSON.stringify(data, null, 2));
    }
    
    return response.statusCode === 200;
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    return false;
  }
}

async function testChatEndpoint() {
  log('\n=== Testing Chat Endpoint with Auth ===', colors.cyan);
  
  const data = {
    messages: [
      {
        role: 'user',
        content: 'What is the current status of Work Center WC-001?'
      }
    ],
    stream: false
  };
  
  try {
    const response = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-token',
        'Cookie': 'auth-token=dev-token',
      },
    }, data);
    
    log(`Status: ${response.statusCode}`, response.statusCode === 200 ? colors.green : colors.red);
    
    if (response.body) {
      try {
        const responseData = JSON.parse(response.body);
        log('Response:', colors.blue);
        console.log(JSON.stringify(responseData, null, 2));
      } catch (e) {
        log('Raw response:', colors.yellow);
        console.log(response.body);
      }
    }
    
    return response.statusCode === 200;
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    return false;
  }
}

async function testChatWithoutAuth() {
  log('\n=== Testing Chat Endpoint WITHOUT Auth (Should Fail) ===', colors.cyan);
  
  const data = {
    messages: [
      {
        role: 'user',
        content: 'This should fail'
      }
    ],
    stream: false
  };
  
  try {
    const response = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, data);
    
    const expectedStatus = 401;
    const success = response.statusCode === expectedStatus;
    
    log(`Status: ${response.statusCode} (Expected: ${expectedStatus})`, 
        success ? colors.green : colors.red);
    
    if (response.body) {
      try {
        const responseData = JSON.parse(response.body);
        log('Response:', colors.blue);
        console.log(JSON.stringify(responseData, null, 2));
      } catch (e) {
        log('Raw response:', colors.yellow);
        console.log(response.body);
      }
    }
    
    return success;
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    return false;
  }
}

async function testStreamingChat() {
  log('\n=== Testing Streaming Chat Endpoint ===', colors.cyan);
  
  const data = {
    messages: [
      {
        role: 'user',
        content: 'List three key manufacturing metrics'
      }
    ],
    stream: true
  };
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/chat/stream',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-token',
        'Cookie': 'auth-token=dev-token',
        'Accept': 'text/event-stream',
      },
    }, (res) => {
      log(`Status: ${res.statusCode}`, res.statusCode === 200 ? colors.green : colors.red);
      log('Streaming response:', colors.blue);
      
      let chunks = 0;
      
      res.on('data', (chunk) => {
        chunks++;
        process.stdout.write(chunk.toString());
      });
      
      res.on('end', () => {
        log(`\nStream ended. Received ${chunks} chunks`, colors.green);
        resolve(res.statusCode === 200);
      });
    });
    
    req.on('error', (error) => {
      log(`Error: ${error.message}`, colors.red);
      resolve(false);
    });
    
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function runAllTests() {
  log('🧪 Manufacturing Analytics Platform - Chat API Tests', colors.yellow);
  log('=' . repeat(50), colors.yellow);
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Chat with Auth', fn: testChatEndpoint },
    { name: 'Chat without Auth', fn: testChatWithoutAuth },
    { name: 'Streaming Chat', fn: testStreamingChat },
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const success = await test.fn();
      results.push({ name: test.name, success });
    } catch (error) {
      log(`Test "${test.name}" failed with error: ${error.message}`, colors.red);
      results.push({ name: test.name, success: false });
    }
  }
  
  // Summary
  log('\n=== Test Summary ===', colors.cyan);
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? colors.green : colors.red;
    log(`${icon} ${result.name}`, color);
  });
  
  log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`, 
      failed === 0 ? colors.green : colors.red);
  
  if (failed > 0) {
    log('\n⚠️  Some tests failed. Please check the server is running and configured correctly.', colors.yellow);
  } else {
    log('\n✨ All tests passed!', colors.green);
  }
}

// Check if server is running first
const checkReq = http.get('http://127.0.0.1:3000', (res) => {
  log('✅ Server is running on port 3000', colors.green);
  runAllTests();
}).on('error', (err) => {
  log('❌ Server is not running on port 3000', colors.red);
  log('Please start the server with: npm run dev', colors.yellow);
  process.exit(1);
});