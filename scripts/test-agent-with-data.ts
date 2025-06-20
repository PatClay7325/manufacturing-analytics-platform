import { ManufacturingEngineeringAgent } from '../src/lib/agents/ManufacturingEngineeringAgent';

async function testAgent() {
  console.log('🤖 Testing Manufacturing Engineering Agent with real data...\n');

  const agent = new ManufacturingEngineeringAgent();

  const queries = [
    "Show me the current OEE metrics",
    "What are the main reasons for downtime?",
    "Analyze quality trends for this week",
    "What's our equipment performance today?"
  ];

  for (const query of queries) {
    console.log(`\n📊 Query: "${query}"`);
    console.log('─'.repeat(60));
    
    try {
      const response = await agent.execute(query);
      
      console.log(`\n✅ Response (Confidence: ${(response.confidence * 100).toFixed(1)}%):`);
      console.log(response.content);
      
      if (response.dataPoints) {
        console.log(`\n📈 Data Points Analyzed: ${response.dataPoints}`);
      }
      
      if (response.references && response.references.length > 0) {
        console.log(`\n📚 ISO References:`);
        response.references.forEach(ref => console.log(`   - ${ref}`));
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

testAgent().catch(console.error);