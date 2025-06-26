#!/usr/bin/env ts-node

/**
 * Live Chat Testing Script
 * Tests the TrueIntelligentAgent with REAL Ollama calls
 * NO MOCKS - 100% live data for POC debugging
 */

import { TrueIntelligentAgent } from '../src/lib/agents/TrueIntelligentAgent';
import { prisma } from '../src/lib/database/prisma';
import chalk from 'chalk';

const TEST_QUERIES = [
  // Basic queries
  'Show me current equipment status',
  'What is the OEE?',
  'List all equipment',
  
  // Time-based queries
  'Show OEE for today',
  'What happened in the last 24 hours?',
  'Performance over the past week',
  
  // Complex analysis
  'Which equipment is underperforming?',
  'What are the main causes of downtime?',
  'How can we improve efficiency?',
  
  // Contextual queries (pairs)
  ['Tell me about equipment EQ001', 'What is its current status?'],
  ['Show me quality metrics', 'Why are they low?'],
  ['Analyze production trends', 'What should we do about it?']
];

async function verifyServices() {
  console.log(chalk.blue('\n🔧 Verifying services...\n'));
  
  // Check Ollama
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    console.log(chalk.green('✅ Ollama is running'));
    console.log(chalk.gray(`   Models: ${data.models?.map((m: any) => m.name).join(', ')}`));
  } catch (error) {
    console.error(chalk.red('❌ Ollama is not running!'));
    console.log(chalk.yellow('   Start it with: ollama serve'));
    process.exit(1);
  }
  
  // Check database
  try {
    const equipmentCount = await prisma.dimEquipment.count();
    const productionCount = await prisma.factProduction.count();
    console.log(chalk.green('✅ Database connected'));
    console.log(chalk.gray(`   Equipment: ${equipmentCount} records`));
    console.log(chalk.gray(`   Production: ${productionCount} records`));
    
    if (equipmentCount === 0 || productionCount === 0) {
      console.log(chalk.yellow('\n⚠️  Warning: Database has no data!'));
      console.log(chalk.yellow('   Run: npm run seed:manufacturing'));
    }
  } catch (error) {
    console.error(chalk.red('❌ Database connection failed!'));
    console.error(error);
    process.exit(1);
  }
}

async function testQuery(agent: TrueIntelligentAgent, query: string, sessionId: string) {
  console.log(chalk.cyan(`\n📝 Query: "${query}"`));
  
  const start = Date.now();
  
  try {
    const response = await agent.chat(query, sessionId, 'test-user');
    const duration = Date.now() - start;
    
    if (response.error) {
      console.log(chalk.red(`❌ Error: ${response.message}`));
    } else {
      console.log(chalk.green(`✅ Success (${duration}ms)`));
      console.log(chalk.gray(`   Response: ${response.message.substring(0, 100)}...`));
      
      if (response.metadata.dataPoints) {
        console.log(chalk.gray(`   Data points: ${response.metadata.dataPoints}`));
      }
      
      if (response.insights?.length > 0) {
        console.log(chalk.gray(`   Insights: ${response.insights.length}`));
      }
      
      if (response.suggestions?.length > 0) {
        console.log(chalk.gray(`   Suggestions: ${response.suggestions[0]}`));
      }
    }
    
    return { success: !response.error, duration, response };
  } catch (error) {
    console.log(chalk.red(`❌ Exception: ${error}`));
    return { success: false, duration: Date.now() - start, error };
  }
}

async function runLiveTests() {
  await verifyServices();
  
  console.log(chalk.blue('\n🚀 Starting live chat tests...\n'));
  
  const agent = new TrueIntelligentAgent();
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    totalDuration: 0,
    slowest: { query: '', duration: 0 },
    fastest: { query: '', duration: Infinity }
  };
  
  // Test single queries
  for (const query of TEST_QUERIES) {
    if (Array.isArray(query)) continue; // Skip contextual pairs for now
    
    const result = await testQuery(agent, query as string, `test-${Date.now()}`);
    
    results.total++;
    if (result.success) results.successful++;
    else results.failed++;
    
    results.totalDuration += result.duration;
    
    if (result.duration > results.slowest.duration) {
      results.slowest = { query: query as string, duration: result.duration };
    }
    if (result.duration < results.fastest.duration) {
      results.fastest = { query: query as string, duration: result.duration };
    }
  }
  
  // Test contextual queries
  console.log(chalk.blue('\n\n🔄 Testing contextual conversations...\n'));
  
  for (const queryPair of TEST_QUERIES) {
    if (!Array.isArray(queryPair)) continue;
    
    const sessionId = `context-${Date.now()}`;
    console.log(chalk.magenta(`\n📚 Contextual session: ${sessionId}`));
    
    for (const query of queryPair) {
      const result = await testQuery(agent, query, sessionId);
      results.total++;
      if (result.success) results.successful++;
      else results.failed++;
      results.totalDuration += result.duration;
    }
  }
  
  // Summary
  console.log(chalk.blue('\n\n📊 Test Summary\n'));
  console.log(chalk.white(`Total queries: ${results.total}`));
  console.log(chalk.green(`Successful: ${results.successful}`));
  console.log(chalk.red(`Failed: ${results.failed}`));
  console.log(chalk.white(`Success rate: ${Math.round((results.successful / results.total) * 100)}%`));
  console.log(chalk.white(`Average response time: ${Math.round(results.totalDuration / results.total)}ms`));
  console.log(chalk.yellow(`Slowest: "${results.slowest.query}" (${results.slowest.duration}ms)`));
  console.log(chalk.green(`Fastest: "${results.fastest.query}" (${results.fastest.duration}ms)`));
  
  // Test specific error cases
  console.log(chalk.blue('\n\n🧪 Testing error handling...\n'));
  
  const errorTests = [
    { query: '```invalid markdown```', description: 'Malformed input' },
    { query: '', description: 'Empty query' },
    { query: 'Show me data from non_existent_table', description: 'Invalid table' }
  ];
  
  for (const { query, description } of errorTests) {
    console.log(chalk.yellow(`\n⚠️  ${description}`));
    await testQuery(agent, query, `error-${Date.now()}`);
  }
  
  console.log(chalk.blue('\n\n✅ Live testing complete!\n'));
  
  await prisma.$disconnect();
}

// Run the tests
runLiveTests().catch(error => {
  console.error(chalk.red('\n\n❌ Test runner failed:'), error);
  process.exit(1);
});