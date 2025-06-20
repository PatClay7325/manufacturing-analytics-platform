/**
 * Minimal Manufacturing Analytics Database Seeding
 * Creates essential test data for dashboard functionality
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper functions for random data generation
function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 15)}`;
}

// Manufacturing data constants
const ENTERPRISES = ['AcmeCorp Manufacturing'];
const SITES = ['Plant A - Detroit', 'Plant B - Charlotte'];
const AREAS = ['Assembly Line 1', 'Assembly Line 2', 'Quality Control', 'Packaging'];
const EQUIPMENT_TYPES = ['CNC Machine', 'Robotic Arm', 'Conveyor Belt', 'Press', 'Welding Station'];
const SHIFTS = ['A', 'B', 'C'];
const OPERATORS = ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Lisa Rodriguez', 'David Kim'];
const PRODUCTS = ['Widget A', 'Widget B', 'Component X', 'Assembly Y'];

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  // Clear in dependency order (all dependent records first)
  await prisma.costMetric.deleteMany();
  await prisma.processParameter.deleteMany();
  await prisma.energyMetric.deleteMany();
  await prisma.productionLineMetric.deleteMany();
  await prisma.shiftReport.deleteMany();
  await prisma.equipmentHealth.deleteMany();
  await prisma.performanceMetric.deleteMany();
  await prisma.qualityMetric.deleteMany();
  await prisma.metric.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.alert.deleteMany();
  
  // Clear KPI summaries that reference entities
  await prisma.workUnitKPISummary.deleteMany();
  await prisma.workCenterKPISummary.deleteMany();
  await prisma.areaKPISummary.deleteMany();
  await prisma.siteKPISummary.deleteMany();
  await prisma.enterpriseKPISummary.deleteMany();
  
  // Clear hierarchy entities
  await prisma.workUnit.deleteMany();
  await prisma.workCenter.deleteMany();
  await prisma.area.deleteMany();
  await prisma.site.deleteMany();
  await prisma.enterprise.deleteMany();
  
  console.log('✅ Database cleared');
}

async function createBasicHierarchy() {
  console.log('🏭 Creating basic manufacturing hierarchy...');
  
  // Create Enterprise
  const enterprise = await prisma.enterprise.create({
    data: {
      id: 'ent-001',
      name: ENTERPRISES[0],
      code: 'ACME',
      updatedAt: new Date(),
    }
  });

  // Create Sites
  const site = await prisma.site.create({
    data: {
      id: 'site-001',
      enterpriseId: enterprise.id,
      name: SITES[0],
      code: 'SITE1',
      location: 'Detroit, MI',
      updatedAt: new Date(),
    }
  });

  // Create Areas
  const area = await prisma.area.create({
    data: {
      id: 'area-001',
      siteId: site.id,
      name: AREAS[0],
      code: 'AREA1',
      updatedAt: new Date(),
    }
  });

  // Create Work Centers
  const workCenter = await prisma.workCenter.create({
    data: {
      id: 'wc-001',
      areaId: area.id,
      name: 'Assembly Station 1',
      code: 'WC001',
      updatedAt: new Date(),
    }
  });

  // Create Work Units (Equipment)
  const workUnits = [];
  for (let i = 0; i < 5; i++) {
    const equipmentType = EQUIPMENT_TYPES[i % EQUIPMENT_TYPES.length];
    const workUnit = await prisma.workUnit.create({
      data: {
        id: `wu-00${i + 1}`,
        workCenterId: workCenter.id,
        name: `${equipmentType} ${i + 1}`,
        code: `WU00${i + 1}`,
        equipmentType,
        model: `Model-${i + 1}`,
        serialNumber: `SN${String(1000 + i).padStart(6, '0')}`,
        manufacturerCode: 'MANUF001',
        installationDate: new Date('2020-01-01'),
        status: randomChoice(['operational', 'maintenance', 'idle']),
        location: `Bay ${i + 1}`,
        description: `${equipmentType} for manufacturing operations`,
        updatedAt: new Date(),
      }
    });
    workUnits.push(workUnit);
  }

  console.log(`✅ Created hierarchy with ${workUnits.length} work units`);
  return { enterprise, site, area, workCenter, workUnits };
}

async function generateSampleOEEMetrics(workUnits: any[]) {
  console.log('📊 Generating sample OEE metrics...');
  
  const now = new Date();
  const metrics = [];

  for (const workUnit of workUnits) {
    // Generate metrics for the last 7 days, every 4 hours
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour += 4) {
        const timestamp = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000) + (hour * 60 * 60 * 1000));
        
        // Simulate realistic OEE calculations
        const plannedProductionTime = 240; // 4 hours in minutes
        const operatingTime = plannedProductionTime * randomFloat(0.75, 0.95); // 75-95%
        const availability = operatingTime / plannedProductionTime;
        
        const targetThroughput = 60; // parts per hour
        const actualThroughput = targetThroughput * randomFloat(0.8, 1.05); // 80-105%
        const performance = actualThroughput / targetThroughput;
        
        const totalParts = Math.floor(actualThroughput * (operatingTime / 60));
        const goodParts = Math.floor(totalParts * randomFloat(0.95, 1.0)); // 95-100%
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
            changeoverTime: randomFloat(10, 60),
            idealCycleTime: 1, // 1 minute ideal
            actualCycleTime: 60 / actualThroughput,
            standardCycleTime: 1.1,
            totalParts,
            goodParts,
            rejectedParts: totalParts - goodParts,
            reworkParts: Math.floor((totalParts - goodParts) * 0.3),
            plannedProduction: Math.floor(targetThroughput * (operatingTime / 60)),
            shift: SHIFTS[Math.floor(hour / 8)],
            operator: randomChoice(OPERATORS),
            productType: randomChoice(PRODUCTS),
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

async function generateSampleEquipmentHealth(workUnits: any[]) {
  console.log('🔧 Generating sample equipment health records...');
  
  const healthRecords = [];
  
  for (const workUnit of workUnits) {
    // Calculate realistic reliability metrics
    const operatingHours = 8760 * randomFloat(0.7, 0.9); // 70-90% uptime per year
    const totalFailures = randomInt(1, 5); // 1-5 failures per year
    const mtbf = operatingHours / totalFailures;
    const mttr = randomFloat(2, 10); // 2-10 hours repair time
    const availability = operatingHours / (operatingHours + (totalFailures * mttr));
    
    const health = await prisma.equipmentHealth.create({
      data: {
        workUnitId: workUnit.id,
        overallHealth: randomFloat(70, 95), // 70-95% health
        mechanicalHealth: randomFloat(75, 95),
        electricalHealth: randomFloat(80, 95),
        softwareHealth: randomFloat(85, 95),
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
        vibrationLevel: randomFloat(0.5, 2.5), // mm/s vibration
        temperature: randomFloat(60, 80), // 60-80°C
        lubricationStatus: randomChoice(['good', 'fair', 'poor']),
        wearLevel: randomFloat(0, 30), // 0-30% wear
        nextMaintenanceDue: new Date(Date.now() + randomInt(1, 30) * 24 * 60 * 60 * 1000),
        maintenanceScore: randomFloat(60, 90),
        riskLevel: randomChoice(['low', 'medium', 'high']),
      }
    });
    healthRecords.push(health);
  }

  console.log(`✅ Generated ${healthRecords.length} equipment health records`);
  return healthRecords;
}

async function generateSampleQualityMetrics(workUnits: any[]) {
  console.log('📋 Generating sample quality metrics...');
  
  const qualityMetrics = [];
  const parameters = ['Diameter', 'Length', 'Weight', 'Surface Finish', 'Hardness'];
  
  for (const workUnit of workUnits) {
    // Generate quality measurements for the last 7 days
    for (let day = 0; day < 7; day++) {
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
            inspectionType: randomChoice(['incoming', 'in-process', 'final', 'audit']),
            batchNumber: `BATCH-${String(randomInt(1000, 9999))}`,
            inspector: randomChoice(OPERATORS),
            shift: randomChoice(SHIFTS),
            operator: randomChoice(OPERATORS),
            measurementDevice: `${parameter}-Gauge-${randomInt(1, 3)}`,
            calibrationDate: new Date(Date.now() - randomInt(1, 90) * 24 * 60 * 60 * 1000),
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

async function generateSampleAlerts(workUnits: any[]) {
  console.log('🚨 Generating sample alerts...');
  
  const alerts = [];
  const alertTypes = ['quality', 'equipment', 'production', 'safety', 'maintenance'];
  
  for (const workUnit of workUnits) {
    // Generate 2-5 alerts per work unit
    const alertCount = randomInt(2, 5);
    
    for (let i = 0; i < alertCount; i++) {
      const alertType = randomChoice(alertTypes);
      const severity = randomChoice(['critical', 'high', 'medium', 'low', 'info']);
      
      const alert = await prisma.alert.create({
        data: {
          workUnitId: workUnit.id,
          alertType,
          subType: `${alertType}_${randomInt(1, 3)}`,
          severity,
          priority: severity === 'critical' ? 'urgent' : severity,
          title: `${alertType.toUpperCase()} Alert - ${workUnit.name}`,
          message: `${alertType} issue detected on ${workUnit.name}`,
          metricName: randomChoice(['temperature', 'pressure', 'vibration', 'speed']),
          currentValue: randomFloat(75, 125),
          thresholdValue: 100,
          unit: randomChoice(['°C', 'bar', 'mm/s', 'rpm']),
          timestamp: new Date(Date.now() - randomInt(1, 7) * 24 * 60 * 60 * 1000),
          status: randomChoice(['active', 'acknowledged', 'resolved']),
          acknowledgedBy: Math.random() > 0.5 ? randomChoice(OPERATORS) : undefined,
          acknowledgedAt: Math.random() > 0.5 ? new Date(Date.now() - randomInt(1, 24) * 60 * 60 * 1000) : undefined,
          resolutionTime: randomFloat(0, 240), // 0-4 hours
          tags: [alertType, severity, workUnit.equipmentType],
          updatedAt: new Date(),
        }
      });
      alerts.push(alert);
    }
  }

  console.log(`✅ Generated ${alerts.length} alerts`);
  return alerts;
}

async function generateMaintenanceRecords(workUnits: any[]) {
  console.log('🔧 Generating maintenance records...');
  
  const maintenanceRecords = [];
  
  for (const workUnit of workUnits) {
    // Generate 3-5 maintenance records per work unit
    const recordCount = randomInt(3, 5);
    
    for (let i = 0; i < recordCount; i++) {
      const startTime = new Date(Date.now() - randomInt(1, 90) * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + randomFloat(1, 8) * 60 * 60 * 1000);
      const actualDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      const record = await prisma.maintenanceRecord.create({
        data: {
          workUnitId: workUnit.id,
          maintenanceType: randomChoice(['preventive', 'corrective', 'predictive', 'emergency']),
          subType: randomChoice(['planned', 'unplanned', 'condition-based', 'calendar-based']),
          failureMode: randomChoice(['mechanical', 'electrical', 'software', 'operator error']),
          failureCause: randomChoice(['wear', 'fatigue', 'corrosion', 'design', 'installation']),
          description: `Maintenance performed on ${workUnit.name}`,
          workOrderNumber: `WO-${generateId('').substring(0, 8).toUpperCase()}`,
          priority: randomChoice(['critical', 'high', 'medium', 'low']),
          technician: randomChoice(OPERATORS),
          supervisor: randomChoice(OPERATORS),
          team: randomChoice(['Mechanical', 'Electrical', 'Controls']),
          startTime,
          endTime,
          plannedDuration: randomFloat(2, 6),
          actualDuration,
          status: 'completed',
          parts: [`PART-${randomInt(1000, 9999)}`],
          partsCost: randomFloat(50, 500),
          laborCost: actualDuration * randomFloat(50, 100),
          totalCost: randomFloat(150, 1500),
          downtimeHours: actualDuration,
          effectiveness: randomChoice(['successful', 'partially_successful']),
          rootCauseFound: Math.random() > 0.3,
          notes: 'Routine maintenance completed',
          updatedAt: new Date(),
        }
      });
      maintenanceRecords.push(record);
    }
  }

  console.log(`✅ Generated ${maintenanceRecords.length} maintenance records`);
  return maintenanceRecords;
}

async function generateEnergyMetrics(workUnits: any[]) {
  console.log('⚡ Generating energy metrics...');
  
  const energyMetrics = [];
  const now = new Date();
  
  for (const workUnit of workUnits) {
    // Generate hourly energy data for the last 24 hours
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(now.getTime() - hour * 60 * 60 * 1000);
      const baseConsumption = randomFloat(50, 150);
      
      const metric = await prisma.energyMetric.create({
        data: {
          workUnitId: workUnit.id,
          timestamp,
          electricalConsumption: baseConsumption,
          gasConsumption: randomFloat(0, 20),
          compressedAirConsumption: randomFloat(10, 40),
          waterConsumption: randomFloat(5, 20),
          energyPerUnit: randomFloat(2, 5),
          powerFactor: randomFloat(0.85, 0.95),
          peakDemand: baseConsumption * randomFloat(1.1, 1.5),
          energyCost: baseConsumption * 0.12,
          costPerUnit: randomFloat(0.24, 0.60),
          carbonFootprint: baseConsumption * 0.5,
          renewablePercent: randomFloat(15, 40),
          productionVolume: randomInt(30, 80),
          shift: SHIFTS[Math.floor(hour / 8)]
        }
      });
      energyMetrics.push(metric);
    }
  }

  console.log(`✅ Generated ${energyMetrics.length} energy metrics`);
  return energyMetrics;
}

async function generateProductionLineMetrics(workUnits: any[]) {
  console.log('🏭 Generating production line metrics...');
  
  const productionMetrics = [];
  const now = new Date();
  
  for (const workUnit of workUnits) {
    // Generate metrics for last 7 days, every 4 hours
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour += 4) {
        const timestamp = new Date(now.getTime() - (day * 24 + hour) * 60 * 60 * 1000);
        
        const throughput = randomFloat(50, 120);
        const targetThroughput = 100;
        
        const metric = await prisma.productionLineMetric.create({
          data: {
            lineId: `LINE-${workUnit.id}-${day}-${hour}`,
            timestamp,
            actualThroughput: throughput,
            targetThroughput,
            throughputEfficiency: (throughput / targetThroughput) * 100,
            bottleneckStation: randomChoice(['Station1', 'Station2', 'Station3', null]),
            flowRate: randomFloat(45, 110),
            balanceEfficiency: randomFloat(70, 95),
            totalCycleTime: randomFloat(30, 90),
            taktTime: 60, // 60 seconds takt time
            cycleTimeVariance: randomFloat(5, 20),
            firstPassYield: randomFloat(92, 99),
            lineYield: randomFloat(88, 96),
            qualityIssues: Math.random() > 0.7 ? ['Minor surface defects'] : [],
            changeoverTime: randomFloat(15, 45),
            changeoverCount: randomInt(0, 3),
            setupTime: randomFloat(5, 20),
            materialUtilization: randomFloat(85, 98),
            wasteGenerated: randomFloat(2, 10),
            recycledMaterial: randomFloat(50, 90),
            energyConsumption: randomFloat(100, 300),
            energyEfficiency: randomFloat(70, 90),
            productType: randomChoice(PRODUCTS)
          }
        });
        productionMetrics.push(metric);
      }
    }
  }

  console.log(`✅ Generated ${productionMetrics.length} production line metrics`);
  return productionMetrics;
}

async function generateShiftReports(workUnits: any[]) {
  console.log('📋 Generating shift reports...');
  
  const shiftReports = [];
  const now = new Date();
  
  // Generate shift reports for last 7 days
  for (let day = 0; day < 7; day++) {
    for (const shift of SHIFTS) {
      const shiftDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
      shiftDate.setHours(shift === 'A' ? 6 : shift === 'B' ? 14 : 22, 0, 0, 0);
      
      const actualProduction = randomInt(200, 500);
      const targetProduction = 400;
      
      const report = await prisma.shiftReport.create({
        data: {
          shiftId: `SR-${shift}-${shiftDate.toISOString().split('T')[0]}-${day}`,
          date: shiftDate,
          shift,
          supervisor: randomChoice(OPERATORS),
          operators: [randomChoice(OPERATORS), randomChoice(OPERATORS), randomChoice(OPERATORS)],
          staffingLevel: randomFloat(80, 100),
          targetProduction,
          actualProduction,
          productionEfficiency: (actualProduction / targetProduction) * 100,
          qualityTarget: 98,
          actualQuality: randomFloat(95, 99.5),
          qualityIssues: Math.random() > 0.7 ? ['Minor defects found'] : [],
          equipmentUptime: randomFloat(85, 98),
          breakdowns: randomInt(0, 2),
          maintenanceIssues: Math.random() > 0.8 ? ['Scheduled maintenance delayed'] : [],
          safetyIncidents: randomInt(0, 1),
          nearMisses: randomInt(0, 2),
          complianceIssues: [],
          handoverNotes: `Shift ${shift} summary for ${shiftDate.toDateString()}`,
          improvements: Math.random() > 0.5 ? ['Process optimization identified'] : [],
          suggestions: Math.random() > 0.5 ? ['Increase preventive maintenance'] : [],
          openIssues: Math.random() > 0.7 ? ['Equipment calibration pending'] : [],
        }
      });
      shiftReports.push(report);
    }
  }

  console.log(`✅ Generated ${shiftReports.length} shift reports`);
  return shiftReports;
}

async function main() {
  try {
    console.log('🚀 Starting minimal manufacturing database seeding...');
    
    await clearDatabase();
    
    const { workUnits } = await createBasicHierarchy();
    
    // Generate sample data
    await Promise.all([
      generateSampleOEEMetrics(workUnits),
      generateSampleEquipmentHealth(workUnits),
      generateSampleQualityMetrics(workUnits),
      generateSampleAlerts(workUnits),
      generateMaintenanceRecords(workUnits),
      generateEnergyMetrics(workUnits),
      generateProductionLineMetrics(workUnits),
      generateShiftReports(workUnits),
    ]);

    console.log('🎉 Database seeding completed successfully!');
    console.log(`
📊 Summary:
- Work Units: ${workUnits.length}
- Sample metrics generated for dashboard testing
- Ready for visualization
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