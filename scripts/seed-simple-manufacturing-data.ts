import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSimpleManufacturingData() {
  console.log('🏭 Seeding Simple Manufacturing Data for Agent...\n');

  try {
    // Create Site
    console.log('Creating site...');
    const site = await prisma.site.upsert({
      where: { code: 'MAIN-01' },
      update: {},
      create: {
        name: 'Main Manufacturing Facility',
        code: 'MAIN-01',
        location: 'Industrial District',
        timeZone: 'America/New_York'
      }
    });

    // Create Areas
    console.log('Creating areas...');
    const productionArea = await prisma.area.upsert({
      where: { code: 'PROD-01' },
      update: {},
      create: {
        name: 'Production Floor',
        code: 'PROD-01',
        siteId: site.id,
        description: 'Main production area'
      }
    });

    // Create Work Centers
    console.log('Creating work centers...');
    const cncCenter = await prisma.workCenter.upsert({
      where: { code: 'CNC-CTR-01' },
      update: {},
      create: {
        name: 'CNC Machining Center',
        code: 'CNC-CTR-01',
        areaId: productionArea.id,
        costCenter: 'CC-100'
      }
    });

    // Create Work Units (Equipment)
    console.log('Creating work units (equipment)...');
    const cnc001 = await prisma.workUnit.upsert({
      where: { code: 'CNC-001' },
      update: {},
      create: {
        name: 'CNC Machine 001',
        code: 'CNC-001',
        equipmentType: 'CNC_MACHINE',
        manufacturer: 'HAAS',
        model: 'VF-2SS',
        serialNumber: 'SN-12345',
        status: 'operational',
        workCenterId: cncCenter.id,
        maintenanceSchedule: 'PREDICTIVE'
      }
    });

    const cnc002 = await prisma.workUnit.upsert({
      where: { code: 'CNC-002' },
      update: {},
      create: {
        name: 'CNC Machine 002',
        code: 'CNC-002',
        equipmentType: 'CNC_MACHINE',
        manufacturer: 'HAAS',
        model: 'VF-3SS',
        serialNumber: 'SN-12346',
        status: 'operational',
        workCenterId: cncCenter.id,
        maintenanceSchedule: 'PREVENTIVE'
      }
    });

    // Generate Performance Metrics for the last 7 days
    console.log('Generating performance metrics...');
    const now = new Date();
    const performanceMetrics = [];

    const equipment = [cnc001, cnc002];

    for (const unit of equipment) {
      for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
        for (let hoursAgo = 0; hoursAgo < 24; hoursAgo += 4) { // Every 4 hours
          const timestamp = new Date(now);
          timestamp.setDate(timestamp.getDate() - daysAgo);
          timestamp.setHours(timestamp.getHours() - hoursAgo);

          // Generate realistic OEE components
          const availability = 0.85 + Math.random() * 0.10; // 85-95%
          const performance = 0.90 + Math.random() * 0.08; // 90-98%
          const quality = 0.96 + Math.random() * 0.03; // 96-99%
          const oeeScore = availability * performance * quality;

          // Calculate production metrics
          const plannedTime = 240; // 4 hours in minutes
          const runTime = plannedTime * availability;
          const idealCycleTime = 2.5; // minutes per unit
          const targetProduction = runTime / idealCycleTime;
          const actualProduction = Math.floor(targetProduction * performance);
          const goodProduction = Math.floor(actualProduction * quality);

          performanceMetrics.push({
            workUnitId: unit.id,
            timestamp,
            oeeScore,
            availability,
            performance,
            quality,
            plannedProductionTime: plannedTime,
            runTime,
            unplannedDowntime: (1 - availability) * plannedTime,
            plannedDowntime: 0,
            plannedProduction: Math.floor(targetProduction),
            totalParts: actualProduction,
            goodParts: goodProduction,
            rejectedParts: actualProduction - goodProduction,
            changeoverTime: Math.random() * 10,
            idealCycleTime,
            actualCycleTime: idealCycleTime / performance
          });
        }
      }
    }

    await prisma.performanceMetric.createMany({ data: performanceMetrics });

    // Generate some alerts
    console.log('Generating alerts...');
    const alerts = [
      {
        workUnitId: cnc001.id,
        alertType: 'PERFORMANCE_DEGRADATION',
        severity: 'MEDIUM',
        title: 'Performance Below Target',
        description: 'CNC-001 performance has dropped below 90% threshold',
        timestamp: new Date(),
        status: 'active'
      },
      {
        workUnitId: cnc002.id,
        alertType: 'MAINTENANCE_REQUIRED',
        severity: 'HIGH',
        title: 'Scheduled Maintenance Due',
        description: 'CNC-002 preventive maintenance is due in 2 days',
        timestamp: new Date(),
        status: 'active'
      }
    ];

    await prisma.alert.createMany({ data: alerts });

    // Generate Quality Metrics
    console.log('Generating quality metrics...');
    const qualityMetrics = [];

    for (const unit of equipment) {
      for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
        for (let i = 0; i < 5; i++) { // 5 quality checks per day
          const timestamp = new Date(now);
          timestamp.setDate(timestamp.getDate() - daysAgo);
          timestamp.setHours(Math.floor(Math.random() * 24));

          const nominal = 100; // target dimension
          const tolerance = 2; // +/- 2mm
          const deviation = (Math.random() - 0.5) * tolerance * 1.5;
          const value = nominal + deviation;

          qualityMetrics.push({
            workUnitId: unit.id,
            timestamp,
            parameter: 'Dimension A',
            value,
            uom: 'mm',
            lowerLimit: nominal - tolerance,
            upperLimit: nominal + tolerance,
            nominal: nominal,
            isWithinSpec: Math.abs(deviation) <= tolerance,
            deviation: deviation
          });
        }
      }
    }

    await prisma.qualityMetric.createMany({ data: qualityMetrics });

    // Summary
    console.log('\n✅ Simple manufacturing data seeded successfully!');
    console.log(`   - Sites: 1`);
    console.log(`   - Areas: 1`);
    console.log(`   - Work Centers: 1`);
    console.log(`   - Work Units (Equipment): ${equipment.length}`);
    console.log(`   - Performance Metrics: ${performanceMetrics.length}`);
    console.log(`   - Quality Metrics: ${qualityMetrics.length}`);
    console.log(`   - Alerts: ${alerts.length}`);
    console.log('\n🎯 The Manufacturing Engineering Agent now has data to analyze!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedSimpleManufacturingData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });