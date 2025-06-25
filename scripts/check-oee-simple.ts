#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOEEData() {
  console.log('🔍 Checking OEE Data Issues...\n');

  try {
    // 1. Check if we have any data
    const count = await prisma.performanceMetric.count();
    console.log(`Total PerformanceMetric records: ${count}\n`);

    // 2. Check raw SQL query results
    console.log('Raw OEE View Data:');
    const rawData = await prisma.$queryRaw`
      SELECT 
        equipment_id,
        period_date,
        availability_rate,
        performance_rate,
        quality_rate,
        oee,
        ROUND((availability_rate * performance_rate * quality_rate)::numeric, 4) as calculated_oee
      FROM vw_iso22400_oee_metrics
      ORDER BY period_date DESC
      LIMIT 5
    ` as any[];
    
    console.table(rawData);

    // 3. Check aggregated OEE by equipment
    console.log('\nAggregated OEE by Equipment:');
    const aggregated = await prisma.$queryRaw`
      SELECT 
        equipment_id,
        ROUND(AVG(availability_rate)::numeric * 100, 1) as avg_availability,
        ROUND(AVG(performance_rate)::numeric * 100, 1) as avg_performance,
        ROUND(AVG(quality_rate)::numeric * 100, 1) as avg_quality,
        ROUND(AVG(oee)::numeric * 100, 1) as avg_oee,
        COUNT(*) as records
      FROM vw_iso22400_oee_metrics
      GROUP BY equipment_id
      ORDER BY equipment_id
    ` as any[];
    
    console.table(aggregated);

    // 4. Check what Grafana pie chart query returns
    console.log('\nGrafana Pie Chart Query Result:');
    const pieData = await prisma.$queryRaw`
      SELECT 
        NOW() as time,
        equipment_id::text as metric,
        ROUND(AVG(oee)::numeric * 100, 1)::float as value
      FROM vw_iso22400_oee_metrics
      WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY equipment_id
      ORDER BY value DESC
    ` as any[];
    
    console.table(pieData);
    
    // Calculate sum to check normalization
    const sum = pieData.reduce((acc: number, row: any) => acc + (row.value || 0), 0);
    console.log(`\nSum of all OEE values: ${sum.toFixed(1)}%`);
    
    // 5. Check if values are stored as decimals (0-1) or percentages (0-100)
    console.log('\nChecking data format in raw table:');
    const formatCheck = await prisma.performanceMetric.findFirst({
      where: {
        oeeScore: { not: null }
      },
      select: {
        equipmentId: true,
        oeeScore: true,
        availability: true,
        performance: true,
        quality: true
      }
    });
    
    if (formatCheck) {
      console.log('Sample record:', formatCheck);
      console.log(`OEE format: ${formatCheck.oeeScore! > 1 ? 'Percentage (0-100)' : 'Decimal (0-1)'}`);
    }

    // 6. Check view definition calculation
    console.log('\nChecking view calculation logic...');
    const viewDef = await prisma.$queryRaw`
      SELECT 
        equipment_id,
        planned_production_time_hours,
        downtime,
        total_count,
        good_count,
        availability_rate,
        performance_rate,
        quality_rate,
        oee
      FROM vw_iso22400_oee_metrics
      WHERE equipment_id = 'EQ001'
        AND period_date = (SELECT MAX(period_date) FROM vw_iso22400_oee_metrics WHERE equipment_id = 'EQ001')
    ` as any[];
    
    if (viewDef.length > 0) {
      const row = viewDef[0];
      console.log('\nSample calculation for EQ001:');
      console.log(`  Planned Time: ${row.planned_production_time_hours}h`);
      console.log(`  Downtime: ${row.downtime}h`);
      console.log(`  Total Count: ${row.total_count}`);
      console.log(`  Good Count: ${row.good_count}`);
      console.log(`  Availability: ${(row.availability_rate * 100).toFixed(1)}%`);
      console.log(`  Performance: ${(row.performance_rate * 100).toFixed(1)}%`);
      console.log(`  Quality: ${(row.quality_rate * 100).toFixed(1)}%`);
      console.log(`  OEE: ${(row.oee * 100).toFixed(1)}%`);
      
      const calcOEE = row.availability_rate * row.performance_rate * row.quality_rate;
      console.log(`  Calculated OEE: ${(calcOEE * 100).toFixed(1)}%`);
      
      if (Math.abs(row.oee - calcOEE) > 0.01) {
        console.log('  ⚠️  OEE calculation mismatch!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOEEData().catch(console.error);