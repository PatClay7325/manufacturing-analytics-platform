/**
 * Manual Page Testing Script
 * Tests all navigation pages without browser automation
 */

const http = require('http');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 10000;

// All pages to test from navigation
const pages = [
  { name: 'Home', path: '/' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Analytics', path: '/dashboards' },
  { name: 'Equipment', path: '/equipment' },
  { name: 'Alerts', path: '/alerts' },
  { name: 'Manufacturing Chat', path: '/manufacturing-chat' },
  { name: 'Documentation', path: '/documentation' },
  { name: 'Dashboard Import', path: '/dashboard/import' },
  { name: 'Dashboard Snapshot', path: '/dashboard/snapshot' },
  { name: 'Dashboards Browse', path: '/dashboards/browse' },
  { name: 'Dashboards New', path: '/dashboards/new' },
  { name: 'Dashboards Manufacturing', path: '/dashboards/manufacturing' },
  { name: 'Dashboards OEE', path: '/dashboards/oee' },
  { name: 'Dashboards Production', path: '/dashboards/production' },
  { name: 'Dashboards Quality', path: '/dashboards/quality' },
  { name: 'Dashboards Maintenance', path: '/dashboards/maintenance' },
  { name: 'Dashboards Unified', path: '/dashboards/unified' },
  { name: 'Dashboards Grafana', path: '/dashboards/grafana' },
  { name: 'Manufacturing Chat Optimized', path: '/manufacturing-chat/optimized' },
  { name: 'Documentation API Reference', path: '/documentation/api-reference' },
  { name: 'Analytics Dashboard', path: '/Analytics-dashboard' },
  { name: 'Profile', path: '/profile' },
  { name: 'Status', path: '/status' },
  { name: 'Support', path: '/support' },
  { name: 'Diagnostics', path: '/diagnostics' },
  { name: 'Explore', path: '/explore' },
];

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  errors: [],
  summary: {
    total: pages.length,
    passed: 0,
    failed: 0,
    errors: 0,
    successRate: 0
  }
};

// Helper function to make HTTP request
function testPage(pagePath, pageName) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = http.get(`${BASE_URL}${pagePath}`, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          name: pageName,
          path: pagePath,
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 400,
          hasContent: data.length > 0,
          hasTitle: data.includes('<title>'),
          hasNavigation: data.includes('nav') || data.includes('navigation'),
          hasError: data.includes('Error:') || data.includes('error'),
          contentLength: data.length
        };
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      const result = {
        name: pageName,
        path: pagePath,
        statusCode: 0,
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message
      };
      resolve(result);
    });
    
    req.setTimeout(TEST_TIMEOUT, () => {
      req.destroy();
      const result = {
        name: pageName,
        path: pagePath,
        statusCode: 0,
        responseTime: TEST_TIMEOUT,
        success: false,
        error: 'Timeout'
      };
      resolve(result);
    });
  });
}

// Function to test all pages
async function testAllPages() {
  console.log('🚀 Starting comprehensive page testing...\n');
  console.log(`Testing ${pages.length} pages against ${BASE_URL}\n`);
  
  // Test server availability first
  try {
    const serverTest = await testPage('/', 'Server Check');
    if (!serverTest.success) {
      console.error('❌ Server is not responding. Make sure the development server is running on port 3000');
      process.exit(1);
    }
    console.log('✅ Server is responding\n');
  } catch (error) {
    console.error('❌ Cannot connect to server:', error.message);
    process.exit(1);
  }
  
  // Test each page
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const progress = `[${i + 1}/${pages.length}]`;
    
    console.log(`${progress} Testing ${page.name} (${page.path})...`);
    
    try {
      const result = await testPage(page.path, page.name);
      
      if (result.success) {
        testResults.passed.push(result);
        testResults.summary.passed++;
        console.log(`  ✅ PASS - ${result.statusCode} (${result.responseTime}ms)`);
        
        // Additional checks
        if (!result.hasTitle) console.log('  ⚠️  Warning: No title found');
        if (!result.hasNavigation) console.log('  ⚠️  Warning: No navigation found');
        if (result.hasError) console.log('  ⚠️  Warning: Error text detected in page');
        
      } else {
        testResults.failed.push(result);
        testResults.summary.failed++;
        console.log(`  ❌ FAIL - ${result.statusCode || 'No response'} (${result.responseTime}ms)`);
        if (result.error) console.log(`  Error: ${result.error}`);
      }
      
    } catch (error) {
      testResults.errors.push({
        name: page.name,
        path: page.path,
        error: error.message
      });
      testResults.summary.errors++;
      console.log(`  💥 ERROR - ${error.message}`);
    }
    
    // Brief pause between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Calculate success rate
  testResults.summary.successRate = ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1);
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Pages Tested: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`💥 Errors: ${testResults.summary.errors}`);
  console.log(`📈 Success Rate: ${testResults.summary.successRate}%`);
  
  // Print failed tests details
  if (testResults.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.failed.forEach(result => {
      console.log(`  - ${result.name} (${result.path}): ${result.statusCode || 'No response'}`);
      if (result.error) console.log(`    Error: ${result.error}`);
    });
  }
  
  // Print error details
  if (testResults.errors.length > 0) {
    console.log('\n💥 ERROR DETAILS:');
    testResults.errors.forEach(result => {
      console.log(`  - ${result.name} (${result.path}): ${result.error}`);
    });
  }
  
  // Performance analysis
  const responseTimes = testResults.passed.map(r => r.responseTime);
  if (responseTimes.length > 0) {
    const avgResponseTime = (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(0);
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    console.log('\n⚡ PERFORMANCE ANALYSIS:');
    console.log(`  Average Response Time: ${avgResponseTime}ms`);
    console.log(`  Fastest Response: ${minResponseTime}ms`);
    console.log(`  Slowest Response: ${maxResponseTime}ms`);
    
    // Performance warnings
    if (avgResponseTime > 2000) {
      console.log('  ⚠️  Warning: Average response time is high (>2s)');
    }
    if (maxResponseTime > 5000) {
      console.log('  ⚠️  Warning: Some pages are very slow (>5s)');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Return results for further processing
  return testResults;
}

// Main execution
if (require.main === module) {
  testAllPages()
    .then(results => {
      // Exit with error code if tests failed
      if (results.summary.failed > 0 || results.summary.errors > 0) {
        console.log('\n❌ Some tests failed. Check the details above.');
        process.exit(1);
      } else {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testAllPages, testResults };