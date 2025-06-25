#!/usr/bin/env node

/**
 * Script to create Grafana dashboard via API
 * This creates an ISO 22400 OEE dashboard programmatically
 */

import fs from 'fs';
import path from 'path';

const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3001';
const GRAFANA_USER = process.env.GRAFANA_USER || 'admin';
const GRAFANA_PASSWORD = process.env.GRAFANA_PASSWORD || 'admin';

async function createDashboard() {
  console.log('📊 Creating ISO 22400 OEE Dashboard in Grafana...\n');

  // Read the dashboard JSON
  const dashboardPath = path.join(process.cwd(), 'grafana/dashboards/iso22400-oee-dashboard.json');
  const dashboardJson = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

  // Wrap in the import format
  const importPayload = {
    dashboard: dashboardJson,
    overwrite: true,
    message: "ISO 22400 OEE Dashboard created via script"
  };

  try {
    // Create dashboard via API
    const response = await fetch(`${GRAFANA_URL}/api/dashboards/db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASSWORD}`).toString('base64')
      },
      body: JSON.stringify(importPayload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create dashboard: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('✅ Dashboard created successfully!');
    console.log(`   Dashboard UID: ${result.uid}`);
    console.log(`   Dashboard URL: ${GRAFANA_URL}${result.url}`);
    console.log(`   Version: ${result.version}`);

  } catch (error) {
    console.error('❌ Failed to create dashboard:', error);
    console.log('\n📝 Alternative: Manual Import Instructions:');
    console.log('1. Open Grafana at http://localhost:3001');
    console.log('2. Login with admin/admin');
    console.log('3. Go to Dashboards → New → Import');
    console.log('4. Copy the contents of: grafana/dashboards/iso22400-oee-dashboard.json');
    console.log('5. Paste into the import box and click Load');
    console.log('6. Select "Manufacturing PostgreSQL" as the data source');
    console.log('7. Click Import');
  }
}

// Run the script
createDashboard().catch(console.error);