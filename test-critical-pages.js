#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3001';
const TIMEOUT = 10000;

// Test only critical pages first
const criticalPages = [
  { name: 'Documentation', path: '/documentation' },
  { name: 'Dashboard Import', path: '/dashboard/import' },
  { name: 'Connections', path: '/connections' },
  { name: 'Admin Plugins', path: '/admin/plugins' },
  { name: 'Service Accounts', path: '/org/serviceaccounts' },
  { name: 'Library Panels', path: '/dashboards/library-panels' },
];

async function testPage(page) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = http.get(`${BASE_URL}${page.path}`, { timeout: TIMEOUT }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const hasError = data.includes('Error:') ||
                        data.includes('SyntaxError') ||
                        data.includes('TypeError') ||
                        data.includes('ReferenceError') ||
                        data.includes('Internal Server Error');
        
        resolve({
          ...page,
          statusCode: res.statusCode,
          responseTime,
          hasError,
          success: res.statusCode === 200 && !hasError
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        ...page,
        statusCode: 0,
        responseTime: Date.now() - startTime,
        error: err.message,
        success: false
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        ...page,
        statusCode: 0,
        responseTime: TIMEOUT,
        error: 'Timeout',
        success: false
      });
    });
  });
}

async function runTests() {
  console.log('🚀 Testing Critical Pages');
  console.log(`📊 Testing ${criticalPages.length} pages against ${BASE_URL}\n`);
  
  for (const page of criticalPages) {
    const result = await testPage(page);
    
    if (result.success) {
      console.log(`✅ ${page.name} (${page.path}) - ${result.statusCode} in ${result.responseTime}ms`);
    } else {
      console.log(`❌ ${page.name} (${page.path}) - ${result.statusCode || 'FAIL'}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      if (result.hasError) console.log(`   Has error content in response`);
    }
  }
}

runTests().catch(console.error);