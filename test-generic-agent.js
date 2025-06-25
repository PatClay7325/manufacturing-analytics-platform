const fetch = require('node-fetch');

async function testGenericAgent() {
  const queries = [
    "What is my OEE by machine?",
    "Show equipment status",
    "What are the production metrics for today?",
    "Analyze quality issues",
    "Show maintenance schedule",
    "What equipment has the most downtime?"
  ];

  for (const query of queries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing query: "${query}"`);
    console.log('='.repeat(60));
    
    try {
      const response = await fetch('http://localhost:3000/api/agents/manufacturing-engineering/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          parameters: {
            hours: 24
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('\n✅ Success!');
        console.log(`Data points: ${data.data.dataPoints}`);
        console.log('\nResponse preview:');
        console.log(data.data.content.substring(0, 300) + '...');
        
        if (data.data.metadata) {
          console.log('\nMetadata:', JSON.stringify(data.data.metadata, null, 2));
        }
      } else {
        console.log('\n❌ Error:', data.error);
        if (data.details) {
          console.log('Details:', data.details);
        }
      }
    } catch (error) {
      console.log('\n❌ Request failed:', error.message);
    }
  }
}

// Test health endpoint first
async function testHealth() {
  try {
    const response = await fetch('http://localhost:3000/api/agents/manufacturing-engineering/execute');
    const data = await response.json();
    console.log('Agent Health Check:', data);
    return true;
  } catch (error) {
    console.error('Health check failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('Testing Generic Manufacturing Engineering Agent...\n');
  
  const healthy = await testHealth();
  if (healthy) {
    await testGenericAgent();
  }
}

main();