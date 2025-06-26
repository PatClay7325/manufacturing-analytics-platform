/**
 * Seed Production Data Script
 * Creates sample production, scrap, and downtime data for the past week
 */

import { prisma } from './src/lib/database/prisma';

async function seedProductionData() {
  console.log('🌱 Seeding Production Data...\n');
  
  try {
    // Get existing dimension data
    const equipment = await prisma.dimEquipment.findMany();
    const products = await prisma.dimProduct.findMany();
    const shifts = await prisma.dimShift.findMany();
    const downtimeReasons = await prisma.dimDowntimeReason.findMany();
    
    if (equipment.length === 0 || products.length === 0 || shifts.length === 0) {
      console.error('❌ Missing required dimension data. Please run dimension seeding first.');
      return;
    }
    
    console.log(`Found: ${equipment.length} equipment, ${products.length} products, ${shifts.length} shifts`);
    
    // Define scrap codes for quality analysis
    const scrapCodes = [
      { code: 'DEF001', description: 'Surface Defect' },
      { code: 'DEF002', description: 'Dimensional Out of Spec' },
      { code: 'DEF003', description: 'Material Flaw' },
      { code: 'DEF004', description: 'Assembly Error' },
      { code: 'DEF005', description: 'Contamination' },
      { code: 'DEF006', description: 'Wrong Material' },
      { code: 'DEF007', description: 'Machining Error' }
    ];
    
    // Generate data for the past 7 days
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let productionCount = 0;
    let scrapCount = 0;
    let downtimeCount = 0;
    
    // Generate production data for each day
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      
      // For each shift
      for (const shift of shifts) {
        // For each equipment
        for (const eq of equipment) {
          // For each product (randomly select 1-2 products per shift)
          const selectedProducts = products
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.floor(Math.random() * 2) + 1);
          
          for (const product of selectedProducts) {
            // Calculate shift times
            const [startHour, startMin] = shift.startTime.split(':').map(Number);
            const [endHour, endMin] = shift.endTime.split(':').map(Number);
            
            const startTime = new Date(date);
            startTime.setHours(startHour, startMin, 0);
            
            const endTime = new Date(date);
            endTime.setHours(endHour, endMin, 0);
            if (endHour < startHour) endTime.setDate(endTime.getDate() + 1);
            
            // Generate production metrics
            const plannedTime = (endTime.getTime() - startTime.getTime()) - (shift.breakMinutes || 0) * 60 * 1000;
            const efficiency = 0.7 + Math.random() * 0.25; // 70-95% efficiency
            const operatingTime = Math.floor(plannedTime * efficiency);
            
            const targetRate = eq.theoreticalRate || 60; // parts per hour
            const totalParts = Math.floor((operatingTime / (60 * 60 * 1000)) * targetRate);
            const qualityRate = 0.92 + Math.random() * 0.07; // 92-99% quality
            const goodParts = Math.floor(totalParts * qualityRate);
            const scrapParts = Math.floor(totalParts * (1 - qualityRate));
            const reworkParts = Math.floor(scrapParts * 0.3); // 30% can be reworked
            
            // Ensure parts sum matches totalParts (constraint validation)
            const actualScrap = totalParts - goodParts - reworkParts;
            const adjustedScrapParts = Math.max(0, actualScrap);
            const adjustedReworkParts = totalParts - goodParts - adjustedScrapParts;
            
            // Create production record
            const production = await prisma.factProduction.create({
              data: {
                dateId: parseInt(date.toISOString().slice(0, 10).replace(/-/g, '')),
                shiftId: shift.id,
                equipmentId: eq.id,
                productId: product.id,
                orderNumber: `ORD-${date.toISOString().slice(0, 10)}-${eq.code}-${product.code}`,
                startTime,
                endTime,
                plannedProductionTime: BigInt(plannedTime),
                operatingTime: BigInt(operatingTime),
                totalPartsProduced: totalParts,
                goodParts,
                scrapParts: adjustedScrapParts,
                reworkParts: adjustedReworkParts,
                operatorId: `OP-${Math.floor(Math.random() * 10) + 1}`
              }
            });
            productionCount++;
            
            // Create scrap records for quality analysis
            if (adjustedScrapParts > 0) {
              // Distribute scrap across different defect types
              const defectDistribution = scrapCodes
                .map(sc => ({ ...sc, qty: 0 }))
                .sort(() => Math.random() - 0.5);
              
              let remainingScrap = adjustedScrapParts;
              const numDefectTypes = Math.min(Math.floor(Math.random() * 3) + 1, defectDistribution.length);
              
              for (let i = 0; i < numDefectTypes && remainingScrap > 0; i++) {
                const qty = i === numDefectTypes - 1 
                  ? remainingScrap 
                  : Math.floor(Math.random() * remainingScrap * 0.6) + 1;
                
                await prisma.factScrap.create({
                  data: {
                    productionId: production.id,
                    productId: product.id,
                    scrapCode: defectDistribution[i].code,
                    scrapQty: qty,
                    scrapCost: product.standardCost ? product.standardCost.toNumber() * qty : null
                  }
                });
                scrapCount++;
                remainingScrap -= qty;
              }
            }
            
            // Create downtime records (20% chance)
            if (Math.random() < 0.2 && downtimeReasons.length > 0) {
              const downtimeMinutes = Math.floor(Math.random() * 30) + 10; // 10-40 minutes
              const downtimeStart = new Date(startTime.getTime() + Math.random() * operatingTime);
              const downtimeEnd = new Date(downtimeStart.getTime() + downtimeMinutes * 60 * 1000);
              
              await prisma.factDowntime.create({
                data: {
                  productionId: production.id,
                  equipmentId: eq.id,
                  reasonId: downtimeReasons[Math.floor(Math.random() * downtimeReasons.length)].id,
                  startTime: downtimeStart,
                  endTime: downtimeEnd,
                  downtimeDuration: BigInt(downtimeMinutes * 60 * 1000),
                  comments: 'Auto-generated downtime for testing'
                }
              });
              downtimeCount++;
            }
          }
        }
      }
    }
    
    console.log('\n✅ Production Data Seeded Successfully!');
    console.log(`   - Production records: ${productionCount}`);
    console.log(`   - Scrap records: ${scrapCount}`);
    console.log(`   - Downtime records: ${downtimeCount}`);
    
    // Show sample quality analysis
    console.log('\n📊 Sample Quality Analysis:');
    const topDefects = await prisma.factScrap.groupBy({
      by: ['scrapCode'],
      _sum: { scrapQty: true },
      orderBy: { _sum: { scrapQty: 'desc' } },
      take: 5
    });
    
    console.log('Top 5 Defect Types:');
    topDefects.forEach((defect, index) => {
      const defectInfo = scrapCodes.find(sc => sc.code === defect.scrapCode);
      console.log(`   ${index + 1}. ${defect.scrapCode} (${defectInfo?.description || 'Unknown'}): ${defect._sum.scrapQty} units`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding production data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedProductionData().catch(console.error);