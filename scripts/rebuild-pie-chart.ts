#!/usr/bin/env node

/**
 * Rebuild the pie chart to show equipment OEE distribution properly
 */

const GRAFANA_URL = 'http://localhost:3001';
const GRAFANA_USER = 'admin';
const GRAFANA_PASSWORD = 'admin';

async function rebuildPieChart() {
  console.log('🔧 Rebuilding pie chart panel...\n');

  try {
    // Get the current dashboard
    const dashboardResponse = await fetch(`${GRAFANA_URL}/api/dashboards/uid/iso22400-oee-metrics`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')
      }
    });

    const dashboardData = await dashboardResponse.json();
    const dashboard = dashboardData.dashboard;

    // Find and remove the old pie chart
    const pieChartIndex = dashboard.panels.findIndex((p: any) => p.title === '30-Day Average OEE by Equipment');
    
    if (pieChartIndex === -1) {
      throw new Error('Pie chart panel not found');
    }

    // Create a new pie chart panel with proper configuration
    const newPieChart = {
      "datasource": {
        "type": "postgres",
        "uid": "P5A16E44E3700E098" // Manufacturing PostgreSQL UID
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "hideFrom": {
              "tooltip": false,
              "viz": false,
              "legend": false
            }
          },
          "mappings": [],
          "unit": "percent",
          "min": 0,
          "max": 100,
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
          }
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
        "legend": {
          "displayMode": "list",
          "placement": "right",
          "showLegend": true,
          "values": []
        },
        "pieType": "pie",
        "tooltip": {
          "mode": "single",
          "sort": "none"
        },
        "displayLabels": ["name", "percent"],
        "reduceOptions": {
          "values": false,
          "calcs": ["lastNotNull"],
          "fields": ""
        }
      },
      "targets": [
        {
          "datasource": {
            "type": "postgres",
            "uid": "P5A16E44E3700E098"
          },
          "editorMode": "code",
          "format": "table",
          "rawQuery": true,
          "rawSql": `WITH equipment_oee AS (
  SELECT 
    equipment_id,
    ROUND(AVG(oee)::numeric * 100, 1) as avg_oee
  FROM vw_iso22400_oee_metrics
  WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY equipment_id
)
SELECT 
  equipment_id || ' (' || avg_oee || '%)' as "Equipment",
  avg_oee as "OEE"
FROM equipment_oee
ORDER BY avg_oee DESC`,
          "refId": "A",
          "sql": {
            "columns": [
              {
                "parameters": [],
                "type": "function"
              }
            ],
            "groupBy": [
              {
                "property": {
                  "type": "string"
                },
                "type": "groupBy"
              }
            ],
            "limit": 50
          }
        }
      ],
      "title": "30-Day Average OEE by Equipment",
      "type": "piechart",
      "pluginVersion": "10.2.0"
    };

    // Replace the old panel with the new one
    dashboard.panels[pieChartIndex] = newPieChart;

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
        message: "Rebuilt pie chart with proper configuration"
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update dashboard: ${error}`);
    }

    const result = await updateResponse.json();
    console.log('✅ Pie chart rebuilt successfully!');
    console.log(`   Dashboard version: ${result.version}`);
    console.log('\n📊 The pie chart now shows:');
    console.log('   - Equipment distribution by OEE percentage');
    console.log('   - Labels with equipment names and percentages');
    console.log('   - Color-coded slices based on performance');
    console.log('\n🔄 Please refresh your browser to see the changes!');

  } catch (error) {
    console.error('❌ Error rebuilding pie chart:', error);
  }
}

// Run the rebuild
rebuildPieChart().catch(console.error);