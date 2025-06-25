import { manufacturingPipeline } from '../src/lib/agents/pipeline/ManufacturingPipeline';

async function testPipeline() {
  console.log('🧪 Testing Manufacturing Agent Pipeline...\n');

  const testQueries = [
    "Show me the current OEE metrics",
    "What are the main reasons for downtime?",
    "Perform root cause analysis for quality issues"
  ];

  for (const query of testQueries) {
    console.log(`\n📊 Testing: "${query}"`);
    console.log('─'.repeat(60));

    try {
      // Test pipeline status
      const agents = manufacturingPipeline.getAgents();
      console.log(`\n✅ Pipeline has ${agents.length} agents ready`);
      
      // Execute query
      const startTime = Date.now();
      const response = await manufacturingPipeline.execute({
        query,
        parameters: {
          sessionId: 'test-session',
          context: { testMode: true }
        }
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`\n📈 Response (${duration}ms):`);
      console.log(`Confidence: ${(response.confidence * 100).toFixed(1)}%`);
      console.log(`Content: ${response.content.substring(0, 200)}...`);
      
      if (response.visualizations && response.visualizations.length > 0) {
        console.log(`\n📊 Visualizations:`);
        response.visualizations.forEach(viz => {
          console.log(`  - ${viz.chartType}: ${viz.title}`);
        });
      }
      
      if (response.references && response.references.length > 0) {
        console.log(`\n📚 References:`);
        response.references.forEach(ref => {
          console.log(`  - ${ref.type}: ${ref.title}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Pipeline error:', error);
    }
  }
  
  console.log('\n\n✅ Pipeline test complete!');
}

// Test individual data endpoints
async function testDataEndpoints() {
  console.log('\n\n🔍 Testing Data API Endpoints...\n');
  
  const endpoints = [
    '/api/data/oee',
    '/api/data/downtime',
    '/api/data/root-cause'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`);
      const data = await response.json();
      
      console.log(`✅ ${endpoint}: ${response.ok ? 'OK' : 'FAILED'}`);
      if (data.summary) {
        console.log(`   Summary: ${JSON.stringify(data.summary).substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: Error - ${error}`);
    }
  }
}

// Run tests
async function runTests() {
  await testPipeline();
  await testDataEndpoints();
}

runTests().catch(console.error);