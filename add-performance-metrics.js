const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Find the work unit
    const workUnit = await prisma.workUnit.findFirst({
      where: { code: 'WU-NA001-AUT-BA-RW1' }
    });

    if (!workUnit) {
      console.error('❌ Work unit not found');
      return;
    }

    console.log('✅ Found work unit:', workUnit.name);

    // Create performance metrics for the last 7 days
    const performanceMetrics = [];
    const now = new Date();
    
    for (let day = 0; day < 7; day++) {
      for (let shift = 0; shift < 3; shift++) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - day);
        timestamp.setHours(shift * 8);
        
        // Calculate realistic OEE components
        const availability = 85 + Math.random() * 10; // 85-95%
        const performance = 90 + Math.random() * 8;  // 90-98%
        const quality = 98 + Math.random() * 2;      // 98-100%
        const oeeScore = (availability * performance * quality) / 10000;
        
        performanceMetrics.push({
          id: `pm-${workUnit.id}-${day}-${shift}-${Date.now()}`,
          workUnitId: workUnit.id,
          timestamp: timestamp,
          availability: availability,
          performance: performance,
          quality: quality,
          oeeScore: oeeScore,
          runTime: 7.5 + Math.random() * 0.5,  // 7.5-8 hours
          plannedDowntime: Math.random() * 0.5, // 0-0.5 hours
          unplannedDowntime: Math.random() * 0.3, // 0-0.3 hours
          idealCycleTime: 60, // seconds
          actualCycleTime: 60 + Math.random() * 5, // 60-65 seconds
          totalParts: Math.floor(400 + Math.random() * 50),
          goodParts: Math.floor(395 + Math.random() * 45),
          shift: `Shift ${shift + 1}`,
          operator: `Operator ${Math.floor(Math.random() * 10) + 1}`,
          notes: `Production run ${day}-${shift}`
        });
      }
    }

    // Insert performance metrics
    console.log(`📊 Creating ${performanceMetrics.length} performance metrics...`);
    
    const result = await prisma.performanceMetric.createMany({
      data: performanceMetrics,
      skipDuplicates: true
    });

    console.log(`✅ Created ${result.count} performance metrics`);

    // Verify by calculating average OEE
    const avgMetrics = await prisma.performanceMetric.aggregate({
      where: { workUnitId: workUnit.id },
      _avg: {
        oeeScore: true,
        availability: true,
        performance: true,
        quality: true
      }
    });

    console.log('\n📈 Average KPIs:');
    console.log(`  OEE: ${avgMetrics._avg.oeeScore?.toFixed(1)}%`);
    console.log(`  Availability: ${avgMetrics._avg.availability?.toFixed(1)}%`);
    console.log(`  Performance: ${avgMetrics._avg.performance?.toFixed(1)}%`);
    console.log(`  Quality: ${avgMetrics._avg.quality?.toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();