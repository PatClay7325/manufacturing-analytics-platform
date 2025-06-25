import axios from 'axios';

const GRAFANA_URL = 'http://localhost:3001';
const GRAFANA_USER = 'admin';
const GRAFANA_PASS = 'admin';

// Create basic auth header
const auth = Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASS}`).toString('base64');

const dashboards = [
  'manufacturing-overview',
  'production-metrics', 
  'quality-dashboard',
  'system-health-monitoring'
];

async function fixDashboardPermissions(uid: string) {
  try {
    // First get the dashboard
    const dashResponse = await axios.get(
      `${GRAFANA_URL}/api/dashboards/uid/${uid}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      }
    );

    const dashboardId = dashResponse.data.dashboard.id;
    console.log(`Setting permissions for dashboard: ${uid} (ID: ${dashboardId})`);

    // Set permissions to allow anonymous viewers
    const permissions = [
      {
        role: "Viewer",
        permission: 1 // View permission
      },
      {
        role: "Editor", 
        permission: 2 // Edit permission
      }
    ];

    await axios.post(
      `${GRAFANA_URL}/api/dashboards/id/${dashboardId}/permissions`,
      {
        items: permissions
      },
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Fixed permissions for ${uid}`);
  } catch (error: any) {
    console.error(`❌ Failed to fix permissions for ${uid}:`, error.response?.data || error.message);
  }
}

async function enableAnonymousOrg() {
  try {
    // Update org preferences to set home dashboard
    await axios.put(
      `${GRAFANA_URL}/api/org/preferences`,
      {
        theme: "dark",
        homeDashboardUID: "manufacturing-overview"
      },
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Set default home dashboard');
  } catch (error: any) {
    console.error('❌ Failed to set org preferences:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🔧 Fixing Grafana dashboard permissions...\n');

  await enableAnonymousOrg();

  for (const dashboard of dashboards) {
    await fixDashboardPermissions(dashboard);
  }

  console.log('\n✨ Permission fixes complete!');
  console.log('\nDashboards should now be accessible to anonymous users.');
}

main().catch(console.error);