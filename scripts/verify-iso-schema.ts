import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public'
    }
  }
});

async function verifyISOSchema() {
  console.log('🔍 Verifying ISO-Compliant Schema and Data Population...\n');
  
  try {
    // Check for critical ISO tables
    const tables = await prisma.$queryRaw<{tablename: string}[]>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    
    console.log('📊 Current Tables in Database:');
    tables.forEach(t => console.log(`  - ${t.tablename}`));
    
    // Check for ISO-required tables
    const requiredTables = [
      'dim_date_range',
      'ontology_term',
      'view_oee_daily',
      'view_reliability_summary',
      'view_scrap_summary'
    ];
    
    console.log('\n🔍 Checking ISO-Required Tables:');
    for (const table of requiredTables) {
      const exists = tables.some(t => t.tablename === table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }
    
    // Check data population for key tables
    console.log('\n📈 Data Population Check:');
    
    const tableCounts = [
      { name: 'dim_equipment', query: prisma.dimEquipment.count() },
      { name: 'dim_product', query: prisma.dimProduct.count() },
      { name: 'fact_production', query: prisma.factProduction.count() },
      { name: 'fact_downtime', query: prisma.factDowntime.count() },
      { name: 'fact_scrap', query: prisma.factScrap.count() },
      { name: 'fact_maintenance', query: prisma.factMaintenance.count() }
    ];
    
    for (const { name, query } of tableCounts) {
      const count = await query;
      console.log(`  ${name}: ${count.toLocaleString()} records`);
    }
    
    // Check for TimescaleDB hypertables
    console.log('\n🕐 TimescaleDB Hypertables Check:');
    const hypertables = await prisma.$queryRaw<{hypertable_name: string}[]>`
      SELECT hypertable_name 
      FROM timescaledb_information.hypertables 
      WHERE hypertable_schema = 'public';
    `;
    
    if (hypertables.length > 0) {
      hypertables.forEach(h => console.log(`  ✅ ${h.hypertable_name}`));
    } else {
      console.log('  ❌ No TimescaleDB hypertables found');
    }
    
    // Check for materialized views
    console.log('\n👁️ Materialized Views Check:');
    const matviews = await prisma.$queryRaw<{matviewname: string}[]>`
      SELECT matviewname 
      FROM pg_matviews 
      WHERE schemaname = 'public';
    `;
    
    if (matviews.length > 0) {
      matviews.forEach(v => console.log(`  ✅ ${v.matviewname}`));
    } else {
      console.log('  ❌ No materialized views found');
    }
    
    // Check for missing ISO schema elements
    console.log('\n⚠️  Missing ISO Schema Elements:');
    console.log('  1. dim_date_range - Calendar/date range table');
    console.log('  2. ontology_term - Synonym mapping for AI');
    console.log('  3. Materialized views for OEE, reliability, scrap');
    console.log('  4. Audit triggers on critical tables');
    
  } catch (error) {
    console.error('❌ Error verifying schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyISOSchema();