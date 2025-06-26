const { PrismaClient } = require('../prisma/generated/client');

const prisma = new PrismaClient();

async function applySchemaFixes() {
  console.log('🔧 Applying schema fixes...\n');
  
  try {
    // 1. Add isFailure column if not exists
    console.log('Adding is_failure column to dim_downtime_reason...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'dim_downtime_reason' 
          AND column_name = 'is_failure'
        ) THEN
          ALTER TABLE dim_downtime_reason 
          ADD COLUMN is_failure BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `;
    
    // Update failure reasons
    await prisma.$executeRaw`
      UPDATE dim_downtime_reason 
      SET is_failure = true 
      WHERE reason_code IN ('MECH_FAIL', 'ELEC_FAIL', 'BREAKDOWN', 'EQUIPMENT_FAILURE');
    `;
    console.log('  ✅ is_failure column ready');
    
    // 2. Add plannedParts column if not exists
    console.log('\nAdding planned_parts column to fact_production...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'fact_production' 
          AND column_name = 'planned_parts'
        ) THEN
          ALTER TABLE fact_production 
          ADD COLUMN planned_parts INT DEFAULT 0;
        END IF;
      END $$;
    `;
    
    // Populate with estimated values
    await prisma.$executeRaw`
      UPDATE fact_production 
      SET planned_parts = GREATEST(total_parts_produced, good_parts + COALESCE(scrap_parts, 0))
      WHERE planned_parts = 0 OR planned_parts IS NULL;
    `;
    console.log('  ✅ planned_parts column ready');
    
    // 3. Refresh materialized views
    console.log('\nRefreshing materialized views...');
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW view_oee_daily`;
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW view_reliability_summary`;
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW view_scrap_summary`;
    console.log('  ✅ Views refreshed');
    
    // 4. Show summary
    const summary = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM dim_equipment) as equipment_count,
        (SELECT COUNT(*) FROM fact_production) as production_records,
        (SELECT COUNT(*) FROM fact_maintenance) as maintenance_records,
        (SELECT COUNT(*) FROM fact_sensor_event) as sensor_events;
    `;
    
    console.log('\n📊 Database Status:');
    console.table(summary);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

applySchemaFixes();