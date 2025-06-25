#!/usr/bin/env node

/**
 * Completely replace the broken pie chart with a working one
 */

const GRAFANA_URL = 'http://localhost:3001';
const GRAFANA_USER = 'admin';
const GRAFANA_PASSWORD = 'admin';

async function fixPieChartCompletely() {
  console.log('🗑️  Removing broken pie chart and creating a new working one...\n');

  try {
    // Get the current dashboard
    const dashboardResponse = await fetch(`${GRAFANA_URL}/api/dashboards/uid/iso22400-oee-metrics`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')
      }
    });

    const dashboardData = await dashboardResponse.json();
    const dashboard = dashboardData.dashboard;

    // Find and remove the broken pie chart
    const pieChartIndex = dashboard.panels.findIndex((p: any) => 
      p.title === '30-Day Average OEE by Equipment' || p.type === 'piechart'
    );
    
    if (pieChartIndex !== -1) {
      dashboard.panels.splice(pieChartIndex, 1);
      console.log('✅ Removed broken pie chart');
    }

    // Create a new stat panel that actually works (like the gauge)
    const newStatPanel = {
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
        "orientation": "auto",
        "reduceOptions": {
          "values": false,
          "calcs": ["lastNotNull"],
          "fields": ""
        },
        "textMode": "auto"
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
  equipment_id as "Equipment",
  ROUND(AVG(oee)::numeric * 100, 1) as "OEE %"
FROM vw_iso22400_oee_metrics
WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY equipment_id
ORDER BY "OEE %" DESC`,
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
      "type": "stat"
    };

    // Add the new panel
    dashboard.panels.push(newStatPanel);

    // Let's also add a simple bar gauge that shows the same data nicely
    const barGaugePanel = {
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
        "w": 12,
        "x": 12,
        "y": 17
      },
      "id": 6,
      "options": {
        "displayMode": "gradient",
        "minVizHeight": 10,
        "minVizWidth": 0,
        "orientation": "horizontal",
        "reduceOptions": {
          "values": false,
          "calcs": ["lastNotNull"],
          "fields": ""
        },
        "showUnfilled": true,
        "text": {}
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
  equipment_id || ': ' || ROUND(AVG(oee)::numeric * 100, 1) || '%' as "Equipment",
  ROUND(AVG(oee)::numeric * 100, 1) as "OEE"
FROM vw_iso22400_oee_metrics
WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY equipment_id
ORDER BY "OEE" DESC`,
          "refId": "A"
        }
      ],
      "title": "Equipment OEE Rankings (30 Days)",
      "type": "bargauge"
    };

    // Find the bar chart position and insert the new bar gauge after it
    const barChartIndex = dashboard.panels.findIndex((p: any) => 
      p.title === 'OEE Components by Equipment (Last 7 Days)'
    );
    
    if (barChartIndex !== -1) {
      // Adjust grid positions
      barGaugePanel.gridPos.y = dashboard.panels[barChartIndex].gridPos.y + dashboard.panels[barChartIndex].gridPos.h + 1;
    }

    dashboard.panels.push(barGaugePanel);

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
        message: "Replaced broken pie chart with working stat panels"
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update dashboard: ${error}`);
    }

    const result = await updateResponse.json();
    console.log('✅ Dashboard fixed successfully!');
    console.log(`   Dashboard version: ${result.version}`);
    console.log('\n📊 New panels created:');
    console.log('   1. Stat Panel: Shows OEE % for each equipment in colored boxes');
    console.log('   2. Bar Gauge: Shows OEE rankings as horizontal bars');
    console.log('\n🔄 Please refresh your browser to see the changes!');
    console.log('\n✨ Both panels use the same query format as the working gauge');

  } catch (error) {
    console.error('❌ Error fixing dashboard:', error);
  }
}

// Run the fix
fixPieChartCompletely().catch(console.error);