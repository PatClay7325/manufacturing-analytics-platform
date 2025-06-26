#!/usr/bin/env tsx

/**
 * Apply ISO 22400 Compliant Schema
 * This script applies the master schema based on the ISO-compliant document
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const SCHEMA_FILES = {
  master: 'prisma/schema-iso22400-master.prisma',
  current: 'prisma/schema.prisma',
  backup: 'prisma/schema.backup.prisma',
  migration: 'prisma/migrations/iso22400-master-implementation.sql'
};

async function applyISOCompliantSchema() {
  console.log('🔄 Applying ISO 22400 Compliant Schema\n');

  try {
    // Step 1: Backup current schema
    console.log('📦 Backing up current schema...');
    const currentSchema = await fs.readFile(SCHEMA_FILES.current, 'utf-8');
    await fs.writeFile(SCHEMA_FILES.backup, currentSchema);
    console.log('  ✅ Backup created: schema.backup.prisma');

    // Step 2: Copy master schema to be the active schema
    console.log('\n📝 Applying ISO-compliant master schema...');
    const masterSchema = await fs.readFile(SCHEMA_FILES.master, 'utf-8');
    await fs.writeFile(SCHEMA_FILES.current, masterSchema);
    console.log('  ✅ Master schema copied to schema.prisma');

    // Step 3: Generate Prisma client
    console.log('\n🔧 Generating Prisma client...');
    await execAsync('npx prisma generate');
    console.log('  ✅ Prisma client generated');

    // Step 4: Apply SQL migration
    console.log('\n🗄️  Applying database migration...');
    const migrationSQL = await fs.readFile(SCHEMA_FILES.migration, 'utf-8');
    
    // Split migration into statements (basic split by semicolon)
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    console.log(`  📊 Found ${statements.length} SQL statements to execute`);

    // Execute statements in batches to avoid overwhelming the connection
    const BATCH_SIZE = 10;
    for (let i = 0; i < statements.length; i += BATCH_SIZE) {
      const batch = statements.slice(i, Math.min(i + BATCH_SIZE, statements.length));
      
      console.log(`  🔄 Executing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(statements.length / BATCH_SIZE)}...`);
      
      for (const statement of batch) {
        try {
          // Skip comments and empty statements
          if (statement.match(/^\s*--/) || statement.match(/^\s*$/)) {
            continue;
          }

          // Execute statement
          await prisma.$executeRawUnsafe(statement);
        } catch (error: any) {
          // Some errors are expected (e.g., "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key')) {
            // Ignore - this is expected
          } else {
            console.warn(`  ⚠️  Warning: ${error.message.split('\n')[0]}`);
          }
        }
      }
    }

    console.log('  ✅ Database migration applied');

    // Step 5: Verify schema alignment
    console.log('\n🔍 Verifying schema alignment...');
    
    // Check for key tables
    const keyTables = [
      'dim_date_range',
      'ontology_term',
      'dim_equipment',
      'fact_sensor_event',
      'audit_log',
      'view_oee_daily'
    ];

    for (const table of keyTables) {
      const result = await prisma.$queryRawUnsafe<any[]>(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        ) as exists
      `, table);
      
      const exists = result[0]?.exists;
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }

    // Step 6: Initialize data
    console.log('\n📊 Initializing data...');
    
    // Refresh date ranges
    await prisma.$executeRaw`SELECT refresh_date_ranges()`;
    console.log('  ✅ Date ranges refreshed');

    // Check ontology terms
    const ontologyCount = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM ontology_term
    `;
    console.log(`  ✅ Ontology terms: ${ontologyCount[0]?.count || 0} entries`);

    // Step 7: Create sample data for testing
    console.log('\n🏭 Creating sample reference data...');
    
    // Create sample site
    await prisma.$executeRaw`
      INSERT INTO dim_site (site_code, site_name, timezone)
      VALUES ('MAIN', 'Main Manufacturing Site', 'America/New_York')
      ON CONFLICT (site_code) DO NOTHING
    `;

    // Create sample area
    await prisma.$executeRaw`
      INSERT INTO dim_area (area_code, area_name, site_id)
      SELECT 'PROD-A', 'Production Area A', site_id
      FROM dim_site WHERE site_code = 'MAIN'
      ON CONFLICT (area_code) DO NOTHING
    `;

    // Create sample work center
    await prisma.$executeRaw`
      INSERT INTO dim_work_center (work_center_code, work_center_name, area_id, capacity, capacity_unit)
      SELECT 'WC-001', 'Work Center 001', area_id, 100, 'units/hour'
      FROM dim_area WHERE area_code = 'PROD-A'
      ON CONFLICT (work_center_code) DO NOTHING
    `;

    // Create sample equipment
    await prisma.$executeRaw`
      INSERT INTO dim_equipment (
        equipment_code, equipment_name, equipment_type, 
        work_center_id, theoretical_rate, attributes
      )
      SELECT 
        'EQ-001', 'CNC Machine 001', 'CNC', 
        work_center_id, 60, 
        '{"vendor": "Haas", "model": "VF-2", "year": 2020}'::jsonb
      FROM dim_work_center WHERE work_center_code = 'WC-001'
      ON CONFLICT (equipment_code) DO NOTHING
    `;

    console.log('  ✅ Sample reference data created');

    // Final summary
    console.log('\n✨ ISO 22400 Compliant Schema Applied Successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Run "npm run db:seed" to populate with sample data');
    console.log('  2. Set up cron jobs for refresh_date_ranges() and refresh_all_views()');
    console.log('  3. Configure your AI agent to use ontology_term mappings');
    console.log('  4. Monitor audit_log for all data changes');
    
  } catch (error) {
    console.error('\n❌ Error applying schema:', error);
    
    // Attempt to restore backup
    try {
      console.log('\n🔄 Attempting to restore backup...');
      const backupSchema = await fs.readFile(SCHEMA_FILES.backup, 'utf-8');
      await fs.writeFile(SCHEMA_FILES.current, backupSchema);
      await execAsync('npx prisma generate');
      console.log('  ✅ Backup restored');
    } catch (restoreError) {
      console.error('  ❌ Failed to restore backup:', restoreError);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  applyISOCompliantSchema();
}