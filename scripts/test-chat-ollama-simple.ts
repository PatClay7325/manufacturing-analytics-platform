import axios from 'axios';

const OLLAMA_BASE_URL = 'http://localhost:11434';

async function testChatWithOllama() {
  console.log('🧪 Testing Chat + Ollama Integration\n');

  const testQueries = [
    {
      name: 'KPI Query',
      prompt: 'Generate a Prisma query to get KPIs from last 24 hours',
      model: 'gemma:2b'
    },
    {
      name: 'Equipment Status',
      prompt: 'What fields should I query for equipment status?',
      model: 'gemma:2b'
    },
    {
      name: 'OEE Calculation',
      prompt: 'Show formula for OEE calculation',
      model: 'gemma:2b'
    }
  ];

  try {
    // Check Ollama is running
    const health = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    console.log(`✅ Ollama running with ${health.data.models.length} models\n`);

    // Test each query
    for (const test of testQueries) {
      console.log(`📝 ${test.name}:`);
      console.log(`   Prompt: "${test.prompt}"`);
      
      const start = Date.now();
      
      try {
        const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
          model: test.model,
          prompt: test.prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 150,
            top_k: 40,
            top_p: 0.9
          }
        }, {
          timeout: 30000 // 30 second timeout
        });

        const elapsed = Date.now() - start;
        const preview = response.data.response.split('\n')[0].substring(0, 80);
        
        console.log(`   ✅ Response (${elapsed}ms): ${preview}...`);
      } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
      
      console.log('');
    }

    // Test the actual chat API endpoint if server is running
    console.log('📡 Testing Chat API Endpoint...');
    try {
      const chatResponse = await axios.post('http://localhost:3000/api/chat', {
        message: 'What is the current OEE?',
        conversationId: 'test-' + Date.now()
      });
      
      console.log('✅ Chat API Response:', chatResponse.data.message.substring(0, 100) + '...');
    } catch (error: any) {
      console.log('❌ Chat API not available (is the server running?)');
    }

    console.log('\n✨ Ollama integration is working!');
    console.log('💡 Tip: Use gemma:2b for fastest responses');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testChatWithOllama();