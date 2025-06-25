const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public'
    }
  }
});

async function seedSimpleData() {
  console.log('🌱 Seeding simple manufacturing data...');
  
  try {
    // Clean existing data first
    await prisma.factOeeMetric.deleteMany();
    await prisma.factPerformanceMetric.deleteMany();
    await prisma.equipment.deleteMany();
    await prisma.workCenter.deleteMany();
    await prisma.manufacturingArea.deleteMany();
    await prisma.manufacturingSite.deleteMany();
    
    console.log('✅ Cleaned existing data');
    
    // Create a manufacturing site
    const site = await prisma.manufacturingSite.create({
      data: {
        siteCode: 'MAIN-PLANT',
        siteName: 'Main Manufacturing Plant',
        address: '123 Industrial Parkway, Detroit, MI',
        timezone: 'America/Detroit',
      }
    });
    console.log('✅ Created site:', site.siteName);
    
    // Create areas
    const productionArea = await prisma.manufacturingArea.create({
      data: {
        siteId: site.id,
        areaCode: 'PROD-FLOOR',
        areaName: 'Production Floor',
        description: 'Main production area with CNC machines',
      }
    });
    
    const assemblyArea = await prisma.manufacturingArea.create({
      data: {
        siteId: site.id,
        areaCode: 'ASSEMBLY',
        areaName: 'Assembly Line',
        description: 'Final assembly operations',
      }
    });
    
    console.log('✅ Created areas:', productionArea.areaName, assemblyArea.areaName);
    
    // Create work centers
    const cncWorkCenter = await prisma.workCenter.create({
      data: {
        areaId: productionArea.id,
        workCenterCode: 'CNC-001',
        workCenterName: 'CNC Machining Center',
        capacityUnits: 'parts/hour',
        theoreticalCapacity: 50.0,
      }
    });
    
    const assemblyWorkCenter = await prisma.workCenter.create({
      data: {
        areaId: assemblyArea.id,
        workCenterCode: 'ASM-001',
        workCenterName: 'Final Assembly Line',
        capacityUnits: 'units/hour',
        theoreticalCapacity: 25.0,
      }
    });
    
    console.log('✅ Created work centers:', cncWorkCenter.workCenterName, assemblyWorkCenter.workCenterName);
    
    // Create equipment
    const cncMachine = await prisma.equipment.create({
      data: {
        workCenterId: cncWorkCenter.id,
        equipmentCode: 'CNC-M001',
        equipmentName: 'CNC Machine #1',
        equipmentType: 'CNC',
        manufacturer: 'Haas Automation',
        model: 'VF-2SS',
        serialNumber: 'SN123456',
        installationDate: new Date('2020-06-15'),
        criticalityLevel: 'Critical',
        idealRunRate: 45.0,
        isActive: true,
      }
    });
    
    const robotArm = await prisma.equipment.create({
      data: {
        workCenterId: assemblyWorkCenter.id,
        equipmentCode: 'ROB-001',
        equipmentName: 'Assembly Robot #1',
        equipmentType: 'Robot',
        manufacturer: 'KUKA',
        model: 'KR 10 R1100',
        serialNumber: 'SN789012',
        installationDate: new Date('2021-03-10'),
        criticalityLevel: 'Important',
        idealRunRate: 30.0,
        isActive: true,
      }
    });
    
    console.log('✅ Created equipment:', cncMachine.equipmentName, robotArm.equipmentName);
    
    // Create some recent OEE metrics
    const now = new Date();
    const oeeMetrics = [];
    
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000)); // Every hour going back
      
      // CNC Machine metrics
      const actualRunTime = 50 + Math.random() * 10; // 50-60 minutes
      const goodCount = Math.floor(40 + Math.random() * 10); // 40-50 parts
      const totalCount = Math.floor(45 + Math.random() * 10); // 45-55 parts
      const plannedQuantity = 50.0;
      
      // Calculate OEE components
      const availability = actualRunTime / 60.0; // actual runtime / planned time
      const performance = (totalCount * 1.33) / actualRunTime; // ideal time / actual time
      const quality = goodCount / totalCount; // good parts / total parts
      const oee = availability * performance * quality;
      
      oeeMetrics.push({
        timestamp: timestamp,
        equipmentId: cncMachine.id,
        plannedProductionTime: 60.0, // 60 minutes
        actualProductionTime: actualRunTime,
        downtimeMinutes: 60.0 - actualRunTime,
        plannedQuantity: plannedQuantity,
        producedQuantity: totalCount,
        goodQuantity: goodCount,
        scrapQuantity: totalCount - goodCount,
        idealCycleTime: 1.33, // minutes per part
        actualCycleTime: actualRunTime / totalCount,
        availability: Math.min(1.0, availability),
        performance: Math.min(1.0, performance),
        quality: Math.min(1.0, quality),
        oee: Math.min(1.0, oee),
      });
      
      // Robot metrics
      const robotActualRunTime = 55 + Math.random() * 5; // 55-60 minutes
      const robotGoodCount = Math.floor(25 + Math.random() * 8); // 25-33 units
      const robotTotalCount = Math.floor(27 + Math.random() * 8); // 27-35 units
      const robotPlannedQuantity = 30.0;
      
      // Calculate Robot OEE components
      const robotAvailability = robotActualRunTime / 60.0;
      const robotPerformance = (robotTotalCount * 2.0) / robotActualRunTime;
      const robotQuality = robotGoodCount / robotTotalCount;
      const robotOee = robotAvailability * robotPerformance * robotQuality;
      
      oeeMetrics.push({
        timestamp: timestamp,
        equipmentId: robotArm.id,
        plannedProductionTime: 60.0,
        actualProductionTime: robotActualRunTime,
        downtimeMinutes: 60.0 - robotActualRunTime,
        plannedQuantity: robotPlannedQuantity,
        producedQuantity: robotTotalCount,
        goodQuantity: robotGoodCount,
        scrapQuantity: robotTotalCount - robotGoodCount,
        idealCycleTime: 2.0, // minutes per unit
        actualCycleTime: robotActualRunTime / robotTotalCount,
        availability: Math.min(1.0, robotAvailability),
        performance: Math.min(1.0, robotPerformance),
        quality: Math.min(1.0, robotQuality),
        oee: Math.min(1.0, robotOee),
      });
    }
    
    // Create OEE metrics in batches
    for (let i = 0; i < oeeMetrics.length; i += 10) {
      const batch = oeeMetrics.slice(i, i + 10);
      await prisma.factOeeMetric.createMany({
        data: batch
      });
    }
    
    console.log(`✅ Created ${oeeMetrics.length} OEE metrics`);
    
    // Create some performance metrics
    const performanceMetrics = [];
    
    for (let i = 0; i < 12; i++) {
      const timestamp = new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)); // Every 2 hours
      
      performanceMetrics.push({
        timestamp: timestamp,
        equipmentId: cncMachine.id,
        cycleTime: 1.2 + Math.random() * 0.3, // 1.2-1.5 minutes
        theoreticalCycleTime: 1.33, // theoretical
        actualRunRate: 40 + Math.random() * 10, // 40-50 parts/hour
        idealRunRate: 45.0,
        microStopsCount: Math.floor(Math.random() * 5), // 0-4 stops
      });
      
      performanceMetrics.push({
        timestamp: timestamp,
        equipmentId: robotArm.id,
        cycleTime: 2.0 + Math.random() * 0.5, // 2.0-2.5 minutes
        theoreticalCycleTime: 2.0,
        actualRunRate: 25 + Math.random() * 8, // 25-33 units/hour
        idealRunRate: 30.0,
        microStopsCount: Math.floor(Math.random() * 3), // 0-2 stops
      });
    }
    
    await prisma.factPerformanceMetric.createMany({
      data: performanceMetrics
    });
    
    console.log(`✅ Created ${performanceMetrics.length} performance metrics`);
    
    console.log('✅ Simple manufacturing data seeded successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - 1 Site: ${site.siteName}`);
    console.log(`   - 2 Areas: Production Floor, Assembly Line`);
    console.log(`   - 2 Work Centers: CNC, Assembly`);
    console.log(`   - 2 Equipment: CNC Machine, Robot`);
    console.log(`   - ${oeeMetrics.length} OEE Metrics`);
    console.log(`   - ${performanceMetrics.length} Performance Metrics`);
    
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSimpleData();