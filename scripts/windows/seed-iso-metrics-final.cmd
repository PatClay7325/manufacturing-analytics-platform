@echo off
echo === SEEDING ISO METRICS (FINAL VERSION) ===
echo.
echo This will generate 90 days of ISO 22400 metrics for your equipment.
echo.

echo [1] Generating metrics data...
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMetrics() {
  console.log('Starting metrics generation...');
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  
  const workUnits = await prisma.workUnit.findMany();
  console.log(`Found ${workUnits.length} work units`);
  
  for (const unit of workUnits) {
    console.log(`\nGenerating metrics for ${unit.name}`);
    const metrics = [];
    const perfMetrics = [];
    
    // Generate daily metrics
    for (let d = 0; d < 90; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);
      
      // Random but realistic values
      const availability = 85 + Math.random() * 15;
      const performance = 80 + Math.random() * 20;
      const quality = 95 + Math.random() * 5;
      const oee = (availability * performance * quality) / 10000;
      
      // ISO 22400 metrics
      metrics.push(
        {
          workUnitId: unit.id,
          timestamp: date,
          name: 'OEE',
          value: parseFloat(oee.toFixed(1)),
          unit: '%',
          source: 'ISO22400',
          quality: 1.0
        },
        {
          workUnitId: unit.id,
          timestamp: date,
          name: 'Availability',
          value: parseFloat(availability.toFixed(1)),
          unit: '%',
          source: 'ISO22400',
          quality: 1.0
        },
        {
          workUnitId: unit.id,
          timestamp: date,
          name: 'Performance',
          value: parseFloat(performance.toFixed(1)),
          unit: '%',
          source: 'ISO22400',
          quality: 1.0
        },
        {
          workUnitId: unit.id,
          timestamp: date,
          name: 'Quality',
          value: parseFloat(quality.toFixed(1)),
          unit: '%',
          source: 'ISO22400',
          quality: 1.0
        }
      );
      
      // Performance metrics
      const totalParts = Math.floor(400 + Math.random() * 200);
      const goodParts = Math.floor(totalParts * quality / 100);
      
      perfMetrics.push({
        workUnitId: unit.id,
        timestamp: date,
        availability: parseFloat(availability.toFixed(1)),
        performance: parseFloat(performance.toFixed(1)),
        quality: parseFloat(quality.toFixed(1)),
        oeeScore: parseFloat(oee.toFixed(1)),
        totalParts,
        goodParts
      });
    }
    
    // Add reliability metrics
    metrics.push(
      {
        workUnitId: unit.id,
        timestamp: endDate,
        name: 'MTBF',
        value: Math.floor(500 + Math.random() * 500),
        unit: 'hours',
        source: 'Reliability',
        quality: 1.0
      },
      {
        workUnitId: unit.id,
        timestamp: endDate,
        name: 'MTTR',
        value: parseFloat((1 + Math.random() * 3).toFixed(1)),
        unit: 'hours',
        source: 'Reliability',
        quality: 1.0
      }
    );
    
    // Batch create
    console.log(`Creating ${metrics.length} metrics...`);
    await prisma.metric.createMany({ data: metrics });
    
    console.log(`Creating ${perfMetrics.length} performance metrics...`);
    await prisma.performanceMetric.createMany({ data: perfMetrics });
  }
  
  console.log('\nMetrics generation completed!');
  await prisma.$disconnect();
}

seedMetrics().catch(console.error);
"

echo.
echo === METRICS SEEDING COMPLETE ===
echo.
echo Your database now contains:
echo - 90 days of ISO 22400 metrics (OEE, Availability, Performance, Quality)
echo - Performance tracking data
echo - Reliability metrics (MTBF, MTTR)
echo.
echo Test the chat with questions like:
echo - "What is my OEE?"
echo - "Show me equipment performance"
echo - "What's the availability of Machine A?"
echo.
pause