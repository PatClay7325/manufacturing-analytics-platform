#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOEEDataIssue() {
  console.log('🔍 Investigating OEE Data and Calculations...\n');

  try {
    // 1. Check raw performance metrics
    console.log('1. Raw Performance Metrics (last 5 records):');
    console.log('===========================================');
    const rawMetrics = await prisma.performanceMetric.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      select: {
        equipmentId: true,
        timestamp: true,
        oeeScore: true,
        availability: true,
        performance: true,
        quality: true,
        plannedProduction: true,
        actualProductionTime: true,
        cycleTimeSeconds: true,
        totalParts: true,
        goodParts: true,
        rejectedParts: true,
        downtimeMinutes: true
      }
    });
    
    rawMetrics.forEach(m => {
      console.log(`Equipment: ${m.equipmentId}, Time: ${m.timestamp.toISOString()}`);
      console.log(`  OEE: ${m.oeeScore}%, Availability: ${m.availability}%, Performance: ${m.performance}%, Quality: ${m.quality}%`);
      console.log(`  Planned Production: ${m.plannedProduction}, Actual Time: ${m.actualProductionTime}h`);
      console.log(`  Total Parts: ${m.totalParts}, Good Parts: ${m.goodParts}, Rejected: ${m.rejectedParts}`);
      console.log(`  Downtime: ${m.downtimeMinutes} minutes`);
      console.log(`  Calculated OEE: ${(m.availability * m.performance * m.quality / 10000).toFixed(1)}%`);
      console.log();
    });

    // 2. Check OEE view data
    console.log('\n2. OEE View Data (vw_iso22400_oee_metrics):');
    console.log('==========================================');
    const viewData = await prisma.$queryRaw`
      SELECT * FROM vw_iso22400_oee_metrics 
      ORDER BY period_date DESC, equipment_id 
      LIMIT 5
    ` as any[];
    
    viewData.forEach(row => {
      console.log(`Equipment: ${row.equipment_id}, Date: ${row.period_date}`);
      console.log(`  Availability Rate: ${(row.availability_rate * 100).toFixed(1)}%`);
      console.log(`  Performance Rate: ${(row.performance_rate * 100).toFixed(1)}%`);
      console.log(`  Quality Rate: ${(row.quality_rate * 100).toFixed(1)}%`);
      console.log(`  OEE: ${(row.oee * 100).toFixed(1)}%`);
      console.log(`  Calculated: ${(row.availability_rate * row.performance_rate * row.quality_rate * 100).toFixed(1)}%`);
      console.log();
    });

    // 3. Check aggregated values by equipment
    console.log('\n3. Average OEE Components by Equipment:');
    console.log('======================================');
    const avgByEquipment = await prisma.$queryRaw`
      SELECT 
        equipment_id,
        ROUND(AVG(availability_rate)::numeric * 100, 1) as avg_availability,
        ROUND(AVG(performance_rate)::numeric * 100, 1) as avg_performance,
        ROUND(AVG(quality_rate)::numeric * 100, 1) as avg_quality,
        ROUND(AVG(oee)::numeric * 100, 1) as avg_oee,
        COUNT(*) as data_points
      FROM vw_iso22400_oee_metrics
      GROUP BY equipment_id
      ORDER BY equipment_id
    ` as any[];
    
    avgByEquipment.forEach(row => {
      const calculated = (row.avg_availability * row.avg_performance * row.avg_quality / 10000).toFixed(1);
      console.log(`${row.equipment_id}: A=${row.avg_availability}%, P=${row.avg_performance}%, Q=${row.avg_quality}%`);
      console.log(`  Stored OEE: ${row.avg_oee}%, Calculated: ${calculated}% (${row.data_points} data points)`);
      if (Math.abs(parseFloat(row.avg_oee) - parseFloat(calculated)) > 1) {
        console.log(`  ⚠️  WARNING: Stored vs Calculated mismatch!`);
      }
    });

    // 4. Check for data anomalies
    console.log('\n4. Data Range Analysis:');
    console.log('======================');
    const dataRange = await prisma.$queryRaw`
      SELECT 
        MIN(oee) as min_oee,
        MAX(oee) as max_oee,
        AVG(oee) as avg_oee,
        STDDEV(oee) as stddev_oee,
        COUNT(*) as total_records,
        COUNT(DISTINCT equipment_id) as equipment_count,
        MIN(period_date) as earliest_date,
        MAX(period_date) as latest_date
      FROM vw_iso22400_oee_metrics
    ` as any[];
    
    const range = dataRange[0];
    console.log(`OEE Range: ${(range.min_oee * 100).toFixed(1)}% - ${(range.max_oee * 100).toFixed(1)}%`);
    console.log(`Average OEE: ${(range.avg_oee * 100).toFixed(1)}% (σ = ${(range.stddev_oee * 100).toFixed(1)}%)`);
    console.log(`Total Records: ${range.total_records} across ${range.equipment_count} equipment`);
    console.log(`Date Range: ${range.earliest_date} to ${range.latest_date}`);

    // 5. Check if OEE values are stored as decimals or percentages
    console.log('\n5. Data Format Check:');
    console.log('====================');
    const formatCheck = await prisma.$queryRaw`
      SELECT 
        equipment_id,
        oee,
        availability_rate,
        performance_rate,
        quality_rate
      FROM vw_iso22400_oee_metrics
      WHERE period_date = CURRENT_DATE - INTERVAL '1 day'
      LIMIT 3
    ` as any[];
    
    formatCheck.forEach(row => {
      console.log(`${row.equipment_id}:`);
      console.log(`  OEE raw value: ${row.oee}`);
      console.log(`  Rates: A=${row.availability_rate}, P=${row.performance_rate}, Q=${row.quality_rate}`);
      console.log(`  Format: ${row.oee > 1 ? 'Percentage (0-100)' : 'Decimal (0-1)'}`);
    });

    // 6. Check Grafana query results
    console.log('\n6. Simulating Grafana Queries:');
    console.log('=============================');
    
    // Pie chart query
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
    
    console.log('Pie Chart Data:');
    pieData.forEach(row => {
      console.log(`  ${row.metric}: ${row.value}%`);
    });

    // Check if values sum to 100 (which would be wrong for OEE)
    const sum = pieData.reduce((acc, row) => acc + row.value, 0);
    console.log(`\nSum of all values: ${sum.toFixed(1)}%`);
    if (Math.abs(sum - 100) < 1) {
      console.log('⚠️  WARNING: Values sum to 100%, this suggests normalization issue!');
    }

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOEEDataIssue().catch(console.error);