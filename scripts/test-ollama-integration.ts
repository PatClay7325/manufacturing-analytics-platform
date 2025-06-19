import axios from 'axios';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

async function testOllamaIntegration() {
  console.log('🧪 Testing Ollama Integration...\n');

  try {
    // 1. Check if Ollama is running
    console.log('1️⃣ Checking Ollama service...');
    const healthResponse = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    console.log('✅ Ollama is running');
    console.log(`   Available models: ${healthResponse.data.models.map((m: any) => m.name).join(', ')}`);

    // 2. Test with gemma:2b (fastest)
    console.log('\n2️⃣ Testing gemma:2b model...');
    const gemmaStart = Date.now();
    const gemmaResponse = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: 'gemma:2b',
      prompt: 'Write a simple Prisma query to get all KPIs',
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 100
      }
    });
    const gemmaTime = Date.now() - gemmaStart;
    console.log('✅ gemma:2b response received');
    console.log(`   Response time: ${gemmaTime}ms`);
    console.log(`   Response preview: ${gemmaResponse.data.response.substring(0, 100)}...`);

    // 3. Test with manufacturing-assistant
    console.log('\n3️⃣ Testing manufacturing-assistant model...');
    const assistantStart = Date.now();
    const assistantResponse = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: 'manufacturing-assistant',
      prompt: 'Generate an efficient Prisma query for retrieving equipment OEE data',
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 200
      }
    });
    const assistantTime = Date.now() - assistantStart;
    console.log('✅ manufacturing-assistant response received');
    console.log(`   Response time: ${assistantTime}ms`);
    console.log(`   Response preview: ${assistantResponse.data.response.substring(0, 100)}...`);

    // 4. Test streaming response
    console.log('\n4️⃣ Testing streaming response...');
    const streamResponse = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: 'gemma:2b',
      prompt: 'List 3 important KPIs for manufacturing',
      stream: true
    }, {
      responseType: 'stream'
    });

    console.log('✅ Streaming response:');
    let fullResponse = '';
    streamResponse.data.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) {
            process.stdout.write(json.response);
            fullResponse += json.response;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    await new Promise(resolve => streamResponse.data.on('end', resolve));
    console.log('\n');

    // 5. Test context window
    console.log('\n5️⃣ Testing context window handling...');
    const longPrompt = `
      Given the following Prisma schema:
      model KPI {
        id String @id @default(cuid())
        name String
        value Float
        unit String
        timestamp DateTime
        workUnitId String
        workUnit WorkUnit @relation(fields: [workUnitId], references: [id])
      }
      
      Write an efficient query to:
      1. Get KPIs from the last 7 days
      2. Group by name
      3. Calculate average, min, and max values
      4. Include pagination
    `;

    const contextResponse = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: 'gemma:2b',
      prompt: longPrompt,
      stream: false,
      options: {
        num_ctx: 4096,
        temperature: 0.3
      }
    });
    console.log('✅ Context window test passed');

    console.log('\n✨ All Ollama integration tests passed!');
    console.log('\n📊 Performance Summary:');
    console.log(`   gemma:2b: ${gemmaTime}ms`);
    console.log(`   manufacturing-assistant: ${assistantTime}ms`);

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testOllamaIntegration();