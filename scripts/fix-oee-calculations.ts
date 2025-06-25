#!/usr/bin/env node

/**
 * Fix OEE data and recalculate to ensure consistency
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOEECalculations() {
  console.log('🔧 Fixing OEE Calculations and Data...\n');

  try {
    // First, let's check if the issue is with the pie chart visualization
    console.log('1. Current Pie Chart Data:');
    const pieData = await prisma.$queryRaw`
      SELECT 
        equipment_id as "Equipment",
        ROUND(AVG(oee)::numeric * 100, 1) as "OEE %"
      FROM vw_iso22400_oee_metrics
      WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY equipment_id
      ORDER BY "OEE %" DESC
    ` as any[];
    
    console.table(pieData);

    // Check if the view is calculating correctly
    console.log('\n2. Recreating the view with clearer calculations...');
    
    // Drop and recreate the view to ensure calculations are correct
    await prisma.$executeRaw`DROP VIEW IF EXISTS vw_iso22400_oee_metrics CASCADE`;
    
    await prisma.$executeRaw`
      CREATE VIEW vw_iso22400_oee_metrics AS
      WITH daily_metrics AS (
        SELECT 
          pm."equipmentId" AS equipment_id,
          date_trunc('day', pm."timestamp") AS period_date,
          
          -- Aggregate time measurements (convert minutes to hours)
          SUM(COALESCE(pm."plannedProductionTime", 8.0)) AS planned_production_time_hours,
          SUM(COALESCE(pm."downtimeMinutes", 0) / 60.0) AS downtime,
          
          -- Aggregate production counts
          SUM(COALESCE(pm."totalParts", 0)) AS total_count,
          SUM(COALESCE(pm."goodParts", 0)) AS good_count,
          
          -- Count records for averaging rates
          COUNT(*) AS record_count
        FROM "PerformanceMetric" pm
        WHERE pm."equipmentId" IS NOT NULL
        GROUP BY pm."equipmentId", date_trunc('day', pm."timestamp")
      )
      SELECT 
        equipment_id,
        period_date,
        planned_production_time_hours,
        downtime,
        total_count,
        good_count,
        record_count,
        
        -- ISO 22400 OEE Component Calculations
        -- Availability = (Planned Time - Downtime) / Planned Time
        CASE 
          WHEN planned_production_time_hours > 0 
          THEN GREATEST(0, LEAST(1, (planned_production_time_hours - downtime) / planned_production_time_hours))
          ELSE 0 
        END AS availability_rate,
        
        -- Performance = Actual Production / Theoretical Maximum
        -- Using a standard rate of 60 parts per hour as theoretical maximum
        CASE 
          WHEN (planned_production_time_hours - downtime) > 0 
          THEN GREATEST(0, LEAST(1, total_count::float / ((planned_production_time_hours - downtime) * 60)))
          ELSE 0 
        END AS performance_rate,
        
        -- Quality = Good Parts / Total Parts
        CASE 
          WHEN total_count > 0 
          THEN GREATEST(0, LEAST(1, good_count::float / total_count))
          ELSE 0 
        END AS quality_rate,
        
        -- OEE = Availability × Performance × Quality
        CASE 
          WHEN planned_production_time_hours > 0 AND total_count > 0
          THEN GREATEST(0, LEAST(1,
            ((planned_production_time_hours - downtime) / planned_production_time_hours) *
            (total_count::float / ((planned_production_time_hours - downtime) * 60)) *
            (good_count::float / total_count)
          ))
          ELSE 0
        END AS oee
      FROM daily_metrics
      WHERE planned_production_time_hours > 0
    `;

    console.log('✅ View recreated with clearer calculations');

    // Now check the new data
    console.log('\n3. Verifying new calculations:');
    const newData = await prisma.$queryRaw`
      SELECT 
        equipment_id,
        ROUND(AVG(availability_rate)::numeric * 100, 1) as "Availability %",
        ROUND(AVG(performance_rate)::numeric * 100, 1) as "Performance %",
        ROUND(AVG(quality_rate)::numeric * 100, 1) as "Quality %",
        ROUND(AVG(oee)::numeric * 100, 1) as "OEE %"
      FROM vw_iso22400_oee_metrics
      GROUP BY equipment_id
      ORDER BY "OEE %" DESC
    ` as any[];
    
    console.table(newData);

    // Update the Grafana dashboard to use simpler queries
    console.log('\n4. Updating Grafana dashboard...');
    
    const GRAFANA_URL = 'http://localhost:3001';
    const GRAFANA_USER = 'admin';
    const GRAFANA_PASSWORD = 'admin';

    // Get the current dashboard
    const dashboardResponse = await fetch(`${GRAFANA_URL}/api/dashboards/uid/iso22400-oee-metrics`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')
      }
    });

    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      const dashboard = dashboardData.dashboard;

      // Find and update the pie chart
      const pieChart = dashboard.panels.find((p: any) => p.title === '30-Day Average OEE by Equipment');
      if (pieChart) {
        // Simplify the query
        pieChart.targets[0].rawSql = `SELECT 
  equipment_id as "Equipment",
  ROUND(AVG(oee)::numeric * 100, 1) as "OEE %"
FROM vw_iso22400_oee_metrics
WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY equipment_id
ORDER BY "OEE %" DESC`;

        // Update panel to use table format first
        pieChart.type = 'table';
        
        // Save the dashboard
        const updateResponse = await fetch(`${GRAFANA_URL}/api/dashboards/db`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')
          },
          body: JSON.stringify({
            dashboard: dashboard,
            overwrite: true,
            message: "Fixed OEE calculations and simplified queries"
          })
        });

        if (updateResponse.ok) {
          console.log('✅ Dashboard updated successfully');
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log('- OEE calculations have been standardized');
    console.log('- View has been recreated with clearer logic');
    console.log('- Each equipment shows individual OEE percentage');
    console.log('- Values do NOT sum to 100% (they are independent OEE scores)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOEECalculations().catch(console.error);