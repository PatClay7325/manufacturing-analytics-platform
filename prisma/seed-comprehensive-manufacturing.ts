/**
 * Comprehensive Manufacturing Analytics Database Seeding
 * Populates the database with realistic manufacturing data for dashboard testing
 * 
 * Covers all data requirements for:
 * - OEE Metrics (ISO 22400 compliant)
 * - Equipment Health Metrics (ISO 14224 compliant)
 * - Production Metrics
 * - Quality Control
 * - Maintenance Records
 * - Energy Consumption
 * - Process Parameters
 * - Cost Tracking
 */

import { PrismaClient } from '@prisma/client';
// Using built-in crypto for random generation instead of faker for now
// import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Manufacturing data constants
const ENTERPRISES = ['AcmeCorp Manufacturing'];
const SITES = ['Plant A - Detroit', 'Plant B - Charlotte'];
const AREAS = ['Assembly Line 1', 'Assembly Line 2', 'Quality Control', 'Packaging'];
const WORK_CENTERS = ['Station 1', 'Station 2', 'Station 3', 'Inspection', 'Final Assembly'];
const EQUIPMENT_TYPES = ['CNC Machine', 'Robotic Arm', 'Conveyor Belt', 'Press', 'Welding Station', 'Inspection Station'];
const SHIFTS = ['A', 'B', 'C'];
const OPERATORS = ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Lisa Rodriguez', 'David Kim'];
const PRODUCTS = ['Widget A', 'Widget B', 'Component X', 'Assembly Y'];

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  // Clear in reverse dependency order
  await prisma.costMetric.deleteMany();
  await prisma.processParameter.deleteMany();
  await prisma.energyMetric.deleteMany();
  await prisma.equipmentHealth.deleteMany();
  await prisma.shiftReport.deleteMany();
  await prisma.productionLineMetric.deleteMany();
  await prisma.qualityMetric.deleteMany();
  await prisma.performanceMetric.deleteMany();
  await prisma.metric.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.qualityCheck.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productionData.deleteMany();
  await prisma.downtimeCause.deleteMany();
  await prisma.workUnitKPISummary.deleteMany();
  await prisma.workUnit.deleteMany();
  await prisma.workCenterKPISummary.deleteMany();
  await prisma.workCenter.deleteMany();
  await prisma.areaKPISummary.deleteMany();
  await prisma.area.deleteMany();
  await prisma.siteKPISummary.deleteMany();
  await prisma.site.deleteMany();
  await prisma.enterpriseKPISummary.deleteMany();
  await prisma.enterprise.deleteMany();
  
  console.log('✅ Database cleared');
}

async function createHierarchy() {
  console.log('🏭 Creating manufacturing hierarchy...');
  
  // Create Enterprise
  const enterprise = await prisma.enterprise.create({
    data: {
      id: 'ent-001',
      name: ENTERPRISES[0],
      code: 'ACME',
    }
  });

  // Create Sites
  const sites = [];
  for (let i = 0; i < SITES.length; i++) {
    const site = await prisma.site.create({
      data: {
        id: `site-00${i + 1}`,
        enterpriseId: enterprise.id,
        name: SITES[i],
        code: `SITE${i + 1}`,
        location: faker.location.city(),
      }
    });
    sites.push(site);
  }

  // Create Areas
  const areas = [];
  for (const site of sites) {
    for (let i = 0; i < AREAS.length; i++) {
      const area = await prisma.area.create({
        data: {
          id: `${site.id}-area-${i + 1}`,
          siteId: site.id,
          name: AREAS[i],
          code: `${site.code}-AREA${i + 1}`,
        }
      });
      areas.push(area);
    }
  }

  // Create Work Centers
  const workCenters = [];
  for (const area of areas) {
    for (let i = 0; i < 2; i++) { // 2 work centers per area
      const workCenter = await prisma.workCenter.create({
        data: {
          id: `${area.id}-wc-${i + 1}`,
          areaId: area.id,
          name: `${area.name} - ${WORK_CENTERS[i]}`,
          code: `${area.code}-WC${i + 1}`,
        }
      });
      workCenters.push(workCenter);
    }
  }

  // Create Work Units (Equipment)
  const workUnits = [];
  for (const workCenter of workCenters) {
    for (let i = 0; i < 3; i++) { // 3 work units per work center
      const equipmentType = EQUIPMENT_TYPES[i % EQUIPMENT_TYPES.length];
      const workUnit = await prisma.workUnit.create({
        data: {
          id: `${workCenter.id}-wu-${i + 1}`,
          workCenterId: workCenter.id,
          name: `${equipmentType} ${i + 1}`,
          code: `${workCenter.code}-WU${i + 1}`,
          equipmentType,
          model: faker.vehicle.model(),
          serialNumber: faker.string.alphanumeric(10).toUpperCase(),
          manufacturerCode: faker.company.name().substring(0, 8).toUpperCase(),
          installationDate: faker.date.past({ years: 5 }),
          status: faker.helpers.arrayElement(['operational', 'maintenance', 'idle']),
          location: `${workCenter.name} - Bay ${i + 1}`,
          description: `${equipmentType} used for manufacturing operations`,
        }
      });
      workUnits.push(workUnit);
    }
  }

  console.log(`✅ Created hierarchy: ${workUnits.length} work units across ${workCenters.length} work centers`);
  return { enterprise, sites, areas, workCenters, workUnits };
}

async function createUsers() {
  console.log('👥 Creating users...');
  
  const users = [];
  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.person.fullName(),
        role: faker.helpers.arrayElement(['admin', 'manager', 'operator', 'analyst']),
        department: faker.helpers.arrayElement(['Production', 'Quality', 'Maintenance', 'Engineering']),
        passwordHash: faker.string.alphanumeric(32),
      }
    });
    users.push(user);
  }

  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function generateOEEMetrics(workUnits: any[]) {
  console.log('📊 Generating OEE and Performance Metrics...');
  
  const now = new Date();
  const metrics = [];

  for (const workUnit of workUnits) {
    // Generate metrics for the last 30 days
    for (let day = 0; day < 30; day++) {
      for (let hour = 0; hour < 24; hour += 4) { // Every 4 hours
        const timestamp = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000) + (hour * 60 * 60 * 1000));
        
        // Simulate realistic OEE calculations
        const plannedProductionTime = 240; // 4 hours in minutes
        const operatingTime = plannedProductionTime * (0.75 + Math.random() * 0.2); // 75-95%
        const availability = operatingTime / plannedProductionTime;
        
        const targetThroughput = 60; // parts per hour
        const actualThroughput = targetThroughput * (0.8 + Math.random() * 0.25); // 80-105%
        const performance = actualThroughput / targetThroughput;
        
        const totalParts = Math.floor(actualThroughput * (operatingTime / 60));
        const goodParts = Math.floor(totalParts * (0.95 + Math.random() * 0.05)); // 95-100%
        const quality = totalParts > 0 ? goodParts / totalParts : 1;
        
        const oeeScore = availability * performance * quality;

        const metric = await prisma.performanceMetric.create({
          data: {
            workUnitId: workUnit.id,
            timestamp,
            availability: availability * 100,
            performance: performance * 100,
            quality: quality * 100,
            oeeScore: oeeScore * 100,
            plannedProductionTime,
            operatingTime,
            runTime: operatingTime * 0.9,
            plannedDowntime: 30, // 30 minutes planned
            unplannedDowntime: plannedProductionTime - operatingTime - 30,
            changeoverTime: faker.number.float({ min: 10, max: 60 }),
            idealCycleTime: 1, // 1 minute ideal
            actualCycleTime: 60 / actualThroughput,
            standardCycleTime: 1.1,
            totalParts,
            goodParts,
            rejectedParts: totalParts - goodParts,
            reworkParts: Math.floor((totalParts - goodParts) * 0.3),
            plannedProduction: Math.floor(targetThroughput * (operatingTime / 60)),
            shift: SHIFTS[hour < 8 ? 0 : hour < 16 ? 1 : 2],
            operator: faker.helpers.arrayElement(OPERATORS),
            productType: faker.helpers.arrayElement(PRODUCTS),
            firstPassYield: (goodParts / totalParts) * 100,
            scrapRate: ((totalParts - goodParts) / totalParts) * 100,
            throughputRate: actualThroughput,
            targetThroughput,
            speedLoss: Math.max(0, (1 - performance) * 100),
          }
        });
        metrics.push(metric);
      }
    }
  }

  console.log(`✅ Generated ${metrics.length} OEE metrics`);
  return metrics;
}

async function generateEquipmentHealth(workUnits: any[]) {
  console.log('🔧 Generating Equipment Health Metrics...');
  
  const healthRecords = [];
  
  for (const workUnit of workUnits) {
    // Calculate realistic reliability metrics
    const operatingHours = 8760 * (0.7 + Math.random() * 0.2); // 70-90% uptime per year
    const totalFailures = Math.floor(1 + Math.random() * 5); // 1-5 failures per year
    const mtbf = operatingHours / totalFailures;
    const mttr = 2 + Math.random() * 8; // 2-10 hours repair time
    const availability = operatingHours / (operatingHours + (totalFailures * mttr));
    
    const health = await prisma.equipmentHealth.create({
      data: {
        workUnitId: workUnit.id,
        overallHealth: 70 + Math.random() * 25, // 70-95% health
        mechanicalHealth: 75 + Math.random() * 20,
        electricalHealth: 80 + Math.random() * 15,
        softwareHealth: 85 + Math.random() * 10,
        mtbf,
        mttr,
        availability: availability * 100,
        reliability: (1 - (totalFailures / (operatingHours / 1000))) * 100,
        totalFailures,
        criticalFailures: Math.floor(totalFailures * 0.2),
        minorFailures: Math.floor(totalFailures * 0.8),
        operatingHours,
        totalDowntime: totalFailures * mttr,
        plannedDowntime: operatingHours * 0.1, // 10% planned downtime
        unplannedDowntime: totalFailures * mttr,
        vibrationLevel: 0.5 + Math.random() * 2, // mm/s vibration
        temperature: 60 + Math.random() * 20, // 60-80°C
        lubricationStatus: faker.helpers.arrayElement(['good', 'fair', 'poor']),
        wearLevel: Math.random() * 30, // 0-30% wear
        nextMaintenanceDue: faker.date.future(),
        maintenanceScore: 60 + Math.random() * 30,
        riskLevel: faker.helpers.arrayElement(['low', 'medium', 'high']),
      }
    });
    healthRecords.push(health);
  }

  console.log(`✅ Generated ${healthRecords.length} equipment health records`);
  return healthRecords;
}

async function generateMaintenanceRecords(workUnits: any[]) {
  console.log('🔧 Generating Maintenance Records...');
  
  const maintenanceRecords = [];
  
  for (const workUnit of workUnits) {
    // Generate 5-15 maintenance records per work unit
    const recordCount = 5 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < recordCount; i++) {
      const startTime = faker.date.past({ years: 1 });
      const endTime = new Date(startTime.getTime() + (1 + Math.random() * 8) * 60 * 60 * 1000); // 1-8 hours
      const actualDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      const record = await prisma.maintenanceRecord.create({
        data: {
          workUnitId: workUnit.id,
          maintenanceType: faker.helpers.arrayElement(['preventive', 'corrective', 'predictive', 'emergency']),
          subType: faker.helpers.arrayElement(['planned', 'unplanned', 'condition-based', 'calendar-based']),
          failureMode: faker.helpers.arrayElement(['mechanical', 'electrical', 'software', 'operator error']),
          failureCause: faker.helpers.arrayElement(['wear', 'fatigue', 'corrosion', 'design', 'installation']),
          description: faker.lorem.paragraph(),
          workOrderNumber: `WO-${faker.string.alphanumeric(8).toUpperCase()}`,
          priority: faker.helpers.arrayElement(['critical', 'high', 'medium', 'low']),
          technician: faker.person.fullName(),
          supervisor: faker.person.fullName(),
          team: faker.helpers.arrayElement(['Mechanical', 'Electrical', 'Controls']),
          startTime,
          endTime,
          plannedDuration: 4 + Math.random() * 4, // 4-8 hours planned
          actualDuration,
          status: faker.helpers.arrayElement(['completed', 'in_progress', 'scheduled']),
          parts: Array.from({ length: Math.floor(Math.random() * 5) }, () => 
            `PART-${faker.string.alphanumeric(6).toUpperCase()}`
          ),
          partsCost: 100 + Math.random() * 500,
          laborCost: actualDuration * (50 + Math.random() * 50), // $50-100/hour
          totalCost: 150 + Math.random() * 750,
          downtimeHours: actualDuration,
          restoreTime: actualDuration * 0.8,
          testTime: actualDuration * 0.2,
          effectiveness: faker.helpers.arrayElement(['successful', 'partially_successful', 'unsuccessful']),
          rootCauseFound: faker.datatype.boolean(),
          preventiveMeasures: faker.lorem.sentence(),
          notes: faker.lorem.paragraph(),
        }
      });
      maintenanceRecords.push(record);
    }
  }

  console.log(`✅ Generated ${maintenanceRecords.length} maintenance records`);
  return maintenanceRecords;
}

async function generateQualityMetrics(workUnits: any[]) {
  console.log('📋 Generating Quality Control Metrics...');
  
  const qualityMetrics = [];
  const parameters = ['Diameter', 'Length', 'Weight', 'Surface Finish', 'Hardness', 'Tensile Strength'];
  
  for (const workUnit of workUnits) {
    // Generate quality measurements for the last 30 days
    for (let day = 0; day < 30; day++) {
      for (const parameter of parameters) {
        const timestamp = new Date(Date.now() - (day * 24 * 60 * 60 * 1000));
        const nominal = 100; // Nominal value
        const tolerance = 5; // ±5 tolerance
        const value = nominal + (Math.random() - 0.5) * tolerance * 2;
        
        const metric = await prisma.qualityMetric.create({
          data: {
            workUnitId: workUnit.id,
            timestamp,
            parameter,
            value,
            uom: parameter === 'Weight' ? 'kg' : parameter === 'Diameter' || parameter === 'Length' ? 'mm' : 'units',
            lowerLimit: nominal - tolerance,
            upperLimit: nominal + tolerance,
            nominal,
            lowerControlLimit: nominal - tolerance * 0.6,
            upperControlLimit: nominal + tolerance * 0.6,
            isWithinSpec: Math.abs(value - nominal) <= tolerance,
            isInControl: Math.abs(value - nominal) <= tolerance * 0.6,
            deviation: value - nominal,
            zScore: (value - nominal) / (tolerance / 3),
            cpk: tolerance / (6 * (tolerance / 3)), // Simplified calculation
            qualityGrade: Math.abs(value - nominal) <= tolerance * 0.3 ? 'A' : 
                         Math.abs(value - nominal) <= tolerance * 0.6 ? 'B' : 'C',
            inspectionType: faker.helpers.arrayElement(['incoming', 'in-process', 'final', 'audit']),
            batchNumber: `BATCH-${faker.string.alphanumeric(6).toUpperCase()}`,
            inspector: faker.person.fullName(),
            shift: faker.helpers.arrayElement(SHIFTS),
            operator: faker.helpers.arrayElement(OPERATORS),
            measurementDevice: `${parameter}-Gauge-${Math.floor(Math.random() * 3) + 1}`,
            calibrationDate: faker.date.recent({ days: 90 }),
            disposition: Math.abs(value - nominal) <= tolerance ? 'accept' : 
                        Math.abs(value - nominal) <= tolerance * 1.2 ? 'rework' : 'reject',
          }
        });
        qualityMetrics.push(metric);
      }
    }
  }

  console.log(`✅ Generated ${qualityMetrics.length} quality metrics`);
  return qualityMetrics;
}

async function generateAlerts(workUnits: any[]) {
  console.log('🚨 Generating Alerts...');
  
  const alerts = [];
  const alertTypes = ['quality', 'equipment', 'production', 'safety', 'maintenance'];
  
  for (const workUnit of workUnits) {
    // Generate 3-8 alerts per work unit
    const alertCount = 3 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < alertCount; i++) {
      const alertType = faker.helpers.arrayElement(alertTypes);
      const severity = faker.helpers.arrayElement(['critical', 'high', 'medium', 'low', 'info']);
      
      const alert = await prisma.alert.create({
        data: {
          workUnitId: workUnit.id,
          alertType,
          subType: `${alertType}_${faker.number.int({ min: 1, max: 3 })}`,
          severity,
          priority: severity === 'critical' ? 'urgent' : severity,
          title: `${alertType.toUpperCase()} Alert - ${workUnit.name}`,
          message: faker.lorem.sentence(),
          metricName: faker.helpers.arrayElement(['temperature', 'pressure', 'vibration', 'speed']),
          currentValue: 75 + Math.random() * 50,
          thresholdValue: 100,
          unit: faker.helpers.arrayElement(['°C', 'bar', 'mm/s', 'rpm']),
          timestamp: faker.date.recent({ days: 7 }),
          status: faker.helpers.arrayElement(['active', 'acknowledged', 'resolved']),
          acknowledgedBy: faker.datatype.boolean() ? faker.person.fullName() : undefined,
          acknowledgedAt: faker.datatype.boolean() ? faker.date.recent({ days: 1 }) : undefined,
          resolutionTime: Math.random() * 240, // 0-4 hours
          tags: [alertType, severity, workUnit.equipmentType],
        }
      });
      alerts.push(alert);
    }
  }

  console.log(`✅ Generated ${alerts.length} alerts`);
  return alerts;
}

async function generateEnergyMetrics(workUnits: any[]) {
  console.log('⚡ Generating Energy Consumption Metrics...');
  
  const energyMetrics = [];
  
  for (const workUnit of workUnits) {
    // Generate hourly energy data for the last 7 days
    for (let hour = 0; hour < 7 * 24; hour++) {
      const timestamp = new Date(Date.now() - (hour * 60 * 60 * 1000));
      
      const metric = await prisma.energyMetric.create({
        data: {
          workUnitId: workUnit.id,
          timestamp,
          electricalConsumption: 50 + Math.random() * 100, // kWh
          gasConsumption: Math.random() * 20, // m³
          compressedAirConsumption: 10 + Math.random() * 30, // m³
          waterConsumption: 5 + Math.random() * 15, // liters
          energyPerUnit: 2 + Math.random() * 3, // kWh per unit
          powerFactor: 0.85 + Math.random() * 0.1,
          peakDemand: 75 + Math.random() * 50, // kW
          energyCost: (50 + Math.random() * 100) * 0.12, // $0.12/kWh
          costPerUnit: (2 + Math.random() * 3) * 0.12,
          carbonFootprint: (50 + Math.random() * 100) * 0.5, // kg CO2
          renewablePercent: 15 + Math.random() * 25, // 15-40% renewable
          productionVolume: Math.floor(40 + Math.random() * 40), // units produced
          shift: faker.helpers.arrayElement(SHIFTS),
        }
      });
      energyMetrics.push(metric);
    }
  }

  console.log(`✅ Generated ${energyMetrics.length} energy metrics`);
  return energyMetrics;
}

async function main() {
  try {
    console.log('🚀 Starting comprehensive manufacturing database seeding...');
    
    await clearDatabase();
    
    const users = await createUsers();
    const { workUnits } = await createHierarchy();
    
    // Generate all metrics in parallel for better performance
    await Promise.all([
      generateOEEMetrics(workUnits),
      generateEquipmentHealth(workUnits),
      generateMaintenanceRecords(workUnits),
      generateQualityMetrics(workUnits),
      generateAlerts(workUnits),
      generateEnergyMetrics(workUnits),
    ]);

    console.log('🎉 Database seeding completed successfully!');
    console.log(`
📊 Summary:
- Users: ${users.length}
- Work Units: ${workUnits.length}
- Comprehensive metrics generated across all models
- Data ready for dashboard visualization
    `);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export default main;