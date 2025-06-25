#!/usr/bin/env node

/**
 * Verify that OEE dashboard data is properly formatted
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDashboardQueries() {
  console.log('🔍 Verifying OEE Dashboard Data Queries\n');
  
  try {
    // Test 1: OEE Trend Query
    console.log('1️⃣ Testing OEE Trend Query...');
    const trendData = await prisma.$queryRaw`
      SELECT 
        period_date AS time,
        equipment_id AS metric,
        ROUND(oee::numeric * 100, 1) AS value
      FROM vw_iso22400_oee_metrics
      WHERE period_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY period_date, equipment_id
      LIMIT 10
    `;
    console.log(`   ✅ Found ${(trendData as any[]).length} trend records`);
    if ((trendData as any[]).length > 0) {
      console.log('   Sample:', (trendData as any[])[0]);
    }
    
    // Test 2: Current Average OEE
    console.log('\n2️⃣ Testing Current Average OEE Query...');
    const avgOee = await prisma.$queryRaw`
      SELECT AVG(oee) * 100 as value
      FROM vw_iso22400_oee_metrics
      WHERE period_date >= CURRENT_DATE - INTERVAL '24 hours'
    `;
    console.log('   ✅ Current 24hr Average OEE:', (avgOee as any[])[0]?.value?.toFixed(1) + '%');
    
    // Test 3: Details Table
    console.log('\n3️⃣ Testing Details Table Query...');
    const details = await prisma.$queryRaw`
      SELECT 
        equipment_id AS "Equipment",
        period_date AS "Date",
        planned_production_time_hours AS "Planned Hours",
        downtime AS "Downtime Hours",
        total_count AS "Total Parts",
        good_count AS "Good Parts",
        availability_rate AS "Availability Rate",
        performance_rate AS "Performance Rate",
        quality_rate AS "Quality Rate",
        oee AS "OEE"
      FROM vw_iso22400_oee_metrics
      WHERE period_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY period_date DESC, equipment_id
      LIMIT 5
    `;
    console.log(`   ✅ Found ${(details as any[]).length} detail records`);
    
    // Test 4: 30-Day Equipment Average
    console.log('\n4️⃣ Testing 30-Day Average by Equipment...');
    const pieData = await prisma.$queryRaw`
      SELECT 
        equipment_id as metric,
        ROUND(AVG(oee)::numeric * 100, 1) as value
      FROM vw_iso22400_oee_metrics
      WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY equipment_id
      ORDER BY value DESC
    `;
    console.log('   ✅ Equipment OEE Averages:');
    (pieData as any[]).forEach(row => {
      console.log(`      ${row.metric}: ${row.value}%`);
    });
    
    // Test 5: Bar Chart Components (Fixed Query)
    console.log('\n5️⃣ Testing Bar Chart Components Query...');
    const barData = await prisma.$queryRaw`
      WITH components AS (
        SELECT 
          equipment_id,
          AVG(availability_rate) * 100 as availability,
          AVG(performance_rate) * 100 as performance,
          AVG(quality_rate) * 100 as quality
        FROM vw_iso22400_oee_metrics
        WHERE period_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY equipment_id
      )
      SELECT 
        equipment_id as "Equipment",
        'Availability' as "Metric",
        ROUND(availability::numeric, 1) as "Value"
      FROM components
      UNION ALL
      SELECT 
        equipment_id,
        'Performance',
        ROUND(performance::numeric, 1)
      FROM components
      UNION ALL
      SELECT 
        equipment_id,
        'Quality',
        ROUND(quality::numeric, 1)
      FROM components
      ORDER BY "Equipment", "Metric"
      LIMIT 15
    `;
    console.log(`   ✅ Found ${(barData as any[]).length} component records`);
    console.log('   Sample format:', (barData as any[])[0]);
    
    // Test 6: Date Range Check
    console.log('\n6️⃣ Checking Data Date Range...');
    const dateRange = await prisma.$queryRaw`
      SELECT 
        MIN(period_date) as min_date,
        MAX(period_date) as max_date,
        COUNT(DISTINCT equipment_id) as equipment_count,
        COUNT(*) as total_records
      FROM vw_iso22400_oee_metrics
    `;
    const range = (dateRange as any[])[0];
    console.log(`   ✅ Data Range: ${new Date(range.min_date).toLocaleDateString()} to ${new Date(range.max_date).toLocaleDateString()}`);
    console.log(`   ✅ Equipment: ${range.equipment_count} units`);
    console.log(`   ✅ Total Records: ${range.total_records}`);
    
    console.log('\n✅ All dashboard queries verified successfully!');
    console.log('\n📊 Your dashboard should now display:');
    console.log('   - OEE trend lines for each equipment');
    console.log('   - Current average OEE gauge');
    console.log('   - Detailed OEE table with all metrics');
    console.log('   - 30-day OEE comparison donut chart');
    console.log('   - OEE components bar chart');
    
  } catch (error) {
    console.error('❌ Query verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDashboardQueries();