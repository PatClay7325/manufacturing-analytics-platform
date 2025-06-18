import { PrismaClient } from '@prisma/client';

/**
 * Verify database connection and basic queries
 */
async function verifyDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verifying database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test basic queries
    console.log('\n📊 Running verification queries...');
    
    // Count records in each table
    const counts = {
      equipment: await prisma.equipment.count(),
      users: await prisma.user.count(),
      alerts: await prisma.alert.count(),
      performanceMetrics: await prisma.performanceMetric.count(),
      qualityMetrics: await prisma.qualityMetric.count(),
      maintenanceRecords: await prisma.maintenanceRecord.count(),
      productionLines: await prisma.productionLine.count(),
      productionOrders: await prisma.productionOrder.count(),
      settings: await prisma.setting.count(),
    };
    
    console.log('\n📈 Database Statistics:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} records`);
    });
    
    // Test a complex query
    console.log('\n🔧 Testing complex queries...');
    
    // Get active alerts with equipment info
    const activeAlerts = await prisma.alert.findMany({
      where: { status: 'active' },
      include: {
        equipment: true
      },
      take: 5
    });
    
    console.log(`  Found ${activeAlerts.length} active alerts`);
    
    // Get recent performance metrics
    const recentMetrics = await prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      take: 10,
      orderBy: { timestamp: 'desc' }
    });
    
    console.log(`  Found ${recentMetrics.length} performance metrics from last 24 hours`);
    
    // Test aggregation
    const avgOEE = await prisma.performanceMetric.aggregate({
      _avg: {
        oeeScore: true
      },
      where: {
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });
    
    console.log(`  Average OEE (last 7 days): ${(avgOEE._avg.oeeScore || 0).toFixed(2)}%`);
    
    console.log('\n✨ Database verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyDatabase().catch(console.error);