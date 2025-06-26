/**
 * Self-Critique Demonstration
 * Shows how the self-critique mechanism improves responses
 */

import { ConversationalManufacturingAgent } from '../src/lib/agents/ConversationalManufacturingAgent';
import { SelfCritiqueService } from '../src/lib/agents/SelfCritiqueService';

async function demonstrateSelfCritique() {
  console.log('🔍 Manufacturing Intelligence Agent - Self-Critique Demonstration\n');
  
  const agent = new ConversationalManufacturingAgent();
  const sessionId = `demo-${Date.now()}`;
  const userId = 'demo-user';
  
  // Test queries that should trigger self-critique
  const testQueries = [
    {
      query: 'What are the top 5 defect types this week?',
      description: 'Quality analysis requiring specific data'
    },
    {
      query: 'Show me OEE for all equipment yesterday',
      description: 'OEE analysis with timeframe'
    },
    {
      query: 'Why is Line 2 having so many issues?',
      description: 'Root cause analysis'
    },
    {
      query: 'Compare performance between shifts',
      description: 'Comparison analysis'
    }
  ];
  
  for (const test of testQueries) {
    console.log('━'.repeat(80));
    console.log(`\n📋 Test: ${test.description}`);
    console.log(`❓ Query: "${test.query}"\n`);
    
    try {
      const startTime = Date.now();
      const response = await agent.chat(test.query, sessionId, userId);
      const endTime = Date.now();
      
      console.log('📊 Response Metrics:');
      console.log(`   • Processing Time: ${endTime - startTime}ms`);
      console.log(`   • Confidence: ${(response.context.confidence * 100).toFixed(1)}%`);
      console.log(`   • Intent: ${response.context.intent}`);
      console.log(`   • Analysis Type: ${response.context.analysisType}`);
      console.log(`   • Self-Critique Score: ${response.context.critiqueScore || 'N/A'}/10`);
      
      console.log('\n💬 Response:');
      console.log(response.content.substring(0, 500) + (response.content.length > 500 ? '...' : ''));
      
      if (response.suggestions && response.suggestions.length > 0) {
        console.log('\n💡 Suggested Follow-ups:');
        response.suggestions.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));
      }
      
      if (response.visualizations && response.visualizations.length > 0) {
        console.log('\n📊 Visualizations:');
        response.visualizations.forEach(v => console.log(`   • ${v.type}: ${v.title}`));
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  console.log('\n' + '━'.repeat(80));
  console.log('\n✅ Self-Critique Demonstration Complete\n');
}

// Example of direct self-critique evaluation
async function demonstrateCritiqueProcess() {
  console.log('\n🔬 Direct Self-Critique Process Demonstration\n');
  
  const critiqueService = new SelfCritiqueService();
  
  // Example 1: Poor response that needs improvement
  const poorResponse = {
    content: 'There are some quality issues.',
    context: {
      confidence: 0.3,
      intent: 'quality_analysis',
      entities: {},
      analysisType: 'quality_analysis'
    }
  };
  
  console.log('📋 Initial Response:');
  console.log(`   Content: "${poorResponse.content}"`);
  console.log(`   Confidence: ${poorResponse.context.confidence}`);
  
  const critiqueResult = await critiqueService.evaluateResponse(
    'What are the top quality issues?',
    poorResponse
  );
  
  console.log('\n📊 Critique Results:');
  console.log(`   Score: ${critiqueResult.score}/10`);
  console.log(`   Number of Critiques: ${critiqueResult.critiques.length}`);
  
  console.log('\n🚨 Critiques:');
  critiqueResult.critiques.forEach(c => {
    console.log(`   • [${c.severity.toUpperCase()}] ${c.type}: ${c.issue}`);
    console.log(`     Suggestion: ${c.suggestion}`);
    console.log(`     Impact: -${c.impact} points`);
  });
  
  console.log('\n💡 Improvement Suggestions:');
  critiqueResult.suggestions.forEach(s => console.log(`   • ${s}`));
  
  // Example 2: Good response
  const goodResponse = {
    content: `Top 5 Quality Issues This Week:

1. **Surface Defects (DEF001)**: 248 units - 17.8%
   - Primarily on CNC Machine #1
   - Increased 12% from last week

2. **Dimensional Errors (DEF007)**: 247 units - 17.7%
   - Affecting precision components
   - Tool wear correlation detected

3. **Material Flaws (DEF003)**: 245 units - 17.6%
   - Batch B-2024-156 affected
   - Supplier issue suspected

Total defects: 1,392 units
Quality rate: 94.7% (below target)`,
    context: {
      confidence: 0.95,
      intent: 'quality_analysis',
      entities: { 
        timeRange: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
        metrics: ['quality', 'defects']
      },
      analysisType: 'quality_analysis'
    }
  };
  
  console.log('\n\n📋 Improved Response:');
  console.log(`   Content Length: ${goodResponse.content.length} characters`);
  console.log(`   Confidence: ${goodResponse.context.confidence}`);
  
  const goodCritique = await critiqueService.evaluateResponse(
    'What are the top quality issues?',
    goodResponse
  );
  
  console.log('\n📊 Critique Results:');
  console.log(`   Score: ${goodCritique.score}/10`);
  console.log(`   Number of Critiques: ${goodCritique.critiques.length}`);
  
  if (goodCritique.critiques.length > 0) {
    console.log('\n🚨 Remaining Critiques:');
    goodCritique.critiques.forEach(c => {
      console.log(`   • [${c.severity}] ${c.type}: ${c.issue}`);
    });
  } else {
    console.log('\n✨ No critiques - response meets quality standards!');
  }
}

// Run demonstrations
async function main() {
  try {
    await demonstrateSelfCritique();
    await demonstrateCritiqueProcess();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}