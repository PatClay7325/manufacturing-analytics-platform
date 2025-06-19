import axios from 'axios';

async function testISOChat() {
  console.log('🧪 Testing ISO 22400 Chat Functionality...\n');
  
  const testQueries = [
    "What are my current ISO 22400 KPIs?",
    "What's the current OEE for production line 3?",
    "Show me the availability rate calculation",
  ];

  // Test each query with the manufacturing-assistant model directly
  for (const query of testQueries) {
    console.log(`📝 Testing: "${query}"`);
    
    try {
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'manufacturing-assistant',
        prompt: `You are a manufacturing expert. Answer this question about ISO 22400 KPIs: ${query}`,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 300,
          top_k: 40,
          top_p: 0.9
        }
      }, {
        timeout: 45000
      });

      const answer = response.data.response;
      console.log(`✅ Response: ${answer.substring(0, 200)}...`);
      console.log('');
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
      console.log('');
    }
  }

  // Test with gemma:2b as fallback
  console.log('🔄 Testing with gemma:2b as fallback...\n');
  
  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'gemma:2b',
      prompt: 'List the main ISO 22400 KPIs for manufacturing',
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 200
      }
    }, {
      timeout: 30000
    });

    console.log(`✅ Gemma response: ${response.data.response.substring(0, 200)}...`);
  } catch (error: any) {
    console.log(`❌ Gemma error: ${error.message}`);
  }
}

testISOChat();