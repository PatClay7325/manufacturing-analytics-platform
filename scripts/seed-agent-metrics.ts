import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAgentMetrics() {
  console.log('🏭 Seeding Manufacturing Metrics for Agent...\n');

  try {
    // Get existing equipment
    const equipment = await prisma.workUnit.findMany();
    console.log(`Found ${equipment.length} equipment units`);

    if (equipment.length === 0) {
      console.log('No equipment found. Please run a setup script first.');
      return;
    }

    // Generate Performance Metrics for the last 7 days
    console.log('Generating performance metrics...');
    const now = new Date();
    const performanceMetrics = [];

    for (const unit of equipment) {
      console.log(`  - Generating metrics for ${unit.name} (${unit.code})`);
      
      for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
        for (let hoursAgo = 0; hoursAgo < 24; hoursAgo += 4) { // Every 4 hours
          const timestamp = new Date(now);
          timestamp.setDate(timestamp.getDate() - daysAgo);
          timestamp.setHours(timestamp.getHours() - hoursAgo);

          // Generate realistic OEE components
          const isOperational = unit.status === 'operational';
          const availability = isOperational ? 0.85 + Math.random() * 0.10 : 0.20 + Math.random() * 0.10;
          const performance = isOperational ? 0.90 + Math.random() * 0.08 : 0.30 + Math.random() * 0.20;
          const quality = isOperational ? 0.96 + Math.random() * 0.03 : 0.80 + Math.random() * 0.10;
          const oeeScore = availability * performance * quality;

          // Calculate production metrics
          const plannedTime = 240; // 4 hours in minutes
          const runTime = plannedTime * availability;
          const idealCycleTime = unit.equipmentType === 'CNC_MACHINE' ? 2.5 : 0.5; // minutes per unit
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
            unplannedDowntime: (1 - availability) * plannedTime * 0.7,
            plannedDowntime: isOperational ? 0 : plannedTime * 0.3,
            plannedProduction: Math.floor(targetProduction),
            totalParts: actualProduction,
            goodParts: goodProduction,
            rejectedParts: actualProduction - goodProduction,
            changeoverTime: Math.random() * 10,
            idealCycleTime,
            actualCycleTime: idealCycleTime / performance,
            shift: ['A', 'B', 'C'][Math.floor(hoursAgo / 8) % 3],
            productType: 'PART-' + (Math.floor(Math.random() * 5) + 1).toString().padStart(3, '0')
          });
        }
      }
    }

    console.log(`Creating ${performanceMetrics.length} performance metrics...`);
    await prisma.performanceMetric.createMany({ data: performanceMetrics });

    // Generate Quality Metrics
    console.log('\nGenerating quality metrics...');
    const qualityMetrics = [];
    const parameters = [
      { name: 'Dimension A', unit: 'mm', nominal: 100, tolerance: 2 },
      { name: 'Dimension B', unit: 'mm', nominal: 50, tolerance: 1 },
      { name: 'Surface Finish', unit: 'Ra', nominal: 1.6, tolerance: 0.4 },
      { name: 'Hardness', unit: 'HRC', nominal: 45, tolerance: 3 }
    ];

    for (const unit of equipment.filter(u => u.status === 'operational')) {
      for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
        for (let i = 0; i < 8; i++) { // 8 quality checks per day
          const timestamp = new Date(now);
          timestamp.setDate(timestamp.getDate() - daysAgo);
          timestamp.setHours(Math.floor(Math.random() * 24));

          const param = parameters[Math.floor(Math.random() * parameters.length)];
          const deviation = (Math.random() - 0.5) * param.tolerance * 2.2;
          const value = param.nominal + deviation;
          const isWithinSpec = Math.abs(deviation) <= param.tolerance;

          qualityMetrics.push({
            workUnitId: unit.id,
            timestamp,
            parameter: param.name,
            value,
            uom: param.unit,
            lowerLimit: param.nominal - param.tolerance,
            upperLimit: param.nominal + param.tolerance,
            nominal: param.nominal,
            isWithinSpec,
            deviation: Math.abs(deviation),
            inspectionType: ['incoming', 'in-process', 'final'][Math.floor(Math.random() * 3)],
            shift: ['A', 'B', 'C'][Math.floor(timestamp.getHours() / 8)],
            inspector: `QC-${Math.floor(Math.random() * 5) + 1}`
          });
        }
      }
    }

    console.log(`Creating ${qualityMetrics.length} quality metrics...`);
    await prisma.qualityMetric.createMany({ data: qualityMetrics });

    // Generate Alerts
    console.log('\nGenerating alerts...');
    const alerts = [];
    const alertTypes = [
      { type: 'PERFORMANCE_DEGRADATION', severity: 'MEDIUM', title: 'Performance Below Target' },
      { type: 'QUALITY_ISSUE', severity: 'HIGH', title: 'Quality Out of Control' },
      { type: 'MAINTENANCE_REQUIRED', severity: 'HIGH', title: 'Maintenance Due' },
      { type: 'DOWNTIME_EXCEEDED', severity: 'CRITICAL', title: 'Excessive Downtime' }
    ];

    for (const unit of equipment) {
      // Generate 1-3 alerts per equipment
      const alertCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < alertCount; i++) {
        const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        const daysAgo = Math.floor(Math.random() * 3);
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - daysAgo);

        alerts.push({
          workUnitId: unit.id,
          alertType: alertType.type,
          severity: alertType.severity,
          title: `${alertType.title} - ${unit.name}`,
          description: `${alertType.title} detected on ${unit.name}. Immediate attention required.`,
          timestamp,
          status: Math.random() > 0.4 ? 'active' : 'resolved'
        });
      }
    }

    console.log(`Creating ${alerts.length} alerts...`);
    await prisma.alert.createMany({ data: alerts });

    // Generate Maintenance Records
    console.log('\nGenerating maintenance records...');
    const maintenanceRecords = [];
    const maintenanceTypes = ['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE'];

    for (const unit of equipment) {
      // Generate 2-4 maintenance records per equipment
      const recordCount = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < recordCount; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const startTime = new Date(now);
        startTime.setDate(startTime.getDate() - daysAgo);
        
        const duration = 30 + Math.floor(Math.random() * 180); // 30-210 minutes
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + duration);

        maintenanceRecords.push({
          workUnitId: unit.id,
          maintenanceType: maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)],
          description: `Routine maintenance on ${unit.name}`,
          technician: `Tech-${Math.floor(Math.random() * 5) + 1}`,
          startTime,
          endTime,
          status: 'completed',
          effectiveness: 'successful',
          totalCost: 100 + Math.random() * 500,
          downtimeHours: duration / 60,
          notes: 'Maintenance completed successfully'
        });
      }
    }

    console.log(`Creating ${maintenanceRecords.length} maintenance records...`);
    await prisma.maintenanceRecord.createMany({ data: maintenanceRecords });

    // Summary
    console.log('\n✅ Manufacturing metrics seeded successfully!');
    console.log(`   - Performance Metrics: ${performanceMetrics.length}`);
    console.log(`   - Quality Metrics: ${qualityMetrics.length}`);
    console.log(`   - Alerts: ${alerts.length}`);
    console.log(`   - Maintenance Records: ${maintenanceRecords.length}`);
    console.log('\n🎯 The Manufacturing Engineering Agent now has comprehensive data to analyze!');

  } catch (error) {
    console.error('❌ Error seeding metrics:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedAgentMetrics()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });