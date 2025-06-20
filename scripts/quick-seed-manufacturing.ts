import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickSeed() {
  console.log('🏭 Quick seeding manufacturing data...');

  try {
    // Get existing enterprise and site
    let enterprise = await prisma.enterprise.findFirst();
    if (!enterprise) {
      console.log('No enterprise found, creating one...');
      return;
    }

    let site = await prisma.site.findFirst();
    if (!site) {
      console.log('No site found, creating one...');
      return;
    }

    // Get or create area
    let area = await prisma.area.findFirst();
    if (!area) {
      area = await prisma.area.create({
        data: {
          id: 'area-production-001',
          siteId: site.id,
          name: 'Production Area A',
          code: 'PROD-A',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
    }

    // Get or create work center
    let workCenter = await prisma.workCenter.findFirst();
    if (!workCenter) {
      workCenter = await prisma.workCenter.create({
        data: {
          id: 'wc-welding-001',
          areaId: area.id,
          name: 'Welding Center 1',
          code: 'WLD-001',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
    }

    // Create work units (equipment)
    const workUnitsData = [
      {
        id: 'wu-welder-001',
        workCenterId: workCenter.id,
        name: 'Robotic Welder Alpha',
        code: 'RW-ALPHA-001',
        equipmentType: 'Robotic Welder',
        model: 'RW-3000X',
        serialNumber: 'RW3000X-2024-001',
        manufacturerCode: 'KUKA',
        installationDate: new Date('2023-01-15'),
        status: 'operational',
        location: 'Bay 1, Station A',
        description: 'High-precision robotic welding system',
        lastMaintenanceAt: new Date('2024-06-15'),
      },
      {
        id: 'wu-welder-002',
        workCenterId: workCenter.id,
        name: 'Robotic Welder Beta',
        code: 'RW-BETA-002',
        equipmentType: 'Robotic Welder',
        model: 'RW-3000X',
        serialNumber: 'RW3000X-2024-002',
        manufacturerCode: 'KUKA',
        installationDate: new Date('2023-02-20'),
        status: 'maintenance',
        location: 'Bay 2, Station B',
        description: 'High-precision robotic welding system',
        lastMaintenanceAt: new Date('2024-06-10'),
      },
      {
        id: 'wu-cnc-001',
        workCenterId: workCenter.id,
        name: 'CNC Machine Gamma',
        code: 'CNC-GAMMA-001',
        equipmentType: 'CNC Machine',
        model: 'CNC-5000',
        serialNumber: 'CNC5000-2024-001',
        manufacturerCode: 'HAAS',
        installationDate: new Date('2023-03-10'),
        status: 'operational',
        location: 'Bay 3, Station C',
        description: 'Computer numerical control machining center',
        lastMaintenanceAt: new Date('2024-06-12'),
      }
    ];

    // Delete existing data in correct order (foreign key constraints)
    await prisma.performanceMetric.deleteMany({});
    await prisma.metric.deleteMany({});
    await prisma.alert.deleteMany({});
    await prisma.workUnit.deleteMany({});
    
    // Create work units
    for (const unitData of workUnitsData) {
      await prisma.workUnit.create({
        data: {
          ...unitData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
    }

    // Create performance metrics for each work unit
    const workUnits = await prisma.workUnit.findMany();
    
    for (const unit of workUnits) {
      // Create recent performance metrics (last 7 days)
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const baseOEE = unit.status === 'operational' ? 0.75 + Math.random() * 0.2 : 0.3;
        const availability = unit.status === 'operational' ? 0.85 + Math.random() * 0.1 : 0.5;
        const performance = 0.8 + Math.random() * 0.15;
        const quality = 0.92 + Math.random() * 0.06;
        
        await prisma.performanceMetric.create({
          data: {
            workUnitId: unit.id,
            timestamp: date,
            availability: Number(availability.toFixed(2)),
            performance: Number(performance.toFixed(2)),
            quality: Number(quality.toFixed(2)),
            oeeScore: Number((availability * performance * quality).toFixed(2)),
            runTime: 480 + Math.random() * 60, // 8-9 hours
            plannedDowntime: 30 + Math.random() * 30, // 30-60 min
            unplannedDowntime: unit.status === 'operational' ? Math.random() * 30 : 120 + Math.random() * 60,
            idealCycleTime: 120, // 2 minutes
            actualCycleTime: 120 + Math.random() * 30,
            totalParts: Math.floor(200 + Math.random() * 100),
            goodParts: Math.floor((200 + Math.random() * 100) * quality),
            shift: i % 2 === 0 ? 'Day' : 'Night',
            operator: `Operator ${Math.floor(Math.random() * 5) + 1}`,
            createdAt: new Date(),
          }
        });
      }

      // Create real-time metrics
      const metricTypes = ['temperature', 'pressure', 'vibration', 'speed', 'power_consumption'];
      
      for (const metricType of metricTypes) {
        for (let i = 0; i < 10; i++) { // Last 10 readings
          const timestamp = new Date();
          timestamp.setMinutes(timestamp.getMinutes() - (i * 30)); // Every 30 minutes
          
          let value, unit;
          switch (metricType) {
            case 'temperature':
              value = 65 + Math.random() * 15; // 65-80°C
              unit = '°C';
              break;
            case 'pressure':
              value = 150 + Math.random() * 50; // 150-200 PSI
              unit = 'PSI';
              break;
            case 'vibration':
              value = 2 + Math.random() * 3; // 2-5 mm/s
              unit = 'mm/s';
              break;
            case 'speed':
              value = 1500 + Math.random() * 500; // 1500-2000 RPM
              unit = 'RPM';
              break;
            case 'power_consumption':
              value = 15 + Math.random() * 10; // 15-25 kW
              unit = 'kW';
              break;
            default:
              value = Math.random() * 100;
              unit = 'units';
          }
          
          await prisma.metric.create({
            data: {
              id: `metric-${unit.id}-${metricType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              workUnitId: unit.id,
              timestamp: timestamp,
              name: metricType.toUpperCase(),
              value: Number(value.toFixed(2)),
              unit: unit,
              source: 'sensor',
              quality: 0.95 + Math.random() * 0.05,
              createdAt: new Date(),
            }
          });
        }
      }
    }

    // Create alerts for equipment issues
    const alertTypes = [
      { type: 'TEMPERATURE_HIGH', severity: 'medium', message: 'Operating temperature above normal range' },
      { type: 'VIBRATION_ANOMALY', severity: 'high', message: 'Unusual vibration pattern detected' },
      { type: 'MAINTENANCE_DUE', severity: 'low', message: 'Scheduled maintenance approaching' },
      { type: 'PERFORMANCE_DROP', severity: 'medium', message: 'Performance efficiency below target' },
    ];

    // Create some active alerts
    for (let i = 0; i < 3; i++) {
      const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const unit = workUnits[Math.floor(Math.random() * workUnits.length)];
      
      await prisma.alert.create({
        data: {
          alertType: alert.type,
          severity: alert.severity,
          message: `${unit.name}: ${alert.message}`,
          status: 'active',
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Within last 24 hours
          workUnitId: unit.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
    }

    console.log('✅ Quick seed completed successfully!');
    console.log(`Created ${workUnits.length} work units with performance metrics, real-time data, and alerts`);
    
  } catch (error) {
    console.error('Error in quick seed:', error);
    throw error;
  }
}

quickSeed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });