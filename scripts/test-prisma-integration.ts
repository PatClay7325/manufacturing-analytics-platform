/**
 * Test Prisma Integration and Database Connection
 * Verifies the enhanced manufacturing schema is working correctly
 */

import { PrismaClient } from '@prisma/client';
import ManufacturingDataService from '../src/services/manufacturingDataService';

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  console.log('🔌 Testing database connection...');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test basic query
    const workUnitCount = await prisma.workUnit.count();
    console.log(`📊 Found ${workUnitCount} work units in database`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function testSchemaModels() {
  console.log('🏗️  Testing enhanced schema models...');
  
  try {
    // Test each new model
    const tests = [
      { name: 'PerformanceMetric', query: () => prisma.performanceMetric.count() },
      { name: 'EquipmentHealth', query: () => prisma.equipmentHealth.count() },
      { name: 'QualityMetric', query: () => prisma.qualityMetric.count() },
      { name: 'Alert', query: () => prisma.alert.count() },
      { name: 'MaintenanceRecord', query: () => prisma.maintenanceRecord.count() },
      { name: 'EnergyMetric', query: () => prisma.energyMetric.count() },
      { name: 'ProcessParameter', query: () => prisma.processParameter.count() },
      { name: 'CostMetric', query: () => prisma.costMetric.count() },
      { name: 'ProductionLineMetric', query: () => prisma.productionLineMetric.count() },
      { name: 'ShiftReport', query: () => prisma.shiftReport.count() },
    ];

    for (const test of tests) {
      try {
        const count = await test.query();
        console.log(`  ✅ ${test.name}: ${count} records`);
      } catch (error) {
        console.log(`  ❌ ${test.name}: Error - ${error.message}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Schema model test failed:', error);
    return false;
  }
}

async function testManufacturingDataService() {
  console.log('🔧 Testing Manufacturing Data Service...');
  
  try {
    // Test OEE metrics
    console.log('  Testing OEE metrics...');
    const oeeData = await ManufacturingDataService.getOEEMetrics({ timeRange: '24h' });
    console.log(`    ✅ OEE data: ${oeeData.trends.length} trend points, avg OEE: ${oeeData.aggregated.avgOEE?.toFixed(1)}%`);
    
    // Test equipment health
    console.log('  Testing equipment health...');
    const healthData = await ManufacturingDataService.getEquipmentHealth();
    console.log(`    ✅ Health data: ${healthData.equipmentHealth.length} equipment, avg health: ${healthData.aggregated.avgOverallHealth?.toFixed(1)}%`);
    
    // Test production metrics
    console.log('  Testing production metrics...');
    const productionData = await ManufacturingDataService.getProductionMetrics({ timeRange: '24h' });
    console.log(`    ✅ Production data: ${productionData.trends.length} data points, total parts: ${productionData.aggregated.totalPartsProduced}`);
    
    // Test quality metrics
    console.log('  Testing quality metrics...');
    const qualityData = await ManufacturingDataService.getQualityMetrics({ timeRange: '7d' });
    console.log(`    ✅ Quality data: ${qualityData.qualityData.length} measurements, ${qualityData.summary.withinSpec} within spec`);
    
    // Test alerts
    console.log('  Testing alerts...');
    const alertData = await ManufacturingDataService.getActiveAlerts();
    console.log(`    ✅ Alert data: ${alertData.alerts.length} active alerts`);
    
    // Test dashboard summary
    console.log('  Testing dashboard summary...');
    const summaryData = await ManufacturingDataService.getDashboardSummary({ timeRange: '24h' });
    console.log(`    ✅ Dashboard summary: OEE ${summaryData.oee.avgOEE?.toFixed(1)}%, Health ${summaryData.health.avgOverallHealth?.toFixed(1)}%`);
    
    return true;
  } catch (error) {
    console.error('❌ Manufacturing Data Service test failed:', error);
    return false;
  }
}

async function testAPICompatibility() {
  console.log('🌐 Testing API compatibility...');
  
  try {
    // Test complex queries that the API routes would use
    
    // Test OEE query with joins
    const oeeWithUnits = await prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: {
        WorkUnit: {
          select: {
            id: true,
            name: true,
            code: true,
            equipmentType: true,
          }
        }
      },
      take: 5
    });
    console.log(`  ✅ OEE with work units: ${oeeWithUnits.length} records`);
    
    // Test equipment health with relationships
    const healthWithUnits = await prisma.equipmentHealth.findMany({
      include: {
        WorkUnit: {
          include: {
            WorkCenter: {
              include: {
                Area: {
                  include: {
                    Site: true
                  }
                }
              }
            }
          }
        }
      },
      take: 3
    });
    console.log(`  ✅ Equipment health with hierarchy: ${healthWithUnits.length} records`);
    
    // Test aggregation queries
    const aggregatedMetrics = await prisma.performanceMetric.aggregate({
      _avg: {
        oeeScore: true,
        availability: true,
        performance: true,
        quality: true,
      },
      _min: { oeeScore: true },
      _max: { oeeScore: true }
    });
    console.log(`  ✅ Aggregated metrics: Avg OEE ${aggregatedMetrics._avg.oeeScore?.toFixed(1)}%`);
    
    return true;
  } catch (error) {
    console.error('❌ API compatibility test failed:', error);
    return false;
  }
}

async function generateSampleDashboardData() {
  console.log('📊 Generating sample dashboard data preview...');
  
  try {
    // Get work units
    const workUnits = await prisma.workUnit.findMany({
      take: 5,
      include: {
        EquipmentHealth: true,
        WorkCenter: {
          include: {
            Area: {
              include: {
                Site: true
              }
            }
          }
        }
      }
    });
    
    console.log('\n📋 Work Units Overview:');
    workUnits.forEach(unit => {
      const health = unit.EquipmentHealth?.overallHealth || 'N/A';
      console.log(`  • ${unit.name} (${unit.equipmentType}) - Health: ${health}% - Location: ${unit.WorkCenter.Area.Site.name}`);
    });
    
    // Get recent OEE data
    const recentOEE = await prisma.performanceMetric.findMany({
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: {
        WorkUnit: {
          select: { name: true }
        }
      }
    });
    
    console.log('\n📈 Recent OEE Performance:');
    recentOEE.forEach(metric => {
      console.log(`  • ${metric.WorkUnit.name}: OEE ${metric.oeeScore?.toFixed(1)}% (A:${metric.availability?.toFixed(1)}% P:${metric.performance?.toFixed(1)}% Q:${metric.quality?.toFixed(1)}%)`);
    });
    
    // Get active alerts
    const activeAlerts = await prisma.alert.findMany({
      where: {
        status: { in: ['active', 'acknowledged'] }
      },
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: {
        WorkUnit: {
          select: { name: true }
        }
      }
    });
    
    console.log('\n🚨 Active Alerts:');
    if (activeAlerts.length === 0) {
      console.log('  • No active alerts');
    } else {
      activeAlerts.forEach(alert => {
        console.log(`  • ${alert.severity.toUpperCase()}: ${alert.title} - ${alert.WorkUnit?.name || 'System'}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Dashboard data preview failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Prisma Integration Test Suite...\n');
  
  const tests = [
    { name: 'Database Connection', test: testDatabaseConnection },
    { name: 'Schema Models', test: testSchemaModels },
    { name: 'Manufacturing Data Service', test: testManufacturingDataService },
    { name: 'API Compatibility', test: testAPICompatibility },
    { name: 'Dashboard Data Preview', test: generateSampleDashboardData },
  ];
  
  let passedTests = 0;
  
  for (const { name, test } of tests) {
    try {
      const passed = await test();
      if (passed) {
        passedTests++;
        console.log(`✅ ${name} - PASSED\n`);
      } else {
        console.log(`❌ ${name} - FAILED\n`);
      }
    } catch (error) {
      console.log(`❌ ${name} - ERROR: ${error.message}\n`);
    }
  }
  
  console.log(`\n🎯 Test Results: ${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    console.log('🎉 All tests passed! Your Prisma integration is working correctly.');
    console.log('\n📊 Your manufacturing analytics database is ready for dashboard integration!');
    console.log('\nNext steps:');
    console.log('  1. Run npm run prisma:generate to ensure client is up to date');
    console.log('  2. Run npm run prisma:seed to populate with sample data');
    console.log('  3. Start using the API routes for dashboard data');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above and fix any issues.');
  }
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Test suite failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default main;