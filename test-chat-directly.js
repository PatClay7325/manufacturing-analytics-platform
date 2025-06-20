// Direct test of the chat functionality
const testChat = async () => {
  console.log('Testing AI Chat functionality...\n');

  // Test 1: Check Ollama
  try {
    const ollamaResponse = await fetch('http://127.0.0.1:11434/api/tags');
    const ollamaData = await ollamaResponse.json();
    console.log('✅ Ollama Status: Connected');
    console.log('   Models:', ollamaData.models.map(m => m.name).join(', '));
  } catch (error) {
    console.log('❌ Ollama Status: Not connected');
    console.log('   Error:', error.message);
  }

  // Test 2: Direct Ollama chat
  console.log('\nTesting direct Ollama chat...');
  try {
    const chatResponse = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma:2b',
        prompt: 'Say hello in one sentence',
        stream: false
      })
    });
    const chatData = await chatResponse.json();
    console.log('✅ Direct Ollama Response:', chatData.response);
  } catch (error) {
    console.log('❌ Direct Ollama Error:', error.message);
  }

  // Test 3: Check Next.js API
  console.log('\nTesting Next.js Chat API...');
  try {
    const apiResponse = await fetch('http://localhost:3000/api/chat/test');
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      console.log('✅ Next.js API Status:', apiData.ollama.status);
    } else {
      console.log('❌ Next.js API Error: Status', apiResponse.status);
    }
  } catch (error) {
    console.log('❌ Next.js API Error:', error.message);
    console.log('   Make sure dev server is running: npm run dev');
  }

  console.log('\n--- Troubleshooting Steps ---');
  console.log('1. If Ollama works but chat doesn\'t:');
  console.log('   - Restart dev server: Ctrl+C then npm run dev');
  console.log('   - Clear browser cache and refresh');
  console.log('2. Check browser console for errors');
  console.log('3. Try the fallback endpoint: /api/chat/stream-with-fallback');
};

testChat();