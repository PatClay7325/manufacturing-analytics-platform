// Seed ISO 22400-compliant sample data for testing
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSampleData() {
  console.log('🌱 Seeding ISO 22400-compliant sample data...');

  try {
    // Clean existing data (development only) - order matters due to foreign keys
    await prisma.factOeeMetric.deleteMany();
    await prisma.factProductionQuantity.deleteMany();
    await prisma.factEquipmentState.deleteMany();
    await prisma.factQualityMetric.deleteMany();
    await prisma.factPerformanceMetric.deleteMany();
    await prisma.factEnergyMetric.deleteMany();
    await prisma.factMaintenanceEvent.deleteMany();
    await prisma.productionOrder.deleteMany();
    await prisma.equipment.deleteMany();
    await prisma.workCenter.deleteMany();
    await prisma.manufacturingArea.deleteMany();
    await prisma.product.deleteMany();
    await prisma.shiftDefinition.deleteMany();
    await prisma.manufacturingSite.deleteMany();

    // Create manufacturing sites
    const mainSite = await prisma.manufacturingSite.create({
      data: {
        siteCode: 'MAIN',
        siteName: 'Main Manufacturing Plant',
        address: '123 Industrial Blvd, Manufacturing City',
        timezone: 'America/New_York'
      }
    });

    const pilotSite = await prisma.manufacturingSite.create({
      data: {
        siteCode: 'PILOT',
        siteName: 'Pilot Production Facility',
        address: '456 Innovation Drive, Tech Park',
        timezone: 'America/New_York'
      }
    });

    // Create manufacturing areas
    const prodArea = await prisma.manufacturingArea.create({
      data: {
        siteId: mainSite.id,
        areaCode: 'PROD_LINE_1',
        areaName: 'Production Line 1',
        description: 'Main assembly line for Widget production'
      }
    });

    const qualityArea = await prisma.manufacturingArea.create({
      data: {
        siteId: mainSite.id,
        areaCode: 'QUALITY_LAB',
        areaName: 'Quality Control Laboratory',
        description: 'Quality testing and inspection area'
      }
    });

    // Create work centers
    const mainWorkCenter = await prisma.workCenter.create({
      data: {
        areaId: prodArea.id,
        workCenterCode: 'WC_001',
        workCenterName: 'Assembly Station 1',
        capacityUnits: 'units/hour',
        theoreticalCapacity: 100.00
      }
    });

    const qcWorkCenter = await prisma.workCenter.create({
      data: {
        areaId: qualityArea.id,
        workCenterCode: 'WC_QC_001',
        workCenterName: 'Quality Inspection Station',
        capacityUnits: 'inspections/hour',
        theoreticalCapacity: 150.00
      }
    });

    // Create equipment
    const cncMachine = await prisma.equipment.create({
      data: {
        workCenterId: mainWorkCenter.id,
        equipmentCode: 'EQ_001',
        equipmentName: 'CNC Machine #1',
        equipmentType: 'CNC_MILL',
        manufacturer: 'Haas Automation',
        model: 'VF-4SS',
        serialNumber: 'HAS123456',
        installationDate: new Date('2020-01-15'),
        sapEquipmentNumber: 'SAP_EQ_001',
        criticalityLevel: 'Critical',
        maintenanceStrategy: 'Preventive',
        theoreticalCycleTime: 45.0, // seconds per unit
        idealRunRate: 80.0, // units per hour
        isActive: true
      }
    });

    const robotWelder = await prisma.equipment.create({
      data: {
        workCenterId: mainWorkCenter.id,
        equipmentCode: 'EQ_002',
        equipmentName: 'Robotic Welder #1',
        equipmentType: 'ROBOT_WELDER',
        manufacturer: 'KUKA',
        model: 'KR 210 R3100',
        serialNumber: 'KUKA789012',
        installationDate: new Date('2019-08-20'),
        sapEquipmentNumber: 'SAP_EQ_002',
        criticalityLevel: 'Important',
        maintenanceStrategy: 'Predictive',
        theoreticalCycleTime: 30.0,
        idealRunRate: 120.0,
        isActive: true
      }
    });

    const inspectionStation = await prisma.equipment.create({
      data: {
        workCenterId: qcWorkCenter.id,
        equipmentCode: 'EQ_003',
        equipmentName: 'Coordinate Measuring Machine',
        equipmentType: 'CMM',
        manufacturer: 'Zeiss',
        model: 'CONTURA G2',
        serialNumber: 'ZEISS345678',
        installationDate: new Date('2021-03-10'),
        sapEquipmentNumber: 'SAP_EQ_003',
        criticalityLevel: 'Standard',
        maintenanceStrategy: 'Condition-based',
        theoreticalCycleTime: 180.0, // 3 minutes per inspection
        idealRunRate: 20.0, // inspections per hour
        isActive: true
      }
    });

    // Create products
    const widgetA = await prisma.product.create({
      data: {
        productCode: 'WIDGET_A',
        productName: 'Premium Widget Type A',
        productFamily: 'Widgets',
        unitOfMeasure: 'EA',
        standardCost: 25.75,
        targetCycleTime: 40.0
      }
    });

    const widgetB = await prisma.product.create({
      data: {
        productCode: 'WIDGET_B',
        productName: 'Standard Widget Type B',
        productFamily: 'Widgets',
        unitOfMeasure: 'EA',
        standardCost: 18.50,
        targetCycleTime: 35.0
      }
    });

    // Create shift definitions
    const shifts = await Promise.all([
      prisma.shiftDefinition.create({
        data: {
          siteId: mainSite.id,
          shiftName: 'Day Shift',
          startTime: '06:00:00',
          endTime: '14:00:00',
          isOvernight: false,
          breakMinutes: 30,
          mealMinutes: 30
        }
      }),
      prisma.shiftDefinition.create({
        data: {
          siteId: mainSite.id,
          shiftName: 'Evening Shift',
          startTime: '14:00:00',
          endTime: '22:00:00',
          isOvernight: false,
          breakMinutes: 30,
          mealMinutes: 30
        }
      }),
      prisma.shiftDefinition.create({
        data: {
          siteId: mainSite.id,
          shiftName: 'Night Shift',
          startTime: '22:00:00',
          endTime: '06:00:00',
          isOvernight: true,
          breakMinutes: 30,
          mealMinutes: 30
        }
      })
    ]);

    // Create production orders
    const productionOrder = await prisma.productionOrder.create({
      data: {
        orderNumber: `PO_001_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        productId: widgetA.id,
        equipmentId: cncMachine.id,
        plannedQuantity: 1000,
        producedQuantity: 850,
        goodQuantity: 825,
        scrapQuantity: 25,
        reworkQuantity: 15,
        plannedStartTime: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        plannedEndTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        actualStartTime: new Date(Date.now() - 7.5 * 60 * 60 * 1000), // 7.5 hours ago
        orderStatus: 'In_Progress',
        priorityLevel: 1,
        sapOrderNumber: 'SAP_PO_001'
      }
    });

    // Generate sample OEE metrics for the last 24 hours
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const oeeMetrics = [];
    const equipmentList = [cncMachine, robotWelder];
    
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(oneDayAgo.getTime() + hour * 60 * 60 * 1000);
      
      for (const equipment of equipmentList) {
        // Generate realistic OEE data with some variation
        const baseAvailability = 0.85 + (Math.random() * 0.15); // 85-100%
        const basePerformance = 0.75 + (Math.random() * 0.20);  // 75-95%
        const baseQuality = 0.90 + (Math.random() * 0.10);      // 90-100%
        
        // Add some "shift patterns" - lower performance during shift changes
        const shiftFactor = (hour % 8 === 0) ? 0.85 : 1.0;
        
        const availability = Math.min(1.0, baseAvailability * shiftFactor);
        const performance = Math.min(1.0, basePerformance * shiftFactor);
        const quality = Math.min(1.0, baseQuality);
        const oee = availability * performance * quality;
        
        oeeMetrics.push({
          timestamp,
          equipmentId: equipment.id,
          productionOrderId: equipment.id === cncMachine.id ? productionOrder.id : null,
          shiftId: shifts[Math.floor(hour / 8)]?.id,
          plannedProductionTime: 60.0, // 60 minutes per hour
          actualProductionTime: Math.max(0, 60.0 * availability),
          downtimeMinutes: Math.max(0, 60.0 * (1 - availability)),
          plannedQuantity: equipment.idealRunRate || 80.0,
          producedQuantity: Math.max(0, (equipment.idealRunRate || 80.0) * performance),
          goodQuantity: Math.max(0, (equipment.idealRunRate || 80.0) * performance * quality),
          scrapQuantity: Math.max(0, (equipment.idealRunRate || 80.0) * performance * (1 - quality)),
          idealCycleTime: equipment.theoreticalCycleTime,
          actualCycleTime: equipment.theoreticalCycleTime ? equipment.theoreticalCycleTime / performance : null,
          availability: Number(availability.toFixed(6)),
          performance: Number(performance.toFixed(6)),
          quality: Number(quality.toFixed(6)),
          oee: Number(oee.toFixed(6)),
          utilization: 0.95, // Assume 95% calendar utilization
          teep: Number((0.95 * oee).toFixed(6))
        });
      }
    }

    // Batch insert OEE metrics
    await prisma.factOeeMetric.createMany({
      data: oeeMetrics
    });

    // Generate some quality metrics
    const qualityMetrics = [];
    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(oneDayAgo.getTime() + Math.random() * 24 * 60 * 60 * 1000);
      const equipment = equipmentList[Math.floor(Math.random() * equipmentList.length)];
      
      qualityMetrics.push({
        timestamp,
        equipmentId: equipment.id,
        productionOrderId: equipment.id === cncMachine.id ? productionOrder.id : null,
        productId: Math.random() > 0.5 ? widgetA.id : widgetB.id,
        defectType: ['Dimensional', 'Surface Finish', 'Material', 'Assembly'][Math.floor(Math.random() * 4)],
        defectCategory: ['Critical', 'Major', 'Minor'][Math.floor(Math.random() * 3)],
        defectCount: Math.floor(Math.random() * 5) + 1,
        defectDescription: 'Automated quality inspection detected deviation',
        rootCause: 'Under investigation',
        inspectorId: `QC_${Math.floor(Math.random() * 5) + 1}`,
        severityScore: Math.floor(Math.random() * 10) + 1,
        inspectionLotSize: 100,
        totalInspected: 100,
        totalDefects: Math.floor(Math.random() * 5) + 1
      });
    }

    await prisma.factQualityMetric.createMany({
      data: qualityMetrics
    });

    // Generate equipment state data
    const stateData = [];
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(oneDayAgo.getTime() + hour * 60 * 60 * 1000);
      
      for (const equipment of equipmentList) {
        const states = ['Run', 'Stop', 'Setup', 'Maintenance'];
        const categories = ['Productive', 'Unscheduled_Downtime', 'Setup', 'Scheduled_Downtime'];
        const stateIndex = Math.floor(Math.random() * states.length);
        
        stateData.push({
          timestamp,
          equipmentId: equipment.id,
          stateCode: states[stateIndex],
          stateCategory: categories[stateIndex],
          reasonCode: stateIndex === 0 ? 'NORMAL_OPERATION' : `REASON_${stateIndex}`,
          reasonDescription: stateIndex === 0 ? 'Normal production' : 'Equipment issue',
          durationMinutes: 60.0,
          operatorId: `OP_${Math.floor(Math.random() * 10) + 1}`,
          shiftId: shifts[Math.floor(hour / 8)]?.id,
          isPlannedDowntime: stateIndex === 3,
          affectsOee: stateIndex !== 3
        });
      }
    }

    await prisma.factEquipmentState.createMany({
      data: stateData
    });

    console.log('✅ Sample data seeded successfully!');
    console.log(`   - Sites: 2`);
    console.log(`   - Areas: 2`);
    console.log(`   - Work Centers: 2`);
    console.log(`   - Equipment: 3`);
    console.log(`   - Products: 2`);
    console.log(`   - Shifts: 3`);
    console.log(`   - Production Orders: 1`);
    console.log(`   - OEE Metrics: ${oeeMetrics.length}`);
    console.log(`   - Quality Metrics: ${qualityMetrics.length}`);
    console.log(`   - Equipment States: ${stateData.length}`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedSampleData()
    .catch(console.error);
}

export { seedSampleData };