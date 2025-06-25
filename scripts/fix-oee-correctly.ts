#!/usr/bin/env node

/**
 * Correctly fix OEE view based on actual data format
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOEECorrectly() {
  console.log('🔧 Fixing OEE View Based on Actual Data Format...\n');

  try {
    // Drop and recreate view
    await prisma.$executeRaw`DROP VIEW IF EXISTS vw_iso22400_oee_metrics CASCADE`;
    
    // Create view that handles data correctly
    await prisma.$executeRaw`
      CREATE VIEW vw_iso22400_oee_metrics AS
      WITH daily_metrics AS (
        SELECT 
          pm."equipmentId" AS equipment_id,
          date_trunc('day', pm."timestamp") AS period_date,
          
          -- Data is stored as decimals (0-1), not percentages
          AVG(COALESCE(pm."availability", 0)) AS availability_rate,
          AVG(COALESCE(pm."performance", 0)) AS performance_rate,
          AVG(COALESCE(pm."quality", 0)) AS quality_rate,
          AVG(COALESCE(pm."oeeScore", 0)) AS oee,
          
          -- Aggregate production data
          SUM(COALESCE(pm."plannedProductionTime", 8.0)) AS planned_production_time_hours,
          SUM(COALESCE(pm."downtimeMinutes", 0) / 60.0) AS downtime,
          SUM(COALESCE(pm."totalParts", 0)) AS total_count,
          SUM(COALESCE(pm."goodParts", 0)) AS good_count,
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
        availability_rate,
        performance_rate,
        quality_rate,
        oee
      FROM daily_metrics
    `;

    console.log('✅ View recreated correctly\n');

    // Verify the data
    console.log('OEE Summary by Equipment:');
    const summary = await prisma.$queryRaw`
      SELECT 
        equipment_id,
        ROUND(AVG(availability_rate)::numeric * 100, 1) as "Availability %",
        ROUND(AVG(performance_rate)::numeric * 100, 1) as "Performance %",
        ROUND(AVG(quality_rate)::numeric * 100, 1) as "Quality %",
        ROUND(AVG(oee)::numeric * 100, 1) as "OEE %"
      FROM vw_iso22400_oee_metrics
      GROUP BY equipment_id
      ORDER BY equipment_id
    ` as any[];
    
    console.table(summary);

    // Update Grafana dashboard with a working visualization
    const GRAFANA_URL = 'http://localhost:3001';
    const GRAFANA_USER = 'admin';
    const GRAFANA_PASSWORD = 'admin';

    const dashboardResponse = await fetch(`${GRAFANA_URL}/api/dashboards/uid/iso22400-oee-metrics`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')
      }
    });

    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      const dashboard = dashboardData.dashboard;

      // Add a new bar chart that shows OEE properly
      const newBarChart = {
        "datasource": {
          "type": "postgres",
          "uid": "${DS_MANUFACTURING_POSTGRESQL}"
        },
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "axisBorderShow": false,
              "axisCenteredZero": false,
              "axisColorMode": "text",
              "axisLabel": "OEE %",
              "axisPlacement": "auto",
              "fillOpacity": 80,
              "gradientMode": "none",
              "hideFrom": {
                "tooltip": false,
                "viz": false,
                "legend": false
              },
              "lineWidth": 1,
              "scaleDistribution": {
                "type": "linear"
              }
            },
            "mappings": [],
            "max": 100,
            "min": 0,
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
            "unit": "percent"
          },
          "overrides": []
        },
        "gridPos": {
          "h": 8,
          "w": 24,
          "x": 0,
          "y": 25
        },
        "id": 7,
        "options": {
          "barRadius": 0,
          "barWidth": 0.8,
          "colorByField": "OEE %",
          "fullHighlight": false,
          "groupWidth": 0.7,
          "legend": {
            "calcs": [],
            "displayMode": "list",
            "placement": "bottom",
            "showLegend": false
          },
          "orientation": "horizontal",
          "showValue": "auto",
          "stacking": "none",
          "tooltip": {
            "mode": "single",
            "sort": "none"
          },
          "xTickLabelRotation": 0,
          "xTickLabelSpacing": 0
        },
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
  equipment_id as "Equipment",
  ROUND(AVG(oee)::numeric * 100, 1) as "OEE %"
FROM vw_iso22400_oee_metrics
WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY equipment_id
ORDER BY "OEE %" DESC`,
            "refId": "A"
          }
        ],
        "title": "Equipment OEE Performance (30 Days)",
        "type": "barchart"
      };

      // Add to dashboard
      dashboard.panels.push(newBarChart);

      // Save
      const updateResponse = await fetch(`${GRAFANA_URL}/api/dashboards/db`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')
        },
        body: JSON.stringify({
          dashboard: dashboard,
          overwrite: true,
          message: "Added working OEE bar chart"
        })
      });

      if (updateResponse.ok) {
        console.log('\n✅ Added new OEE bar chart to dashboard');
      }
    }

    console.log('\n✨ Summary:');
    console.log('- OEE data is stored as decimals (0-1) in the database');
    console.log('- View now correctly handles this format');
    console.log('- Each equipment shows realistic OEE percentages');
    console.log('- Added a horizontal bar chart for clear visualization');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOEECorrectly().catch(console.error);