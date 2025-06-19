#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testChatAPI() {
  console.log('🧪 Testing Manufacturing Chat API...\n');

  try {
    // First, ensure we have some test data
    console.log('📊 Checking database for test data...');
    const equipmentCount = await prisma.equipment.count();
    const alertCount = await prisma.alert.count({ where: { status: 'active' } });
    const maintenanceCount = await prisma.maintenanceRecord.count({ where: { status: 'scheduled' } });

    console.log(`  - Equipment: ${equipmentCount}`);
    console.log(`  - Active Alerts: ${alertCount}`);
    console.log(`  - Scheduled Maintenance: ${maintenanceCount}`);

    if (equipmentCount === 0) {
      console.log('\n⚠️  No equipment found. Please run: npx prisma db seed');
      return;
    }

    // Test queries
    const testQueries = [
      "Show me all operational equipment",
      "What's the current OEE for the first equipment?",
      "List any active alerts",
      "Show upcoming maintenance schedules",
      "What are the latest sensor readings?"
    ];

    console.log('\n🤖 Testing chat queries...\n');

    for (const query of testQueries) {
      console.log(`❓ Query: "${query}"`);
      
      try {
        const response = await fetch('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: 'test-session',
            messages: [
              {
                role: 'user',
                content: query,
              },
            ],
          }),
        });

        if (!response.ok) {
          console.log(`  ❌ API Error: ${response.status} ${response.statusText}`);
          continue;
        }

        const data = await response.json();
        
        if (data.message) {
          console.log(`  ✅ Response: ${data.message.content.substring(0, 100)}...`);
          
          if (data.context) {
            console.log(`  📊 Context: ${JSON.stringify(Object.keys(data.context))}`);
          }
        } else if (data.error) {
          console.log(`  ⚠️  Error: ${data.error}`);
        }
      } catch (error) {
        console.log(`  ❌ Request failed: ${error}`);
      }
      
      console.log('');
    }

    // Check Ollama status
    console.log('🔍 Checking Ollama status...');
    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/tags');
      if (ollamaResponse.ok) {
        const data = await ollamaResponse.json();
        console.log(`  ✅ Ollama is running with ${data.models?.length || 0} models`);
        if (data.models?.length > 0) {
          console.log(`  📋 Available models: ${data.models.map((m: any) => m.name).join(', ')}`);
        }
      } else {
        console.log('  ⚠️  Ollama is not responding');
      }
    } catch (error) {
      console.log('  ❌ Ollama is not running. Chat will use fallback responses.');
      console.log('  💡 Run: docker-compose up -d ollama');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
console.log('🚀 Starting Manufacturing Chat API Test');
console.log('   Make sure the Next.js server is running on http://localhost:3000\n');

testChatAPI().catch(console.error);