import axios from 'axios';

const GRAFANA_URL = 'http://localhost:3001';
const GRAFANA_USER = 'admin';
const GRAFANA_PASS = 'admin';

// Create basic auth header
const auth = Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASS}`).toString('base64');

async function createDatasource() {
  const datasourceData = {
    name: 'Prisma API',
    type: 'grafana-simple-json-datasource',
    access: 'proxy',
    url: 'http://host.docker.internal:3000/api/grafana',
    basicAuth: false,
    isDefault: false,
    jsonData: {
      httpHeaderName1: 'Content-Type',
      httpHeaderValue1: 'application/json',
      keepCookies: [],
      timeInterval: '10s'
    }
  };

  try {
    // Check if datasource exists
    const checkResponse = await axios.get(
      `${GRAFANA_URL}/api/datasources/name/${encodeURIComponent(datasourceData.name)}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      }
    );

    if (checkResponse.status === 200) {
      console.log('✅ Datasource "Prisma API" already exists');
      return checkResponse.data;
    }

    // Create new datasource
    const response = await axios.post(
      `${GRAFANA_URL}/api/datasources`,
      datasourceData,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Created datasource: Prisma API');
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to create datasource:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Setting up Grafana datasource...\n');
  
  const datasource = await createDatasource();
  console.log('\n✨ Datasource setup complete!');
  console.log(`Datasource UID: ${datasource.uid}`);
  
  // Update the dashboard creation script with the correct UID
  return datasource.uid;
}

main().catch(console.error);