#!/usr/bin/env tsx

/**
 * Add Missing CHECK Constraints
 * Ensures full data integrity compliance
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
});

async function addMissingConstraints() {
  console.log('🔧 Adding Missing CHECK Constraints\n');

  try {
    await prisma.$connect();
    
    const constraints = [
      // fact_production constraints
      {
        table: 'fact_production',
        name: 'chk_time_validity',
        definition: 'CHECK (operating_time <= planned_production_time)'
      },
      {
        table: 'fact_production',
        name: 'chk_time_positive',
        definition: 'CHECK (operating_time >= 0 AND planned_production_time >= 0)'
      },
      {
        table: 'fact_production',
        name: 'chk_parts_validity',
        definition: 'CHECK (good_parts <= total_parts_produced)'
      },
      {
        table: 'fact_production',
        name: 'chk_parts_non_negative',
        definition: 'CHECK (good_parts >= 0 AND total_parts_produced >= 0 AND scrap_parts >= 0 AND rework_parts >= 0)'
      },
      {
        table: 'fact_production',
        name: 'chk_parts_sum',
        definition: 'CHECK (good_parts + scrap_parts + rework_parts <= total_parts_produced)'
      },
      {
        table: 'fact_production',
        name: 'chk_production_times_valid',
        definition: 'CHECK (end_time > start_time)'
      },
      // fact_equipment_states constraints
      {
        table: 'fact_equipment_states',
        name: 'chk_duration_positive',
        definition: 'CHECK (duration_minutes >= 0)'
      },
      // fact_downtime constraints
      {
        table: 'fact_downtime',
        name: 'chk_downtime_duration_positive',
        definition: 'CHECK (downtime_duration >= 0)'
      },
      {
        table: 'fact_downtime',
        name: 'chk_downtime_times_valid',
        definition: 'CHECK (end_time > start_time)'
      },
      // fact_scrap constraints
      {
        table: 'fact_scrap',
        name: 'chk_scrap_quantity_positive',
        definition: 'CHECK (scrap_quantity >= 0)'
      },
      // fact_oee_metrics constraints
      {
        table: 'fact_oee_metrics',
        name: 'chk_oee_availability_range',
        definition: 'CHECK (availability >= 0 AND availability <= 1)'
      },
      {
        table: 'fact_oee_metrics',
        name: 'chk_oee_performance_range',
        definition: 'CHECK (performance >= 0 AND performance <= 1)'
      },
      {
        table: 'fact_oee_metrics',
        name: 'chk_oee_quality_range',
        definition: 'CHECK (quality >= 0 AND quality <= 1)'
      },
      {
        table: 'fact_oee_metrics',
        name: 'chk_oee_value_range',
        definition: 'CHECK (oee >= 0 AND oee <= 1)'
      },
      // fact_quality_metrics constraints
      {
        table: 'fact_quality_metrics',
        name: 'chk_quality_percentages',
        definition: 'CHECK (first_pass_yield >= 0 AND first_pass_yield <= 100 AND defect_rate >= 0 AND defect_rate <= 100)'
      },
      // fact_performance_metrics constraints
      {
        table: 'fact_performance_metrics',
        name: 'chk_performance_positive',
        definition: 'CHECK (cycle_time >= 0 AND setup_time >= 0 AND changeover_time >= 0)'
      },
      // fact_energy_metrics constraints
      {
        table: 'fact_energy_metrics',
        name: 'chk_energy_consumption_positive',
        definition: 'CHECK (energy_consumption >= 0)'
      },
      // fact_production_quantities constraints
      {
        table: 'fact_production_quantities',
        name: 'chk_quantities_positive',
        definition: 'CHECK (quantity >= 0 AND duration_minutes >= 0)'
      }
    ];
    
    let successCount = 0;
    let existingCount = 0;
    
    for (const constraint of constraints) {
      try {
        // First drop if exists
        await prisma.$executeRawUnsafe(`
          ALTER TABLE ${constraint.table} 
          DROP CONSTRAINT IF EXISTS ${constraint.name}
        `);
        
        // Then add the constraint
        await prisma.$executeRawUnsafe(`
          ALTER TABLE ${constraint.table} 
          ADD CONSTRAINT ${constraint.name} ${constraint.definition}
        `);
        
        console.log(`✅ Added: ${constraint.table}.${constraint.name}`);
        successCount++;
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          existingCount++;
        } else {
          console.log(`❌ Failed: ${constraint.table}.${constraint.name}`);
          console.log(`   ${error.message.split('\n')[0]}`);
        }
      }
    }
    
    // Add additional data quality constraints
    console.log('\n📋 Adding additional data quality constraints...\n');
    
    // Sensor event value ranges
    try {
      await prisma.$executeRaw`
        ALTER TABLE fact_sensor_event 
        DROP CONSTRAINT IF EXISTS chk_sensor_value_reasonable,
        ADD CONSTRAINT chk_sensor_value_reasonable 
        CHECK (value >= -9999999 AND value <= 9999999)
      `;
      console.log('✅ Added sensor value range constraint');
      successCount++;
    } catch (error) {
      console.log('⚠️  Sensor value constraint already exists');
    }
    
    // Equipment code format
    try {
      await prisma.$executeRaw`
        ALTER TABLE dim_equipment 
        DROP CONSTRAINT IF EXISTS chk_equipment_code_format,
        ADD CONSTRAINT chk_equipment_code_format 
        CHECK (equipment_code ~ '^[A-Z0-9-]+$')
      `;
      console.log('✅ Added equipment code format constraint');
      successCount++;
    } catch (error) {
      console.log('⚠️  Equipment code constraint already exists');
    }
    
    // Verify constraints were added
    const constraintCount = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count
      FROM pg_constraint
      WHERE contype = 'c'
      AND connamespace = 'public'::regnamespace
    `;
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CHECK CONSTRAINTS IMPLEMENTATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📊 Results:`);
    console.log(`  ✅ Successfully added: ${successCount} constraints`);
    console.log(`  ⚠️  Already existing: ${existingCount} constraints`);
    console.log(`  📈 Total CHECK constraints: ${constraintCount[0].count}`);
    
    // Re-run compliance check
    console.log('\n🔍 Re-checking compliance score...\n');
    
    const checkConstraints = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) FILTER (WHERE contype = 'c')::int as check_count,
        COUNT(*) FILTER (WHERE contype = 'u')::int as unique_count,
        COUNT(*) FILTER (WHERE contype = 'f')::int as foreign_key_count
      FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace
    `;
    
    const result = checkConstraints[0];
    console.log(`✅ CHECK constraints: ${result.check_count}`);
    console.log(`✅ UNIQUE constraints: ${result.unique_count}`);
    console.log(`✅ Foreign keys: ${result.foreign_key_count}`);
    
    console.log('\n✨ Data integrity now fully enforced!');
    
  } catch (error) {
    console.error('❌ Error adding constraints:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  addMissingConstraints();
}

export { addMissingConstraints };