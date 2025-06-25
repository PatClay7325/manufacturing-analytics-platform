import axios from 'axios';

const GRAFANA_URL = 'http://localhost:3001';
const GRAFANA_USER = 'admin';
const GRAFANA_PASS = 'admin';
const auth = Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASS}`).toString('base64');

const headers = {
  'Authorization': `Basic ${auth}`,
  'Content-Type': 'application/json'
};

async function updateDashboardsToPrisma() {
  console.log('Updating dashboards to use Prisma API datasource...');
  console.log('==============================================');

  try {
    // Get the Prisma API datasource
    const datasourceResponse = await axios.get(
      `${GRAFANA_URL}/api/datasources/name/Prisma%20API`,
      { headers }
    );
    
    const prismaDataSourceUid = datasourceResponse.data.uid;
    console.log(`Prisma API datasource UID: ${prismaDataSourceUid}`);

    // Get all dashboards
    console.log('\nFetching all dashboards...');
    const dashboardsResponse = await axios.get(
      `${GRAFANA_URL}/api/search?type=dash-db`,
      { headers }
    );

    const dashboards = dashboardsResponse.data;
    console.log(`Found ${dashboards.length} dashboards`);

    // Update each dashboard
    for (const dashboardMeta of dashboards) {
      console.log(`\nProcessing dashboard: ${dashboardMeta.uid}`);
      console.log(`  Title: ${dashboardMeta.title}`);

      try {
        // Get full dashboard
        const dashboardResponse = await axios.get(
          `${GRAFANA_URL}/api/dashboards/uid/${dashboardMeta.uid}`,
          { headers }
        );

        const dashboard = dashboardResponse.data.dashboard;

        // Update datasource references
        const updatedDashboard = JSON.parse(
          JSON.stringify(dashboard).replace(
            /"datasource":\s*({[^}]*"type":\s*"postgres"[^}]*}|"[^"]*postgres[^"]*")/g,
            `"datasource": {"type": "grafana-simple-json-datasource", "uid": "${prismaDataSourceUid}"}`
          )
        );

        // Update panel queries to use Prisma API queries
        if (updatedDashboard.panels) {
          updatedDashboard.panels.forEach((panel: any) => {
            if (panel.targets) {
              panel.targets.forEach((target: any) => {
                // Map PostgreSQL queries to Prisma API queries
                if (target.rawSql || target.rawQuery) {
                  // Simple mapping based on common patterns
                  if (target.rawSql?.includes('performance_metrics') || 
                      target.rawQuery?.includes('performance_metrics')) {
                    target.target = 'performance_metrics';
                    delete target.rawSql;
                    delete target.rawQuery;
                    delete target.format;
                    target.type = 'timeserie';
                  } else if (target.rawSql?.includes('equipment') || 
                             target.rawQuery?.includes('equipment')) {
                    target.target = 'equipment_list';
                    delete target.rawSql;
                    delete target.rawQuery;
                    target.type = 'table';
                  } else if (target.rawSql?.includes('oee') || 
                             target.rawQuery?.includes('oee')) {
                    target.target = 'oee_by_equipment';
                    delete target.rawSql;
                    delete target.rawQuery;
                    target.type = 'table';
                  } else {
                    // Default to performance metrics
                    target.target = 'performance_metrics';
                    delete target.rawSql;
                    delete target.rawQuery;
                    target.type = 'timeserie';
                  }
                }
              });
            }
          });
        }

        // Save updated dashboard
        const saveResponse = await axios.post(
          `${GRAFANA_URL}/api/dashboards/db`,
          {
            dashboard: updatedDashboard,
            overwrite: true,
            message: 'Updated datasource to Prisma API'
          },
          { headers }
        );

        if (saveResponse.data.status === 'success') {
          console.log('  ✓ Successfully updated');
        } else {
          console.log('  ✗ Failed to update:', saveResponse.data);
        }
      } catch (error: any) {
        console.log(`  ✗ Error updating dashboard: ${error.message}`);
      }
    }

    console.log('\nDashboard update complete!');
    console.log('=========================');
    console.log('\nAll dashboards have been updated to use the Prisma API datasource.');
    console.log('You may need to fine-tune some queries in the dashboard editor.');
    console.log('\nAvailable Prisma API queries:');
    console.log('- performance_metrics');
    console.log('- oee_by_equipment'); 
    console.log('- production_summary');
    console.log('- downtime_analysis');
    console.log('- quality_metrics');
    console.log('- equipment_list');
    console.log('- shift_performance');
    console.log('\nVisit your dashboards at http://localhost:3001');

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the update
updateDashboardsToPrisma();