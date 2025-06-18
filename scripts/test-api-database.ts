import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3001;

async function testAPIDatabaseIntegration() {
  console.log('🔧 Testing API endpoints with database...\n');
  
  const baseUrl = `http://${hostname}:${port}`;
  
  // Test endpoints
  const endpoints = [
    { path: '/api/equipment', method: 'GET', description: 'Fetch all equipment' },
    { path: '/api/alerts', method: 'GET', description: 'Fetch all alerts' },
    { path: '/api/metrics/query', method: 'POST', description: 'Query metrics', 
      body: { 
        equipmentId: 'all',
        metric: 'oee',
        timeRange: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() }
      }
    },
  ];
  
  for (const endpoint of endpoints) {
    console.log(`📍 Testing ${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
    
    try {
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }
      
      const response = await fetch(`${baseUrl}${endpoint.path}`, options);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Success (${response.status})`);
        
        // Show sample data
        if (Array.isArray(data)) {
          console.log(`   Found ${data.length} records`);
        } else if (data.data && Array.isArray(data.data)) {
          console.log(`   Found ${data.data.length} records`);
        } else {
          console.log(`   Response:`, JSON.stringify(data).substring(0, 100) + '...');
        }
      } else {
        console.log(`❌ Failed (${response.status}): ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
}

// Run the test
console.log('Note: Make sure the dev server is running (npm run dev)\n');
testAPIDatabaseIntegration().catch(console.error);