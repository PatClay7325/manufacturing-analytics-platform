#!/usr/bin/env node

const { PrismaClient } = require('../prisma/generated/client');
const { ConversationalManufacturingAgent } = require('../src/lib/agents/ConversationalManufacturingAgent');

const prisma = new PrismaClient();

async function testChatWithRealData() {
  console.log('🧪 Testing chat with real data from database...\n');
  
  try {
    // First verify we have data
    const equipmentCount = await prisma.dimEquipment.count();
    const productionCount = await prisma.factProduction.count();
    const maintenanceCount = await prisma.factMaintenance.count();
    
    console.log('📊 Database Status:');
    console.log(`  - Equipment: ${equipmentCount} records`);
    console.log(`  - Production: ${productionCount} records`);
    console.log(`  - Maintenance: ${maintenanceCount} records\n`);
    
    if (equipmentCount === 0) {
      console.error('❌ No equipment data found! Please run seed script first.');
      return;
    }
    
    // Initialize the agent
    const agent = new ConversationalManufacturingAgent(prisma);
    
    // Test queries
    const testQueries = [
      "What is the current OEE for equipment CNC-001?",
      "Show me maintenance history for CNC machines",
      "What equipment has the lowest OEE today?",
      "Are there any equipment failures in the last 24 hours?",
      "What's the MTBF for our critical equipment?"
    ];
    
    for (const query of testQueries) {
      console.log(`\n🤖 Query: "${query}"`);
      console.log('-----------------------------------');
      
      const response = await agent.processQuery(query, {
        timestamp: new Date().toISOString(),
        user: 'test-user',
        conversationId: 'test-123'
      });
      
      console.log(`✅ Response: ${response.response}`);
      console.log(`📊 Data Sources: ${response.dataSources.join(', ')}`);
      console.log(`⭐ Confidence: ${response.confidence}/5`);
      console.log(`🎯 Self-Critique Score: ${response.selfCritique?.score || 'N/A'}/5`);
      
      if (response.selfCritique?.suggestions?.length) {
        console.log(`💡 Suggestions: ${response.selfCritique.suggestions.join(', ')}`);
      }
    }
    
    // Check OEE view
    console.log('\n📈 Checking OEE View Data:');
    const oeeData = await prisma.viewOeeDaily.findMany({
      take: 5,
      orderBy: { dateId: 'desc' }
    });
    
    if (oeeData.length > 0) {
      console.log('  Recent OEE records:');
      oeeData.forEach(record => {
        console.log(`    - Equipment ${record.equipmentId}: OEE=${(record.oee * 100).toFixed(1)}% (A=${(record.availability * 100).toFixed(1)}%, P=${(record.performance * 100).toFixed(1)}%, Q=${(record.quality * 100).toFixed(1)}%)`);
      });
    } else {
      console.log('  ⚠️  No OEE data in materialized view');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testChatWithRealData()
  .then(() => {
    console.log('\n✅ Chat test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });