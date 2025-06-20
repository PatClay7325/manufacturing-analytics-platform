#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3001';
const TIMEOUT = 10000;

// Test only generated pages
const generatedPages = [
  { name: 'Alert Groups', path: '/alerting/groups' },
  { name: 'Alert Admin', path: '/alerting/admin' },
  { name: 'Alert State History', path: '/alerting/state-history' },
  { name: 'Contact Points', path: '/alerting/contact-points' },
  { name: 'Notification Policies', path: '/alerting/notification-policies' },
  { name: 'Server Stats', path: '/admin/stats' },
  { name: 'Extensions', path: '/admin/extensions' },
  { name: 'Access Control', path: '/admin/access' },
  { name: 'LDAP', path: '/admin/ldap' },
  { name: 'Authentication', path: '/admin/authentication' },
  { name: 'Configuration', path: '/admin/config' },
  { name: 'Storage', path: '/admin/storage' },
  { name: 'Migrations', path: '/admin/migrations' },
  { name: 'Feature Toggles', path: '/admin/feature-toggles' },
  { name: 'New Organization', path: '/org/new' },
  { name: 'Profile Preferences', path: '/profile/preferences' },
  { name: 'Profile Sessions', path: '/profile/sessions' },
  { name: 'Profile Tokens', path: '/profile/tokens' },
  { name: 'Change Password', path: '/profile/password' },
  { name: 'Profile Notifications', path: '/profile/notifications' },
  { name: 'Profile Organizations', path: '/profile/orgs' },
  { name: 'Profile Teams', path: '/profile/teams' },
  { name: 'Playlists', path: '/playlists' },
  { name: 'Snapshots', path: '/dashboards/snapshots' },
  { name: 'Public Dashboards', path: '/dashboards/public' },
  { name: 'Help', path: '/help' },
  { name: 'About', path: '/about' },
  { name: 'Search', path: '/search' },
  { name: 'Bookmarks', path: '/bookmarks' },
  { name: 'Shortcuts', path: '/shortcuts' },
  { name: 'Reports', path: '/reports' },
  { name: 'Annotations', path: '/annotations' },
  { name: 'Live', path: '/live' },
  { name: 'Monitoring', path: '/monitoring' },
  { name: 'Logs', path: '/logs' },
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
  console.log('🚀 Testing Generated Pages');
  console.log(`📊 Testing ${generatedPages.length} pages against ${BASE_URL}\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const page of generatedPages) {
    const result = await testPage(page);
    
    if (result.success) {
      console.log(`✅ ${page.name} (${page.path}) - ${result.statusCode} in ${result.responseTime}ms`);
      passed++;
    } else {
      console.log(`❌ ${page.name} (${page.path}) - ${result.statusCode || 'FAIL'}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      if (result.hasError) console.log(`   Has error content in response`);
      failed++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Success Rate: ${Math.round(passed / generatedPages.length * 100)}%`);
}

runTests().catch(console.error);