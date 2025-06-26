const fetch = require('node-fetch');

async function testChatAPI() {
  console.log('🧪 Testing Manufacturing Chat API with real data...\n');
  
  const baseUrl = 'http://localhost:3001';
  
  const testQueries = [
    {
      message: "What is the current OEE for equipment CNC-001?",
      expectedDataSources: ['production', 'oee']
    },
    {
      message: "Show me maintenance history for CNC machines",
      expectedDataSources: ['maintenance']
    },
    {
      message: "What equipment has the lowest OEE today?",
      expectedDataSources: ['oee', 'equipment']
    },
    {
      message: "Are there any equipment failures in the last 24 hours?",
      expectedDataSources: ['downtime', 'maintenance']
    },
    {
      message: "What's the MTBF for our critical equipment?",
      expectedDataSources: ['maintenance', 'equipment', 'reliability']
    }
  ];
  
  for (const test of testQueries) {
    console.log(`\n🤖 Query: "${test.message}"`);
    console.log('-----------------------------------');
    
    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-' + Date.now(),
          messages: [
            {
              role: 'user',
              content: test.message
            }
          ]
        })
      });
      
      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.error('Response:', text.substring(0, 200) + '...');
        continue;
      }
      
      const data = await response.json();
      
      console.log(`✅ Response: ${data.response}`);
      console.log(`📊 Data Sources: ${data.dataSources?.join(', ') || 'N/A'}`);
      console.log(`⭐ Confidence: ${data.confidence || 'N/A'}/5`);
      
      if (data.selfCritique) {
        console.log(`🎯 Self-Critique Score: ${data.selfCritique.score}/5`);
        if (data.selfCritique.suggestions?.length) {
          console.log(`💡 Suggestions: ${data.selfCritique.suggestions.join(', ')}`);
        }
      }
      
      // Validate expected data sources
      if (test.expectedDataSources) {
        const missingDataSources = test.expectedDataSources.filter(
          ds => !data.dataSources?.includes(ds)
        );
        if (missingDataSources.length > 0) {
          console.log(`⚠️  Missing expected data sources: ${missingDataSources.join(', ')}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  // Test streaming endpoint
  console.log('\n\n🌊 Testing Streaming Chat API...');
  console.log('-----------------------------------');
  
  try {
    const streamResponse = await fetch(`${baseUrl}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "Give me a quick summary of today's production performance",
        stream: true
      })
    });
    
    if (!streamResponse.ok) {
      console.error(`❌ Stream HTTP Error: ${streamResponse.status}`);
    } else {
      console.log('✅ Stream endpoint is responsive');
    }
  } catch (error) {
    console.error(`❌ Stream Error: ${error.message}`);
  }
}

// Check if node-fetch is installed
try {
  require.resolve('node-fetch');
  testChatAPI()
    .then(() => {
      console.log('\n✅ All tests completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
} catch (e) {
  console.log('Installing node-fetch...');
  require('child_process').execSync('npm install node-fetch@2', { stdio: 'inherit' });
  console.log('Please run the script again.');
}