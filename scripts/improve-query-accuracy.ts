#!/usr/bin/env tsx

/**
 * Script to analyze and improve query accuracy
 */

import { prisma } from '../src/lib/database/prisma';
import { logger } from '../src/lib/logger';

async function analyzeQueryAccuracy() {
  logger.info('🔍 Analyzing query accuracy and data availability...');
  
  try {
    // 1. Check equipment data completeness
    const equipment = await prisma.equipment.findMany({
      select: {
        id: true,
        equipmentCode: true,
        equipmentName: true,
        equipmentType: true,
        isActive: true
      }
    });
    
    logger.info('📊 Equipment Data:', {
      totalEquipment: equipment.length,
      activeEquipment: equipment.filter(e => e.isActive).length,
      equipmentTypes: [...new Set(equipment.map(e => e.equipmentType))],
      codes: equipment.map(e => e.equipmentCode)
    });
    
    // 2. Check OEE data recency and coverage
    const recentOEE = await prisma.factOeeMetric.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        equipmentId: true,
        timestamp: true,
        oee: true,
        availability: true,
        performance: true,
        quality: true
      }
    });
    
    const equipmentWithData = new Set(recentOEE.map(m => m.equipmentId));
    const avgOEE = recentOEE.reduce((sum, m) => sum + Number(m.oee), 0) / recentOEE.length;
    
    logger.info('📈 OEE Data Coverage:', {
      totalOEERecords: recentOEE.length,
      equipmentWithData: equipmentWithData.size,
      equipmentMissingData: equipment.length - equipmentWithData.size,
      avgOEE: (avgOEE * 100).toFixed(1) + '%',
      dataRecency: recentOEE.length > 0 ? `Most recent: ${recentOEE[0]?.timestamp}` : 'No recent data'
    });
    
    // 3. Check for equipment states (downtime data)
    const equipmentStates = await prisma.factEquipmentState.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      take: 10
    });
    
    logger.info('⚙️ Equipment State Data:', {
      totalStates: equipmentStates.length,
      hasDowntimeData: equipmentStates.length > 0
    });
    
    // 4. Check for quality metrics
    const qualityMetrics = await prisma.factQualityMetric.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      take: 5
    });
    
    logger.info('🎯 Quality Data:', {
      totalQualityRecords: qualityMetrics.length,
      hasQualityData: qualityMetrics.length > 0
    });
    
    // 5. Suggestions for improvement
    logger.info('💡 Accuracy Improvement Suggestions:');
    
    if (equipmentWithData.size < equipment.length) {
      logger.warn(`- ${equipment.length - equipmentWithData.size} equipment missing recent OEE data`);
    }
    
    if (equipmentStates.length === 0) {
      logger.warn('- No equipment state data for downtime analysis');
    }
    
    if (avgOEE < 0.75) {
      logger.info('- OEE below good threshold (75%) - focus on improvement opportunities');
    }
    
    logger.info('✅ Query accuracy analysis complete!');
    
  } catch (error) {
    logger.error('❌ Analysis failed:', error);
    throw error;
  }
}

// Run the analysis
analyzeQueryAccuracy()
  .then(() => {
    logger.info('Analysis completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Analysis failed:', error);
    process.exit(1);
  });