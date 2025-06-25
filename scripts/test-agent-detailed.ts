#!/usr/bin/env tsx

/**
 * Detailed test of agent execution to debug the empty response
 */

import { ManufacturingEngineeringAgent } from '../src/lib/agents/ManufacturingEngineeringAgent';
import { prisma } from '../src/lib/database/prisma';
import { logger } from '../src/lib/logger';

async function testAgentDetailed() {
  logger.info('Testing Manufacturing Engineering Agent with detailed debugging...');
  
  try {
    // First, check what data we have
    logger.info('Checking available data...');
    
    const equipmentCount = await prisma.equipment.count();
    const oeeCount = await prisma.factOeeMetric.count();
    const qualityCount = await prisma.factQualityMetric.count();
    
    logger.info('Data available:', {
      equipment: equipmentCount,
      oeeMetrics: oeeCount,
      qualityMetrics: qualityCount
    });
    
    if (oeeCount === 0) {
      logger.warn('No OEE metrics found - this explains the empty response');
      return;
    }
    
    // Check recent OEE data
    const recentOEE = await prisma.factOeeMetric.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      include: {
        equipment: {
          select: { equipmentName: true, equipmentCode: true }
        }
      }
    });
    
    logger.info('Recent OEE data (last 5 records):', 
      recentOEE.map(r => ({
        equipment: r.equipment?.equipmentName,
        oee: r.oee,
        timestamp: r.timestamp
      }))
    );
    
    // Now test the agent
    logger.info('Testing agent execution...');
    const agent = new ManufacturingEngineeringAgent();
    
    const result = await agent.execute(
      "Show me OEE for all equipment in the last 24 hours",
      { messages: [] }
    );
    
    logger.info('Agent result:', {
      content: result.content ? result.content.substring(0, 200) + '...' : 'NO CONTENT',
      confidence: result.confidence,
      dataPoints: result.dataPoints,
      analysisType: result.analysisType
    });
    
  } catch (error) {
    logger.error('❌ Detailed test failed:', error);
    throw error;
  }
}

// Run the test
testAgentDetailed()
  .then(() => {
    logger.info('Detailed test completed');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Test failed:', error);
    process.exit(1);
  });