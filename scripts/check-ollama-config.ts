#!/usr/bin/env ts-node

console.log('🔍 Checking Ollama configuration...\n');

console.log('Environment variables:');
console.log('OLLAMA_MODEL:', process.env.OLLAMA_MODEL);
console.log('OLLAMA_API_URL:', process.env.OLLAMA_API_URL);
console.log('OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL);

console.log('\nDefault model in agent:');
const defaultModel = process.env.OLLAMA_MODEL || 'gemma:2b';
console.log('Model that will be used:', defaultModel);

// Test if we can call Ollama with tinyllama
console.log('\n🧪 Testing tinyllama model...');
fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'tinyllama',
    prompt: 'Say hello',
    stream: false,
    options: { num_predict: 10 }
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Tinyllama response:', data.response);
})
.catch(err => {
  console.error('❌ Tinyllama error:', err);
});

// Test if we can call Ollama with gemma:2b
console.log('\n🧪 Testing gemma:2b model...');
fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gemma:2b',
    prompt: 'Say hello',
    stream: false,
    options: { num_predict: 10 }
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Gemma:2b response:', data.response || 'No response');
})
.catch(err => {
  console.error('❌ Gemma:2b error:', err);
});