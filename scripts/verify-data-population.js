const { PrismaClient } = require('../prisma/generated/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public'
    }
  }
});

async function verifyDataPopulation() {
  console.log('📊 Comprehensive Data Population Verification\n');
  
  try {
    // 1. Check dim_date_range population
    console.log('📅 Date Ranges:');
    const dateRanges = await prisma.$queryRaw`
      SELECT name, start_date, end_date 
      FROM dim_date_range 
      ORDER BY name;
    `;
    if (dateRanges.length > 0) {
      dateRanges.forEach(r => {
        console.log(`  ✅ ${r.name}: ${r.start_date} to ${r.end_date}`);
      });
    } else {
      console.log('  ❌ No date ranges found - needs population');
    }
    
    // 2. Check ontology_term population
    console.log('\n🔤 Ontology Terms:');
    const ontologyCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM ontology_term;
    `;
    console.log(`  Total terms: ${ontologyCount[0].count}`);
    
    const sampleTerms = await prisma.$queryRaw`
      SELECT term, model_name, field_name 
      FROM ontology_term 
      LIMIT 5;
    `;
    if (sampleTerms.length > 0) {
      console.log('  Sample mappings:');
      sampleTerms.forEach(t => {
        console.log(`    "${t.term}" → ${t.model_name}.${t.field_name}`);
      });
    }
    
    // 3. Check equipment hierarchy
    console.log('\n🏭 Equipment Hierarchy:');
    const hierarchy = await prisma.$queryRaw`
      SELECT 
        s.name as site,
        a.name as area,
        wc.name as work_center,
        COUNT(e.equipment_id) as equipment_count
      FROM dim_site s
      LEFT JOIN dim_area a ON s.site_id = a.site_id
      LEFT JOIN dim_work_center wc ON a.area_id = wc.area_id
      LEFT JOIN dim_equipment e ON wc.work_center_id = e.work_center_id
      GROUP BY s.name, a.name, wc.name
      ORDER BY s.name, a.name, wc.name;
    `;
    
    hierarchy.forEach(h => {
      console.log(`  ${h.site} > ${h.area} > ${h.work_center}: ${h.equipment_count} equipment`);
    });
    
    // 4. Check production data time coverage
    console.log('\n⏱️ Production Data Coverage:');
    const coverage = await prisma.$queryRaw`
      SELECT 
        MIN(start_time) as earliest,
        MAX(end_time) as latest,
        COUNT(DISTINCT DATE(start_time)) as days_with_data,
        COUNT(DISTINCT equipment_id) as equipment_with_data,
        COUNT(*) as total_records
      FROM fact_production;
    `;
    
    const cov = coverage[0];
    if (cov.total_records > 0) {
      console.log(`  Date range: ${cov.earliest} to ${cov.latest}`);
      console.log(`  Days with data: ${cov.days_with_data}`);
      console.log(`  Equipment with data: ${cov.equipment_with_data}`);
      console.log(`  Total production records: ${parseInt(cov.total_records).toLocaleString()}`);
    } else {
      console.log('  ❌ No production data found');
    }
    
    // 5. Check quality data
    console.log('\n🎯 Quality/Scrap Data:');
    const qualityStats = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT production_id) as production_with_scrap,
        COUNT(DISTINCT scrap_code) as unique_scrap_codes,
        SUM(scrap_qty) as total_scrap_qty
      FROM fact_scrap;
    `;
    
    const qs = qualityStats[0];
    console.log(`  Productions with scrap: ${qs.production_with_scrap}`);
    console.log(`  Unique scrap codes: ${qs.unique_scrap_codes}`);
    console.log(`  Total scrap quantity: ${parseInt(qs.total_scrap_qty || 0).toLocaleString()}`);
    
    // 6. Check maintenance data
    console.log('\n🔧 Maintenance Data:');
    const maintStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT equipment_id) as equipment_with_maintenance,
        COUNT(DISTINCT maintenance_type) as maintenance_types
      FROM fact_maintenance;
    `;
    
    const ms = maintStats[0];
    console.log(`  Total maintenance records: ${ms.total_records}`);
    console.log(`  Equipment with maintenance: ${ms.equipment_with_maintenance}`);
    console.log(`  Maintenance types: ${ms.maintenance_types}`);
    
    // 7. Check materialized views
    console.log('\n📊 Materialized Views Status:');
    const viewStatus = await prisma.$queryRaw`
      SELECT 
        matviewname,
        hasindexes,
        ispopulated,
        definition
      FROM pg_matviews
      WHERE schemaname = 'public';
    `;
    
    viewStatus.forEach(v => {
      console.log(`  ${v.matviewname}: ${v.ispopulated ? '✅ Populated' : '❌ Not populated'}`);
    });
    
    // 8. Summary recommendations
    console.log('\n💡 Recommendations:');
    if (parseInt(ontologyCount[0].count) === 0) {
      console.log('  ⚠️ Populate ontology_term table for AI synonym mapping');
    }
    if (dateRanges.length === 0) {
      console.log('  ⚠️ Run refresh_date_ranges() function to populate date ranges');
    }
    if (parseInt(ms.total_records) === 0) {
      console.log('  ⚠️ Add maintenance records for predictive analytics');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDataPopulation();