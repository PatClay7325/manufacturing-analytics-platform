#!/usr/bin/env node

/**
 * Test script for ISO 22400 OEE Metrics View
 * This script creates the view and tests it with sample queries
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function createOEEView() {
  console.log('🔧 Creating ISO 22400 OEE Metrics View...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'prisma/sql/create_iso22400_oee_view.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await prisma.$executeRawUnsafe(sql);
    
    console.log('✅ View created successfully!');
  } catch (error) {
    console.error('❌ Error creating view:', error);
    throw error;
  }
}

async function testOEEView() {
  console.log('\n📊 Testing ISO 22400 OEE Metrics View...');
  
  try {
    // Test 1: Check if view exists and returns data
    const result = await prisma.$queryRaw`
      SELECT 
        equipment_id,
        period_date,
        planned_production_time_hours,
        downtime,
        operating_time,
        total_count,
        good_count,
        scrap_count,
        ideal_cycle_time,
        availability_rate,
        performance_rate,
        quality_rate,
        oee
      FROM vw_iso22400_oee_metrics
      LIMIT 10
    `;
    
    console.log(`\n✅ View query successful! Found ${(result as any[]).length} rows`);
    
    if ((result as any[]).length > 0) {
      console.log('\n📋 Sample OEE Metrics:');
      console.table((result as any[]).map(row => ({
        'Equipment': row.equipment_id || 'N/A',
        'Date': row.period_date ? new Date(row.period_date).toLocaleDateString() : 'N/A',
        'Planned Time (hrs)': row.planned_production_time_hours?.toFixed(2) || '0',
        'Downtime (hrs)': row.downtime?.toFixed(2) || '0',
        'Total Parts': row.total_count || 0,
        'Good Parts': row.good_count || 0,
        'Availability %': ((row.availability_rate || 0) * 100).toFixed(1),
        'Performance %': ((row.performance_rate || 0) * 100).toFixed(1),
        'Quality %': ((row.quality_rate || 0) * 100).toFixed(1),
        'OEE %': ((row.oee || 0) * 100).toFixed(1)
      })));
    }
    
    // Test 2: Aggregate statistics
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT equipment_id) as equipment_count,
        COUNT(DISTINCT period_date) as days_count,
        AVG(oee) as avg_oee,
        MIN(oee) as min_oee,
        MAX(oee) as max_oee,
        AVG(availability_rate) as avg_availability,
        AVG(performance_rate) as avg_performance,
        AVG(quality_rate) as avg_quality
      FROM vw_iso22400_oee_metrics
      WHERE oee > 0
    `;
    
    const statsData = (stats as any[])[0];
    console.log('\n📈 OEE Statistics:');
    console.log(`  Equipment Count: ${statsData.equipment_count || 0}`);
    console.log(`  Days with Data: ${statsData.days_count || 0}`);
    console.log(`  Average OEE: ${((statsData.avg_oee || 0) * 100).toFixed(1)}%`);
    console.log(`  Min OEE: ${((statsData.min_oee || 0) * 100).toFixed(1)}%`);
    console.log(`  Max OEE: ${((statsData.max_oee || 0) * 100).toFixed(1)}%`);
    console.log(`  Avg Availability: ${((statsData.avg_availability || 0) * 100).toFixed(1)}%`);
    console.log(`  Avg Performance: ${((statsData.avg_performance || 0) * 100).toFixed(1)}%`);
    console.log(`  Avg Quality: ${((statsData.avg_quality || 0) * 100).toFixed(1)}%`);
    
    // Test 3: Check for data quality issues
    const issues = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE oee > 1) as oee_over_100,
        COUNT(*) FILTER (WHERE oee < 0) as oee_negative,
        COUNT(*) FILTER (WHERE availability_rate > 1) as availability_over_100,
        COUNT(*) FILTER (WHERE performance_rate > 1) as performance_over_100,
        COUNT(*) FILTER (WHERE quality_rate > 1) as quality_over_100
      FROM vw_iso22400_oee_metrics
    `;
    
    const issuesData = (issues as any[])[0];
    console.log('\n🔍 Data Quality Check:');
    console.log(`  OEE > 100%: ${issuesData.oee_over_100 || 0} records`);
    console.log(`  OEE < 0%: ${issuesData.oee_negative || 0} records`);
    console.log(`  Availability > 100%: ${issuesData.availability_over_100 || 0} records`);
    console.log(`  Performance > 100%: ${issuesData.performance_over_100 || 0} records`);
    console.log(`  Quality > 100%: ${issuesData.quality_over_100 || 0} records`);
    
  } catch (error) {
    console.error('❌ Error testing view:', error);
    throw error;
  }
}

async function main() {
  try {
    await createOEEView();
    await testOEEView();
    
    console.log('\n✅ ISO 22400 OEE View is ready for use!');
    console.log('\n📝 Example SQL queries:');
    console.log('   SELECT * FROM vw_iso22400_oee_metrics WHERE equipment_id = \'EQ001\' ORDER BY period_date DESC LIMIT 30;');
    console.log('   SELECT equipment_id, AVG(oee) as avg_oee FROM vw_iso22400_oee_metrics GROUP BY equipment_id;');
    
  } catch (error) {
    console.error('Failed to set up OEE view:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();