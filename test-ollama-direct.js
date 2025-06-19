#!/usr/bin/env node

async function testOllama() {
  console.log('Testing Ollama API...\n');
  
  // Test 1: Check if Ollama is running
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    console.log('✅ Ollama is running');
    console.log('Available models:', data.models?.map(m => m.name).join(', ') || 'None');
  } catch (error) {
    console.log('❌ Cannot connect to Ollama at http://localhost:11434');
    console.log('Error:', error.message);
    return;
  }

  console.log('\n---\n');

  // Test 2: Test chat endpoint
  console.log('Testing chat endpoint...');
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma:2b',
        messages: [
          { role: 'user', content: 'Say hello in one word' }
        ],
        stream: false
      })
    });
    
    if (!response.ok) {
      console.log('❌ Chat endpoint returned error:', response.status);
      const text = await response.text();
      console.log('Response:', text);
    } else {
      const data = await response.json();
      console.log('✅ Chat response:', data.message?.content || 'No content');
    }
  } catch (error) {
    console.log('❌ Chat test failed:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Test streaming
  console.log('Testing streaming...');
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma:2b',
        messages: [
          { role: 'user', content: 'Count to 3' }
        ],
        stream: true
      })
    });
    
    if (!response.ok) {
      console.log('❌ Streaming endpoint returned error:', response.status);
    } else {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      
      console.log('Streaming response:');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              content += data.message.content;
              process.stdout.write(data.message.content);
            }
          } catch (e) {
            // Skip
          }
        }
      }
      console.log('\n✅ Streaming complete. Full response:', content);
    }
  } catch (error) {
    console.log('❌ Streaming test failed:', error.message);
  }
}

testOllama().catch(console.error);