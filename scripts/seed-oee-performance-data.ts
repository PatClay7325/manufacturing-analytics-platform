#!/usr/bin/env node

/**
 * Seed script to populate PerformanceMetric table with realistic OEE data
 * This creates data that will work with the ISO 22400 OEE view
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Equipment IDs
const EQUIPMENT_IDS = ['EQ001', 'EQ002', 'EQ003', 'EQ004', 'EQ005'];
const MACHINE_NAMES = ['CNC-Mill-01', 'Lathe-02', 'Press-03', 'Assembly-04', 'Packaging-05'];
const SHIFTS = ['Morning', 'Afternoon', 'Night'];

// Realistic OEE parameters by equipment type
const EQUIPMENT_PROFILES = {
  'EQ001': { baseOEE: 0.75, availability: 0.85, performance: 0.92, quality: 0.96 },
  'EQ002': { baseOEE: 0.68, availability: 0.80, performance: 0.88, quality: 0.97 },
  'EQ003': { baseOEE: 0.82, availability: 0.90, performance: 0.94, quality: 0.97 },
  'EQ004': { baseOEE: 0.70, availability: 0.82, performance: 0.90, quality: 0.95 },
  'EQ005': { baseOEE: 0.65, availability: 0.78, performance: 0.85, quality: 0.98 }
};

async function clearExistingData() {
  console.log('🧹 Clearing existing performance metrics...');
  await prisma.performanceMetric.deleteMany({});
}

async function seedPerformanceData() {
  console.log('🌱 Seeding OEE performance data...');
  
  const now = new Date();
  const records = [];
  
  // Generate data for the last 90 days
  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    
    // Generate data for each equipment for each shift
    for (const [index, equipmentId] of EQUIPMENT_IDS.entries()) {
      const profile = EQUIPMENT_PROFILES[equipmentId as keyof typeof EQUIPMENT_PROFILES];
      
      for (const shift of SHIFTS) {
        // Skip some shifts randomly to simulate non-24/7 operation
        if (Math.random() < 0.1) continue;
        
        // Base timestamp for this shift
        const shiftHour = shift === 'Morning' ? 6 : shift === 'Afternoon' ? 14 : 22;
        const timestamp = new Date(date);
        timestamp.setHours(shiftHour, 0, 0, 0);
        
        // Planned production time (7.5 hours per shift with breaks)
        const plannedProductionTime = 450; // minutes
        
        // Generate realistic downtime (0-60 minutes)
        const downtimeMinutes = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 60);
        const changeoverMinutes = shift === 'Morning' ? Math.floor(Math.random() * 30) : 0;
        
        // Calculate actual operating time
        const operatingTimeMinutes = plannedProductionTime - downtimeMinutes - changeoverMinutes;
        
        // Production calculations
        const idealCycleTime = 30 + Math.random() * 20; // 30-50 seconds per part
        const theoreticalProduction = (operatingTimeMinutes * 60) / idealCycleTime;
        
        // Apply performance factor
        const performanceFactor = profile.performance + (Math.random() - 0.5) * 0.1;
        const actualProduction = Math.floor(theoreticalProduction * performanceFactor);
        
        // Quality calculations
        const qualityRate = profile.quality + (Math.random() - 0.5) * 0.05;
        const goodParts = Math.floor(actualProduction * qualityRate);
        const rejectParts = actualProduction - goodParts;
        
        // Calculate actual OEE components
        const availability = operatingTimeMinutes / plannedProductionTime;
        const performance = actualProduction / theoreticalProduction;
        const quality = goodParts / Math.max(actualProduction, 1);
        const oee = availability * performance * quality;
        
        records.push({
          timestamp,
          equipmentId,
          machineName: MACHINE_NAMES[index],
          shift,
          
          // Time measurements
          plannedProductionTime,
          downtimeMinutes,
          changeoverTimeMinutes: changeoverMinutes,
          operatingTime: operatingTimeMinutes,
          plannedDowntime: 30, // 30 min break per shift
          unplannedDowntime: downtimeMinutes,
          
          // Production counts
          totalPartsProduced: actualProduction,
          totalParts: actualProduction,
          goodParts,
          rejectParts,
          rejectedParts: rejectParts,
          
          // Cycle times
          idealCycleTime,
          cycleTimeSeconds: idealCycleTime,
          actualCycleTime: idealCycleTime * (1 / performanceFactor),
          
          // OEE scores
          availability,
          performance,
          quality,
          oeeScore: oee,
          
          // Additional fields
          productType: faker.helpers.arrayElement(['Product-A', 'Product-B', 'Product-C']),
          batchNumber: `BATCH-${date.toISOString().split('T')[0]}-${shift}-${equipmentId}`,
          operatorName: faker.helpers.arrayElement(['John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Brown']),
          
          // Utilization metrics
          machineUtilizationPercentage: availability * 100,
          downtimePercentage: (downtimeMinutes / plannedProductionTime) * 100,
          
          // Quality metrics
          yieldPercentage: qualityRate * 100,
          defectiveItems: rejectParts,
          
          // Energy consumption (realistic values)
          energyConsumed_kWh: operatingTimeMinutes * 0.5 + Math.random() * 10,
          
          // Status
          dataValidationStatus: 'validated',
          realTimeDataFlag: true,
        });
      }
    }
  }
  
  console.log(`📊 Creating ${records.length} performance metric records...`);
  
  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await prisma.performanceMetric.createMany({
      data: batch,
      skipDuplicates: true
    });
    
    if (i % 500 === 0) {
      console.log(`   Inserted ${i} records...`);
    }
  }
  
  console.log(`✅ Successfully created ${records.length} performance metric records!`);
}

async function verifyData() {
  console.log('\n🔍 Verifying seeded data...');
  
  // Check total records
  const count = await prisma.performanceMetric.count();
  console.log(`   Total records: ${count}`);
  
  // Check date range
  const dateRange = await prisma.performanceMetric.aggregate({
    _min: { timestamp: true },
    _max: { timestamp: true }
  });
  console.log(`   Date range: ${dateRange._min.timestamp?.toLocaleDateString()} to ${dateRange._max.timestamp?.toLocaleDateString()}`);
  
  // Check equipment distribution
  const equipmentCounts = await prisma.$queryRaw`
    SELECT "equipmentId", COUNT(*) as count 
    FROM "PerformanceMetric" 
    GROUP BY "equipmentId"
    ORDER BY "equipmentId"
  `;
  console.log('   Records per equipment:');
  console.table(equipmentCounts);
  
  // Test the OEE view
  console.log('\n📊 Testing OEE view...');
  try {
    const oeeData = await prisma.$queryRaw`
      SELECT 
        equipment_id,
        COUNT(*) as days,
        ROUND(AVG(oee)::numeric * 100, 1) as avg_oee,
        ROUND(MIN(oee)::numeric * 100, 1) as min_oee,
        ROUND(MAX(oee)::numeric * 100, 1) as max_oee
      FROM vw_iso22400_oee_metrics
      GROUP BY equipment_id
      ORDER BY equipment_id
    `;
    console.log('\n✅ OEE View Summary:');
    console.table(oeeData);
  } catch (error) {
    console.log('⚠️  OEE view not found. Run create-iso22400-oee-view.ts first.');
  }
}

async function main() {
  try {
    await clearExistingData();
    await seedPerformanceData();
    await verifyData();
    
    console.log('\n✅ Database seeded successfully!');
    console.log('🎉 Your Grafana dashboard should now show data!');
    console.log('\n📊 Access the dashboard at:');
    console.log('   Grafana: http://localhost:3001/d/iso22400-oee-metrics/iso-22400-oee-metrics-dashboard');
    console.log('   Next.js: http://localhost:3000/grafana/oee-dashboard');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();