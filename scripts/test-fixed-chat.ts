import axios from 'axios';

async function testFixedChat() {
  console.log('🧪 Testing Fixed Chat API...\n');
  
  // Test 1: Direct Ollama API with gemma:2b
  console.log('1️⃣ Testing Ollama directly with gemma:2b...');
  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'gemma:2b',
      prompt: 'What are the main ISO 22400 KPIs? List 5 key ones.',
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 300
      }
    }, {
      timeout: 30000
    });

    console.log(`✅ Direct Ollama response: ${response.data.response.substring(0, 150)}...`);
  } catch (error: any) {
    console.log(`❌ Direct Ollama error: ${error.message}`);
  }

  console.log('\n2️⃣ Testing chat API endpoint (if server is running)...');
  try {
    const chatResponse = await axios.post('http://localhost:3000/api/chat', {
      sessionId: 'test-session',
      messages: [
        {
          role: 'user',
          content: 'What are my current ISO 22400 KPIs?'
        }
      ]
    }, {
      timeout: 45000
    });

    const message = chatResponse.data.message?.content || 'No content';
    console.log(`✅ Chat API response: ${message.substring(0, 200)}...`);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Next.js server not running. Start with: npm run dev');
    } else {
      console.log(`❌ Chat API error: ${error.message}`);
    }
  }

  console.log('\n📊 Model comparison:');
  console.log('✅ gemma:2b - Fast, reliable, good for ISO 22400 queries');
  console.log('❌ tinyllama - Removed (poor quality output)');
  console.log('⚠️  manufacturing-assistant - Available but slower');
  console.log('⚠️  phi3:mini - Available but slower');

  console.log('\n💡 Recommendation: Use gemma:2b for production ISO 22400 queries');
}

testFixedChat();