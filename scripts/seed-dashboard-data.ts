#!/usr/bin/env tsx

/**
 * Seed script to populate database with sample manufacturing data
 * for dashboard testing
 */

import { PrismaClient } from '@prisma/client';
import { addDays, subDays, subHours } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting dashboard data seed...');

  try {
    // Clean existing data
    console.log('🗑️  Cleaning existing data...');
    await prisma.performanceMetric.deleteMany({});
    await prisma.qualityMetric.deleteMany({});
    await prisma.equipmentHealth.deleteMany({});
    await prisma.workUnit.deleteMany({});

    // Create Work Units (Equipment)
    console.log('🏭 Creating work units...');
    const workUnits = await Promise.all([
      prisma.workUnit.create({
        data: {
          name: 'CNC Machine 1',
          code: 'CNC-001',
          equipmentType: 'CNC_MACHINE',
          status: 'active',
          location: 'Production Floor A',
        },
      }),
      prisma.workUnit.create({
        data: {
          name: 'Assembly Robot A',
          code: 'ROBOT-001',
          equipmentType: 'ROBOT',
          status: 'active',
          location: 'Assembly Line 1',
        },
      }),
      prisma.workUnit.create({
        data: {
          name: 'Packaging Line 1',
          code: 'PKG-001',
          equipmentType: 'PACKAGING',
          status: 'active',
          location: 'Packaging Area',
        },
      }),
      prisma.workUnit.create({
        data: {
          name: 'Quality Scanner',
          code: 'QC-001',
          equipmentType: 'INSPECTION',
          status: 'active',
          location: 'Quality Control',
        },
      }),
      prisma.workUnit.create({
        data: {
          name: 'Conveyor System',
          code: 'CONV-001',
          equipmentType: 'MATERIAL_HANDLING',
          status: 'active',
          location: 'Main Floor',
        },
      }),
    ]);

    // Generate Performance Metrics for the last 7 days
    console.log('📊 Creating performance metrics...');
    const now = new Date();
    const performanceMetrics = [];
    
    for (let daysAgo = 7; daysAgo >= 0; daysAgo--) {
      for (let hour = 0; hour < 24; hour += 4) { // Every 4 hours
        for (const workUnit of workUnits) {
          const timestamp = subHours(subDays(now, daysAgo), hour);
          
          // Generate realistic OEE components
          const availability = 0.85 + Math.random() * 0.1; // 85-95%
          const performance = 0.88 + Math.random() * 0.1; // 88-98%
          const quality = 0.95 + Math.random() * 0.04; // 95-99%
          const oeeScore = availability * performance * quality;
          
          performanceMetrics.push({
            timestamp,
            workUnitId: workUnit.id,
            
            // OEE Components
            availability,
            performance,
            quality,
            oeeScore,
            
            // Production Data
            totalParts: Math.floor(400 + Math.random() * 100),
            goodParts: Math.floor(380 + Math.random() * 100),
            rejectedParts: Math.floor(5 + Math.random() * 10),
            reworkParts: Math.floor(5 + Math.random() * 5),
            plannedProduction: 450,
            
            // Time Metrics
            scheduledTime: 240, // 4 hours in minutes
            operatingTime: 240 * availability,
            actualProductionTime: 240 * availability * performance,
            plannedDowntime: 20,
            unplannedDowntime: 240 * (1 - availability) - 20,
            
            // Throughput
            throughputRate: 100 + Math.random() * 20,
            targetThroughput: 115,
            
            // Cycle Times
            idealCycleTime: 2.4,
            actualCycleTime: 2.4 / performance,
            standardCycleTime: 2.5,
            
            // Quality Metrics
            firstPassYield: quality,
            scrapRate: (1 - quality) * 0.5,
            reworkRate: (1 - quality) * 0.5,
            
            // Context
            shift: hour < 8 ? 'Morning' : hour < 16 ? 'Afternoon' : 'Night',
            productType: 'Product-' + (Math.floor(Math.random() * 3) + 1),
            operatorName: 'Operator-' + (Math.floor(Math.random() * 5) + 1),
            
            // ISO Fields
            processName: workUnit.equipmentType,
            plant: 'PLANT-001',
            area: workUnit.location,
            cellWorkCenter: workUnit.code,
            machineName: workUnit.name,
          });
        }
      }
    }
    
    await prisma.performanceMetric.createMany({
      data: performanceMetrics,
    });
    
    console.log(`✅ Created ${performanceMetrics.length} performance metrics`);

    // Create Quality Metrics
    console.log('🔍 Creating quality metrics...');
    const qualityMetrics = [];
    
    for (let daysAgo = 7; daysAgo >= 0; daysAgo--) {
      for (let hour = 0; hour < 24; hour += 2) { // Every 2 hours
        for (const workUnit of workUnits.slice(0, 3)) { // First 3 units
          const timestamp = subHours(subDays(now, daysAgo), hour);
          
          // Different quality parameters
          const parameters = ['Dimension', 'Weight', 'Surface Finish', 'Hardness'];
          
          for (const parameter of parameters) {
            const nominal = 100;
            const tolerance = 5;
            const value = nominal + (Math.random() - 0.5) * tolerance * 2;
            const isWithinSpec = Math.abs(value - nominal) <= tolerance;
            
            qualityMetrics.push({
              timestamp,
              workUnitId: workUnit.id,
              parameter,
              value,
              uom: parameter === 'Weight' ? 'kg' : 'mm',
              lowerLimit: nominal - tolerance,
              upperLimit: nominal + tolerance,
              nominal,
              lowerControlLimit: nominal - tolerance * 0.8,
              upperControlLimit: nominal + tolerance * 0.8,
              isWithinSpec,
              qualityGrade: isWithinSpec ? (Math.abs(value - nominal) < tolerance * 0.5 ? 'A' : 'B') : 'C',
              cpk: isWithinSpec ? 1.33 + Math.random() * 0.5 : 0.8 + Math.random() * 0.3,
              ppk: isWithinSpec ? 1.2 + Math.random() * 0.4 : 0.7 + Math.random() * 0.3,
              shift: hour < 8 ? 'Morning' : hour < 16 ? 'Afternoon' : 'Night',
              productType: 'Product-' + (Math.floor(Math.random() * 3) + 1),
              batchNumber: 'BATCH-' + Math.floor(1000 + Math.random() * 9000),
              defectType: !isWithinSpec ? ['Oversize', 'Undersize', 'Surface Defect'][Math.floor(Math.random() * 3)] : null,
            });
          }
        }
      }
    }
    
    await prisma.qualityMetric.createMany({
      data: qualityMetrics,
    });
    
    console.log(`✅ Created ${qualityMetrics.length} quality metrics`);

    // Create Equipment Health Records
    console.log('🔧 Creating equipment health records...');
    const equipmentHealth = [];
    
    for (const workUnit of workUnits) {
      const overallHealth = 0.85 + Math.random() * 0.14; // 85-99%
      
      equipmentHealth.push({
        workUnitId: workUnit.id,
        overallHealth,
        operationalStatus: overallHealth > 0.95 ? 'OPTIMAL' : overallHealth > 0.85 ? 'GOOD' : 'NEEDS_ATTENTION',
        
        // Component Health
        mechanicalHealth: 0.8 + Math.random() * 0.2,
        electricalHealth: 0.85 + Math.random() * 0.15,
        hydraulicHealth: 0.9 + Math.random() * 0.1,
        
        // Performance Indicators
        vibrationLevel: 0.5 + Math.random() * 2,
        temperatureLevel: 60 + Math.random() * 20,
        noiseLevel: 70 + Math.random() * 15,
        
        // Reliability Metrics
        mtbf: 150 + Math.random() * 50, // Hours
        mttr: 2 + Math.random() * 2, // Hours
        failureRate: 0.001 + Math.random() * 0.002,
        
        // Maintenance
        lastMaintenanceDate: subDays(now, Math.floor(Math.random() * 30)),
        nextMaintenanceDate: addDays(now, Math.floor(Math.random() * 30)),
        maintenanceScore: 0.8 + Math.random() * 0.2,
        
        // Risk Assessment
        riskLevel: overallHealth > 0.9 ? 'LOW' : overallHealth > 0.8 ? 'MEDIUM' : 'HIGH',
        riskScore: (1 - overallHealth) * 10,
        
        // Condition Monitoring
        operatingHours: 1000 + Math.floor(Math.random() * 5000),
        powerConsumption: 50 + Math.random() * 50,
        
        // Predictive Indicators
        estimatedRUL: Math.floor(30 + Math.random() * 300), // Days
        anomalyScore: Math.random() * 0.3,
        trendIndicator: ['STABLE', 'IMPROVING', 'DEGRADING'][Math.floor(Math.random() * 3)],
      });
    }
    
    await prisma.equipmentHealth.createMany({
      data: equipmentHealth,
    });
    
    console.log(`✅ Created ${equipmentHealth.length} equipment health records`);

    console.log('\n✨ Dashboard data seeding completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`   - Work Units: ${workUnits.length}`);
    console.log(`   - Performance Metrics: ${performanceMetrics.length}`);
    console.log(`   - Quality Metrics: ${qualityMetrics.length}`);
    console.log(`   - Equipment Health: ${equipmentHealth.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding dashboard data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });