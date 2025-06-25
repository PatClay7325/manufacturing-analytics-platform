// Direct test of chat functionality
const fetch = require('node-fetch');

async function testOllama() {
  console.log('Testing Ollama connection...');
  
  try {
    const response = await fetch('http://localhost:11434/api/version');
    const data = await response.json();
    console.log('✅ Ollama is running:', data);
    return true;
  } catch (error) {
    console.error('❌ Ollama error:', error.message);
    return false;
  }
}

async function testOllamaChat() {
  console.log('\nTesting Ollama chat...');
  
  const body = {
    model: 'gemma:2b',
    messages: [
      {
        role: 'user',
        content: 'Say hello in 5 words or less'
      }
    ],
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 50,
    }
  };
  
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      console.error('❌ Ollama chat failed:', response.status, response.statusText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Ollama response:', data.message?.content || data);
    return true;
  } catch (error) {
    console.error('❌ Ollama chat error:', error.message);
    return false;
  }
}

async function testDatabase() {
  console.log('\nTesting database connection...');
  
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public'
      }
    }
  });
  
  try {
    await prisma.$connect();
    const count = await prisma.user.count();
    console.log(`✅ Database connected. Users: ${count}`);
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Database error:', error.message);
    await prisma.$disconnect();
    return false;
  }
}

async function runTests() {
  console.log('🧪 Direct Service Tests\n');
  
  const results = {
    ollama: await testOllama(),
    ollamaChat: await testOllamaChat(),
    database: await testDatabase(),
  };
  
  console.log('\n📊 Summary:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  if (!allPassed) {
    console.log('\n⚠️  Some services are not working properly.');
  } else {
    console.log('\n✨ All services are operational!');
  }
}

runTests().catch(console.error);