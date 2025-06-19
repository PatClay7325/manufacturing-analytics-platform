import { PrismaClient } from '@prisma/client';
import { subHours } from 'date-fns';

const prisma = new PrismaClient();

async function seedAlertMetrics() {
  console.log('Seeding alert metrics...');

  // Get work units
  const workUnits = await prisma.workUnit.findMany({
    take: 5
  });

  if (workUnits.length === 0) {
    console.error('No work units found. Please seed work units first.');
    return;
  }

  const metrics = [];
  const now = new Date();

  // Generate hourly metrics for the past 24 hours
  for (let hoursAgo = 24; hoursAgo >= 0; hoursAgo--) {
    const timestamp = subHours(now, hoursAgo);
    
    // Generate metrics for each work unit
    for (const workUnit of workUnits) {
      // Alert count metric
      metrics.push({
        workUnitId: workUnit.id,
        timestamp,
        key: 'alert_count',
        value: Math.floor(Math.random() * 10) + 1,
        unit: 'count',
        category: 'telemetry' as const,
        metadata: { source: 'alert_system' }
      });

      // Mean Time To Resolution (MTTR) metric
      metrics.push({
        workUnitId: workUnit.id,
        timestamp,
        key: 'mttr',
        value: Math.floor(Math.random() * 60) + 20, // 20-80 minutes
        unit: 'minutes',
        category: 'performance' as const,
        metadata: { source: 'alert_system' }
      });

      // Alert rate metric (alerts per hour)
      metrics.push({
        workUnitId: workUnit.id,
        timestamp,
        key: 'alert_rate',
        value: Math.round((Math.random() * 5 + 0.5) * 10) / 10, // 0.5-5.5 alerts/hour
        unit: 'alerts/hour',
        category: 'performance' as const,
        metadata: { source: 'alert_system' }
      });

      // Critical alert count
      metrics.push({
        workUnitId: workUnit.id,
        timestamp,
        key: 'critical_alerts',
        value: Math.floor(Math.random() * 3), // 0-2 critical alerts
        unit: 'count',
        category: 'telemetry' as const,
        metadata: { source: 'alert_system', severity: 'critical' }
      });

      // Resolution rate
      metrics.push({
        workUnitId: workUnit.id,
        timestamp,
        key: 'resolution_rate',
        value: Math.floor(Math.random() * 30) + 70, // 70-100%
        unit: 'percentage',
        category: 'performance' as const,
        metadata: { source: 'alert_system' }
      });
    }
  }

  // Insert metrics
  const result = await prisma.metric.createMany({
    data: metrics,
    skipDuplicates: true
  });

  console.log(`Seeded ${result.count} alert metrics`);
}

async function main() {
  try {
    await seedAlertMetrics();
  } catch (error) {
    console.error('Error seeding alert metrics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();