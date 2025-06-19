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
  console.log('\n🏢 Creating Areas...');
  
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
        siteId: northAmericaSite.id,
        name: 'Quality Control',
        code: 'AREA-NA001-QC',
      },
    }),
    // Asia Pacific Areas
    prisma.area.create({
      data: {
        siteId: asiaPacificSite.id,
        name: 'Electronics Manufacturing',
        code: 'AREA-AP001-ELEC',
      },
    }),
    prisma.area.create({
      data: {
        siteId: asiaPacificSite.id,
        name: 'Semiconductor Fabrication',
        code: 'AREA-AP001-SEMI',
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
        areaId: automotiveArea.id,
        name: 'Body Assembly',
        code: 'WC-NA001-AUT-BA',
      },
    }),
    prisma.workCenter.create({
      data: {
        areaId: automotiveArea.id,
        name: 'Painting',
        code: 'WC-NA001-AUT-PT',
      },
    }),
    // Quality Control Work Centers
    prisma.workCenter.create({
      data: {
        areaId: qualityControlArea.id,
        name: 'Dimensional Inspection',
        code: 'WC-NA001-QC-DI',
      },
    }),
    // Electronics Work Centers
    prisma.workCenter.create({
      data: {
        areaId: electronicsArea.id,
        name: 'PCB Assembly',
        code: 'WC-AP001-ELEC-PCB',
      },
    }),
    prisma.workCenter.create({
      data: {
        areaId: electronicsArea.id,
        name: 'Final Assembly',
        code: 'WC-AP001-ELEC-FA',
      },
    }),
    // Semiconductor Work Centers
    prisma.workCenter.create({
      data: {
        areaId: semiconductorArea.id,
        name: 'Wafer Processing',
        code: 'WC-AP001-SEMI-WP',
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
      },
    }),
    await prisma.workUnit.create({
      data: {
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
      },
    })
  );
  
  // Painting Work Units
  workUnits.push(
    await prisma.workUnit.create({
      data: {
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
      },
    })
  );
  
  // Quality Control Work Units
  workUnits.push(
    await prisma.workUnit.create({
      data: {
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
      },
    })
  );
  
  // PCB Assembly Work Units
  workUnits.push(
    await prisma.workUnit.create({
      data: {
        workCenterId: workCenters[3].id,
        name: 'SMT Line 1',
        code: 'WU-AP001-ELEC-PCB-SMT1',
        equipmentType: 'SMT Line',
        model: 'ASM SIPLACE SX',
        serialNumber: 'SMT-2024-001',
        manufacturerCode: 'ASM-SX-001',
        installationDate: new Date('2022-04-01'),
        status: 'operational',
        location: 'Clean Room 1',
        description: 'High-speed surface mount technology line',
      },
    })
  );
  
  // Final Assembly Work Units
  workUnits.push(
    await prisma.workUnit.create({
      data: {
        workCenterId: workCenters[4].id,
        name: 'Assembly Station 1',
        code: 'WU-AP001-ELEC-FA-AS1',
        equipmentType: 'Assembly Station',
        model: 'FlexLine AS-2000',
        serialNumber: 'AS-2024-001',
        manufacturerCode: 'FLEX-AS2K-001',
        installationDate: new Date('2022-05-01'),
        status: 'operational',
        location: 'Assembly Hall A',
        description: 'Flexible assembly station for final product assembly',
      },
    })
  );
  
  // Wafer Processing Work Units
  workUnits.push(
    await prisma.workUnit.create({
      data: {
        workCenterId: workCenters[5].id,
        name: 'Ion Implanter 1',
        code: 'WU-AP001-SEMI-WP-II1',
        equipmentType: 'Ion Implanter',
        model: 'Applied Varian VIISta',
        serialNumber: 'II-2024-001',
        manufacturerCode: 'AMAT-VII-001',
        installationDate: new Date('2022-06-01'),
        status: 'operational',
        location: 'Fab Clean Room 1',
        description: 'High-current ion implanter for semiconductor doping',
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
        email: 'john.smith@adaptivefactory.com',
        name: 'John Smith',
        role: 'manager',
        department: 'Production',
        passwordHash: hashedPassword,
        siteId: sites[0].id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'jane.doe@adaptivefactory.com',
        name: 'Jane Doe',
        role: 'engineer',
        department: 'Quality',
        passwordHash: hashedPassword,
        siteId: sites[0].id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob.wilson@adaptivefactory.com',
        name: 'Bob Wilson',
        role: 'operator',
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
  
  const now = new Date();
  let metricsCount = 0;
  
  for (const workUnit of workUnits) {
    // Create metrics for last 7 days
    for (let i = 0; i < 7; i++) {
      const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      await prisma.performanceMetric.create({
        data: {
          workUnitId: workUnit.id,
          timestamp,
          availability: 0.85 + Math.random() * 0.1,
          performance: 0.88 + Math.random() * 0.08,
          quality: 0.94 + Math.random() * 0.05,
          oeeScore: 0.82 + Math.random() * 0.1,
          runTime: 420 + Math.random() * 60,
          plannedDowntime: 30 + Math.random() * 20,
          unplannedDowntime: Math.random() * 30,
          totalParts: Math.floor(800 + Math.random() * 200),
          goodParts: Math.floor(750 + Math.random() * 200),
          shift: ['morning', 'afternoon', 'night'][i % 3],
          operator: ['John Doe', 'Jane Smith', 'Bob Wilson'][i % 3],
        },
      });
      metricsCount++;
    }
  }
  
  console.log(`✅ Created ${metricsCount} performance metrics`);
}

async function createAlerts(workUnits: any[]) {
  console.log('\n🚨 Creating Alerts...');
  
  const alertTypes = ['maintenance', 'quality', 'performance', 'safety'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const messages = {
    maintenance: 'Scheduled maintenance approaching',
    quality: 'Quality threshold exceeded',
    performance: 'Performance below target',
    safety: 'Safety inspection required',
  };
  
  const alerts = [];
  
  for (const workUnit of workUnits.slice(0, 3)) {
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const alert = await prisma.alert.create({
      data: {
        workUnitId: workUnit.id,
        alertType,
        severity: severities[Math.floor(Math.random() * severities.length)],
        message: messages[alertType as keyof typeof messages],
        status: 'active',
      },
    });
    alerts.push(alert);
  }
  
  console.log(`✅ Created ${alerts.length} alerts`);
  return alerts;
}

async function createMaintenanceRecords(workUnits: any[]) {
  console.log('\n🔧 Creating Maintenance Records...');
  
  const maintenanceTypes = ['preventive', 'corrective', 'predictive'];
  const records = [];
  
  for (const workUnit of workUnits.slice(0, 4)) {
    const record = await prisma.maintenanceRecord.create({
      data: {
        workUnitId: workUnit.id,
        maintenanceType: maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)],
        description: 'Regular maintenance check',
        technician: 'Mike Johnson',
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 6.5 * 24 * 60 * 60 * 1000),
        status: 'completed',
        notes: 'All systems checked and functioning properly',
        parts: ['Filter', 'Belt', 'Oil'],
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
  
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // Enterprise KPI
  await prisma.enterpriseKPISummary.create({
    data: {
      enterpriseId: enterprise.id,
      oee: 85.4,
      availability: 90.2,
      performance: 89.5,
      quality: 95.8,
      mtbf: 1200,
      mttr: 2.5,
      productionCount: BigInt(4850000),
      scrapRate: 2.1,
      energyConsumption: BigInt(15600000),
      periodStart,
      periodEnd,
    },
  });
  
  // Site KPIs
  for (const site of sites) {
    await prisma.siteKPISummary.create({
      data: {
        siteId: site.id,
        oee: 84.0 + Math.random() * 4,
        availability: 88.0 + Math.random() * 4,
        performance: 87.0 + Math.random() * 4,
        quality: 94.0 + Math.random() * 3,
        mtbf: 1000 + Math.random() * 400,
        mttr: 2.0 + Math.random() * 1,
        productionCount: BigInt(Math.floor(2000000 + Math.random() * 1000000)),
        scrapRate: 1.5 + Math.random() * 1,
        energyConsumption: BigInt(Math.floor(7000000 + Math.random() * 2000000)),
        periodStart,
        periodEnd,
      },
    });
  }
  
  console.log('✅ Created KPI summaries at all levels');
}

// Execute the main function
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });