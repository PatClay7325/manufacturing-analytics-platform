import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await cleanDatabase();

  // Create base data
  const { users, teams } = await createUsersAndTeams();
  const { enterprises, sites, areas, workCenters } = await createOrganizationalStructure();
  
  // Create operational data
  await createProductionOrders(workCenters);
  await createMetrics(workCenters);
  await createAlerts(workCenters);
  await createMaintenanceRecords(workCenters);
  await createQualityData(workCenters);
  await createDashboards(users[0]);
  
  console.log('✅ Database seeded successfully!');
}

async function cleanDatabase() {
  console.log('🧹 Cleaning existing data...');
  
  // Delete in correct order to respect foreign keys
  await prisma.metric.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.qualityCheck.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.workCenterKPISummary.deleteMany();
  await prisma.workCenter.deleteMany();
  await prisma.areaKPISummary.deleteMany();
  await prisma.area.deleteMany();
  await prisma.siteKPISummary.deleteMany();
  await prisma.site.deleteMany();
  await prisma.enterpriseKPISummary.deleteMany();
  await prisma.enterprise.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.user.deleteMany();
}

async function createUsersAndTeams() {
  console.log('👥 Creating users and teams...');
  
  // Create users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: 'user-admin-001',
        email: 'admin@manufacturing.com',
        username: 'admin',
        name: 'System Administrator',
        passwordHash: await hash('admin123', 10),
        role: 'admin',
        isActive: true,
        updatedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: 'user-operator-001',
        email: 'operator@manufacturing.com',
        username: 'operator',
        name: 'Machine Operator',
        passwordHash: await hash('operator123', 10),
        role: 'operator',
        isActive: true,
        updatedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: 'user-analyst-001',
        email: 'analyst@manufacturing.com',
        username: 'analyst',
        name: 'Data Analyst',
        passwordHash: await hash('analyst123', 10),
        role: 'analyst',
        isActive: true,
        updatedAt: new Date(),
      },
    }),
  ]);

  // Create teams
  const teams = await Promise.all([
    prisma.team.create({
      data: {
        id: 'team-production-001',
        name: 'Production Team',
        description: 'Main production floor team',
      },
    }),
    prisma.team.create({
      data: {
        id: 'team-quality-001',
        name: 'Quality Control',
        description: 'Quality assurance and control team',
      },
    }),
    prisma.team.create({
      data: {
        id: 'team-maintenance-001',
        name: 'Maintenance',
        description: 'Equipment maintenance team',
      },
    }),
  ]);

  // Add users to teams
  await prisma.teamMember.createMany({
    data: [
      { teamId: teams[0].id, userId: users[1].id, role: 'member' },
      { teamId: teams[1].id, userId: users[2].id, role: 'lead' },
      { teamId: teams[2].id, userId: users[0].id, role: 'admin' },
    ],
  });

  return { users, teams };
}

async function createOrganizationalStructure() {
  console.log('🏢 Creating organizational structure...');
  
  // Create enterprise
  const enterprise = await prisma.enterprise.create({
    data: {
      id: 'ent-001',
      name: 'Global Manufacturing Corp',
      code: 'GMC',
      updatedAt: new Date(),
    },
  });

  // Create sites
  const sites = await Promise.all([
    prisma.site.create({
      data: {
        id: 'site-001',
        enterpriseId: enterprise.id,
        name: 'Main Production Facility',
        code: 'MPF',
        location: 'Detroit, MI',
        updatedAt: new Date(),
      },
    }),
    prisma.site.create({
      data: {
        id: 'site-002',
        enterpriseId: enterprise.id,
        name: 'Assembly Plant East',
        code: 'APE',
        location: 'Columbus, OH',
        updatedAt: new Date(),
      },
    }),
  ]);

  // Create areas
  const areas = await Promise.all([
    prisma.area.create({
      data: {
        id: 'area-001',
        siteId: sites[0].id,
        name: 'Machining Area',
        code: 'MACH',
        updatedAt: new Date(),
      },
    }),
    prisma.area.create({
      data: {
        id: 'area-002',
        siteId: sites[0].id,
        name: 'Assembly Area',
        code: 'ASSY',
        updatedAt: new Date(),
      },
    }),
    prisma.area.create({
      data: {
        id: 'area-003',
        siteId: sites[1].id,
        name: 'Packaging Area',
        code: 'PACK',
        updatedAt: new Date(),
      },
    }),
  ]);

  // Create work centers
  const workCenters = await Promise.all([
    prisma.workCenter.create({
      data: {
        id: 'wc-001',
        areaId: areas[0].id,
        name: 'CNC Machining Center 1',
        code: 'CNC-01',
        updatedAt: new Date(),
      },
    }),
    prisma.workCenter.create({
      data: {
        id: 'wc-002',
        areaId: areas[0].id,
        name: 'CNC Machining Center 2',
        code: 'CNC-02',
        updatedAt: new Date(),
      },
    }),
    prisma.workCenter.create({
      data: {
        id: 'wc-003',
        areaId: areas[1].id,
        name: 'Assembly Line 1',
        code: 'ASM-01',
        updatedAt: new Date(),
      },
    }),
    prisma.workCenter.create({
      data: {
        id: 'wc-004',
        areaId: areas[2].id,
        name: 'Packaging Line A',
        code: 'PKG-01',
        updatedAt: new Date(),
      },
    }),
  ]);

  // Create KPI summaries
  await createKPISummaries(enterprise.id, sites, areas, workCenters);

  return {
    enterprises: [enterprise],
    sites,
    areas,
    workCenters,
  };
}

async function createKPISummaries(enterpriseId: string, sites: any[], areas: any[], workCenters: any[]) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Enterprise KPI
  await prisma.enterpriseKPISummary.create({
    data: {
      id: 'ekpi-001',
      enterpriseId,
      oee: 0.82,
      availability: 0.90,
      performance: 0.95,
      quality: 0.96,
      mtbf: 720, // hours
      mttr: 2.5, // hours
      productionCount: BigInt(1250000),
      scrapRate: 0.04,
      energyConsumption: BigInt(850000), // kWh
      periodStart,
      periodEnd,
      updatedAt: new Date(),
    },
  });

  // Site KPIs
  for (const site of sites) {
    await prisma.siteKPISummary.create({
      data: {
        id: `skpi-${site.id}`,
        siteId: site.id,
        oee: 0.80 + Math.random() * 0.1,
        availability: 0.88 + Math.random() * 0.1,
        performance: 0.92 + Math.random() * 0.05,
        quality: 0.95 + Math.random() * 0.03,
        mtbf: 650 + Math.random() * 100,
        mttr: 2 + Math.random() * 1,
        productionCount: BigInt(Math.floor(500000 + Math.random() * 200000)),
        scrapRate: 0.03 + Math.random() * 0.02,
        energyConsumption: BigInt(Math.floor(400000 + Math.random() * 100000)),
        periodStart,
        periodEnd,
        updatedAt: new Date(),
      },
    });
  }

  // Area KPIs
  for (const area of areas) {
    await prisma.areaKPISummary.create({
      data: {
        id: `akpi-${area.id}`,
        areaId: area.id,
        oee: 0.78 + Math.random() * 0.12,
        availability: 0.85 + Math.random() * 0.1,
        performance: 0.90 + Math.random() * 0.08,
        quality: 0.94 + Math.random() * 0.04,
        mtbf: 600 + Math.random() * 150,
        mttr: 1.5 + Math.random() * 1.5,
        productionCount: BigInt(Math.floor(150000 + Math.random() * 100000)),
        scrapRate: 0.02 + Math.random() * 0.03,
        energyConsumption: BigInt(Math.floor(100000 + Math.random() * 50000)),
        periodStart,
        periodEnd,
        updatedAt: new Date(),
      },
    });
  }

  // WorkCenter KPIs
  for (const wc of workCenters) {
    await prisma.workCenterKPISummary.create({
      data: {
        id: `wckpi-${wc.id}`,
        workCenterId: wc.id,
        oee: 0.75 + Math.random() * 0.15,
        availability: 0.82 + Math.random() * 0.13,
        performance: 0.88 + Math.random() * 0.10,
        quality: 0.93 + Math.random() * 0.05,
        mtbf: 500 + Math.random() * 200,
        mttr: 1 + Math.random() * 2,
        productionCount: BigInt(Math.floor(30000 + Math.random() * 20000)),
        scrapRate: 0.01 + Math.random() * 0.04,
        energyConsumption: BigInt(Math.floor(20000 + Math.random() * 10000)),
        periodStart,
        periodEnd,
        updatedAt: new Date(),
      },
    });
  }
}

async function createProductionOrders(workCenters: any[]) {
  console.log('📋 Creating production orders...');
  
  const products = ['PART-A100', 'PART-B200', 'PART-C300', 'WIDGET-X1', 'COMPONENT-Y2'];
  const statuses = ['scheduled', 'in_progress', 'completed', 'on_hold'];
  
  const orders = [];
  for (let i = 0; i < 20; i++) {
    const targetStart = new Date();
    targetStart.setDate(targetStart.getDate() - Math.floor(Math.random() * 30));
    
    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetEnd.getDate() + Math.floor(Math.random() * 5) + 1);
    
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    orders.push({
      orderNumber: `PO-2024-${String(i + 1).padStart(4, '0')}`,
      product: products[Math.floor(Math.random() * products.length)],
      quantity: Math.floor(Math.random() * 1000) + 100,
      targetStartDate: targetStart,
      targetEndDate: targetEnd,
      actualStartDate: status !== 'scheduled' ? targetStart : null,
      actualEndDate: status === 'completed' ? targetEnd : null,
      status,
      priority: Math.floor(Math.random() * 5) + 1,
      workCenterId: workCenters[Math.floor(Math.random() * workCenters.length)].id,
    });
  }
  
  await prisma.productionOrder.createMany({ data: orders });
}

async function createMetrics(workCenters: any[]) {
  console.log('📊 Creating metrics...');
  
  const metricTypes = [
    { name: 'temperature', unit: '°C', category: 'equipment', min: 20, max: 80 },
    { name: 'pressure', unit: 'bar', category: 'equipment', min: 1, max: 10 },
    { name: 'vibration', unit: 'mm/s', category: 'equipment', min: 0, max: 5 },
    { name: 'speed', unit: 'rpm', category: 'equipment', min: 0, max: 3000 },
    { name: 'production_count', unit: 'units', category: 'production', min: 0, max: 100 },
    { name: 'cycle_time', unit: 'seconds', category: 'production', min: 10, max: 120 },
    { name: 'energy_consumption', unit: 'kWh', category: 'energy', min: 0, max: 500 },
    { name: 'oee', unit: '%', category: 'performance', min: 0, max: 1 },
    { name: 'availability', unit: '%', category: 'performance', min: 0, max: 1 },
    { name: 'performance', unit: '%', category: 'performance', min: 0, max: 1 },
    { name: 'quality', unit: '%', category: 'performance', min: 0, max: 1 },
    { name: 'defect_rate', unit: '%', category: 'quality', min: 0, max: 0.1 },
    { name: 'scrap_rate', unit: '%', category: 'quality', min: 0, max: 0.05 },
    { name: 'first_pass_yield', unit: '%', category: 'quality', min: 0.8, max: 1 },
  ];
  
  const now = new Date();
  const metrics = [];
  
  // Generate metrics for the last 24 hours
  for (let hours = 0; hours < 24; hours++) {
    for (const metricType of metricTypes) {
      // Generate metrics for some work centers
      for (let i = 0; i < workCenters.length; i++) {
        if (Math.random() > 0.3) { // 70% chance of having data
          const timestamp = new Date(now);
          timestamp.setHours(timestamp.getHours() - hours);
          
          const baseValue = metricType.min + (metricType.max - metricType.min) * (0.5 + Math.random() * 0.3);
          const value = baseValue + (Math.random() - 0.5) * (metricType.max - metricType.min) * 0.1;
          
          metrics.push({
            timestamp,
            name: metricType.name,
            category: metricType.category,
            value: Math.max(metricType.min, Math.min(metricType.max, value)),
            unit: metricType.unit,
            quality: 95 + Math.random() * 5,
            confidence: 90 + Math.random() * 10,
            source: Math.random() > 0.8 ? 'manual' : 'sensor',
            sensorId: `SENSOR-${workCenters[i].code}-${metricType.name.toUpperCase()}`,
            warningMin: metricType.min + (metricType.max - metricType.min) * 0.1,
            warningMax: metricType.max - (metricType.max - metricType.min) * 0.1,
            alarmMin: metricType.min,
            alarmMax: metricType.max,
            isValid: true,
            processed: true,
          });
        }
      }
    }
  }
  
  await prisma.metric.createMany({ data: metrics });
  console.log(`Created ${metrics.length} metrics`);
}

async function createAlerts(workCenters: any[]) {
  console.log('🚨 Creating alerts...');
  
  const alertTemplates = [
    {
      alertType: 'equipment',
      subType: 'temperature',
      severity: 'warning',
      title: 'High Temperature Warning',
      message: 'Temperature exceeds normal operating range',
    },
    {
      alertType: 'equipment',
      subType: 'maintenance',
      severity: 'medium',
      title: 'Maintenance Due',
      message: 'Scheduled maintenance is due in 24 hours',
    },
    {
      alertType: 'quality',
      subType: 'defect_rate',
      severity: 'high',
      title: 'High Defect Rate',
      message: 'Defect rate exceeds acceptable threshold',
    },
    {
      alertType: 'production',
      subType: 'efficiency',
      severity: 'low',
      title: 'Low Production Efficiency',
      message: 'Production efficiency below target',
    },
    {
      alertType: 'safety',
      subType: 'emergency_stop',
      severity: 'critical',
      title: 'Emergency Stop Activated',
      message: 'Emergency stop button pressed on equipment',
    },
  ];
  
  const alerts = [];
  const now = new Date();
  
  // Create some recent alerts
  for (let i = 0; i < 15; i++) {
    const template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
    const createdAt = new Date(now);
    createdAt.setHours(createdAt.getHours() - Math.floor(Math.random() * 48));
    
    const isActive = Math.random() > 0.4; // 60% active
    
    alerts.push({
      ...template,
      metricName: `${template.subType}_metric`,
      currentValue: Math.random() * 100,
      thresholdValue: 80,
      unit: template.alertType === 'temperature' ? '°C' : '%',
      status: isActive ? 'active' : 'resolved',
      timestamp: createdAt,
      acknowledgedAt: !isActive ? createdAt : null,
      resolvedAt: !isActive ? new Date(createdAt.getTime() + Math.random() * 3600000) : null,
      tags: [
        `area:${Math.floor(Math.random() * 3) + 1}`, 
        'auto-generated', 
        `workCenter:${workCenters[Math.floor(Math.random() * workCenters.length)].code}`,
        'monitoring-system'
      ],
      notes: `Auto-generated alert from monitoring system. WorkCenter: ${workCenters[Math.floor(Math.random() * workCenters.length)].code}`,
      priority: template.severity === 'critical' ? 'urgent' : template.severity === 'high' ? 'high' : 'medium',
    });
  }
  
  await prisma.alert.createMany({ data: alerts });
}

async function createMaintenanceRecords(workCenters: any[]) {
  console.log('🔧 Creating maintenance records...');
  
  const maintenanceTypes = [
    { type: 'preventive', subType: 'scheduled', description: 'Regular preventive maintenance' },
    { type: 'corrective', subType: 'unplanned', description: 'Corrective maintenance for equipment failure' },
    { type: 'predictive', subType: 'condition-based', description: 'Maintenance based on condition monitoring' },
  ];
  
  const records = [];
  const now = new Date();
  
  for (let i = 0; i < 25; i++) {
    const mType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
    const startTime = new Date(now);
    startTime.setDate(startTime.getDate() - Math.floor(Math.random() * 90));
    
    const duration = 0.5 + Math.random() * 4; // 0.5 to 4.5 hours
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + Math.floor(duration));
    
    records.push({
      maintenanceType: mType.type,
      subType: mType.subType,
      description: mType.description,
      workOrderNumber: `WO-2024-${String(i + 1).padStart(4, '0')}`,
      priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
      status: Math.random() > 0.2 ? 'completed' : 'in_progress',
      startTime,
      endTime: Math.random() > 0.2 ? endTime : null,
      plannedDuration: duration,
      actualDuration: Math.random() > 0.2 ? duration * (0.8 + Math.random() * 0.4) : null,
      technician: ['John Smith', 'Jane Doe', 'Bob Johnson'][Math.floor(Math.random() * 3)],
      team: ['Maintenance Team A', 'Maintenance Team B'][Math.floor(Math.random() * 2)],
      parts: Math.random() > 0.5 ? ['PART-001', 'PART-002', 'PART-003', 'PART-004'] : [],
      partsCost: Math.random() > 0.5 ? Math.floor(Math.random() * 500) + 50 : null,
      laborCost: Math.floor(duration * 75), // $75/hour
      totalCost: Math.floor(Math.random() * 1000) + 100,
      downtimeHours: duration,
      effectiveness: ['successful', 'partially_successful'][Math.floor(Math.random() * 2)],
      rootCauseFound: Math.random() > 0.3,
      notes: 'Maintenance completed successfully',
      attachments: [],
    });
  }
  
  await prisma.maintenanceRecord.createMany({ data: records });
}

async function createQualityData(workCenters: any[]) {
  console.log('✅ Creating quality data...');
  
  const products = ['PART-A100', 'PART-B200', 'PART-C300'];
  const inspectionTypes = ['incoming', 'in-process', 'final', 'random'];
  
  const qualityChecks = [];
  const now = new Date();
  
  // Get some production orders
  const orders = await prisma.productionOrder.findMany({ take: 10 });
  
  for (const order of orders) {
    // Create 2-5 quality checks per order
    const numChecks = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < numChecks; i++) {
      const inspectionDate = new Date(order.targetStartDate);
      inspectionDate.setHours(inspectionDate.getHours() + Math.floor(Math.random() * 24));
      
      const sampleSize = Math.floor(Math.random() * 50) + 10;
      const defects = Math.floor(Math.random() * sampleSize * 0.05); // Up to 5% defects
      
      qualityChecks.push({
        productionOrderId: order.id,
        checkType: inspectionTypes[Math.floor(Math.random() * inspectionTypes.length)],
        inspector: ['Alice Brown', 'Charlie Wilson', 'Dana Lee'][Math.floor(Math.random() * 3)],
        timestamp: inspectionDate,
        result: defects / sampleSize < 0.03 ? 'pass' : 'fail',
        notes: defects > 0 ? 'Minor defects found, within acceptable limits' : 'All samples passed inspection',
        defectTypes: defects > 0 ? ['dimensional', 'surface', 'functional'].slice(0, Math.floor(Math.random() * 3) + 1) : [],
        defectCounts: defects > 0 ? [Math.floor(defects * 0.5), Math.floor(defects * 0.3), Math.floor(defects * 0.2)] : [],
      });
    }
  }
  
  await prisma.qualityCheck.createMany({ data: qualityChecks });
  
  // Create quality metrics
  const qualityMetrics = [];
  for (let days = 0; days < 30; days++) {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    
    // First Pass Yield metric
    const fpyValue = 0.85 + Math.random() * 0.13; // 85-98% FPY
    qualityMetrics.push({
      timestamp: date,
      parameter: 'first_pass_yield',
      value: fpyValue,
      uom: 'percentage',
      lowerLimit: 0.80,
      upperLimit: 1.00,
      nominal: 0.95,
      lowerControlLimit: 0.85,
      upperControlLimit: 0.99,
      isWithinSpec: fpyValue >= 0.80,
      isInControl: fpyValue >= 0.85 && fpyValue <= 0.99,
      deviation: fpyValue - 0.95,
      zScore: (fpyValue - 0.95) / 0.03,
    });
    
    // Defect Rate metric
    const defectRate = 0.01 + Math.random() * 0.04; // 1-5% defect rate
    qualityMetrics.push({
      timestamp: date,
      parameter: 'defect_rate',
      value: defectRate,
      uom: 'percentage',
      lowerLimit: 0,
      upperLimit: 0.05,
      nominal: 0.02,
      lowerControlLimit: 0,
      upperControlLimit: 0.04,
      isWithinSpec: defectRate <= 0.05,
      isInControl: defectRate <= 0.04,
      deviation: defectRate - 0.02,
      zScore: (defectRate - 0.02) / 0.01,
    });
  }
  
  await prisma.qualityMetric.createMany({ data: qualityMetrics });
}

async function createDashboards(user: any) {
  console.log('📊 Creating dashboards...');
  
  const dashboards = [
    {
      id: 'dash-001',
      uid: 'production-overview',
      title: 'Production Overview',
      slug: 'production-overview',
      panels: JSON.stringify([
        {
          id: 1,
          type: 'stat',
          title: 'Current OEE',
          gridPos: { x: 0, y: 0, w: 6, h: 4 },
        },
        {
          id: 2,
          type: 'timeseries',
          title: 'Production Trend',
          gridPos: { x: 6, y: 0, w: 18, h: 8 },
        },
      ]),
      tags: ['production', 'overview'],
      createdBy: user.id,
      updatedAt: new Date(),
    },
    {
      id: 'dash-002',
      uid: 'quality-metrics',
      title: 'Quality Metrics',
      slug: 'quality-metrics',
      panels: JSON.stringify([
        {
          id: 1,
          type: 'gauge',
          title: 'First Pass Yield',
          gridPos: { x: 0, y: 0, w: 8, h: 8 },
        },
        {
          id: 2,
          type: 'piechart',
          title: 'Defect Types',
          gridPos: { x: 8, y: 0, w: 8, h: 8 },
        },
      ]),
      tags: ['quality', 'metrics'],
      createdBy: user.id,
      updatedAt: new Date(),
    },
  ];
  
  await prisma.dashboard.createMany({ data: dashboards });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });