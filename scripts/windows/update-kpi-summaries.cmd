@echo off
echo === UPDATING KPI SUMMARIES FROM METRICS ===
echo.

npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateKPIs() {
  console.log('Calculating KPI summaries from metrics...');
  
  // Get all work units with their recent performance metrics
  const workUnits = await prisma.workUnit.findMany({
    include: {
      performanceMetrics: {
        where: {
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      }
    }
  });
  
  console.log(`Found ${workUnits.length} work units to update`);
  
  // Update each work unit's KPI
  for (const unit of workUnits) {
    if (unit.performanceMetrics.length > 0) {
      const metrics = unit.performanceMetrics;
      const avgOEE = metrics.reduce((sum, m) => sum + (m.oeeScore || 0), 0) / metrics.length;
      const avgAvailability = metrics.reduce((sum, m) => sum + (m.availability || 0), 0) / metrics.length;
      const avgPerformance = metrics.reduce((sum, m) => sum + (m.performance || 0), 0) / metrics.length;
      const avgQuality = metrics.reduce((sum, m) => sum + (m.quality || 0), 0) / metrics.length;
      
      // Update the work unit with inline KPI data
      await prisma.workUnit.update({
        where: { id: unit.id },
        data: {
          metadata: {
            kpi: {
              oee: parseFloat(avgOEE.toFixed(1)),
              availability: parseFloat(avgAvailability.toFixed(1)),
              performance: parseFloat(avgPerformance.toFixed(1)),
              quality: parseFloat(avgQuality.toFixed(1)),
              lastUpdated: new Date().toISOString()
            }
          }
        }
      });
      
      console.log(`Updated ${unit.name}: OEE=${avgOEE.toFixed(1)}%`);
    }
  }
  
  console.log('\nKPI update completed!');
  await prisma.$disconnect();
}

updateKPIs().catch(console.error);
"

echo.
echo KPI summaries have been updated!
echo.
pause