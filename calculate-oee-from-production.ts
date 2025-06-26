/**
 * Calculate OEE from Production Data
 * OEE = Availability × Performance × Quality
 */

import { prisma } from './src/lib/database/prisma';

async function calculateOEEFromProduction() {
  console.log('📊 Calculating OEE from Production Data...\n');
  
  try {
    // Get the last 24 hours
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get all equipment
    const equipment = await prisma.dimEquipment.findMany({
      where: { isActive: true }
    });
    
    console.log(`Found ${equipment.length} active equipment\n`);
    
    const oeeResults = [];
    
    for (const eq of equipment) {
      // Get production data for this equipment in the time range
      const production = await prisma.factProduction.findMany({
        where: {
          equipmentId: eq.id,
          startTime: {
            gte: yesterday,
            lte: now
          }
        },
        include: {
          downtime: true,
          shift: true
        }
      });
      
      if (production.length === 0) {
        console.log(`${eq.name}: No production data in the last 24 hours`);
        continue;
      }
      
      // Calculate total time metrics
      let totalPlannedTime = 0n;
      let totalOperatingTime = 0n;
      let totalDowntime = 0n;
      let totalPartsProduced = 0;
      let totalGoodParts = 0;
      
      for (const prod of production) {
        totalPlannedTime += prod.plannedProductionTime;
        totalOperatingTime += prod.operatingTime;
        totalPartsProduced += prod.totalPartsProduced;
        totalGoodParts += prod.goodParts;
        
        // Sum downtime for this production run
        const downtimeForRun = prod.downtime.reduce((sum, dt) => sum + dt.downtimeDuration, 0n);
        totalDowntime += downtimeForRun;
      }
      
      // Convert BigInt to numbers for calculations (milliseconds to hours)
      const plannedHours = Number(totalPlannedTime) / (1000 * 60 * 60);
      const operatingHours = Number(totalOperatingTime) / (1000 * 60 * 60);
      const downtimeHours = Number(totalDowntime) / (1000 * 60 * 60);
      const actualRunTime = operatingHours - downtimeHours;
      
      // Calculate OEE components
      // Availability = (Operating Time - Downtime) / Planned Production Time
      const availability = plannedHours > 0 ? actualRunTime / plannedHours : 0;
      
      // Performance = (Total Parts Produced / Operating Time) / Theoretical Rate
      const theoreticalRate = eq.theoreticalRate?.toNumber() || 60; // parts per hour
      const actualRate = actualRunTime > 0 ? totalPartsProduced / actualRunTime : 0;
      const performance = theoreticalRate > 0 ? actualRate / theoreticalRate : 0;
      
      // Quality = Good Parts / Total Parts Produced
      const quality = totalPartsProduced > 0 ? totalGoodParts / totalPartsProduced : 0;
      
      // OEE = Availability × Performance × Quality
      const oee = availability * performance * quality;
      
      const result = {
        equipment: eq.name,
        code: eq.code,
        productionRuns: production.length,
        availability: (availability * 100).toFixed(1),
        performance: (performance * 100).toFixed(1),
        quality: (quality * 100).toFixed(1),
        oee: (oee * 100).toFixed(1),
        totalParts: totalPartsProduced,
        goodParts: totalGoodParts,
        scrapParts: totalPartsProduced - totalGoodParts,
        plannedHours: plannedHours.toFixed(1),
        actualRunHours: actualRunTime.toFixed(1),
        downtimeHours: downtimeHours.toFixed(1)
      };
      
      oeeResults.push(result);
      
      console.log(`${eq.name} (${eq.code}):`);
      console.log(`  Production Runs: ${production.length}`);
      console.log(`  Availability: ${result.availability}%`);
      console.log(`  Performance: ${result.performance}%`);
      console.log(`  Quality: ${result.quality}%`);
      console.log(`  OEE: ${result.oee}%`);
      console.log(`  Total Parts: ${totalPartsProduced} (Good: ${totalGoodParts}, Scrap: ${totalPartsProduced - totalGoodParts})`);
      console.log(`  Time: ${result.plannedHours}h planned, ${result.actualRunHours}h actual, ${result.downtimeHours}h downtime`);
      console.log();
    }
    
    // Summary
    if (oeeResults.length > 0) {
      const avgOEE = oeeResults.reduce((sum, r) => sum + parseFloat(r.oee), 0) / oeeResults.length;
      console.log('📊 SUMMARY:');
      console.log(`Average OEE across all equipment: ${avgOEE.toFixed(1)}%`);
      
      // Sort by OEE
      const sorted = [...oeeResults].sort((a, b) => parseFloat(b.oee) - parseFloat(a.oee));
      console.log(`\nBest Performer: ${sorted[0].equipment} - ${sorted[0].oee}% OEE`);
      console.log(`Worst Performer: ${sorted[sorted.length - 1].equipment} - ${sorted[sorted.length - 1].oee}% OEE`);
      
      // World class benchmarks
      console.log('\n📈 Performance Assessment:');
      if (avgOEE >= 85) {
        console.log('✅ World Class Performance (≥85%)');
      } else if (avgOEE >= 75) {
        console.log('✅ Good Performance (≥75%)');
      } else if (avgOEE >= 60) {
        console.log('⚠️  Average Performance (≥60%)');
      } else {
        console.log('❌ Poor Performance (<60%)');
      }
    } else {
      console.log('No production data available for OEE calculation in the last 24 hours.');
    }
    
  } catch (error) {
    console.error('Error calculating OEE:', error);
  } finally {
    await prisma.$disconnect();
  }
}

calculateOEEFromProduction().catch(console.error);