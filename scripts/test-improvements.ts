#!/usr/bin/env tsx

/**
 * Test script to verify all improvements
 */

import { ManufacturingEngineeringAgent } from '../src/lib/agents/ManufacturingEngineeringAgent';
import { processFastQuery } from '../src/lib/fastQueryProcessor';
import { getEquipmentMappings } from '../src/lib/equipmentMapper';
import { logger } from '../src/lib/logger';

async function testImprovements() {
  logger.info('🧪 Testing all improvements...');
  
  try {
    // Test 1: Agent downtime analysis (previously broken)
    logger.info('Test 1: Testing downtime analysis...');
    const agent = new ManufacturingEngineeringAgent();
    
    const downtimeResult = await agent.execute(
      "what is my largest downtime reason",
      { messages: [] }
    );
    
    logger.info('✅ Downtime analysis result:', {
      hasContent: !!downtimeResult.content,
      confidence: downtimeResult.confidence,
      analysisType: downtimeResult.analysisType,
      contentPreview: downtimeResult.content?.substring(0, 100) + '...'
    });
    
    // Test 2: Fast query processing
    logger.info('Test 2: Testing fast query processor...');
    
    const queries = [
      "what departments do i have",
      "list my equipment",
      "overall oee summary"
    ];
    
    for (const query of queries) {
      const startTime = Date.now();
      const result = await processFastQuery(query);
      const executionTime = Date.now() - startTime;
      
      logger.info(`✅ Fast query "${query}":`, {
        type: result.queryType,
        executionTime: `${executionTime}ms`,
        hasData: !!result.data,
        summary: result.data.summary
      });
    }
    
    // Test 3: Equipment mapping
    logger.info('Test 3: Testing equipment mapping...');
    const equipmentMappings = await getEquipmentMappings();
    
    logger.info('✅ Equipment mappings:', {
      totalEquipment: equipmentMappings.length,
      codes: equipmentMappings.map(e => e.code),
      types: [...new Set(equipmentMappings.map(e => e.type))]
    });
    
    // Test 4: OEE analysis with better data conversion
    logger.info('Test 4: Testing improved OEE analysis...');
    const oeeResult = await agent.execute(
      "Show me OEE for all equipment in descending order",
      { messages: [] }
    );
    
    logger.info('✅ OEE analysis result:', {
      hasContent: !!oeeResult.content,
      confidence: oeeResult.confidence,
      dataPoints: oeeResult.dataPoints,
      hasNaN: oeeResult.content?.includes('NaN') || false
    });
    
    logger.info('🎉 All improvements tested successfully!');
    
  } catch (error) {
    logger.error('❌ Improvement test failed:', error);
    throw error;
  }
}

// Run the test
testImprovements()
  .then(() => {
    logger.info('All tests completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Tests failed:', error);
    process.exit(1);
  });