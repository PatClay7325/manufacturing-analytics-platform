#!/usr/bin/env node

/**
 * Restore the OEE view to the correct calculation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreOEEView() {
  console.log('🔧 Restoring OEE View with Correct Calculations...\n');

  try {
    // Drop the broken view
    await prisma.$executeRaw`DROP VIEW IF EXISTS vw_iso22400_oee_metrics CASCADE`;
    
    // Recreate with the original working calculations
    await prisma.$executeRaw`
      CREATE VIEW vw_iso22400_oee_metrics AS
      WITH daily_metrics AS (
        SELECT 
          pm."equipmentId" AS equipment_id,
          date_trunc('day', pm."timestamp") AS period_date,
          
          -- Use the pre-calculated OEE components from the raw data
          AVG(COALESCE(pm."availability", 0)) / 100.0 AS availability_rate,
          AVG(COALESCE(pm."performance", 0)) / 100.0 AS performance_rate,
          AVG(COALESCE(pm."quality", 0)) / 100.0 AS quality_rate,
          AVG(COALESCE(pm."oeeScore", 0)) AS oee_percentage,
          
          -- Aggregate time and production data for reference
          SUM(COALESCE(pm."plannedProductionTime", 8.0)) AS planned_production_time_hours,
          SUM(COALESCE(pm."downtimeMinutes", 0) / 60.0) AS downtime,
          SUM(COALESCE(pm."totalParts", 0)) AS total_count,
          SUM(COALESCE(pm."goodParts", 0)) AS good_count,
          COUNT(*) AS record_count
        FROM "PerformanceMetric" pm
        WHERE pm."equipmentId" IS NOT NULL
          AND pm."availability" IS NOT NULL
          AND pm."performance" IS NOT NULL
          AND pm."quality" IS NOT NULL
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
        availability_rate,
        performance_rate,
        quality_rate,
        -- OEE as decimal (0-1 range)
        CASE 
          WHEN oee_percentage > 1 THEN oee_percentage / 100.0
          ELSE oee_percentage
        END AS oee
      FROM daily_metrics
    `;

    console.log('✅ View restored with original calculations');

    // Verify the data
    console.log('\nVerifying restored data:');
    const verifyData = await prisma.$queryRaw`
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
    
    console.table(verifyData);

    // Test the pie chart query
    console.log('\nPie Chart Query Result:');
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

    // Now create a better dashboard panel
    console.log('\n📊 Creating improved visualization...');
    
    const GRAFANA_URL = 'http://localhost:3001';
    const GRAFANA_USER = 'admin';
    const GRAFANA_PASSWORD = 'admin';

    // Get the dashboard
    const dashboardResponse = await fetch(`${GRAFANA_URL}/api/dashboards/uid/iso22400-oee-metrics`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')
      }
    });

    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      const dashboard = dashboardData.dashboard;

      // Find the pie/table chart
      const chartIndex = dashboard.panels.findIndex((p: any) => 
        p.title === '30-Day Average OEE by Equipment'
      );
      
      if (chartIndex !== -1) {
        // Replace with a stat panel that works well
        dashboard.panels[chartIndex] = {
          "datasource": {
            "type": "postgres",
            "uid": "${DS_MANUFACTURING_POSTGRESQL}"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "thresholds"
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "red",
                    "value": null
                  },
                  {
                    "color": "yellow",
                    "value": 60
                  },
                  {
                    "color": "green",
                    "value": 85
                  }
                ]
              },
              "unit": "percent",
              "min": 0,
              "max": 100
            },
            "overrides": []
          },
          "gridPos": {
            "h": 8,
            "w": 12,
            "x": 0,
            "y": 17
          },
          "id": 4,
          "options": {
            "colorMode": "background",
            "graphMode": "none",
            "justifyMode": "center",
            "orientation": "horizontal",
            "reduceOptions": {
              "values": false,
              "calcs": ["lastNotNull"],
              "fields": ""
            },
            "textMode": "auto",
            "wideLayout": true
          },
          "pluginVersion": "10.2.0",
          "targets": [
            {
              "datasource": {
                "type": "postgres",
                "uid": "${DS_MANUFACTURING_POSTGRESQL}"
              },
              "editorMode": "code",
              "format": "table",
              "rawQuery": true,
              "rawSql": `SELECT 
  equipment_id || ' OEE' as "Equipment",
  ROUND(AVG(oee)::numeric * 100, 1) as "Value"
FROM vw_iso22400_oee_metrics
WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY equipment_id
ORDER BY equipment_id`,
              "refId": "A"
            }
          ],
          "title": "30-Day Average OEE by Equipment",
          "type": "stat"
        };

        // Save the updated dashboard
        const updateResponse = await fetch(`${GRAFANA_URL}/api/dashboards/db`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')
          },
          body: JSON.stringify({
            dashboard: dashboard,
            overwrite: true,
            message: "Restored OEE view and improved visualization"
          })
        });

        if (updateResponse.ok) {
          console.log('✅ Dashboard updated with stat panel');
          console.log('\n✨ The OEE data is now correctly displayed!');
          console.log('   - Each equipment shows its individual OEE percentage');
          console.log('   - Values are color-coded (red < 60%, yellow 60-85%, green > 85%)');
          console.log('   - Data comes from actual calculated OEE scores in the database');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreOEEView().catch(console.error);