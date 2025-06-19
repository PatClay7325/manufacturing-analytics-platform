#!/usr/bin/env tsx

/**
 * Migration script to transform flat Equipment-based data to hierarchical ISA-95 structure
 * 
 * This script:
 * 1. Creates the enterprise hierarchy (Enterprise → Site → Area → WorkCenter → WorkUnit)
 * 2. Migrates existing Equipment records to WorkUnit records
 * 3. Updates all relationships to use WorkUnit instead of Equipment
 * 4. Creates KPI summaries at each hierarchy level
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting migration to hierarchical structure...\n');

  try {
    // Step 1: Create Enterprise
    console.log('📊 Creating Enterprise...');
    const enterprise = await prisma.enterprise.create({
      data: {
        name: 'AdaptiveFactory Global Manufacturing',
        code: 'ENT-001',
      },
    });
    console.log(`✅ Created Enterprise: ${enterprise.name}`);

    // Step 2: Create Sites based on the JSON structure
    console.log('\n📍 Creating Sites...');
    const sites = await Promise.all([
      prisma.site.create({
        data: {
          enterpriseId: enterprise.id,
          name: 'North America Manufacturing',
          code: 'SITE-NA001',
          location: 'Detroit, MI, USA',
        },
      }),
      prisma.site.create({
        data: {
          enterpriseId: enterprise.id,
          name: 'Asia Pacific Manufacturing',
          code: 'SITE-AP001',
          location: 'Shanghai, China',
        },
      }),
    ]);
    console.log(`✅ Created ${sites.length} sites`);

    // Step 3: Create Areas for each site
    console.log('\n🏭 Creating Areas...');
    const northAmericaSite = sites[0];
    const asiaPacificSite = sites[1];

    const areas = await Promise.all([
      // North America Areas
      prisma.area.create({
        data: {
          siteId: northAmericaSite.id,
          name: 'Automotive Assembly',
          code: 'AREA-NA001-AUT',
        },
      }),
      prisma.area.create({
        data: {
          siteId: northAmericaSite.id,
          name: 'Quality Control',
          code: 'AREA-NA001-QC',
        },
      }),
      // Asia Pacific Areas
      prisma.area.create({
        data: {
          siteId: asiaPacificSite.id,
          name: 'Electronics Manufacturing',
          code: 'AREA-AP001-ELEC',
        },
      }),
      prisma.area.create({
        data: {
          siteId: asiaPacificSite.id,
          name: 'Semiconductor Fabrication',
          code: 'AREA-AP001-SEMI',
        },
      }),
    ]);
    console.log(`✅ Created ${areas.length} areas`);

    // Step 4: Create Work Centers
    console.log('\n🔧 Creating Work Centers...');
    const automotiveArea = areas[0];
    const qualityControlArea = areas[1];
    const electronicsArea = areas[2];
    const semiconductorArea = areas[3];

    const workCenters = await Promise.all([
      // Automotive Work Centers
      prisma.workCenter.create({
        data: {
          areaId: automotiveArea.id,
          name: 'Body Assembly',
          code: 'WC-NA001-AUT-BA',
        },
      }),
      prisma.workCenter.create({
        data: {
          areaId: automotiveArea.id,
          name: 'Painting',
          code: 'WC-NA001-AUT-PT',
        },
      }),
      // Quality Control Work Centers
      prisma.workCenter.create({
        data: {
          areaId: qualityControlArea.id,
          name: 'Dimensional Inspection',
          code: 'WC-NA001-QC-DI',
        },
      }),
      // Electronics Work Centers
      prisma.workCenter.create({
        data: {
          areaId: electronicsArea.id,
          name: 'PCB Assembly',
          code: 'WC-AP001-ELEC-PCB',
        },
      }),
      prisma.workCenter.create({
        data: {
          areaId: electronicsArea.id,
          name: 'Final Assembly',
          code: 'WC-AP001-ELEC-FA',
        },
      }),
      // Semiconductor Work Centers
      prisma.workCenter.create({
        data: {
          areaId: semiconductorArea.id,
          name: 'Wafer Processing',
          code: 'WC-AP001-SEMI-WP',
        },
      }),
    ]);
    console.log(`✅ Created ${workCenters.length} work centers`);

    // Step 5: Migrate existing Equipment to WorkUnits
    console.log('\n🔄 Migrating Equipment to WorkUnits...');
    const existingEquipment = await prisma.equipment.findMany({
      include: {
        performanceMetrics: true,
        qualityMetrics: true,
        alerts: true,
        maintenanceRecords: true,
        metrics: true,
      },
    });

    console.log(`Found ${existingEquipment.length} equipment records to migrate`);

    // Map equipment types to appropriate work centers
    const equipmentTypeToWorkCenter = {
      'CNC': workCenters[0], // Body Assembly
      'Robot': workCenters[0], // Body Assembly
      'Welding': workCenters[0], // Body Assembly
      'Paint Booth': workCenters[1], // Painting
      'CMM': workCenters[2], // Dimensional Inspection
      'SMT': workCenters[3], // PCB Assembly
      'Reflow Oven': workCenters[3], // PCB Assembly
      'Ion Implanter': workCenters[5], // Wafer Processing
    };

    let migratedCount = 0;
    for (const equipment of existingEquipment) {
      // Determine which work center based on equipment type
      let workCenter = workCenters[0]; // Default to Body Assembly
      
      for (const [type, wc] of Object.entries(equipmentTypeToWorkCenter)) {
        if (equipment.type.toLowerCase().includes(type.toLowerCase())) {
          workCenter = wc;
          break;
        }
      }

      // Create WorkUnit from Equipment
      const workUnit = await prisma.workUnit.create({
        data: {
          workCenterId: workCenter.id,
          name: equipment.name,
          code: `WU-${equipment.serialNumber}`,
          equipmentType: equipment.type,
          model: equipment.model || equipment.type,
          serialNumber: equipment.serialNumber,
          manufacturerCode: equipment.manufacturerCode,
          installationDate: equipment.installationDate,
          status: equipment.status,
          location: equipment.location,
          description: equipment.description,
          lastMaintenanceAt: equipment.lastMaintenanceAt,
        },
      });

      // Update related records to reference WorkUnit instead of Equipment
      await Promise.all([
        // Update PerformanceMetrics
        prisma.performanceMetric.updateMany({
          where: { equipmentId: equipment.id },
          data: { 
            workUnitId: workUnit.id,
            equipmentId: null,
          },
        }),
        // Update QualityMetrics
        prisma.qualityMetric.updateMany({
          where: { equipmentId: equipment.id },
          data: { workUnitId: workUnit.id },
        }),
        // Update Alerts
        prisma.alert.updateMany({
          where: { equipmentId: equipment.id },
          data: { 
            workUnitId: workUnit.id,
            equipmentId: null,
          },
        }),
        // Update MaintenanceRecords
        prisma.maintenanceRecord.updateMany({
          where: { equipmentId: equipment.id },
          data: { workUnitId: workUnit.id },
        }),
        // Update Metrics
        prisma.metric.updateMany({
          where: { equipmentId: equipment.id },
          data: { workUnitId: workUnit.id },
        }),
      ]);

      migratedCount++;
      console.log(`  ✅ Migrated ${equipment.name} to WorkUnit ${workUnit.code}`);
    }

    console.log(`✅ Successfully migrated ${migratedCount} equipment records`);

    // Step 6: Create initial KPI summaries
    console.log('\n📈 Creating KPI summaries...');
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Create Enterprise KPI Summary
    await prisma.enterpriseKPISummary.create({
      data: {
        enterpriseId: enterprise.id,
        oee: 85.4,
        availability: 90.2,
        performance: 89.5,
        quality: 95.8,
        mtbf: 1200,
        mttr: 2.5,
        productionCount: BigInt(4850000),
        scrapRate: 2.1,
        energyConsumption: BigInt(15600000),
        periodStart,
        periodEnd,
      },
    });

    // Create Site KPI Summaries
    for (const site of sites) {
      await prisma.siteKPISummary.create({
        data: {
          siteId: site.id,
          oee: 84.0 + Math.random() * 4,
          availability: 88.0 + Math.random() * 4,
          performance: 87.0 + Math.random() * 4,
          quality: 94.0 + Math.random() * 3,
          mtbf: 1000 + Math.random() * 400,
          mttr: 2.0 + Math.random() * 1,
          productionCount: BigInt(Math.floor(2000000 + Math.random() * 1000000)),
          scrapRate: 1.5 + Math.random() * 1,
          energyConsumption: BigInt(Math.floor(7000000 + Math.random() * 2000000)),
          periodStart,
          periodEnd,
        },
      });
    }

    // Create sample downtime causes for work units
    console.log('\n⏱️ Creating sample downtime causes...');
    const workUnits = await prisma.workUnit.findMany();
    const downtimeCauses = ['Equipment Failure', 'Setup and Adjustments', 'Planned Maintenance', 'Material Shortage'];
    
    for (const workUnit of workUnits.slice(0, 3)) { // Just for first 3 units as sample
      for (const cause of downtimeCauses) {
        await prisma.downtimeCause.create({
          data: {
            workUnitId: workUnit.id,
            cause,
            hours: Math.random() * 20 + 5,
            percentage: Math.random() * 15 + 5,
            periodStart,
            periodEnd,
          },
        });
      }
    }

    // Update Production Orders to reference Work Centers
    console.log('\n📦 Updating Production Orders...');
    const productionLines = await prisma.productionLine.findMany();
    
    for (const line of productionLines) {
      // Map production lines to work centers based on department
      let workCenterId = workCenters[0].id; // Default
      
      if (line.department.toLowerCase().includes('paint')) {
        workCenterId = workCenters[1].id;
      } else if (line.department.toLowerCase().includes('quality')) {
        workCenterId = workCenters[2].id;
      } else if (line.department.toLowerCase().includes('electronic')) {
        workCenterId = workCenters[3].id;
      }

      await prisma.productionOrder.updateMany({
        where: { productionLineId: line.id },
        data: { workCenterId },
      });
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Enterprise: 1`);
    console.log(`  - Sites: ${sites.length}`);
    console.log(`  - Areas: ${areas.length}`);
    console.log(`  - Work Centers: ${workCenters.length}`);
    console.log(`  - Work Units: ${migratedCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
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