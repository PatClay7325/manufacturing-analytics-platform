#!/usr/bin/env tsx

/**
 * Test script to verify agent execution
 */

import { ManufacturingEngineeringAgent } from '../src/lib/agents/ManufacturingEngineeringAgent';
import { logger } from '../src/lib/logger';

async function testAgentExecution() {
  logger.info('Testing Manufacturing Engineering Agent execution...');
  
  try {
    // Test 1: Initialize agent
    logger.info('Test 1: Initializing agent...');
    const agent = new ManufacturingEngineeringAgent();
    logger.info('✅ Agent initialized successfully');
    
    // Test 2: Execute simple query
    logger.info('Test 2: Executing simple OEE query...');
    const result = await agent.execute(
      "Show me OEE for all equipment in the last 24 hours",
      { messages: [] }
    );
    
    logger.info('✅ Agent execution completed');
    logger.info('Result structure:', {
      hasResult: !!result.result,
      confidence: result.confidence,
      hasInsights: !!result.insights,
      hasData: !!result.data
    });
    
    if (result.result) {
      logger.info('Agent response content (first 200 chars):', 
        result.result.substring(0, 200) + '...'
      );
    }
    
    logger.info('🎉 Agent test completed successfully!');
    
  } catch (error) {
    logger.error('❌ Agent test failed:', error);
    throw error;
  }
}

// Run the test
testAgentExecution()
  .then(() => {
    logger.info('Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Test failed:', error);
    process.exit(1);
  });