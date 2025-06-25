import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPerformance() {
  console.log('=================================');
  console.log('Chat Performance Test Results');
  console.log('=================================\n');

  // Test 1: Database Query Performance
  console.log('1. DATABASE QUERY PERFORMANCE');
  console.log('-----------------------------');
  
  const startDb = Date.now();
  const equipment = await prisma.equipment.findMany({
    include: {
      metrics: {
        take: 1,
        orderBy: { timestamp: 'desc' }
      }
    }
  });
  const dbTime = Date.now() - startDb;
  console.log(`✓ Equipment query: ${dbTime}ms (${equipment.length} records)`);
  
  const startMetrics = Date.now();
  const metrics = await prisma.metric.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    take: 100,
    orderBy: { timestamp: 'desc' }
  });
  const metricsTime = Date.now() - startMetrics;
  console.log(`✓ Metrics query: ${metricsTime}ms (${metrics.length} records)`);
  
  const startAlerts = Date.now();
  const alerts = await prisma.alert.findMany({
    where: { status: 'active' },
    include: { equipment: true },
    take: 20
  });
  const alertsTime = Date.now() - startAlerts;
  console.log(`✓ Alerts query: ${alertsTime}ms (${alerts.length} records)`);

  // Test 2: Ollama Response Time
  console.log('\n2. OLLAMA AI PERFORMANCE');
  console.log('------------------------');
  
  try {
    const startOllama = Date.now();
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma:2b',
        prompt: 'What is manufacturing efficiency?',
        stream: false,
        options: {
          num_predict: 100,
          temperature: 0.7
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const ollamaTime = Date.now() - startOllama;
      console.log(`✓ Ollama response: ${ollamaTime}ms`);
      console.log(`  Generated ${data.response.split(' ').length} words`);
      console.log(`  Tokens/sec: ${(data.eval_count / (data.eval_duration / 1e9)).toFixed(1)}`);
    } else {
      console.log('✗ Ollama not responding');
    }
  } catch (error) {
    console.log('✗ Ollama service not running');
  }

  // Test 3: Combined Performance (DB + AI)
  console.log('\n3. COMBINED PERFORMANCE');
  console.log('----------------------');
  
  const scenarios = [
    { query: 'What equipment is running?', expectedDb: true },
    { query: 'Show OEE metrics', expectedDb: true },
    { query: 'Any active alerts?', expectedDb: true }
  ];
  
  for (const scenario of scenarios) {
    const startTotal = Date.now();
    
    // Simulate database query
    const startQuery = Date.now();
    await prisma.equipment.findMany({ take: 10 });
    const queryTime = Date.now() - startQuery;
    
    // Simulate AI processing (if Ollama is running)
    try {
      const aiStart = Date.now();
      await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma:2b',
          prompt: scenario.query,
          stream: false,
          options: { num_predict: 50 }
        })
      });
      const aiTime = Date.now() - aiStart;
      const totalTime = Date.now() - startTotal;
      
      console.log(`✓ "${scenario.query}"`);
      console.log(`  DB: ${queryTime}ms | AI: ${aiTime}ms | Total: ${totalTime}ms`);
    } catch {
      const totalTime = Date.now() - startTotal;
      console.log(`✓ "${scenario.query}" - DB only: ${totalTime}ms`);
    }
  }

  // Performance Summary
  console.log('\n=================================');
  console.log('PERFORMANCE SUMMARY');
  console.log('=================================');
  console.log(`Database queries: ${dbTime + metricsTime + alertsTime}ms total`);
  console.log(`Average DB query: ${Math.round((dbTime + metricsTime + alertsTime) / 3)}ms`);
  
  console.log('\nRECOMMENDATIONS:');
  if (dbTime > 100) {
    console.log('⚠️  Database queries are slow. Consider:');
    console.log('   - Adding indexes on timestamp fields');
    console.log('   - Limiting query results');
    console.log('   - Using connection pooling');
  }
  
  console.log('\nEXPECTED CHAT PERFORMANCE:');
  console.log('- Simple queries: <1 second');
  console.log('- Database queries: 1-3 seconds');
  console.log('- Complex analysis: 3-5 seconds');
  
  await prisma.$disconnect();
}

testPerformance().catch(console.error);