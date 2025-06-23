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
    
    // Create supporting data
    await createUsers(sites);
    await createEquipmentBasedMetrics(workCenters);
    await createAlerts(workCenters);
    await createMaintenanceRecords(workCenters);
    await createProductionOrders(workCenters);
    await createTimeSeriesMetrics(workCenters);
    await createQualityMetrics(workCenters);
    await createKPISummaries(enterprise, sites, areas, workCenters);

    console.log('\n✅ Hierarchical seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

async function cleanDatabase() {
  console.log('🧹 Cleaning database...');
  
  // Delete in correct order to respect foreign key constraints
  await prisma.folderActivity.deleteMany({});
  await prisma.folderAnalytics.deleteMany({});
  await prisma.folderShare.deleteMany({});
  await prisma.folderTemplate.deleteMany({});
  await prisma.folderPermission.deleteMany({});
  await prisma.dashboardFolder.deleteMany({});
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
  await prisma.workCenterKPISummary.deleteMany({});
  await prisma.areaKPISummary.deleteMany({});
  await prisma.siteKPISummary.deleteMany({});
  await prisma.enterpriseKPISummary.deleteMany({});
  await prisma.workCenter.deleteMany({});
  await prisma.area.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.apiKey.deleteMany({});
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

// Define equipment identifiers for each work center
const EQUIPMENT_MAP = {
  'wc-na001-aut-ba': [
    { equipmentId: 'EQ-RW-001', name: 'Robotic Welding Cell 1', assetTag: 'FANUC-R2K-001' },
    { equipmentId: 'EQ-RW-002', name: 'Robotic Welding Cell 2', assetTag: 'FANUC-R2K-002' },
  ],
  'wc-na001-aut-pt': [
    { equipmentId: 'EQ-PB-001', name: 'Paint Booth 1', assetTag: 'DURR-ERP-001' },
  ],
  'wc-na001-qc-di': [
    { equipmentId: 'EQ-CMM-001', name: 'CMM Station 1', assetTag: 'ZEISS-P10-001' },
  ],
  'wc-ap001-elec-pcb': [
    { equipmentId: 'EQ-SMT-001', name: 'SMT Line 1', assetTag: 'FUJI-NXT3-001' },
  ],
  'wc-ap001-elec-fa': [
    { equipmentId: 'EQ-FA-001', name: 'Final Assembly Station 1', assetTag: 'FA-STATION-001' },
  ],
  'wc-ap001-semi-wp': [
    { equipmentId: 'EQ-WP-001', name: 'Wafer Processing Unit 1', assetTag: 'WP-UNIT-001' },
  ],
};

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

async function createEquipmentBasedMetrics(workCenters: any[]) {
  console.log('\n📊 Creating Performance Metrics (Equipment-based)...');
  
  let metricsCount = 0;
  const now = new Date();
  
  for (const workCenter of workCenters) {
    const equipment = EQUIPMENT_MAP[workCenter.id as keyof typeof EQUIPMENT_MAP] || [];
    
    for (const equip of equipment) {
      // Create metrics for last 7 days
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour += 4) {
          const availability = 85 + Math.random() * 15;
          const performance = 80 + Math.random() * 20;
          const quality = 95 + Math.random() * 5;
          const oeeScore = (availability * performance * quality) / 10000;
          
          await prisma.performanceMetric.create({
            data: {
              timestamp: new Date(now.getTime() - (day * 24 + hour) * 60 * 60 * 1000),
              
              // Machine and Process Information
              machineName: equip.name,
              processName: `${workCenter.name} Process`,
              
              // Core Production Metrics  
              totalPartsProduced: Math.floor(150 + Math.random() * 100),
              totalParts: Math.floor(150 + Math.random() * 100), // Legacy compatibility
              goodParts: Math.floor(140 + Math.random() * 90),
              rejectParts: Math.floor(Math.random() * 10),
              rejectedParts: Math.floor(Math.random() * 10), // Legacy compatibility
              reworkParts: Math.floor(Math.random() * 5),
              plannedProduction: Math.floor(200 + Math.random() * 50),
              
              // Time Measurements (minutes)
              plannedProductionTime: 480.0, // 8 hours
              downtimeMinutes: Math.random() * 30,
              downtimeCategory: 'Equipment',
              downtimeReason: 'Maintenance',
              changeoverTimeMinutes: Math.random() * 15,
              cycleTimeSeconds: 45 + Math.random() * 10,
              
              // Core OEE Components (ISO 22400 compliant)
              availability,
              performance,
              quality,
              oeeScore,
              normalizedOEE: oeeScore * (0.95 + Math.random() * 0.1),
              
              // Reliability Metrics (ISO 14224)
              mtbf: 70 + Math.random() * 30,
              mttr: 2 + Math.random() * 3,
              failureRate: Math.random() * 0.05,
              
              // Utilization Metrics
              machineUtilizationPercentage: 85 + Math.random() * 15,
              operatorUtilizationPercentage: 80 + Math.random() * 20,
              downtimePercentage: Math.random() * 10,
              
              // Quality Metrics
              yieldPercentage: 95 + Math.random() * 5,
              firstPassYield: 92 + Math.random() * 8,
              scrapRate: Math.random() * 3,
              reworkRate: Math.random() * 2,
              
              // Environmental Metrics
              energyConsumed_kWh: 15 + Math.random() * 5,
              energyCost_USD: (15 + Math.random() * 5) * 0.12,
              emissions_kg: (15 + Math.random() * 5) * 0.5,
              
              // Operational Context
              operatorName: `Operator-${Math.floor(Math.random() * 10) + 1}`,
              shift: hour < 8 ? 'Night' : hour < 16 ? 'Day' : 'Evening',
              batchNumber: `BATCH-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
              
              // ISO-compliant equipment identification
              equipmentId: equip.equipmentId,
              plantCode: workCenter.code.split('-')[1].toUpperCase(), // Extract site code
              assetTag: equip.assetTag,
              workCenterId: workCenter.id,
            },
          });
          metricsCount++;
        }
      }
    }
  }
  
  console.log(`✅ Created ${metricsCount} performance metrics`);
}

async function createAlerts(workCenters: any[]) {
  console.log('\n🚨 Creating Alerts...');
  
  const alertTypes = ['Temperature High', 'Vibration Abnormal', 'Pressure Low', 'Quality Issue', 'Maintenance Due'];
  const severities = ['low', 'medium', 'high', 'critical'] as const;
  const statuses = ['active', 'acknowledged', 'resolved'] as const;
  
  const alerts = [];
  
  for (let i = 0; i < 15; i++) {
    const workCenter = workCenters[Math.floor(Math.random() * workCenters.length)];
    const equipment = EQUIPMENT_MAP[workCenter.id as keyof typeof EQUIPMENT_MAP] || [];
    const equip = equipment[Math.floor(Math.random() * equipment.length)] || equipment[0];
    
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    if (equip) {
      const alert = await prisma.alert.create({
        data: {
          // Alert Classification
          alertType: alertType.toLowerCase().replace(' ', '_'),
          subType: 'equipment_monitoring',
          severity,
          priority: severity === 'critical' ? 'urgent' : severity === 'high' ? 'high' : 'medium',
          
          // Alert Content
          title: `${alertType} Alert`,
          message: `${alertType} detected on ${equip.name}`,
          
          // Alert Context
          metricName: alertType.toLowerCase().replace(' ', '_'),
          currentValue: 75 + Math.random() * 25,
          thresholdValue: 85.0,
          unit: alertType.includes('Temperature') ? '°C' : alertType.includes('Pressure') ? 'bar' : 'units',
          
          // Status and Lifecycle
          status,
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          
          // Alert Handling
          acknowledgedBy: status !== 'active' ? 'Operator-1' : null,
          acknowledgedAt: status !== 'active' ? new Date() : null,
          resolvedBy: status === 'resolved' ? 'Technician-1' : null,
          resolvedAt: status === 'resolved' ? new Date() : null,
          
          // Resolution Details
          resolutionTime: status === 'resolved' ? 15 + Math.random() * 45 : null,
          rootCause: status === 'resolved' ? 'Equipment maintenance required' : null,
          correctiveAction: status === 'resolved' ? 'Performed routine maintenance' : null,
          
          // Notification Tracking
          notificationsSent: status !== 'active' ? ['email', 'sms'] : [],
          recipientsList: status !== 'active' ? ['maintenance@company.com', 'operator@company.com'] : [],
          
          notes: status !== 'active' ? `Handled by maintenance team` : null,
          tags: [alertType.toLowerCase(), workCenter.name.toLowerCase()],
          
          // ISO-compliant equipment identification
          equipmentId: equip.equipmentId,
          plantCode: workCenter.code.split('-')[1].toUpperCase(),
          assetTag: equip.assetTag,
        },
      });
      alerts.push(alert);
    }
  }
  
  console.log(`✅ Created ${alerts.length} alerts`);
  return alerts;
}

async function createMaintenanceRecords(workCenters: any[]) {
  console.log('\n🔧 Creating Maintenance Records...');
  
  const maintenanceTypes = ['preventive', 'corrective', 'predictive', 'emergency'];
  const statuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
  
  const records = [];
  
  for (let i = 0; i < 10; i++) {
    const workCenter = workCenters[Math.floor(Math.random() * workCenters.length)];
    const equipment = EQUIPMENT_MAP[workCenter.id as keyof typeof EQUIPMENT_MAP] || [];
    const equip = equipment[Math.floor(Math.random() * equipment.length)] || equipment[0];
    
    if (equip) {
      const maintenanceType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const record = await prisma.maintenanceRecord.create({
        data: {
          // ISO-compliant equipment identification
          equipmentId: equip.equipmentId,
          plantCode: workCenter.code.split('-')[1].toUpperCase(), // Extract site code
          assetTag: equip.assetTag,
          
          // Maintenance details
          maintenanceType,
          description: `${maintenanceType} maintenance for ${equip.name}`,
          technician: `Technician-${Math.floor(Math.random() * 5) + 1}`,
          startTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          endTime: status === 'completed' ? new Date() : null,
          status,
          notes: status === 'completed' ? 'Maintenance completed successfully' : null,
          parts: ['Filter', 'Oil', 'Belt'],
          
          // Additional ISO 14224 fields
          priority: 'medium',
          effectiveness: status === 'completed' ? 'successful' : null,
          rootCauseFound: status === 'completed',
        },
      });
      records.push(record);
    }
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

async function createTimeSeriesMetrics(workCenters: any[]) {
  console.log('\n📈 Creating Time-Series Metrics...');
  
  const metricNames = ['temperature', 'pressure', 'vibration', 'power_consumption'];
  const units = { temperature: '°C', pressure: 'bar', vibration: 'mm/s', power_consumption: 'kW' };
  
  let metricsCount = 0;
  const now = new Date();
  
  for (const workCenter of workCenters) {
    const equipment = EQUIPMENT_MAP[workCenter.id as keyof typeof EQUIPMENT_MAP] || [];
    
    for (const equip of equipment) {
      // Create metrics for last 24 hours
      for (let hour = 0; hour < 24; hour++) {
        for (const metricName of metricNames) {
          await prisma.metric.create({
            data: {
              // Metric data
              timestamp: new Date(now.getTime() - hour * 60 * 60 * 1000),
              name: metricName,
              category: 'equipment',
              value: metricName === 'temperature' ? 65 + Math.random() * 10 :
                     metricName === 'pressure' ? 4 + Math.random() * 2 :
                     metricName === 'vibration' ? 0.5 + Math.random() * 1 :
                     15 + Math.random() * 5,
              unit: units[metricName as keyof typeof units],
              quality: 95 + Math.random() * 5,
              confidence: 90 + Math.random() * 10,
              
              // Contextual Information
              tags: { equipmentId: equip.equipmentId, assetTag: equip.assetTag, workCenter: workCenter.name },
              source: 'SCADA',
              sensorId: `${equip.equipmentId}_${metricName}_sensor`,
              
              // Statistical Information
              minValue: metricName === 'temperature' ? 60 : metricName === 'pressure' ? 3 : metricName === 'vibration' ? 0.3 : 12,
              maxValue: metricName === 'temperature' ? 80 : metricName === 'pressure' ? 6 : metricName === 'vibration' ? 1.2 : 20,
              
              // Thresholds and Alerts
              warningMin: metricName === 'temperature' ? 62 : metricName === 'pressure' ? 3.5 : metricName === 'vibration' ? 0.4 : 13,
              warningMax: metricName === 'temperature' ? 75 : metricName === 'pressure' ? 5.5 : metricName === 'vibration' ? 1.0 : 18,
              alarmMin: metricName === 'temperature' ? 60 : metricName === 'pressure' ? 3.0 : metricName === 'vibration' ? 0.3 : 12,
              alarmMax: metricName === 'temperature' ? 80 : metricName === 'pressure' ? 6.0 : metricName === 'vibration' ? 1.2 : 20,
              
              // Data Validation
              isValid: true,
              validationErrors: [],
            },
          });
          metricsCount++;
        }
      }
    }
  }
  
  console.log(`✅ Created ${metricsCount} time-series metrics`);
}

async function createQualityMetrics(workCenters: any[]) {
  console.log('\n🔍 Creating Quality Metrics...');
  
  let metricsCount = 0;
  
  for (const workCenter of workCenters) {
    const equipment = EQUIPMENT_MAP[workCenter.id as keyof typeof EQUIPMENT_MAP] || [];
    
    for (const equip of equipment) {
      // Create quality metrics
      const parameters = ['dimension', 'weight', 'surface_finish', 'hardness'];
      
      for (const parameter of parameters) {
        const value = parameter === 'dimension' ? 10 + Math.random() * 0.1 :
                      parameter === 'weight' ? 250 + Math.random() * 5 :
                      parameter === 'surface_finish' ? 0.8 + Math.random() * 0.4 :
                      65 + Math.random() * 5;
        
        const lowerLimit = parameter === 'dimension' ? 9.95 :
                          parameter === 'weight' ? 245 :
                          parameter === 'surface_finish' ? 0.5 :
                          60;
        
        const upperLimit = parameter === 'dimension' ? 10.05 :
                          parameter === 'weight' ? 255 :
                          parameter === 'surface_finish' ? 1.5 :
                          70;
        
        const nominal = parameter === 'dimension' ? 10.0 :
                       parameter === 'weight' ? 250 :
                       parameter === 'surface_finish' ? 1.0 :
                       65;
        
        const isWithinSpec = value >= lowerLimit && value <= upperLimit;
        const deviation = Math.abs(value - nominal);
        
        await prisma.qualityMetric.create({
          data: {
            timestamp: new Date(),
            
            // Measurement Details
            parameter,
            value,
            uom: parameter === 'dimension' ? 'mm' :
                 parameter === 'weight' ? 'g' :
                 parameter === 'surface_finish' ? 'µm' :
                 'HRC',
            
            // Control Limits (Statistical Process Control)
            lowerLimit,
            upperLimit,
            nominal,
            lowerControlLimit: lowerLimit + (upperLimit - lowerLimit) * 0.1,
            upperControlLimit: upperLimit - (upperLimit - lowerLimit) * 0.1,
            
            // Statistical Analysis
            isWithinSpec,
            isInControl: isWithinSpec,
            deviation,
            zScore: deviation / (upperLimit - lowerLimit) * 6, // Rough Z-score calculation
            cpk: isWithinSpec ? 1.33 + Math.random() * 0.67 : 0.5 + Math.random() * 0.5,
            
            // Quality Classification
            qualityGrade: isWithinSpec ? 'A' : 'B',
            defectType: !isWithinSpec ? (value < lowerLimit ? 'undersized' : 'oversized') : null,
            defectSeverity: !isWithinSpec ? 'minor' : null,
            inspectionType: 'in-process',
            
            // Contextual Information
            batchNumber: `BATCH-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
            serialNumber: `SN-${String(Math.floor(Math.random() * 10000)).padStart(6, '0')}`,
            inspector: `Inspector-${Math.floor(Math.random() * 5) + 1}`,
            shift: Math.random() < 0.5 ? 'Day' : 'Night',
            operator: `Operator-${Math.floor(Math.random() * 10) + 1}`,
            
            // Measurement Equipment
            measurementDevice: parameter === 'dimension' ? 'Caliper' :
                              parameter === 'weight' ? 'Scale' :
                              parameter === 'surface_finish' ? 'Profilometer' :
                              'Hardness Tester',
            calibrationDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
            measurementAccuracy: 0.01,
            
            // Disposition
            disposition: isWithinSpec ? 'accept' : 'rework',
            reworkReason: !isWithinSpec ? 'Out of specification' : null,
            reworkCost: !isWithinSpec ? 25 + Math.random() * 75 : null,
            
            // ISO-compliant equipment identification
            equipmentId: equip.equipmentId,
            plantCode: workCenter.code.split('-')[1].toUpperCase(),
            assetTag: equip.assetTag,
            workCenterId: workCenter.id,
          },
        });
        metricsCount++;
      }
    }
  }
  
  console.log(`✅ Created ${metricsCount} quality metrics`);
}

async function createKPISummaries(enterprise: any, sites: any[], areas: any[], workCenters: any[]) {
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
  
  // Area KPI Summaries
  for (const [index, area] of areas.entries()) {
    await prisma.areaKPISummary.create({
      data: {
        id: `akpi-${area.id}`,
        areaId: area.id,
        oee: 78 + Math.random() * 12,
        availability: 83 + Math.random() * 12,
        performance: 83 + Math.random() * 12,
        quality: 88 + Math.random() * 10,
        mtbf: 65 + Math.random() * 25,
        mttr: 2.5 + Math.random() * 2.5,
        productionCount: BigInt(20000 + index * 10000),
        scrapRate: 2.5 + Math.random() * 3.5,
        energyConsumption: BigInt(40000 + index * 20000),
        periodStart,
        periodEnd,
        updatedAt: new Date(),
      },
    });
  }
  
  // Work Center KPI Summaries
  for (const [index, workCenter] of workCenters.entries()) {
    await prisma.workCenterKPISummary.create({
      data: {
        id: `wckpi-${workCenter.id}`,
        workCenterId: workCenter.id,
        oee: 75 + Math.random() * 15,
        availability: 80 + Math.random() * 15,
        performance: 80 + Math.random() * 15,
        quality: 85 + Math.random() * 12,
        mtbf: 60 + Math.random() * 30,
        mttr: 3 + Math.random() * 3,
        productionCount: BigInt(8000 + index * 4000),
        scrapRate: 3 + Math.random() * 4,
        energyConsumption: BigInt(15000 + index * 10000),
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