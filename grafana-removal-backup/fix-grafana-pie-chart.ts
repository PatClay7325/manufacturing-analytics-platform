#!/usr/bin/env node

/**
 * Fix the pie chart panel in the OEE dashboard
 */

const GRAFANA_URL = 'http://localhost:3001';
const GRAFANA_USER = 'admin';
const GRAFANA_PASSWORD = 'admin';

async function updatePieChartPanel() {
  console.log('🔧 Fixing pie chart panel...\n');

  try {
    // First, get the current dashboard
    const dashboardResponse = await fetch(`${GRAFANA_URL}/api/dashboards/uid/iso22400-oee-metrics`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')
      }
    });

    if (!dashboardResponse.ok) {
      throw new Error('Failed to fetch dashboard');
    }

    const dashboardData = await dashboardResponse.json();
    const dashboard = dashboardData.dashboard;

    // Find the pie chart panel (30-Day Average OEE by Equipment)
    const pieChartPanel = dashboard.panels.find((p: any) => p.title === '30-Day Average OEE by Equipment');
    
    if (!pieChartPanel) {
      throw new Error('Pie chart panel not found');
    }

    console.log('Found pie chart panel, updating configuration...');

    // Update the panel configuration
    pieChartPanel.fieldConfig = {
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
        "max": 100
      },
      "overrides": [
        {
          "matcher": {
            "id": "byName",
            "options": "value"
          },
          "properties": [
            {
              "id": "displayName",
              "value": "OEE %"
            }
          ]
        },
        {
          "matcher": {
            "id": "byName",
            "options": "metric"
          },
          "properties": [
            {
              "id": "displayName",
              "value": "Equipment"
            }
          ]
        }
      ]
    };

    // Update options to ensure proper display
    pieChartPanel.options = {
      "displayLabels": ["name", "value"],
      "legend": {
        "displayMode": "table",
        "placement": "right",
        "showLegend": true,
        "values": ["value", "percent"]
      },
      "pieType": "donut",
      "tooltip": {
        "mode": "single",
        "sort": "none"
      },
      "reduceOptions": {
        "values": false,
        "calcs": ["lastNotNull"],
        "fields": ""
      }
    };

    // Update the transform to ensure data is in correct format
    pieChartPanel.transformations = [
      {
        "id": "organize",
        "options": {
          "excludeByName": {
            "time": true
          },
          "indexByName": {},
          "renameByName": {
            "metric": "Equipment",
            "value": "OEE %"
          }
        }
      }
    ];

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
        message: "Fixed pie chart display format"
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update dashboard: ${error}`);
    }

    const result = await updateResponse.json();
    console.log('✅ Pie chart panel updated successfully!');
    console.log(`   Dashboard version: ${result.version}`);
    console.log('\n📊 The pie chart should now display:');
    console.log('   - Equipment names (EQ001-EQ005)');
    console.log('   - OEE percentages');
    console.log('   - Proper labels and legend');

  } catch (error) {
    console.error('❌ Error updating pie chart:', error);
  }
}

// Run the fix
updatePieChartPanel().catch(console.error);