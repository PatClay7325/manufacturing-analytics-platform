import axios from 'axios';

const GRAFANA_URL = 'http://localhost:3001';

async function testGrafanaAccess() {
  console.log('🔍 Testing Grafana access...\n');

  // Test anonymous access
  try {
    const dashboardUrl = `${GRAFANA_URL}/d/manufacturing-overview/manufacturing-overview?orgId=1&kiosk=1&theme=dark`;
    const response = await axios.get(dashboardUrl, {
      validateStatus: () => true,
      maxRedirects: 0
    });
    
    console.log(`Dashboard URL: ${dashboardUrl}`);
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, response.headers);
    
    if (response.status === 200) {
      console.log('✅ Dashboard is accessible!');
      console.log('\nEmbed URL for iframe:');
      console.log(dashboardUrl);
    } else {
      console.log('❌ Dashboard returned status:', response.status);
    }
  } catch (error: any) {
    console.error('❌ Error accessing dashboard:', error.message);
  }

  // Test if embedding is allowed
  try {
    const response = await axios.get(`${GRAFANA_URL}/api/dashboards/uid/manufacturing-overview`, {
      validateStatus: () => true
    });
    
    console.log('\n📊 Dashboard API response:');
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      const dashboard = response.data.dashboard;
      console.log(`Title: ${dashboard.title}`);
      console.log(`UID: ${dashboard.uid}`);
      console.log(`Panels: ${dashboard.panels?.length || 0}`);
    }
  } catch (error: any) {
    console.error('❌ Error accessing dashboard API:', error.message);
  }
}

testGrafanaAccess();