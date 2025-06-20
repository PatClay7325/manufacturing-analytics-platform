import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedManufacturingData() {
  console.log('🏭 Seeding Manufacturing Engineering Agent Data...\n');

  try {
    // Clear existing data in correct order to avoid foreign key constraints
    console.log('Clearing existing data...');
    await prisma.metric.deleteMany();
    await prisma.performanceMetric.deleteMany();
    await prisma.qualityMetric.deleteMany();
    await prisma.qualityCheck.deleteMany();
    await prisma.maintenanceRecord.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.workUnit.deleteMany();
    await prisma.workCenter.deleteMany();
    await prisma.area.deleteMany();
    await prisma.site.deleteMany();

    // Create Site
    console.log('Creating site...');
    const site = await prisma.site.create({
      data: {
        name: 'Main Manufacturing Facility',
        code: 'MAIN-01',
        location: 'Industrial District',
        timeZone: 'America/New_York'
      }
    });

    // Create Areas
    console.log('Creating areas...');
    const productionArea = await prisma.area.create({
      data: {
        name: 'Production Floor',
        code: 'PROD-01',
        siteId: site.id,
        description: 'Main production area'
      }
    });

    const assemblyArea = await prisma.area.create({
      data: {
        name: 'Assembly Area',
        code: 'ASSY-01',
        siteId: site.id,
        description: 'Final assembly area'
      }
    });

    // Create Work Centers
    console.log('Creating work centers...');
    const cncCenter = await prisma.workCenter.create({
      data: {
        name: 'CNC Machining Center',
        code: 'CNC-CTR-01',
        areaId: productionArea.id,
        costCenter: 'CC-100'
      }
    });

    const assemblyCenter = await prisma.workCenter.create({
      data: {
        name: 'Assembly Center',
        code: 'ASSY-CTR-01',
        areaId: assemblyArea.id,
        costCenter: 'CC-200'
      }
    });

    // Create Work Units (Equipment)
    console.log('Creating work units (equipment)...');
    const equipment = [
      {
        name: 'CNC Machine 001',
        code: 'CNC-001',
        equipmentType: 'CNC_MACHINE',
        manufacturer: 'HAAS',
        model: 'VF-2SS',
        serialNumber: 'SN-12345',
        status: 'operational',
        workCenterId: cncCenter.id,
        maintenanceSchedule: 'PREDICTIVE',
        lastMaintenanceAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      {
        name: 'CNC Machine 002',
        code: 'CNC-002',
        equipmentType: 'CNC_MACHINE',
        manufacturer: 'HAAS',
        model: 'VF-3SS',
        serialNumber: 'SN-12346',
        status: 'operational',
        workCenterId: cncCenter.id,
        maintenanceSchedule: 'PREVENTIVE',
        lastMaintenanceAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 14 days ago
      },
      {
        name: 'Assembly Line A',
        code: 'ASSY-A',
        equipmentType: 'ASSEMBLY_LINE',
        manufacturer: 'Custom',
        model: 'AL-3000',
        serialNumber: 'SN-22001',
        status: 'operational',
        workCenterId: assemblyCenter.id,
        maintenanceSchedule: 'PREVENTIVE'
      },
      {
        name: 'Packaging Unit 1',
        code: 'PKG-001',
        equipmentType: 'PACKAGING',
        manufacturer: 'PackTech',
        model: 'PT-500',
        serialNumber: 'SN-33001',
        status: 'maintenance',
        workCenterId: assemblyCenter.id,
        maintenanceSchedule: 'SCHEDULED'
      }
    ];

    const createdEquipment = await Promise.all(
      equipment.map(eq => prisma.workUnit.create({ data: eq }))
    );

    // Generate Performance Metrics for the last 7 days
    console.log('Generating performance metrics...');
    const now = new Date();
    const performanceMetrics = [];

    for (const unit of createdEquipment) {
      for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
        for (let hoursAgo = 0; hoursAgo < 24; hoursAgo += 4) { // Every 4 hours
          const timestamp = new Date(now);
          timestamp.setDate(timestamp.getDate() - daysAgo);
          timestamp.setHours(timestamp.getHours() - hoursAgo);

          // Generate realistic OEE components
          const isOperational = unit.status === 'operational';
          const baseAvailability = isOperational ? 0.85 + Math.random() * 0.1 : 0.2;
          const basePerformance = isOperational ? 0.90 + Math.random() * 0.08 : 0;
          const baseQuality = isOperational ? 0.96 + Math.random() * 0.03 : 0;

          // Add some variation for different equipment
          const availabilityFactor = unit.code.includes('CNC') ? 0.95 : 0.90;
          const performanceFactor = unit.code.includes('ASSY') ? 0.92 : 0.88;

          const availability = Math.min(1, baseAvailability * availabilityFactor);
          const performance = Math.min(1, basePerformance * performanceFactor);
          const quality = Math.min(1, baseQuality);
          const oeeScore = availability * performance * quality;

          // Calculate production metrics
          const plannedTime = 240; // 4 hours in minutes
          const runTime = plannedTime * availability;
          const idealCycleTime = unit.code.includes('CNC') ? 2.5 : 0.5; // minutes per unit
          const targetProduction = runTime / idealCycleTime;
          const actualProduction = Math.floor(targetProduction * performance);
          const goodProduction = Math.floor(actualProduction * quality);
          const unplannedDowntime = unit.status === 'maintenance' ? plannedTime * 0.8 : (1 - availability) * plannedTime * 0.7;

          performanceMetrics.push({
            workUnitId: unit.id,
            timestamp,
            oeeScore,
            availability,
            performance,
            quality,
            plannedProductionTime: plannedTime,
            runTime,
            unplannedDowntime,
            plannedDowntime: unit.status === 'maintenance' ? plannedTime * 0.2 : 0,
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

    // Generate Quality Metrics
    console.log('Generating quality metrics...');
    const qualityMetrics = [];
    const parameters = [
      { name: 'Dimension A', unit: 'mm', nominal: 100, tolerance: 2 },
      { name: 'Dimension B', unit: 'mm', nominal: 50, tolerance: 1 },
      { name: 'Surface Finish', unit: 'Ra', nominal: 1.6, tolerance: 0.4 },
      { name: 'Hardness', unit: 'HRC', nominal: 45, tolerance: 3 }
    ];

    for (const unit of createdEquipment.filter(u => u.status === 'operational')) {
      for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
        for (let i = 0; i < 10; i++) { // 10 quality checks per day
          const timestamp = new Date(now);
          timestamp.setDate(timestamp.getDate() - daysAgo);
          timestamp.setHours(Math.floor(Math.random() * 24));

          const param = parameters[Math.floor(Math.random() * parameters.length)];
          const deviation = (Math.random() - 0.5) * param.tolerance * 2.5; // Sometimes out of spec
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
            deviation: deviation
          });
        }
      }
    }

    await prisma.qualityMetric.createMany({ data: qualityMetrics });

    // Generate Quality Checks
    console.log('Generating quality checks...');
    const qualityChecks = [];
    const checkTypes = ['INCOMING', 'IN_PROCESS', 'FINAL', 'RANDOM'];
    
    for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - daysAgo);
        
        qualityChecks.push({
          checkType: checkTypes[Math.floor(Math.random() * checkTypes.length)],
          timestamp,
          result: Math.random() > 0.05 ? 'PASS' : 'FAIL',
          performedBy: `QC-Inspector-${Math.floor(Math.random() * 5) + 1}`,
          notes: 'Standard quality check'
        });
      }
    }

    await prisma.qualityCheck.createMany({ data: qualityChecks });

    // Generate Alerts
    console.log('Generating alerts...');
    const alerts = [];
    const alertTypes = [
      'MAINTENANCE_REQUIRED',
      'PERFORMANCE_DEGRADATION',
      'QUALITY_ISSUE',
      'DOWNTIME_EXCEEDED',
      'EQUIPMENT_FAILURE'
    ];

    for (const unit of createdEquipment) {
      // Generate 0-3 alerts per equipment
      const alertCount = Math.floor(Math.random() * 4);
      for (let i = 0; i < alertCount; i++) {
        const daysAgo = Math.floor(Math.random() * 7);
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - daysAgo);

        alerts.push({
          workUnitId: unit.id,
          alertType: alertTypes[Math.floor(Math.random() * alertTypes.length)],
          severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
          title: `Alert for ${unit.name}`,
          description: `System detected an issue with ${unit.name}`,
          timestamp,
          status: Math.random() > 0.3 ? 'active' : 'resolved'
        });
      }
    }

    await prisma.alert.createMany({ data: alerts });

    // Generate Maintenance Records
    console.log('Generating maintenance records...');
    const maintenanceRecords = [];
    const maintenanceTypes = ['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'EMERGENCY'];

    for (const unit of createdEquipment) {
      // Generate 2-5 maintenance records per equipment
      const recordCount = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < recordCount; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const startTime = new Date(now);
        startTime.setDate(startTime.getDate() - daysAgo);
        
        const duration = 30 + Math.floor(Math.random() * 240); // 30-270 minutes
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + duration);

        maintenanceRecords.push({
          workUnitId: unit.id,
          maintenanceType: maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)],
          startTime,
          endTime,
          technician: `Tech-${Math.floor(Math.random() * 10) + 1}`,
          description: `Routine maintenance on ${unit.name}`,
          partsReplaced: Math.random() > 0.5 ? `Part-${Math.floor(Math.random() * 100)}` : null,
          cost: 100 + Math.random() * 900,
          nextMaintenanceDue: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        });
      }
    }

    await prisma.maintenanceRecord.createMany({ data: maintenanceRecords });

    // Summary
    console.log('\n✅ Manufacturing data seeded successfully!');
    console.log(`   - Sites: 1`);
    console.log(`   - Areas: 2`);
    console.log(`   - Work Centers: 2`);
    console.log(`   - Work Units (Equipment): ${createdEquipment.length}`);
    console.log(`   - Performance Metrics: ${performanceMetrics.length}`);
    console.log(`   - Quality Metrics: ${qualityMetrics.length}`);
    console.log(`   - Quality Checks: ${qualityChecks.length}`);
    console.log(`   - Alerts: ${alerts.length}`);
    console.log(`   - Maintenance Records: ${maintenanceRecords.length}`);
    console.log('\n🎯 The Manufacturing Engineering Agent now has data to analyze!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedManufacturingData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });