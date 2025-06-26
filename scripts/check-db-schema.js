const { PrismaClient } = require('../prisma/generated/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public'
    }
  }
});

async function checkSchema() {
  console.log('🔍 Checking Database Schema and Data...\n');
  
  try {
    // List all tables
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    
    console.log('📊 Tables in Database:');
    tables.forEach(t => console.log(`  - ${t.tablename}`));
    
    // Count records in key tables
    console.log('\n📈 Record Counts:');
    
    const counts = await prisma.$queryRaw`
      SELECT 
        'dim_equipment' as table_name, COUNT(*) as count FROM dim_equipment
      UNION ALL
      SELECT 'dim_product', COUNT(*) FROM dim_product
      UNION ALL
      SELECT 'fact_production', COUNT(*) FROM fact_production
      UNION ALL
      SELECT 'fact_downtime', COUNT(*) FROM fact_downtime
      UNION ALL
      SELECT 'fact_scrap', COUNT(*) FROM fact_scrap
      UNION ALL
      SELECT 'fact_maintenance', COUNT(*) FROM fact_maintenance
      UNION ALL
      SELECT 'fact_sensor_event', COUNT(*) FROM fact_sensor_event
      ORDER BY table_name;
    `;
    
    counts.forEach(c => {
      console.log(`  ${c.table_name}: ${parseInt(c.count).toLocaleString()} records`);
    });
    
    // Check for ISO-required tables
    console.log('\n❓ ISO Schema Requirements Check:');
    
    const isoCheck = await prisma.$queryRaw`
      SELECT 
        EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'dim_date_range') as has_date_range,
        EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'ontology_term') as has_ontology,
        EXISTS(SELECT 1 FROM pg_matviews WHERE matviewname = 'view_oee_daily') as has_oee_view,
        EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'audit_log') as has_audit_log;
    `;
    
    const check = isoCheck[0];
    console.log(`  dim_date_range: ${check.has_date_range ? '✅' : '❌ MISSING'}`);
    console.log(`  ontology_term: ${check.has_ontology ? '✅' : '❌ MISSING'}`);
    console.log(`  view_oee_daily: ${check.has_oee_view ? '✅' : '❌ MISSING'}`);
    console.log(`  audit_log: ${check.has_audit_log ? '✅' : '❌ MISSING'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();