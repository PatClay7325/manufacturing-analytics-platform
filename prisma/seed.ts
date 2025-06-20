import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting hierarchical seed process...\n');

  try {
    // Clean database
    await cleanDatabase();

    // Create hierarchical structure
    const enterprise = await createEnterprise();
    const sites = await createSites(enterprise.id);
    const areas = await createAreas(sites);
    const workCenters = await createWorkCenters(areas);
    const workUnits = await createWorkUnits(workCenters);
    
    // Create supporting data
    await createUsers(sites);
    await createPerformanceMetrics(workUnits);
    await createAlerts(workUnits);
    await createMaintenanceRecords(workUnits);
    await createProductionOrders(workCenters);
    await createMetrics(workUnits);
    await createKPISummaries(enterprise, sites, areas, workCenters, workUnits);

    console.log('\n✅ Hierarchical seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

async function cleanDatabase() {
  console.log('🧹 Cleaning database...');
  
  // Delete in correct order to respect foreign key constraints
  await prisma.dashboard.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.qualityCheck.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  await prisma.metric.deleteMany({});
  await prisma.qualityMetric.deleteMany({});
  await prisma.maintenanceRecord.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.performanceMetric.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.productionData.deleteMany({});
  await prisma.downtimeCause.deleteMany({});
  await prisma.workUnitKPISummary.deleteMany({});
  await prisma.workCenterKPISummary.deleteMany({});
  await prisma.areaKPISummary.deleteMany({});
  await prisma.siteKPISummary.deleteMany({});
  await prisma.enterpriseKPISummary.deleteMany({});
  await prisma.workUnit.deleteMany({});
  await prisma.workCenter.deleteMany({});
  await prisma.area.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.enterprise.deleteMany({});
  
  console.log('✅ Database cleaned\n');
}

async function createEnterprise() {
  console.log('🏢 Creating Enterprise...');
  
  const enterprise = await prisma.enterprise.create({
    data: {
      id: 'ent-001',
      name: 'AdaptiveFactory Global Manufacturing',
      code: 'ENT-001',
      updatedAt: new Date(),
    },
  });
  
  console.log(`✅ Created Enterprise: ${enterprise.name}`);
  return enterprise;
}

async function createSites(enterpriseId: string) {
  console.log('\n🏭 Creating Sites...');
  
  const sites = await Promise.all([
    prisma.site.create({
      data: {
        id: 'site-na001',
        enterpriseId,
        name: 'North America Manufacturing',
        code: 'SITE-NA001',
        location: 'Detroit, MI, USA',
        updatedAt: new Date(),
      },
    }),
    prisma.site.create({
      data: {
        id: 'site-ap001',
        enterpriseId,
        name: 'Asia Pacific Manufacturing',
        code: 'SITE-AP001',
        location: 'Shanghai, China',
        updatedAt: new Date(),
      },
    }),
  ]);
  
  console.log(`✅ Created ${sites.length} sites`);
  return sites;
}

async function createAreas(sites: any[]) {
  console.log('\n🏭 Creating Areas...');
  
  const [northAmericaSite, asiaPacificSite] = sites;
  
  const areas = await Promise.all([
    // North America Areas
    prisma.area.create({
      data: {
        id: 'area-na001-aut',
        siteId: northAmericaSite.id,
        name: 'Automotive Assembly',
        code: 'AREA-NA001-AUT',
        updatedAt: new Date(),
      },
    }),
    prisma.area.create({
      data: {
        id: 'area-na001-qc',
        siteId: northAmericaSite.id,
        name: 'Quality Control',
        code: 'AREA-NA001-QC',
        updatedAt: new Date(),
      },
    }),
    // Asia Pacific Areas
    prisma.area.create({
      data: {
        id: 'area-ap001-elec',
        siteId: asiaPacificSite.id,
        name: 'Electronics Manufacturing',
        code: 'AREA-AP001-ELEC',
        updatedAt: new Date(),
      },
    }),
    prisma.area.create({
      data: {
        id: 'area-ap001-semi',
        siteId: asiaPacificSite.id,
        name: 'Semiconductor Fabrication',
        code: 'AREA-AP001-SEMI',
        updatedAt: new Date(),
      },
    }),
  ]);
  
  console.log(`✅ Created ${areas.length} areas`);
  return areas;
}

async function createWorkCenters(areas: any[]) {
  console.log('\n🔧 Creating Work Centers...');
  
  const [automotiveArea, qualityControlArea, electronicsArea, semiconductorArea] = areas;
  
  const workCenters = await Promise.all([
    // Automotive Work Centers
    prisma.workCenter.create({
      data: {
        id: 'wc-na001-aut-ba',
        areaId: automotiveArea.id,
        name: 'Body Assembly',
        code: 'WC-NA001-AUT-BA',
        updatedAt: new Date(),
      },
    }),
    prisma.workCenter.create({
      data: {
        id: 'wc-na001-aut-pt',
        areaId: automotiveArea.id,
        name: 'Painting',
        code: 'WC-NA001-AUT-PT',
        updatedAt: new Date(),
      },
    }),
    // Quality Control Work Centers
    prisma.workCenter.create({
      data: {
        id: 'wc-na001-qc-di',
        areaId: qualityControlArea.id,
        name: 'Dimensional Inspection',
        code: 'WC-NA001-QC-DI',
        updatedAt: new Date(),
      },
    }),
    // Electronics Work Centers
    prisma.workCenter.create({
      data: {
        id: 'wc-ap001-elec-pcb',
        areaId: electronicsArea.id,
        name: 'PCB Assembly',
        code: 'WC-AP001-ELEC-PCB',
        updatedAt: new Date(),
      },
    }),
    prisma.workCenter.create({
      data: {
        id: 'wc-ap001-elec-fa',
        areaId: electronicsArea.id,
        name: 'Final Assembly',
        code: 'WC-AP001-ELEC-FA',
        updatedAt: new Date(),
      },
    }),
    // Semiconductor Work Centers
    prisma.workCenter.create({
      data: {
        id: 'wc-ap001-semi-wp',
        areaId: semiconductorArea.id,
        name: 'Wafer Processing',
        code: 'WC-AP001-SEMI-WP',
        updatedAt: new Date(),
      },
    }),
  ]);
  
  console.log(`✅ Created ${workCenters.length} work centers`);
  return workCenters;
}

async function createWorkUnits(workCenters: any[]) {
  console.log('\n⚙️ Creating Work Units...');
  
  const workUnits = [];
  
  // Body Assembly Work Units
  workUnits.push(
    await prisma.workUnit.create({
      data: {
        id: 'wu-na001-aut-ba-rw1',
        workCenterId: workCenters[0].id,
        name: 'Robotic Welding Cell 1',
        code: 'WU-NA001-AUT-BA-RW1',
        equipmentType: 'Robotic Welder',
        model: 'Fanuc R-2000iC',
        serialNumber: 'RW-2024-001',
        manufacturerCode: 'FANUC-R2K-001',
        installationDate: new Date('2022-01-15'),
        status: 'operational',
        location: 'Bay A1',
        description: 'High-precision robotic welding cell for body panel assembly',
        updatedAt: new Date(),
      },
    }),
    await prisma.workUnit.create({
      data: {
        id: 'wu-na001-aut-ba-rw2',
        workCenterId: workCenters[0].id,
        name: 'Robotic Welding Cell 2',
        code: 'WU-NA001-AUT-BA-RW2',
        equipmentType: 'Robotic Welder',
        model: 'Fanuc R-2000iC',
        serialNumber: 'RW-2024-002',
        manufacturerCode: 'FANUC-R2K-002',
        installationDate: new Date('2022-01-20'),
        status: 'operational',
        location: 'Bay A2',
        description: 'High-precision robotic welding cell for body panel assembly',
        updatedAt: new Date(),
      },
    })
  );
  
  // Paint Work Units
  workUnits.push(
    await prisma.workUnit.create({
      data: {
        id: 'wu-na001-aut-pt-pb1',
        workCenterId: workCenters[1].id,
        name: 'Paint Booth 1',
        code: 'WU-NA001-AUT-PT-PB1',
        equipmentType: 'Paint Booth',
        model: 'Durr EcoRP E133',
        serialNumber: 'PB-2024-001',
        manufacturerCode: 'DURR-ERP-001',
        installationDate: new Date('2022-02-01'),
        status: 'operational',
        location: 'Paint Shop East',
        description: 'Automated paint booth with electrostatic application system',
        updatedAt: new Date(),
      },
    })
  );
  
  // Quality Control Work Units
  workUnits.push(
    await prisma.workUnit.create({
      data: {
        id: 'wu-na001-qc-di-cmm1',
        workCenterId: workCenters[2].id,
        name: 'CMM Station 1',
        code: 'WU-NA001-QC-DI-CMM1',
        equipmentType: 'Coordinate Measuring Machine',
        model: 'Zeiss PRISMO 10',
        serialNumber: 'CMM-2024-001',
        manufacturerCode: 'ZEISS-P10-001',
        installationDate: new Date('2022-03-01'),
        status: 'operational',
        location: 'Quality Lab 1',
        description: 'High-accuracy coordinate measuring machine for dimensional verification',
        updatedAt: new Date(),
      },
    })
  );
  
  // PCB Assembly Work Units
  workUnits.push(
    await prisma.workUnit.create({
      data: {
        id: 'wu-ap001-elec-pcb-smt1',
        workCenterId: workCenters[3].id,
        name: 'SMT Line 1',
        code: 'WU-AP001-ELEC-PCB-SMT1',
        equipmentType: 'SMT Line',
        model: 'Fuji NXT III',
        serialNumber: 'SMT-2024-001',
        manufacturerCode: 'FUJI-NXT3-001',
        installationDate: new Date('2022-04-01'),
        status: 'operational',
        location: 'PCB Floor East',
        description: 'High-speed surface mount technology line for PCB assembly',
        updatedAt: new Date(),
      },
    })
  );
  
  console.log(`✅ Created ${workUnits.length} work units`);
  return workUnits;
}

async function createUsers(sites: any[]) {
  console.log('\n👥 Creating Users...');
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@adaptivefactory.com',
        name: 'System Administrator',
        role: 'admin',
        department: 'IT',
        passwordHash: hashedPassword,
        siteId: sites[0].id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'operator@adaptivefactory.com',
        name: 'Production Operator',
        role: 'operator',
        department: 'Production',
        passwordHash: hashedPassword,
        siteId: sites[0].id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'manager@adaptivefactory.com',
        name: 'Production Manager',
        role: 'manager',
        department: 'Production',
        passwordHash: hashedPassword,
        siteId: sites[1].id,
      },
    }),
  ]);
  
  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function createPerformanceMetrics(workUnits: any[]) {
  console.log('\n📊 Creating Performance Metrics...');
  
  let metricsCount = 0;
  const now = new Date();
  
  for (const workUnit of workUnits) {
    // Create metrics for last 7 days
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour += 4) {
        const availability = 85 + Math.random() * 15;
        const performance = 80 + Math.random() * 20;
        const quality = 95 + Math.random() * 5;
        const oeeScore = (availability * performance * quality) / 10000;
        
        await prisma.performanceMetric.create({
          data: {
            workUnitId: workUnit.id,
            timestamp: new Date(now.getTime() - (day * 24 + hour) * 60 * 60 * 1000),
            availability,
            performance,
            quality,
            oeeScore,
            runTime: 200 + Math.random() * 40,
            plannedDowntime: Math.random() * 30,
            unplannedDowntime: Math.random() * 20,
            idealCycleTime: 45 + Math.random() * 10,
            actualCycleTime: 50 + Math.random() * 15,
            totalParts: Math.floor(150 + Math.random() * 100),
            goodParts: Math.floor(140 + Math.random() * 90),
            shift: hour < 8 ? 'Night' : hour < 16 ? 'Day' : 'Evening',
            operator: `Operator-${Math.floor(Math.random() * 10) + 1}`,
          },
        });
        metricsCount++;
      }
    }
  }
  
  console.log(`✅ Created ${metricsCount} performance metrics`);
}

async function createAlerts(workUnits: any[]) {
  console.log('\n🚨 Creating Alerts...');
  
  const alertTypes = ['Temperature High', 'Vibration Abnormal', 'Pressure Low', 'Quality Issue', 'Maintenance Due'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['active', 'acknowledged', 'resolved'];
  
  const alerts = [];
  
  for (let i = 0; i < 15; i++) {
    const workUnit = workUnits[Math.floor(Math.random() * workUnits.length)];
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const alert = await prisma.alert.create({
      data: {
        alertType,
        severity,
        message: `${alertType} detected on ${workUnit.name}`,
        status,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        workUnitId: workUnit.id,
        notes: status !== 'active' ? `Handled by maintenance team` : null,
        acknowledgedBy: status !== 'active' ? 'Operator-1' : null,
        acknowledgedAt: status !== 'active' ? new Date() : null,
        resolvedBy: status === 'resolved' ? 'Technician-1' : null,
        resolvedAt: status === 'resolved' ? new Date() : null,
      },
    });
    alerts.push(alert);
  }
  
  console.log(`✅ Created ${alerts.length} alerts`);
  return alerts;
}

async function createMaintenanceRecords(workUnits: any[]) {
  console.log('\n🔧 Creating Maintenance Records...');
  
  const maintenanceTypes = ['Preventive', 'Corrective', 'Predictive', 'Emergency'];
  const statuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];
  
  const records = [];
  
  for (let i = 0; i < 10; i++) {
    const workUnit = workUnits[Math.floor(Math.random() * workUnits.length)];
    const maintenanceType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const record = await prisma.maintenanceRecord.create({
      data: {
        workUnitId: workUnit.id,
        maintenanceType,
        description: `${maintenanceType} maintenance for ${workUnit.name}`,
        technician: `Technician-${Math.floor(Math.random() * 5) + 1}`,
        startTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        endTime: status === 'completed' ? new Date() : null,
        status,
        notes: status === 'completed' ? 'Maintenance completed successfully' : null,
        parts: ['Filter', 'Oil', 'Belt'],
      },
    });
    records.push(record);
  }
  
  console.log(`✅ Created ${records.length} maintenance records`);
  return records;
}

async function createProductionOrders(workCenters: any[]) {
  console.log('\n📦 Creating Production Orders...');
  
  const orders = [];
  
  for (let i = 0; i < 5; i++) {
    const workCenter = workCenters[i % workCenters.length];
    const order = await prisma.productionOrder.create({
      data: {
        orderNumber: `PO-2024-${String(i + 1).padStart(3, '0')}`,
        workCenterId: workCenter.id,
        product: `Product ${i + 1}`,
        quantity: 1000 + i * 100,
        targetStartDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        targetEndDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        status: i === 0 ? 'in-progress' : 'scheduled',
        priority: Math.floor(Math.random() * 5) + 1,
      },
    });
    orders.push(order);
  }
  
  console.log(`✅ Created ${orders.length} production orders`);
  return orders;
}

async function createMetrics(workUnits: any[]) {
  console.log('\n📈 Creating Time-Series Metrics...');
  
  const metricNames = ['temperature', 'pressure', 'vibration', 'power_consumption'];
  const units = { temperature: '°C', pressure: 'bar', vibration: 'mm/s', power_consumption: 'kW' };
  
  let metricsCount = 0;
  const now = new Date();
  
  for (const workUnit of workUnits) {
    // Create metrics for last 24 hours
    for (let hour = 0; hour < 24; hour++) {
      for (const metricName of metricNames) {
        await prisma.metric.create({
          data: {
            workUnitId: workUnit.id,
            timestamp: new Date(now.getTime() - hour * 60 * 60 * 1000),
            name: metricName,
            value: metricName === 'temperature' ? 65 + Math.random() * 10 :
                   metricName === 'pressure' ? 4 + Math.random() * 2 :
                   metricName === 'vibration' ? 0.5 + Math.random() * 1 :
                   15 + Math.random() * 5,
            unit: units[metricName as keyof typeof units],
            quality: 0.95 + Math.random() * 0.05,
            source: 'SCADA',
          },
        });
        metricsCount++;
      }
    }
  }
  
  console.log(`✅ Created ${metricsCount} time-series metrics`);
}

