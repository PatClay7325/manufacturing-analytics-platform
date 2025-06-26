const http = require('http');

async function testChat() {
  console.log('🧪 Verifying Chat Response Format...\n');
  
  const testMessage = "Show me OEE for all equipment today";
  
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
    message: testMessage,
    sessionId: 'verify-' + Date.now(),
    userId: 'test-user'
  });
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('📥 Status:', res.statusCode);
        console.log('📥 Headers:', JSON.stringify(res.headers, null, 2));
        console.log('\n📥 Raw Response:');
        console.log(responseData);
        
        try {
          const parsed = JSON.parse(responseData);
          console.log('\n✅ Parsed Response:');
          console.log(JSON.stringify(parsed, null, 2));
          
          // Check what fields are present
          console.log('\n🔍 Response Analysis:');
          console.log('- Has message:', !!parsed.message);
          console.log('- Has response:', !!parsed.response);
          console.log('- Has error:', !!parsed.error);
          console.log('- Has context:', !!parsed.context);
          console.log('- Has suggestions:', !!parsed.suggestions);
          console.log('- Has dataSources:', !!parsed.dataSources);
          console.log('- Has confidence:', !!parsed.confidence);
          console.log('- Has selfCritique:', !!parsed.selfCritique);
          
          if (parsed.message || parsed.response) {
            console.log('\n✅ CHAT IS WORKING!');
            console.log('Response content:', (parsed.message || parsed.response).substring(0, 200) + '...');
          } else if (parsed.error) {
            console.log('\n❌ Error response:', parsed.error);
          } else {
            console.log('\n⚠️  Unexpected response format');
          }
          
        } catch (e) {
          console.error('\n❌ Failed to parse JSON:', e.message);
          console.log('Response was:', responseData.substring(0, 500));
        }
        
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.error('❌ Request error:', e.message);
      reject(e);
    });
    
    req.write(data);
    req.end();
  });
}

// Run the test
testChat()
  .then(() => console.log('\n✅ Test completed'))
  .catch((err) => console.error('\n❌ Test failed:', err));