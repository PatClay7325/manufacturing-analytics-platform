const fetch = require('node-fetch');

async function debugChatResponse() {
  console.log('🔍 Debugging Chat Response Format...\n');
  
  const message = "Show me OEE for all equipment today";
  
  try {
    console.log('📤 Sending request to /api/chat/conversational');
    console.log('   Message:', message);
    
    const response = await fetch('http://localhost:3000/api/chat/conversational', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        sessionId: 'debug-session-' + Date.now(),
        userId: 'debug-user'
      })
    });
    
    console.log('\n📥 Response Status:', response.status);
    console.log('📥 Response Headers:', response.headers.raw());
    
    const responseText = await response.text();
    console.log('\n📥 Raw Response:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('\n📊 Parsed Response Structure:');
      console.log(JSON.stringify(responseJson, null, 2));
      
      console.log('\n🔍 Response Analysis:');
      console.log('- Has "message" field:', !!responseJson.message);
      console.log('- Has "response" field:', !!responseJson.response);
      console.log('- Has "content" field:', !!responseJson.content);
      console.log('- Has "error" field:', !!responseJson.error);
      console.log('- Has "context" field:', !!responseJson.context);
      console.log('- Has "suggestions" field:', !!responseJson.suggestions);
      
      if (responseJson.message) {
        console.log('\n✅ Response message:', responseJson.message.substring(0, 100) + '...');
      }
      if (responseJson.response) {
        console.log('\n✅ Response content:', responseJson.response.substring(0, 100) + '...');
      }
      
    } catch (parseError) {
      console.error('\n❌ Failed to parse JSON:', parseError.message);
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
}

// Check if node-fetch is installed
try {
  require.resolve('node-fetch');
  debugChatResponse();
} catch (e) {
  console.log('node-fetch already installed or using native fetch');
  debugChatResponse();
}