const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding sample metrics for hierarchical schema...\n');
  
  try {
    // Get the first work unit
    const workUnit = await prisma.workUnit.findFirst();
    if (!workUnit) {
      console.error('No work unit found! Please run the seed script first.');
      return;
    }
    
    console.log(`Found work unit: ${workUnit.name} (${workUnit.id})`);
    
    // Generate sample metrics
    const metrics = [];
    const now = new Date();
    
    // Generate metrics for the past 2 hours
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - (i * 5 * 60 * 1000)); // Every 5 minutes
      
      metrics.push({
        id: `metric-temp-${i}-${Date.now()}`,
        workUnitId: workUnit.id,
        name: 'temperature',
        value: 70 + Math.random() * 10,
        unit: '°C',
        timestamp,
        source: 'sensor',
        quality: 100,
        tags: { sensor: 'temp-001', location: 'motor' }
      });
      
      metrics.push({
        id: `metric-press-${i}-${Date.now()}`,
        workUnitId: workUnit.id,
        name: 'pressure',
        value: 4 + Math.random(),
        unit: 'bar',
        timestamp,
        source: 'sensor',
        quality: 100,
        tags: { sensor: 'press-001', line: 'hydraulic' }
      });
      
      metrics.push({
        id: `metric-prod-${i}-${Date.now()}`,
        workUnitId: workUnit.id,
        name: 'production_count',
        value: i * 5 + Math.floor(Math.random() * 5),
        unit: 'units',
        timestamp,
        source: 'plc',
        quality: 100,
        tags: { line: 'A1', product: 'widget-001' }
      });
    }
    
    // Add OEE metrics
    metrics.push({
      id: `metric-avail-${Date.now()}`,
      workUnitId: workUnit.id,
      name: 'AVAILABILITY',
      value: 85 + Math.random() * 10,
      unit: '%',
      timestamp: now,
      source: 'calculated',
      quality: 100,
      tags: { type: 'OEE' }
    });
    
    metrics.push({
      id: `metric-perf-${Date.now()}`,
      workUnitId: workUnit.id,
      name: 'PERFORMANCE',
      value: 90 + Math.random() * 8,
      unit: '%',
      timestamp: now,
      source: 'calculated',
      quality: 100,
      tags: { type: 'OEE' }
    });
    
    metrics.push({
      id: `metric-qual-${Date.now()}`,
      workUnitId: workUnit.id,
      name: 'QUALITY',
      value: 95 + Math.random() * 5,
      unit: '%',
      timestamp: now,
      source: 'calculated',
      quality: 100,
      tags: { type: 'OEE' }
    });
    
    console.log(`\nCreating ${metrics.length} metrics...`);
    
    // Insert metrics
    const result = await prisma.metric.createMany({
      data: metrics,
      skipDuplicates: true
    });
    
    console.log(`✅ Created ${result.count} metrics successfully!`);
    
    // Verify
    const count = await prisma.metric.count();
    console.log(`\nTotal metrics in database: ${count}`);
    
    // Show sample
    const sample = await prisma.metric.findFirst({
      orderBy: { timestamp: 'desc' },
      include: { WorkUnit: true }
    });
    console.log('\nSample metric:');
    console.log(JSON.stringify(sample, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());