async function createKPISummaries(enterprise: any, sites: any[], areas: any[], workCenters: any[], workUnits: any[]) {
  console.log('\n📊 Creating KPI Summaries...');
  
  const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date();
  
  // Enterprise KPI Summary
  await prisma.enterpriseKPISummary.create({
    data: {
      id: 'ekpi-ent-001',
      enterpriseId: enterprise.id,
      oee: 82.5,
      availability: 88.2,
      performance: 89.1,
      quality: 95.2,
      mtbf: 72.5,
      mttr: 2.8,
      productionCount: BigInt(125000),
      scrapRate: 3.2,
      energyConsumption: BigInt(245000),
      periodStart,
      periodEnd,
      updatedAt: new Date(),
    },
  });
  
  // Site KPI Summaries
  for (const [index, site] of sites.entries()) {
    await prisma.siteKPISummary.create({
      data: {
        id: `skpi-${site.id}`,
        siteId: site.id,
        oee: 80 + Math.random() * 10,
        availability: 85 + Math.random() * 10,
        performance: 85 + Math.random() * 10,
        quality: 90 + Math.random() * 8,
        mtbf: 70 + Math.random() * 20,
        mttr: 2 + Math.random() * 2,
        productionCount: BigInt(50000 + index * 25000),
        scrapRate: 2 + Math.random() * 3,
        energyConsumption: BigInt(100000 + index * 50000),
        periodStart,
        periodEnd,
        updatedAt: new Date(),
      },
    });
  }
  
  console.log('✅ Created KPI summaries');
}

// Execute main function
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });