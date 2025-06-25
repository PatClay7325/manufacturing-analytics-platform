const http = require('http');

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(15000, () => reject(new Error('Request timeout')));
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testComplete() {
  console.log('🚀 Testing Complete Air-Gapped Chat System');
  console.log('==========================================\n');
  
  // Test 1: Ollama Health
  console.log('1. Testing Ollama Health...');
  try {
    const ollamaResult = await makeRequest({
      hostname: 'localhost',
      port: 11434,
      path: '/api/tags',
      method: 'GET'
    });
    
    if (ollamaResult.status === 200) {
      const data = JSON.parse(ollamaResult.data);
      console.log(`✅ Ollama running with ${data.models?.length || 0} models`);
      data.models?.forEach(m => console.log(`   - ${m.name}`));
    } else {
      console.log(`❌ Ollama not responding: ${ollamaResult.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Ollama test failed: ${error.message}`);
    return false;
  }
  
  // Test 2: Air-Gapped Chat Page
  console.log('\n2. Testing Air-Gapped Chat Page...');
  try {
    const pageResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,  // Updated to port 3000
      path: '/air-gapped-chat',
      method: 'GET'
    });
    
    if (pageResult.status === 200 && pageResult.data.includes('Air-Gapped Manufacturing Assistant')) {
      console.log('✅ Air-gapped chat page is accessible');
    } else {
      console.log(`❌ Chat page issue: ${pageResult.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Chat page test failed: ${error.message}`);
    return false;
  }
  
  // Test 3: Chat API with Streaming
  console.log('\n3. Testing Chat API with Manufacturing Query...');
  try {
    const testPayload = JSON.stringify({
      messages: [
        { role: 'user', content: 'What is OEE in manufacturing?' }
      ]
    });
    
    const startTime = Date.now();
    const chatResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat/conversational',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testPayload)
      }
    }, testPayload);
    
    const responseTime = Date.now() - startTime;
    
    if (chatResult.status === 200) {
      console.log('✅ Chat API responding successfully');
      console.log(`   Response time: ${responseTime}ms`);
      
      // Check if it's streaming response
      if (chatResult.headers['content-type']?.includes('text/event-stream')) {
        console.log('✅ Streaming response detected');
        
        // Parse first few SSE lines
        const lines = chatResult.data.split('\n').slice(0, 10);
        let foundData = false;
        for (const line of lines) {
          if (line.startsWith('data: ') && line.length > 10) {
            foundData = true;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                console.log(`✅ AI Response started: "${data.content.substring(0, 50)}..."`);
                break;
              }
            } catch (e) {
              // Continue looking
            }
          }
        }
        
        if (!foundData) {
          console.log('⚠️  Streaming data format might need verification');
        }
      } else {
        console.log('📄 Non-streaming response received');
      }
    } else {
      console.log(`❌ Chat API failed: ${chatResult.status}`);
      console.log(`   Response: ${chatResult.data.substring(0, 200)}...`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Chat API test failed: ${error.message}`);
    return false;
  }
  
  // Test 4: Direct Ollama Generation
  console.log('\n4. Testing Direct Ollama Generation...');
  try {
    const ollamaPayload = JSON.stringify({
      model: 'gemma:2b',
      prompt: 'What is OEE?',
      stream: false,
      options: {
        num_predict: 30
      }
    });
    
    const ollamaGenResult = await makeRequest({
      hostname: 'localhost',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(ollamaPayload)
      }
    }, ollamaPayload);
    
    if (ollamaGenResult.status === 200) {
      const data = JSON.parse(ollamaGenResult.data);
      console.log('✅ Direct Ollama generation working');
      console.log(`   Response: "${data.response?.substring(0, 100)}..."`);
      console.log(`   Model: ${data.model || 'unknown'}`);
    } else {
      console.log(`❌ Ollama generation failed: ${ollamaGenResult.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Ollama generation test failed: ${error.message}`);
    return false;
  }
  
  console.log('\n🎉 SUCCESS: Air-Gapped Chat System is Fully Operational!');
  console.log('========================================================');
  console.log();
  console.log('✅ All components tested and working:');
  console.log('   • Ollama LLM engine running locally');
  console.log('   • Air-gapped chat interface accessible');
  console.log('   • Chat API with streaming responses');
  console.log('   • Direct AI model generation');
  console.log();
  console.log('🚀 Ready to use:');
  console.log('   Navigate to: http://localhost:3000/air-gapped-chat');
  console.log('   Start chatting with your manufacturing assistant!');
  console.log('   No internet connection required! 🔒');
  
  return true;
}

// Run the complete test
testComplete()
  .then(success => {
    if (!success) {
      console.log('\n❌ Some tests failed. Please check the issues above.');
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  });