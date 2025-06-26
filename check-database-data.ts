/**
 * Database Data Review Script
 * Check what data is available in all tables
 */

import { prisma } from './src/lib/database/prisma';

async function checkDatabaseData() {
  console.log('🔍 DATABASE DATA REVIEW\n');
  console.log('=' .repeat(60));
  
  try {
    // Check dimension tables
    console.log('\n📊 DIMENSION TABLES:');
    console.log('-'.repeat(40));
    
    const sites = await prisma.dimSite.count();
    console.log(`DimSite: ${sites} records`);
    
    const areas = await prisma.dimArea.count();
    console.log(`DimArea: ${areas} records`);
    
    const workCenters = await prisma.dimWorkCenter.count();
    console.log(`DimWorkCenter: ${workCenters} records`);
    
    const equipment = await prisma.dimEquipment.count();
    console.log(`DimEquipment: ${equipment} records`);
    
    const products = await prisma.dimProduct.count();
    console.log(`DimProduct: ${products} records`);
    
    const shifts = await prisma.dimShift.count();
    console.log(`DimShift: ${shifts} records`);
    
    const downtimeReasons = await prisma.dimDowntimeReason.count();
    console.log(`DimDowntimeReason: ${downtimeReasons} records`);
    
    const units = await prisma.dimUnit.count();
    console.log(`DimUnit: ${units} records`);
    
    // Check fact tables
    console.log('\n📈 FACT TABLES:');
    console.log('-'.repeat(40));
    
    const production = await prisma.factProduction.count();
    console.log(`FactProduction: ${production} records`);
    
    const downtime = await prisma.factDowntime.count();
    console.log(`FactDowntime: ${downtime} records`);
    
    const scrap = await prisma.factScrap.count();
    console.log(`FactScrap: ${scrap} records`);
    
    const maintenance = await prisma.factMaintenance.count();
    console.log(`FactMaintenance: ${maintenance} records`);
    
    const sensorEvents = await prisma.factSensorEvent.count();
    console.log(`FactSensorEvent: ${sensorEvents} records`);
    
    // Sample some equipment data
    console.log('\n🏭 EQUIPMENT DETAILS:');
    console.log('-'.repeat(40));
    
    const equipmentSample = await prisma.dimEquipment.findMany({
      take: 5,
      include: {
        workCenter: {
          include: {
            area: {
              include: {
                site: true
              }
            }
          }
        }
      }
    });
    
    if (equipmentSample.length > 0) {
      equipmentSample.forEach(eq => {
        console.log(`\n${eq.name} (${eq.code})`);
        console.log(`  Type: ${eq.type || 'N/A'}`);
        console.log(`  Work Center: ${eq.workCenter.name}`);
        console.log(`  Area: ${eq.workCenter.area.name}`);
        console.log(`  Site: ${eq.workCenter.area.site.name}`);
      });
    } else {
      console.log('No equipment found');
    }
    
    // Check for recent production data
    console.log('\n📅 RECENT PRODUCTION DATA:');
    console.log('-'.repeat(40));
    
    const recentProduction = await prisma.factProduction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        equipment: true,
        product: true,
        shift: true
      }
    });
    
    if (recentProduction.length > 0) {
      console.log(`Found ${recentProduction.length} recent production records:`);
      recentProduction.forEach(prod => {
        console.log(`\n- ${prod.equipment.name} produced ${prod.goodParts} good parts of ${prod.product.name}`);
        console.log(`  Date: ${prod.startTime.toISOString()}`);
        console.log(`  Scrap: ${prod.scrapParts}, Rework: ${prod.reworkParts}`);
      });
    } else {
      console.log('No production records found');
    }
    
    // Check for quality data (scrap)
    console.log('\n🔍 QUALITY DATA (SCRAP):');
    console.log('-'.repeat(40));
    
    const recentScrap = await prisma.factScrap.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        production: {
          include: {
            equipment: true
          }
        }
      }
    });
    
    if (recentScrap.length > 0) {
      console.log(`Found ${recentScrap.length} recent scrap records:`);
      recentScrap.forEach(scrap => {
        console.log(`\n- Scrap Code: ${scrap.scrapCode}, Qty: ${scrap.scrapQty}`);
        console.log(`  Product: ${scrap.product.name}`);
        console.log(`  Equipment: ${scrap.production.equipment.name}`);
      });
    } else {
      console.log('No scrap records found');
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('-'.repeat(40));
    
    const hasData = equipment > 0 || production > 0;
    if (hasData) {
      console.log('✅ Database contains data');
      if (production === 0) {
        console.log('⚠️  No production data - chat queries will return empty results');
        console.log('    Run a seeding script to add sample production data');
      }
    } else {
      console.log('❌ Database is empty');
      console.log('    Run a seeding script to populate with sample data');
    }
    
    // Check date ranges if production data exists
    if (production > 0) {
      const dateRange = await prisma.factProduction.aggregate({
        _min: { startTime: true },
        _max: { startTime: true }
      });
      
      console.log('\n📅 PRODUCTION DATE RANGE:');
      console.log(`  Earliest: ${dateRange._min.startTime?.toISOString() || 'N/A'}`);
      console.log(`  Latest: ${dateRange._max.startTime?.toISOString() || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseData().catch(console.error);