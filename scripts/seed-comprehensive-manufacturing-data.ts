import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper functions for generating realistic data
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateTimestamp(daysAgo: number = 0, hoursAgo: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(date.getHours() - hoursAgo);
  return date;
}

// Manufacturing data arrays
const equipmentNumbers = ['EQ-001', 'EQ-002', 'EQ-003', 'EQ-004', 'EQ-005', 'EQ-006', 'EQ-007', 'EQ-008', 'EQ-009', 'EQ-010'];
const processNames = ['CNC Machining', 'Injection Molding', 'Assembly Line', 'Welding Station', 'Painting Booth', 'Quality Control', 'Packaging Line', 'Laser Cutting', '3D Printing', 'Stamping Press'];
const partNumbers = ['PN-10001', 'PN-10002', 'PN-10003', 'PN-10004', 'PN-10005', 'PN-20001', 'PN-20002', 'PN-30001', 'PN-40001', 'PN-50001'];
const productTypes = ['Automotive Component', 'Electronics Housing', 'Medical Device', 'Aerospace Part', 'Consumer Product', 'Industrial Tool', 'Safety Equipment', 'HVAC Component', 'Machinery Part', 'Electrical Connector'];
const downtimeCategories = ['Mechanical Failure', 'Electrical Issue', 'Material Shortage', 'Planned Maintenance', 'Tool Change', 'Quality Issue', 'Operator Break', 'Setup/Changeover', 'Power Outage', 'Software Error'];
const downtimeReasons = [
  'Bearing failure', 'Motor overheating', 'Sensor malfunction', 'PLC error', 'Material jam',
  'Tool wear', 'Calibration required', 'Emergency stop activated', 'Network connectivity issue',
  'Hydraulic leak', 'Air pressure loss', 'Temperature out of range', 'Vibration detected',
  'Safety interlock triggered', 'Operator training'
];
const errorCodes = ['E001', 'E002', 'E003', 'E004', 'E005', 'W001', 'W002', 'C001', 'M001', 'S001'];
const errorDescriptions = [
  'Temperature exceeded threshold', 'Pressure out of range', 'Vibration limit exceeded',
  'Communication timeout', 'Sensor reading invalid', 'Low material warning',
  'Maintenance due soon', 'Calibration required', 'Motor current high', 'System reboot required'
];
const incidentTypes = ['Quality Defect', 'Safety Near Miss', 'Equipment Damage', 'Process Deviation', 'Environmental Spill'];
const incidentSeverities = ['Low', 'Medium', 'High', 'Critical'];
const incidentCategories = ['Human Error', 'Equipment Failure', 'Process Issue', 'External Factor', 'Unknown'];
const operatorNames = ['John Smith', 'Maria Garcia', 'David Chen', 'Sarah Johnson', 'Michael Brown', 'Lisa Wong', 'Robert Taylor', 'Jennifer Lee', 'James Wilson', 'Patricia Davis'];
const shifts = ['Day Shift', 'Evening Shift', 'Night Shift', 'Weekend Shift'];
const supplierNames = ['Acme Supplies Inc', 'Global Materials Ltd', 'TechParts Co', 'Industrial Solutions', 'Quality Components Corp'];
const siteNames = ['Plant A - Detroit', 'Plant B - Chicago', 'Plant C - Houston', 'Plant D - Phoenix', 'Plant E - Seattle'];
const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East'];
const anomalyReasons = ['Unusual vibration pattern', 'Temperature spike detected', 'Abnormal cycle time', 'Quality deviation', 'Energy consumption anomaly'];

async function seedManufacturingData() {
  console.log('🏭 Starting comprehensive manufacturing data seed...');

  try {
    // Clear existing data
    await prisma.performanceMetric.deleteMany();
    console.log('✓ Cleared existing performance metrics');

    const records = [];
    const now = new Date();
    const daysToGenerate = 90; // 3 months of data
    const recordsPerDay = 50; // Multiple records per day

    for (let day = 0; day < daysToGenerate; day++) {
      for (let record = 0; record < recordsPerDay; record++) {
        const timestamp = generateTimestamp(day, getRandomInt(0, 23));
        const equipmentNumber = getRandomElement(equipmentNumbers);
        const processName = getRandomElement(processNames);
        const partNumber = getRandomElement(partNumbers);
        
        // Production metrics
        const plannedProductionTime = getRandomInt(420, 480); // 7-8 hours in minutes
        const downtimeMinutes = getRandomInt(0, 120);
        const actualProductionTime = plannedProductionTime - downtimeMinutes;
        const totalPartsProduced = getRandomInt(800, 1200);
        const rejectParts = getRandomInt(0, Math.floor(totalPartsProduced * 0.05)); // Max 5% rejects
        const goodParts = totalPartsProduced - rejectParts;
        
        // OEE Calculations
        const availability = ((actualProductionTime / plannedProductionTime) * 100);
        const performance = getRandomFloat(75, 95);
        const quality = ((goodParts / totalPartsProduced) * 100);
        const oee = (availability * performance * quality) / 10000;
        
        // Additional OEE metrics
        const normalizedOEE = oee * getRandomFloat(0.95, 1.05);
        const simulatedOEE = oee * getRandomFloat(0.98, 1.02);
        const previousMonthOEE = oee * getRandomFloat(0.92, 1.08);
        const industryBenchmarkOEE = 85;
        const deviationFromBenchmark = oee - industryBenchmarkOEE;
        
        // Reliability metrics
        const mtbf = getRandomInt(100, 500); // Mean Time Between Failures (hours)
        const mttr = getRandomFloat(0.5, 4.0); // Mean Time To Repair (hours)
        const failureRate = 1 / mtbf;
        const remainingUsefulLife = getRandomInt(1000, 10000); // hours
        const confidenceInterval = getRandomFloat(0.85, 0.99);
        
        // Utilization metrics
        const machineUtilizationPercentage = getRandomFloat(60, 95);
        const operatorUtilizationPercentage = getRandomFloat(70, 90);
        
        // Energy and environmental metrics
        const energyConsumed = getRandomFloat(50, 500); // kWh
        const energyCost = energyConsumed * 0.12; // $0.12 per kWh
        const emissions = energyConsumed * 0.5; // kg CO2
        const waterUsage = getRandomInt(100, 1000); // liters
        const wasteGenerated = getRandomFloat(5, 50); // kg
        const recycledMaterial = wasteGenerated * getRandomFloat(0.3, 0.8); // kg
        
        // Financial metrics
        const costPerUnitProduced = getRandomFloat(10, 100);
        const revenueGenerated = goodParts * costPerUnitProduced * 1.3; // 30% margin
        const simulatedRevenueGrowth = getRandomFloat(-5, 15); // percentage
        
        // Process metrics
        const cycleTimeSeconds = getRandomInt(30, 300);
        const changeoverTimeMinutes = getRandomInt(10, 60);
        const yieldPercentage = (goodParts / totalPartsProduced) * 100;
        
        // Create the record
        const manufacturingRecord = {
          machineName: equipmentNumber,
          processName: processName,
          timestamp: timestamp,
          
          // Core production metrics
          totalPartsProduced: totalPartsProduced,
          goodParts: goodParts,
          rejectParts: rejectParts,
          plannedProduction: totalPartsProduced,
          
          // Time measurements
          plannedProductionTime: plannedProductionTime,
          downtimeMinutes: downtimeMinutes,
          downtimeTimestamp: downtimeMinutes > 0 ? generateTimestamp(day, getRandomInt(0, 23)) : null,
          downtimeCategory: downtimeMinutes > 0 ? getRandomElement(downtimeCategories) : null,
          downtimeReason: downtimeMinutes > 0 ? getRandomElement(downtimeReasons) : null,
          cycleTimeSeconds: cycleTimeSeconds,
          changeoverTimeMinutes: changeoverTimeMinutes,
          
          // OEE components
          availability: parseFloat(availability.toFixed(2)),
          performance: performance,
          quality: parseFloat(quality.toFixed(2)),
          oeeScore: parseFloat(oee.toFixed(2)),
          normalizedOEE: parseFloat(normalizedOEE.toFixed(2)),
          simulatedOEE: parseFloat(simulatedOEE.toFixed(2)),
          previousMonthOEE: parseFloat(previousMonthOEE.toFixed(2)),
          rolling7DayOEE: parseFloat((oee * getRandomFloat(0.95, 1.05)).toFixed(2)),
          oeeTrend: oee > previousMonthOEE ? 'Improving' : 'Declining',
          downtimeTrend: getRandomElement(['Increasing', 'Decreasing', 'Stable']),
          previousWeekDowntime: getRandomInt(100, 500),
          rolling30DayDowntime: getRandomInt(500, 2000),
          industryBenchmarkOEE: industryBenchmarkOEE,
          deviationFromBenchmark: parseFloat(deviationFromBenchmark.toFixed(2)),
          benchmarkOEE: industryBenchmarkOEE,
          benchmarkDowntime: 10,
          benchmarkEnergyConsumed: 400,
          
          // Reliability metrics
          mtbf: mtbf,
          mttr: mttr,
          failureRate: parseFloat(failureRate.toFixed(6)),
          remainingUsefulLife: remainingUsefulLife,
          confidenceInterval: confidenceInterval,
          predictedFailureScore: getRandomFloat(0, 0.3),
          
          // Utilization metrics
          machineUtilizationPercentage: machineUtilizationPercentage,
          operatorUtilizationPercentage: operatorUtilizationPercentage,
          efficiencyLossPercentage: parseFloat((100 - performance).toFixed(2)),
          downtimePercentage: parseFloat(((downtimeMinutes / plannedProductionTime) * 100).toFixed(2)),
          
          // Error and events
          errorCode: Math.random() > 0.9 ? getRandomElement(errorCodes) : null,
          errorDescription: Math.random() > 0.9 ? getRandomElement(errorDescriptions) : null,
          eventTrigger: Math.random() > 0.95 ? 'Anomaly Detected' : null,
          eventResolutionTime: Math.random() > 0.95 ? getRandomInt(10, 120) : null,
          
          // Financial and quality metrics
          simulatedRevenueGrowth: simulatedRevenueGrowth,
          revenueGenerated: revenueGenerated,
          simulatedDowntimeReduction: getRandomFloat(5, 25),
          customerSatisfactionScore: getRandomFloat(3.5, 5.0),
          onTimeDeliveryPercentage: getRandomFloat(85, 99),
          costPerUnitProduced: costPerUnitProduced,
          yieldPercentage: yieldPercentage,
          
          // Energy and environmental
          energyConsumed_kWh: energyConsumed,
          energyCost_USD: parseFloat(energyCost.toFixed(2)),
          emissions_kg: parseFloat(emissions.toFixed(2)),
          waterUsage_liters: waterUsage,
          wasteGenerated_kg: parseFloat(wasteGenerated.toFixed(2)),
          recycledMaterial_kg: parseFloat(recycledMaterial.toFixed(2)),
          
          // Delivery and quality
          onTimeDelivery: Math.random() > 0.1,
          defectiveItems: rejectParts,
          
          // Incident information
          incidentType: Math.random() > 0.98 ? getRandomElement(incidentTypes) : null,
          incidentSeverity: Math.random() > 0.98 ? getRandomElement(incidentSeverities) : null,
          incidentTimestamp: Math.random() > 0.98 ? timestamp : null,
          incidentCategory: Math.random() > 0.98 ? getRandomElement(incidentCategories) : null,
          resolutionTimeMinutes: Math.random() > 0.98 ? getRandomInt(15, 240) : null,
          
          // Production context
          operatorName: getRandomElement(operatorNames),
          shift: getRandomElement(shifts),
          batchNumber: `B${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(day).padStart(2, '0')}${String(record).padStart(3, '0')}`,
          productType: getRandomElement(productTypes),
          lotNumber: `${partNumber}-B${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(day).padStart(2, '0')}${String(record).padStart(3, '0')}`,  // Using partNumber in lotNumber
          
          // Supplier information
          supplierName: getRandomElement(supplierNames),
          deliveryLeadTime: getRandomInt(1, 30),
          supplierRating: getRandomFloat(3.0, 5.0),
          
          // Product specifications
          productDimensions: `${getRandomInt(10, 100)}x${getRandomInt(10, 100)}x${getRandomInt(10, 100)}mm`,
          productWeight: getRandomFloat(0.1, 50),
          
          // Site and regional data
          siteName: getRandomElement(siteNames),
          region: getRandomElement(regions),
          shiftOverlap: getRandomInt(0, 30) > 15,
          
          // Data quality and anomaly detection
          dataValidationStatus: 'Validated',
          anomalyDetected: Math.random() > 0.95,
          anomalyScore: Math.random() > 0.95 ? getRandomFloat(0.7, 1.0) : 0,
          anomalyReason: Math.random() > 0.95 ? getRandomElement(anomalyReasons) : null,
          deviationFromNormal: getRandomFloat(-10, 10),
          
          // Time categorization
          weekNumber: Math.floor((daysToGenerate - day) / 7) + 1,
          month: new Date(timestamp).getMonth() + 1,
          quarter: Math.floor(new Date(timestamp).getMonth() / 3) + 1,
          year: new Date(timestamp).getFullYear(),
          
          // Flags and thresholds
          realTimeDataFlag: day === 0 && record < 10,
          lastUpdatedTimestamp: timestamp,
          datasetVersion: '2.0',
          userDefinedOEEThreshold: 75,
          userDefinedDowntimeThreshold: 15,
          visualizationFlag: true,
          stakeholderFeedbackRequired: oee < 70 || Math.random() > 0.95,
          
          // Additional operational metrics
          operatingTime: actualProductionTime * 0.95,
          runTime: actualProductionTime * 0.9,
          plannedDowntime: getRandomInt(15, 30),
          unplannedDowntime: downtimeMinutes,
          idealCycleTime: cycleTimeSeconds * 0.8,
          actualCycleTime: cycleTimeSeconds,
          standardCycleTime: cycleTimeSeconds * 0.9,
          throughputRate: (totalPartsProduced / (actualProductionTime / 60)),
          notes: `Part Number: ${partNumber} | Manufacturing data for ${processName} on ${equipmentNumber}`
        };

        records.push(manufacturingRecord);
      }
    }

    // Insert all records in batches
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await prisma.performanceMetric.createMany({
        data: batch
      });
      console.log(`✓ Inserted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(records.length / batchSize)}`);
    }

    console.log(`✅ Successfully seeded ${records.length} comprehensive manufacturing records`);

    // Create summary statistics
    const stats = await prisma.performanceMetric.aggregate({
      _avg: {
        oeeScore: true
      },
      _min: {
        oeeScore: true
      },
      _max: {
        oeeScore: true
      },
      _count: true
    });

    console.log('\n📊 Summary Statistics:');
    console.log(`   Total Records: ${stats._count}`);
    console.log(`   Average OEE: ${stats._avg.oeeScore?.toFixed(2)}%`);
    console.log(`   Min OEE: ${stats._min.oeeScore?.toFixed(2)}%`);
    console.log(`   Max OEE: ${stats._max.oeeScore?.toFixed(2)}%`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedManufacturingData()
  .then(() => {
    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });