#!/usr/bin/env node

/**
 * Test External System Connections
 * Verifies SAP and Ignition connectivity with sample queries
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function testConnections() {
  console.log(`${colors.cyan}${colors.bright}🔌 Testing External System Connections${colors.reset}\n`);

  try {
    // First, ensure the server is running
    console.log(`${colors.blue}ℹ${colors.reset} Testing connection to API server...`);
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Test basic connectivity
    const response = await fetch(`${baseUrl}/api/test-connections`);
    
    if (!response.ok) {
      throw new Error(`API server not responding (${response.status})`);
    }

    const data = await response.json();
    
    // Display results
    console.log(`\n${colors.bright}Connection Test Results:${colors.reset}`);
    console.log('=' + '='.repeat(60));
    
    // Summary
    console.log(`\n${colors.blue}Summary:${colors.reset}`);
    console.log(`  Total Systems: ${data.totalSystems}`);
    console.log(`  Configured: ${data.configured}`);
    console.log(`  Connected: ${data.connected}`);
    console.log(`  Test Time: ${new Date(data.timestamp).toLocaleString()}`);
    
    // Individual system results
    for (const result of data.results) {
      console.log(`\n${colors.bright}${result.system}:${colors.reset}`);
      
      // Configuration status
      if (result.configured) {
        console.log(`  ${colors.green}✓${colors.reset} Configured`);
      } else {
        console.log(`  ${colors.red}✗${colors.reset} Not Configured`);
      }
      
      // Connection status
      if (result.connected) {
        console.log(`  ${colors.green}✓${colors.reset} Connected`);
        if (result.latency) {
          console.log(`  ⏱  Latency: ${result.latency}ms`);
        }
      } else {
        console.log(`  ${colors.red}✗${colors.reset} Not Connected`);
      }
      
      // Test query
      console.log(`  📋 Test Query: ${result.testQuery}`);
      
      // Results
      if (result.result?.success) {
        console.log(`  ${colors.green}✓${colors.reset} Query Successful`);
        
        // Display sample data
        if (result.system === 'SAP' && result.result.sampleData) {
          console.log(`  📊 Sample Equipment:`);
          for (const eq of result.result.sampleData) {
            console.log(`     - ${eq.equipmentNumber}: ${eq.description}`);
          }
          console.log(`  📊 Total Records: ${result.result.recordCount}`);
        } else if (result.system === 'Ignition' && result.result.systemTags) {
          console.log(`  📊 System Tags:`);
          for (const tag of result.result.systemTags) {
            console.log(`     - ${tag.path}: ${tag.value} (Q:${tag.quality})`);
          }
          console.log(`  📊 Available Paths: ${result.result.totalPaths}`);
        }
      } else if (result.error) {
        console.log(`  ${colors.red}✗${colors.reset} Error: ${result.error}`);
      }
    }
    
    // Recommendations
    if (data.recommendations && data.recommendations.length > 0) {
      console.log(`\n${colors.yellow}${colors.bright}Recommendations:${colors.reset}`);
      for (const rec of data.recommendations) {
        console.log(`  • ${rec}`);
      }
    }
    
    // Test specific queries if systems are connected
    if (data.connected > 0) {
      console.log(`\n${colors.cyan}Testing Specific Queries...${colors.reset}`);
      
      // Test SAP work orders
      if (data.results.find(r => r.system === 'SAP' && r.connected)) {
        await testSpecificQuery('SAP', 'workOrders', {
          dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
      
      // Test Ignition tag history
      if (data.results.find(r => r.system === 'Ignition' && r.connected)) {
        await testSpecificQuery('Ignition', 'tagHistory', {
          tagPaths: ['[System]Gateway/Performance/CPU Usage'],
          startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
        });
      }
    }
    
    // Exit code based on connection status
    const exitCode = data.connected === data.totalSystems ? 0 : 1;
    console.log(`\n${colors.bright}Test completed with exit code: ${exitCode}${colors.reset}`);
    process.exit(exitCode);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Test failed:${colors.reset}`, error.message);
    console.log('\nMake sure:');
    console.log('  1. The development server is running (npm run dev)');
    console.log('  2. Environment variables are configured in .env.local');
    console.log('  3. External systems are accessible from this machine');
    process.exit(1);
  }
}

async function testSpecificQuery(system, query, parameters) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    console.log(`\n  Testing ${system} ${query}...`);
    
    const response = await fetch(`${baseUrl}/api/test-connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ system, query, parameters }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`  ${colors.green}✓${colors.reset} ${query} successful`);
      
      // Display abbreviated results
      if (Array.isArray(result.result)) {
        console.log(`  📊 Returned ${result.result.length} records`);
      } else if (typeof result.result === 'object') {
        console.log(`  📊 Result:`, JSON.stringify(result.result, null, 2).substring(0, 200) + '...');
      }
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${query} failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} ${query} error: ${error.message}`);
  }
}

// Run tests
if (require.main === module) {
  testConnections();
}