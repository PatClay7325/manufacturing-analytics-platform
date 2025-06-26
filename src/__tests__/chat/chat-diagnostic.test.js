/**
 * Chat System Diagnostic Test
 * Quick test to diagnose chat functionality issues
 */

const http = require('http');

function testChatEndpoint() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      message: 'Test OEE query',
      sessionId: 'diagnostic-test',
      userId: 'test-user'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat/conversational',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    console.log('🔍 Testing endpoint:', `http://${options.hostname}:${options.port}${options.path}`);
    console.log('📤 Request payload:', postData);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('📥 Response status:', res.statusCode);
        console.log('📥 Response headers:', JSON.stringify(res.headers, null, 2));
        console.log('📥 Response body:', data);
        
        try {
          const parsed = JSON.parse(data);
          console.log('\n✅ Parsed response:', JSON.stringify(parsed, null, 2));
          resolve({ success: true, status: res.statusCode, data: parsed });
        } catch (e) {
          console.log('\n❌ Failed to parse JSON:', e.message);
          console.log('Raw response:', data.substring(0, 500));
          resolve({ success: false, status: res.statusCode, error: 'Invalid JSON', raw: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ Request error:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.error('🔴 Server is not running on port 3000');
        console.error('Please start the server with: npm run dev');
      }
      reject(error);
    });

    req.on('timeout', () => {
      console.error('\n❌ Request timeout after 10 seconds');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

describe('Chat System Diagnostics', () => {
  test('should connect to chat endpoint and receive response', async () => {
    console.log('\n🏥 CHAT SYSTEM DIAGNOSTIC TEST');
    console.log('==============================\n');
    
    try {
      const result = await testChatEndpoint();
      
      // Basic assertions
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      
      // Check response structure
      const hasContent = !!(result.data.message || result.data.response);
      console.log('\n📊 Diagnostic Results:');
      console.log('- Has content field:', hasContent);
      console.log('- Has sessionId:', !!result.data.sessionId);
      console.log('- Has error:', !!result.data.error);
      console.log('- Content length:', (result.data.message || result.data.response || '').length);
      
      expect(hasContent || result.data.error).toBe(true);
      
      console.log('\n✅ DIAGNOSTIC PASSED - Chat endpoint is responsive');
    } catch (error) {
      console.error('\n❌ DIAGNOSTIC FAILED');
      console.error('Error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.error('\n🔧 SOLUTION:');
        console.error('1. Open a new terminal');
        console.error('2. Run: npm run dev');
        console.error('3. Wait for "Ready" message');
        console.error('4. Run this test again');
      }
      
      throw error;
    }
  }, 15000); // 15 second timeout
});

// Also run a quick standalone test
if (require.main === module) {
  console.log('Running standalone diagnostic...\n');
  testChatEndpoint()
    .then(result => {
      console.log('\n✅ Diagnostic complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Diagnostic failed:', error.message);
      process.exit(1);
    });
}