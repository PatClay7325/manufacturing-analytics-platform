import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLiveData() {
  try {
    console.log('🔍 Checking live data in database...\n');

    // Check hierarchical data
    const enterprises = await prisma.enterprise.count();
    const sites = await prisma.site.count();
    const areas = await prisma.area.count();
    const workCenters = await prisma.workCenter.count();
    
    console.log('📊 Hierarchical Structure:');
    console.log(`  - Enterprises: ${enterprises}`);
    console.log(`  - Sites: ${sites}`);
    console.log(`  - Areas: ${areas}`);
    console.log(`  - Work Centers: ${workCenters}`);
    
    // Check operational data
    const metrics = await prisma.performanceMetric.count();
    const alerts = await prisma.alert.count();
    const maintenance = await prisma.maintenanceRecord.count();
    const qualityChecks = await prisma.qualityCheck.count();
    const production = await prisma.productionData.count();
    
    console.log('\n📈 Operational Data:');
    console.log(`  - Performance Metrics: ${metrics}`);
    console.log(`  - Alerts: ${alerts}`);
    console.log(`  - Maintenance Records: ${maintenance}`);
    console.log(`  - Quality Checks: ${qualityChecks}`);
    console.log(`  - Production Data: ${production}`);
    
    // Check users
    const users = await prisma.user.count();
    console.log(`\n👥 Users: ${users}`);
    
    // Get sample data if exists
    if (workCenters > 0) {
      const sampleWorkCenter = await prisma.workCenter.findFirst({
        include: {
          Area: {
            include: {
              Site: {
                include: {
                  Enterprise: true
                }
              }
            }
          }
        }
      });
      
      if (sampleWorkCenter) {
        console.log('\n📍 Sample Work Center:');
        console.log(`  - Name: ${sampleWorkCenter.name}`);
        console.log(`  - Area: ${sampleWorkCenter.Area.name}`);
        console.log(`  - Site: ${sampleWorkCenter.Area.Site.name}`);
        console.log(`  - Enterprise: ${sampleWorkCenter.Area.Site.Enterprise.name}`);
      }
    }
    
    if (metrics > 0) {
      const recentMetric = await prisma.performanceMetric.findFirst({
        orderBy: { timestamp: 'desc' }
      });
      
      if (recentMetric) {
        console.log('\n⚙️ Recent Performance Metric:');
        console.log(`  - Timestamp: ${recentMetric.timestamp}`);
        console.log(`  - OEE: ${recentMetric.oeeScore}%`);
        console.log(`  - Availability: ${recentMetric.availability}%`);
        console.log(`  - Performance: ${recentMetric.performance}%`);
        console.log(`  - Quality: ${recentMetric.quality}%`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLiveData();