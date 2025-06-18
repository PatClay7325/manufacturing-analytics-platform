import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed script for Manufacturing Intelligence Platform
 * 
 * This script populates the database with initial data for development and testing
 */
async function main() {
  console.log('Starting seed process...');

  // Clean existing data for a fresh start
  await cleanDatabase();

  // Create Equipment data
  await seedEquipment();

  // Create Production Lines
  await seedProductionLines();

  // Create Performance Metrics
  await seedPerformanceMetrics();

  // Create Maintenance Records
  await seedMaintenanceRecords();

  // Create Quality Metrics
  await seedQualityMetrics();

  // Create Alerts
  await seedAlerts();

  // Create Users
  await seedUsers();

  // Create Settings
  await seedSettings();

  console.log('Seed completed successfully!');
}

/**
 * Clean the database for a fresh seed
 */
async function cleanDatabase() {
  console.log('Cleaning database...');
  
  // Delete in order to respect foreign key constraints
  await prisma.metric.deleteMany({}); // Delete metrics first (they reference equipment)
  await prisma.qualityCheck.deleteMany({});
  await prisma.qualityMetric.deleteMany({});
  await prisma.performanceMetric.deleteMany({});
  await prisma.maintenanceRecord.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  await prisma.equipment.deleteMany({});
  await prisma.productionLine.deleteMany({});
  await prisma.dashboard.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.setting.deleteMany({});
  
  console.log('Database cleaned.');
}

/**
 * Seed Equipment data
 */
async function seedEquipment() {
  console.log('Seeding equipment...');
  
  const equipmentData = [
    {
      name: 'CNC Machine 1',
      type: 'CNC',
      manufacturerCode: 'HAAS-F1',
      serialNumber: 'CNC-12345',
      installationDate: new Date('2022-01-15'),
      status: 'operational',
      location: 'Building A, Floor 1',
      model: 'HAAS VF-2',
    },
    {
      name: 'Injection Molder 2',
      type: 'Injection Molding',
      manufacturerCode: 'ENGEL-IM',
      serialNumber: 'IM-54321',
      installationDate: new Date('2021-11-05'),
      status: 'maintenance',
      location: 'Building B, Floor 2',
      model: 'ENGEL E-motion 160',
    },
    {
      name: 'Assembly Robot 3',
      type: 'Robot',
      manufacturerCode: 'FANUC-R2000',
      serialNumber: 'ROB-67890',
      installationDate: new Date('2022-03-20'),
      status: 'operational',
      location: 'Building A, Floor 2',
      model: 'FANUC R-2000iC',
    },
    {
      name: 'Conveyor System A',
      type: 'Conveyor',
      manufacturerCode: 'DORNER-CV',
      serialNumber: 'CNV-24680',
      installationDate: new Date('2021-08-10'),
      status: 'operational',
      location: 'Building A, Floor 1',
      model: 'Dorner 2200',
    },
    {
      name: 'Packaging Machine 5',
      type: 'Packaging',
      manufacturerCode: 'BOSCH-PM',
      serialNumber: 'PKG-13579',
      installationDate: new Date('2022-02-08'),
      status: 'error',
      location: 'Building C, Floor 1',
      model: 'Bosch Pack 301',
    }
  ];
  
  for (const equipment of equipmentData) {
    await prisma.equipment.create({
      data: equipment
    });
  }
  
  console.log(`Created ${equipmentData.length} equipment records.`);
}

/**
 * Seed Production Lines data
 */
async function seedProductionLines() {
  console.log('Seeding production lines...');
  
  // Get equipment IDs for associations
  const equipment = await prisma.equipment.findMany();
  
  const productionLinesData = [
    {
      name: 'Main Assembly Line',
      department: 'Assembly',
      description: 'Primary assembly line for product A and B',
      status: 'active',
      equipment: {
        connect: [
          { id: equipment[0].id },
          { id: equipment[2].id },
          { id: equipment[3].id }
        ]
      }
    },
    {
      name: 'Packaging Line 1',
      department: 'Packaging',
      description: 'Packaging line for finished products',
      status: 'active',
      equipment: {
        connect: [
          { id: equipment[3].id },
          { id: equipment[4].id }
        ]
      }
    },
    {
      name: 'Injection Molding Line',
      department: 'Manufacturing',
      description: 'Plastic parts production',
      status: 'maintenance',
      equipment: {
        connect: [
          { id: equipment[1].id }
        ]
      }
    }
  ];
  
  for (const line of productionLinesData) {
    await prisma.productionLine.create({
      data: line
    });
  }
  
  console.log(`Created ${productionLinesData.length} production lines.`);
  
  // Now create some production orders
  const productionLines = await prisma.productionLine.findMany();
  
  const productionOrdersData = [
    {
      orderNumber: 'PO-2023-001',
      productionLineId: productionLines[0].id,
      product: 'Product A',
      quantity: 5000,
      targetStartDate: new Date('2023-05-01'),
      targetEndDate: new Date('2023-05-03'),
      actualStartDate: new Date('2023-05-01'),
      actualEndDate: new Date('2023-05-04'),
      status: 'completed',
      priority: 2
    },
    {
      orderNumber: 'PO-2023-002',
      productionLineId: productionLines[0].id,
      product: 'Product B',
      quantity: 3000,
      targetStartDate: new Date('2023-05-05'),
      targetEndDate: new Date('2023-05-07'),
      actualStartDate: new Date('2023-05-05'),
      status: 'in-progress',
      priority: 1
    },
    {
      orderNumber: 'PO-2023-003',
      productionLineId: productionLines[1].id,
      product: 'Product C',
      quantity: 8000,
      targetStartDate: new Date('2023-05-10'),
      targetEndDate: new Date('2023-05-15'),
      status: 'scheduled',
      priority: 3
    }
  ];
  
  for (const order of productionOrdersData) {
    await prisma.productionOrder.create({
      data: order
    });
  }
  
  console.log(`Created ${productionOrdersData.length} production orders.`);
}

/**
 * Seed Performance Metrics data
 */
async function seedPerformanceMetrics() {
  console.log('Seeding performance metrics...');
  
  // Get equipment and production lines for associations
  const equipment = await prisma.equipment.findMany();
  const productionLines = await prisma.productionLine.findMany();
  
  // Generate metrics for the last 30 days
  const now = new Date();
  const metrics = [];
  
  // For each equipment
  for (const equip of equipment) {
    // If status is operational, generate 30 days of data
    if (equip.status === 'operational') {
      for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Generate slightly randomized metrics
        const availability = 0.85 + (Math.random() * 0.1);
        const performance = 0.8 + (Math.random() * 0.15);
        const quality = 0.95 + (Math.random() * 0.05);
        const oeeScore = availability * performance * quality;
        
        metrics.push({
          equipmentId: equip.id,
          timestamp: date,
          availability,
          performance,
          quality,
          oeeScore,
          runTime: 480 - (Math.random() * 50),  // Out of 8 hours (480 minutes)
          plannedDowntime: 30 + (Math.random() * 20),
          unplannedDowntime: Math.random() * 30,
          idealCycleTime: 30,
          actualCycleTime: 30 + (Math.random() * 5),
          totalParts: 500 + Math.floor(Math.random() * 100),
          goodParts: 485 + Math.floor(Math.random() * 15),
          shift: i % 3 === 0 ? 'morning' : i % 3 === 1 ? 'afternoon' : 'night',
          operator: `Operator ${(i % 5) + 1}`
        });
      }
    }
  }
  
  // For each production line
  for (const line of productionLines) {
    if (line.status === 'active') {
      for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Generate slightly different metrics for production lines
        const availability = 0.8 + (Math.random() * 0.15);
        const performance = 0.75 + (Math.random() * 0.2);
        const quality = 0.9 + (Math.random() * 0.09);
        const oeeScore = availability * performance * quality;
        
        metrics.push({
          productionLineId: line.id,
          timestamp: date,
          availability,
          performance,
          quality,
          oeeScore,
          runTime: 460 - (Math.random() * 60),
          plannedDowntime: 40 + (Math.random() * 20),
          unplannedDowntime: 10 + (Math.random() * 40),
          shift: i % 3 === 0 ? 'morning' : i % 3 === 1 ? 'afternoon' : 'night'
        });
      }
    }
  }
  
  // Create all metrics
  await prisma.performanceMetric.createMany({
    data: metrics
  });
  
  console.log(`Created ${metrics.length} performance metrics.`);
}

/**
 * Seed Maintenance Records data
 */
async function seedMaintenanceRecords() {
  console.log('Seeding maintenance records...');
  
  const equipment = await prisma.equipment.findMany();
  const maintenanceRecords = [];
  
  // Generate past maintenance records
  for (const equip of equipment) {
    // Create completed records
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const startTime = new Date(date);
      const endTime = new Date(date);
      endTime.setHours(endTime.getHours() + 2 + Math.floor(Math.random() * 3));
      
      maintenanceRecords.push({
        equipmentId: equip.id,
        maintenanceType: i % 3 === 0 ? 'preventive' : i % 3 === 1 ? 'corrective' : 'predictive',
        description: `${i % 3 === 0 ? 'Regular' : i % 3 === 1 ? 'Emergency' : 'Scheduled'} maintenance for ${equip.name}`,
        technician: `Technician ${(i % 3) + 1}`,
        startTime,
        endTime,
        status: 'completed',
        notes: 'Maintenance completed successfully',
        parts: i % 2 === 0 ? ['Filter', 'Lubricant'] : ['Belt', 'Bearing', 'Sensor']
      });
    }
    
    // Create one scheduled maintenance for the future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7 + Math.floor(Math.random() * 14));
    
    maintenanceRecords.push({
      equipmentId: equip.id,
      maintenanceType: 'preventive',
      description: `Scheduled maintenance for ${equip.name}`,
      technician: `Technician ${Math.floor(Math.random() * 3) + 1}`,
      startTime: futureDate,
      status: 'scheduled',
      notes: 'Regular preventive maintenance',
      parts: ['Filter', 'Lubricant', 'Seals']
    });
    
    // If equipment is currently in maintenance, add an in-progress record
    if (equip.status === 'maintenance') {
      const today = new Date();
      
      maintenanceRecords.push({
        equipmentId: equip.id,
        maintenanceType: 'corrective',
        description: `Urgent repair for ${equip.name}`,
        technician: `Technician ${Math.floor(Math.random() * 3) + 1}`,
        startTime: today,
        status: 'in-progress',
        notes: 'Addressing unexpected issues with the equipment',
        parts: ['Controller', 'Motor', 'Wiring']
      });
    }
  }
  
  // Create all maintenance records
  await prisma.maintenanceRecord.createMany({
    data: maintenanceRecords
  });
  
  console.log(`Created ${maintenanceRecords.length} maintenance records.`);
}

/**
 * Seed Quality Metrics data
 */
async function seedQualityMetrics() {
  console.log('Seeding quality metrics...');
  
  const equipment = await prisma.equipment.findMany();
  const qualityMetrics = [];
  
  // Parameters to measure
  const parameters = [
    { name: 'dimension', nominal: 100, lowerLimit: 99.5, upperLimit: 100.5, uom: 'mm' },
    { name: 'weight', nominal: 500, lowerLimit: 495, upperLimit: 505, uom: 'g' },
    { name: 'surface_finish', nominal: 1.6, lowerLimit: 0.8, upperLimit: 3.2, uom: 'Ra' },
    { name: 'hardness', nominal: 45, lowerLimit: 40, upperLimit: 50, uom: 'HRC' },
    { name: 'color_consistency', nominal: 0, lowerLimit: -0.5, upperLimit: 0.5, uom: 'dE' }
  ];
  
  // Generate quality metrics for each equipment
  for (const equip of equipment) {
    // Generate 50 quality measurements per equipment
    for (let i = 0; i < 50; i++) {
      // Select a random parameter
      const paramIndex = Math.floor(Math.random() * parameters.length);
      const param = parameters[paramIndex];
      
      // Generate a value that's usually within spec but occasionally out
      let value;
      const isWithinSpec = Math.random() < 0.95; // 95% within spec
      
      if (isWithinSpec) {
        // Within spec
        value = param.nominal + (Math.random() * (param.upperLimit - param.lowerLimit) - (param.upperLimit - param.nominal));
      } else {
        // Out of spec
        if (Math.random() < 0.5) {
          // Below lower limit
          value = param.lowerLimit - (Math.random() * param.lowerLimit * 0.05);
        } else {
          // Above upper limit
          value = param.upperLimit + (Math.random() * param.upperLimit * 0.05);
        }
      }
      
      // Calculate deviation
      const deviation = value - param.nominal;
      
      // Create timestamp within last 30 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      qualityMetrics.push({
        equipmentId: equip.id,
        timestamp: date,
        parameter: param.name,
        value,
        uom: param.uom,
        lowerLimit: param.lowerLimit,
        upperLimit: param.upperLimit,
        nominal: param.nominal,
        isWithinSpec: value >= param.lowerLimit && value <= param.upperLimit,
        deviation
      });
    }
  }
  
  // Create all quality metrics
  await prisma.qualityMetric.createMany({
    data: qualityMetrics
  });
  
  console.log(`Created ${qualityMetrics.length} quality metrics.`);
  
  // Create some quality checks for production orders
  const productionOrders = await prisma.productionOrder.findMany();
  const qualityChecks = [];
  
  for (const order of productionOrders) {
    // Only create checks for in-progress or completed orders
    if (order.status === 'in-progress' || order.status === 'completed') {
      // Create in-process checks
      for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (10 - i * 3));
        
        const passed = Math.random() < 0.9; // 90% pass rate
        
        qualityChecks.push({
          productionOrderId: order.id,
          checkType: 'in-process',
          inspector: `Inspector ${(i % 3) + 1}`,
          timestamp: date,
          result: passed ? 'pass' : 'fail',
          notes: passed ? 'All specifications met' : 'Issues found during inspection',
          defectTypes: passed ? [] : ['Dimensional', 'Surface finish'],
          defectCounts: passed ? [] : [2, 1]
        });
      }
      
      // Create final check for completed orders
      if (order.status === 'completed') {
        const date = new Date(order.actualEndDate!);
        
        qualityChecks.push({
          productionOrderId: order.id,
          checkType: 'final',
          inspector: 'QA Manager',
          timestamp: date,
          result: 'pass', // Completed orders always passed final QC
          notes: 'Final quality check passed. Product approved for shipment.',
          defectTypes: [],
          defectCounts: []
        });
      }
    }
  }
  
  await prisma.qualityCheck.createMany({
    data: qualityChecks
  });
  
  console.log(`Created ${qualityChecks.length} quality checks.`);
}

/**
 * Seed Alerts data
 */
async function seedAlerts() {
  console.log('Seeding alerts...');
  
  const equipment = await prisma.equipment.findMany();
  const alerts = [];
  
  // Alert types and messages
  const alertTypes = [
    { type: 'maintenance', severity: 'medium', message: 'Scheduled maintenance due' },
    { type: 'maintenance', severity: 'high', message: 'Critical maintenance required' },
    { type: 'quality', severity: 'medium', message: 'Quality metrics approaching threshold' },
    { type: 'quality', severity: 'high', message: 'Quality metrics exceeding threshold' },
    { type: 'performance', severity: 'low', message: 'Performance below target' },
    { type: 'performance', severity: 'medium', message: 'Significant performance drop detected' },
    { type: 'safety', severity: 'critical', message: 'Emergency stop triggered' }
  ];
  
  // For each equipment, create some alerts
  for (const equip of equipment) {
    // Create 1-3 alerts per equipment
    const alertCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < alertCount; i++) {
      // Pick a random alert type
      const alertInfo = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      
      // Create a timestamp within the last 3 days
      const date = new Date();
      date.setHours(date.getHours() - Math.floor(Math.random() * 72));
      
      // Determine status - newer alerts are more likely to be active
      let status;
      const hoursAgo = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (hoursAgo < 24) {
        status = Math.random() < 0.7 ? 'active' : 'acknowledged';
      } else if (hoursAgo < 48) {
        status = Math.random() < 0.4 ? 'active' : Math.random() < 0.7 ? 'acknowledged' : 'resolved';
      } else {
        status = Math.random() < 0.2 ? 'active' : Math.random() < 0.4 ? 'acknowledged' : 'resolved';
      }
      
      // For acknowledged and resolved alerts, add the relevant information
      let acknowledgedBy, acknowledgedAt, resolvedBy, resolvedAt;
      
      if (status === 'acknowledged' || status === 'resolved') {
        acknowledgedBy = `User ${Math.floor(Math.random() * 3) + 1}`;
        acknowledgedAt = new Date(date.getTime() + 1000 * 60 * (Math.floor(Math.random() * 60) + 15));
      }
      
      if (status === 'resolved') {
        resolvedBy = `User ${Math.floor(Math.random() * 3) + 1}`;
        resolvedAt = new Date(acknowledgedAt!.getTime() + 1000 * 60 * (Math.floor(Math.random() * 120) + 30));
      }
      
      alerts.push({
        equipmentId: equip.id,
        alertType: alertInfo.type,
        severity: alertInfo.severity,
        message: `${alertInfo.message} for ${equip.name}`,
        status,
        timestamp: date,
        acknowledgedBy,
        acknowledgedAt,
        resolvedBy,
        resolvedAt,
        notes: status === 'resolved' ? 'Issue has been addressed' : undefined
      });
    }
    
    // If equipment is in error status, add a critical active alert
    if (equip.status === 'error') {
      alerts.push({
        equipmentId: equip.id,
        alertType: 'maintenance',
        severity: 'critical',
        message: `Equipment failure detected on ${equip.name}`,
        status: 'active',
        timestamp: new Date(new Date().getTime() - 1000 * 60 * 30) // 30 minutes ago
      });
    }
  }
  
  // Create all alerts
  await prisma.alert.createMany({
    data: alerts
  });
  
  console.log(`Created ${alerts.length} alerts.`);
}

/**
 * Seed Users data
 */
async function seedUsers() {
  console.log('Seeding users...');
  
  // Create standard password hash for all test users
  const passwordHash = await hash('Password123!', 10);
  
  const usersData = [
    {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      department: 'IT',
      passwordHash,
      lastLogin: new Date()
    },
    {
      email: 'manager@example.com',
      name: 'Production Manager',
      role: 'manager',
      department: 'Production',
      passwordHash,
      lastLogin: new Date(new Date().setDate(new Date().getDate() - 1))
    },
    {
      email: 'engineer@example.com',
      name: 'Process Engineer',
      role: 'engineer',
      department: 'Engineering',
      passwordHash,
      lastLogin: new Date(new Date().setDate(new Date().getDate() - 2))
    },
    {
      email: 'operator@example.com',
      name: 'Machine Operator',
      role: 'operator',
      department: 'Production',
      passwordHash,
      lastLogin: new Date(new Date().setHours(new Date().getHours() - 8))
    }
  ];
  
  await prisma.user.createMany({
    data: usersData
  });
  
  console.log(`Created ${usersData.length} users.`);
}

/**
 * Seed Settings data
 */
async function seedSettings() {
  console.log('Seeding settings...');
  
  const settingsData = [
    {
      key: 'oee_target',
      value: '85',
      category: 'system'
    },
    {
      key: 'quality_threshold',
      value: '99',
      category: 'system'
    },
    {
      key: 'maintenance_notification_lead_time',
      value: '48', // hours
      category: 'notification'
    },
    {
      key: 'dashboard_refresh_interval',
      value: '5', // minutes
      category: 'user'
    },
    {
      key: 'ollama_host',
      value: 'http://localhost:11434',
      category: 'integration'
    },
    {
      key: 'maintenance_reminder_enabled',
      value: 'true',
      category: 'notification'
    },
    {
      key: 'alert_email_notifications',
      value: 'true',
      category: 'notification'
    }
  ];
  
  await prisma.setting.createMany({
    data: settingsData
  });
  
  console.log(`Created ${settingsData.length} settings.`);
}

// Execute the main function
main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Close Prisma Client at the end
    await prisma.$disconnect();
  });