/**
 * Test script to verify Gemma:2b integration with the Manufacturing Chat
 */

import { OllamaProvider } from '../src/core/ai/OllamaProvider';

async function testGemmaChat() {
  console.log('🧪 Testing Gemma:2b Chat Integration\n');

  // Create Ollama provider with Gemma:2b
  const provider = new OllamaProvider({
    baseUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
    defaultModel: 'gemma:2b',
  });

  console.log('📋 Provider Info:');
  console.log(`   Name: ${provider.name}`);
  console.log(`   Description: ${provider.description}`);
  console.log(`   Default Model: gemma:2b\n`);

  try {
    // Check available models
    console.log('🔍 Checking available models...');
    const models = await provider.getAvailableModels();
    const gemmaModel = models.find(m => m.id === 'gemma:2b');
    
    if (!gemmaModel) {
      console.error('❌ Gemma:2b model not found!');
      console.log('   Available models:', models.map(m => m.id).join(', '));
      console.log('\n   Please run: ollama pull gemma:2b');
      process.exit(1);
    }

    console.log('✅ Gemma:2b model found!\n');

    // Test chat completion
    console.log('💬 Testing chat completion...');
    const chatRequest = {
      id: 'test-1',
      type: 'chat' as const,
      modelId: 'gemma:2b',
      messages: [
        {
          role: 'system' as const,
          content: 'You are a helpful manufacturing assistant. Keep responses brief and focused on manufacturing topics.',
        },
        {
          role: 'user' as const,
          content: 'What is OEE in manufacturing?',
        },
      ],
      temperature: 0.7,
      maxTokens: 150,
    };

    const startTime = Date.now();
    const response = await provider.chatCompletion(chatRequest);
    const responseTime = Date.now() - startTime;

    console.log('✅ Chat completion successful!');
    console.log(`   Response time: ${responseTime}ms`);
    console.log(`   Model used: ${response.metadata?.model}`);
    console.log(`   Tokens: ${response.metadata?.usage?.totalTokens || 'N/A'}`);
    console.log('\n📝 Response:');
    console.log('   ', response.data.content);

    // Test manufacturing-specific query
    console.log('\n\n💬 Testing manufacturing-specific query...');
    const mfgRequest = {
      id: 'test-2',
      type: 'chat' as const,
      modelId: 'gemma:2b',
      messages: [
        {
          role: 'user' as const,
          content: 'List 3 key metrics for production line efficiency',
        },
      ],
      temperature: 0.5,
      maxTokens: 200,
    };

    const mfgResponse = await provider.chatCompletion(mfgRequest);
    console.log('✅ Manufacturing query successful!');
    console.log('\n📝 Response:');
    console.log('   ', mfgResponse.data.content);

    console.log('\n\n✨ All tests passed! Gemma:2b is ready for use.');
    console.log('\n📌 Next steps:');
    console.log('   1. Update your .env.local file:');
    console.log('      OLLAMA_DEFAULT_MODEL=gemma:2b');
    console.log('   2. Restart your development server');
    console.log('   3. Test in Manufacturing Chat at http://localhost:3000/manufacturing-chat');

  } catch (error) {
    console.error('\n❌ Error during testing:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure Ollama is running: ollama serve');
    console.log('   2. Pull the Gemma model: ollama pull gemma:2b');
    console.log('   3. Check Ollama is accessible at http://localhost:11434');
    process.exit(1);
  }
}

// Run the test
testGemmaChat().catch(console.error);