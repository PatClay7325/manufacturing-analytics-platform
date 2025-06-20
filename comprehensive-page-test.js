#!/usr/bin/env node

/**
 * Comprehensive Page Testing and Fix Script
 * Tests all pages and provides detailed diagnostics
 */

const http = require('http');
const https = require('https');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';
const TIMEOUT = 15000;

// All pages to test
const pages = [
  // Core navigation pages
  { name: 'Home', path: '/', critical: true },
  { name: 'Dashboard', path: '/dashboard', critical: true },
  { name: 'Equipment', path: '/equipment', critical: true },
  { name: 'Alerts', path: '/alerts', critical: true },
  { name: 'Manufacturing Chat', path: '/manufacturing-chat', critical: true },
  { name: 'Documentation', path: '/documentation', critical: true },
  
  // Dashboard sub-pages
  { name: 'Dashboard Import', path: '/dashboard/import', critical: false },
  { name: 'Dashboard Snapshot', path: '/dashboard/snapshot', critical: false },
  
  // Dashboards sub-pages
  { name: 'Dashboards Browse', path: '/dashboards', critical: false },
  { name: 'Dashboards New', path: '/dashboards/new', critical: false },
  { name: 'Dashboards Manufacturing', path: '/dashboards/manufacturing', critical: false },
  { name: 'Dashboards OEE', path: '/dashboards/oee', critical: false },
  { name: 'Dashboards Production', path: '/dashboards/production', critical: false },
  { name: 'Dashboards Quality', path: '/dashboards/quality', critical: false },
  { name: 'Dashboards Maintenance', path: '/dashboards/maintenance', critical: false },
  { name: 'Dashboards Unified', path: '/dashboards/unified', critical: false },
  
  // Alerting pages
  { name: 'Alert List', path: '/alerting/list', critical: false },
  { name: 'Alert Groups', path: '/alerting/groups', critical: false },
  { name: 'Alert Rules', path: '/alerting/routes', critical: false },
  { name: 'Alert State History', path: '/alerting/state-history', critical: false },
  { name: 'Contact Points', path: '/alerting/contact-points', critical: false },
  { name: 'Notification Policies', path: '/alerting/notification-policies', critical: false },
  { name: 'Alert Admin', path: '/alerting/admin', critical: false },
  
  // Data Sources
  { name: 'Connections', path: '/connections', critical: false },
  { name: 'New Data Source', path: '/connections/datasources/new', critical: false },
  { name: 'Your Connections', path: '/connections/your-connections', critical: false },
  { name: 'Connect Data', path: '/connections/connect-data', critical: false },
  
  // Admin pages
  { name: 'Admin Home', path: '/admin', critical: false },
  { name: 'Admin Users', path: '/admin/users', critical: false },
  { name: 'Admin Teams', path: '/admin/teams', critical: false },
  { name: 'Admin Plugins', path: '/admin/plugins', critical: false },
  { name: 'Server Stats', path: '/admin/stats', critical: false },
  { name: 'Extensions', path: '/admin/extensions', critical: false },
  { name: 'Access Control', path: '/admin/access', critical: false },
  { name: 'LDAP', path: '/admin/ldap', critical: false },
  { name: 'Authentication', path: '/admin/authentication', critical: false },
  { name: 'Configuration', path: '/admin/config', critical: false },
  { name: 'Storage', path: '/admin/storage', critical: false },
  { name: 'Migrations', path: '/admin/migrations', critical: false },
  { name: 'Feature Toggles', path: '/admin/feature-toggles', critical: false },
  
  // Organization pages
  { name: 'Service Accounts', path: '/org/serviceaccounts', critical: false },
  { name: 'New Organization', path: '/org/new', critical: false },
  { name: 'Teams', path: '/teams', critical: false },
  { name: 'New Team', path: '/teams/new', critical: false },
  
  // Profile pages
  { name: 'Profile', path: '/profile', critical: false },
  { name: 'Profile Preferences', path: '/profile/preferences', critical: false },
  { name: 'Profile Sessions', path: '/profile/sessions', critical: false },
  { name: 'Profile Tokens', path: '/profile/tokens', critical: false },
  { name: 'Change Password', path: '/profile/password', critical: false },
  { name: 'Profile Notifications', path: '/profile/notifications', critical: false },
  { name: 'Profile Organizations', path: '/profile/orgs', critical: false },
  { name: 'Profile Teams', path: '/profile/teams', critical: false },
  
  // Dashboard features
  { name: 'Playlists', path: '/playlists', critical: false },
  { name: 'Library Panels', path: '/dashboards/library-panels', critical: false },
  { name: 'Snapshots', path: '/dashboards/snapshots', critical: false },
  { name: 'Public Dashboards', path: '/dashboards/public', critical: false },
  
  // Help/Utility pages
  { name: 'Help', path: '/help', critical: false },
  { name: 'About', path: '/about', critical: false },
  { name: 'Search', path: '/search', critical: false },
  { name: 'Bookmarks', path: '/bookmarks', critical: false },
  { name: 'Shortcuts', path: '/shortcuts', critical: false },
  
  // Auth pages
  { name: 'Login', path: '/login', critical: false },
  { name: 'Signup', path: '/signup', critical: false },
  { name: 'Logout', path: '/logout', critical: false },
  
  // Advanced pages
  { name: 'Reports', path: '/reports', critical: false },
  { name: 'Annotations', path: '/annotations', critical: false },
  { name: 'Live', path: '/live', critical: false },
  { name: 'Monitoring', path: '/monitoring', critical: false },
  { name: 'Logs', path: '/logs', critical: false },
  
  // Other important pages
  { name: 'Analytics Dashboard', path: '/Analytics-dashboard', critical: false },
  { name: 'Documentation API Reference', path: '/documentation/api-reference', critical: false },
  { name: 'Status', path: '/status', critical: false },
  { name: 'Support', path: '/support', critical: false },
  { name: 'Diagnostics', path: '/diagnostics', critical: false },
  { name: 'Explore', path: '/explore', critical: false },
];

// Test results
const results = {
  total: pages.length,
  passed: 0,
  failed: 0,
  critical_failed: 0,
  tests: [],
  server_info: {},
  recommendations: []
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testPage(page) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = `${BASE_URL}${page.path}`;
    
    const req = http.get(url, (res) => {
      let data = '';
      let chunks = 0;
      
      res.on('data', (chunk) => {
        data += chunk;
        chunks++;
        // Limit data collection to prevent memory issues
        if (data.length > 50000) {
          res.destroy();
        }
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const result = analyzeResponse(page, res, data, responseTime);
        resolve(result);
      });
      
      res.on('error', (error) => {
        const result = {
          page: page.name,
          path: page.path,
          critical: page.critical,
          status: 'error',
          statusCode: 0,
          responseTime: Date.now() - startTime,
          error: error.message,
          issues: ['Network error'],
          recommendations: ['Check server connection']
        };
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      const result = {
        page: page.name,
        path: page.path,
        critical: page.critical,
        status: 'error',
        statusCode: 0,
        responseTime: Date.now() - startTime,
        error: error.message,
        issues: ['Connection failed'],
        recommendations: ['Start development server', 'Check port 3000']
      };
      resolve(result);
    });
    
    req.setTimeout(TIMEOUT, () => {
      req.destroy();
      const result = {
        page: page.name,
        path: page.path,
        critical: page.critical,
        status: 'timeout',
        statusCode: 0,
        responseTime: TIMEOUT,
        error: 'Request timeout',
        issues: ['Slow response'],
        recommendations: ['Check server performance', 'Optimize page loading']
      };
      resolve(result);
    });
  });
}

function analyzeResponse(page, res, data, responseTime) {
  const result = {
    page: page.name,
    path: page.path,
    critical: page.critical,
    statusCode: res.statusCode,
    responseTime,
    contentLength: data.length,
    issues: [],
    recommendations: [],
    analysis: {}
  };
  
  // Analyze status code
  if (res.statusCode >= 200 && res.statusCode < 300) {
    result.status = 'success';
  } else if (res.statusCode >= 300 && res.statusCode < 400) {
    result.status = 'redirect';
    result.issues.push('Unexpected redirect');
    result.recommendations.push('Check routing configuration');
  } else if (res.statusCode === 404) {
    result.status = 'not_found';
    result.issues.push('Page not found');
    result.recommendations.push('Create missing page component', 'Check routing configuration');
  } else if (res.statusCode >= 500) {
    result.status = 'server_error';
    result.issues.push('Server error');
    result.recommendations.push('Check server logs', 'Fix server-side issues');
  } else {
    result.status = 'client_error';
    result.issues.push('Client error');
    result.recommendations.push('Check request parameters');
  }
  
  // Analyze response time
  if (responseTime > 10000) {
    result.issues.push('Very slow response time');
    result.recommendations.push('Optimize page performance');
  } else if (responseTime > 5000) {
    result.issues.push('Slow response time');
    result.recommendations.push('Check for database queries', 'Optimize API calls');
  }
  
  // Analyze content
  if (data.length === 0) {
    result.issues.push('Empty response');
    result.recommendations.push('Check component rendering');
  } else if (data.length < 100) {
    result.issues.push('Minimal content');
    result.recommendations.push('Verify component is rendering properly');
  }
  
  // Check for common issues in HTML
  if (data.includes('404') || data.includes('This page could not be found')) {
    result.issues.push('404 content detected');
    result.recommendations.push('Create or fix page component');
  }
  
  if (data.includes('Error:') || data.includes('SyntaxError') || 
      data.includes('TypeError') || data.includes('ReferenceError') || 
      data.includes('Internal Server Error')) {
    result.issues.push('Error content detected');
    result.recommendations.push('Check console for JavaScript errors');
  }
  
  if (data.includes('<!DOCTYPE html>')) {
    result.analysis.hasDoctype = true;
  }
  
  if (data.includes('<title>')) {
    result.analysis.hasTitle = true;
    const titleMatch = data.match(/<title>(.*?)<\/title>/);
    if (titleMatch) {
      result.analysis.title = titleMatch[1];
    }
  }
  
  if (data.includes('nav') || data.includes('navigation')) {
    result.analysis.hasNavigation = true;
  }
  
  // Check for Next.js specific indicators
  if (data.includes('__NEXT_DATA__')) {
    result.analysis.isNextJs = true;
  }
  
  if (data.includes('_next/static/')) {
    result.analysis.hasNextAssets = true;
  }
  
  return result;
}

async function testServer() {
  log('\n🔍 Testing server availability...', 'cyan');
  
  try {
    const serverTest = await testPage({ name: 'Server Test', path: '/', critical: true });
    results.server_info = {
      available: serverTest.statusCode > 0,
      statusCode: serverTest.statusCode,
      responseTime: serverTest.responseTime
    };
    
    if (serverTest.statusCode === 0) {
      log('❌ Server not available', 'red');
      return false;
    } else {
      log(`✅ Server responding (${serverTest.statusCode} in ${serverTest.responseTime}ms)`, 'green');
      return true;
    }
  } catch (error) {
    log(`❌ Server test failed: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('🚀 Starting Comprehensive Page Testing', 'blue');
  log(`📊 Testing ${pages.length} pages against ${BASE_URL}`, 'blue');
  
  // Test server first
  const serverAvailable = await testServer();
  if (!serverAvailable) {
    log('\n❌ Cannot proceed - server is not available', 'red');
    log('💡 Start the development server with: npm run dev', 'yellow');
    return;
  }
  
  log('\n📝 Testing individual pages...', 'cyan');
  
  // Test each page
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const progress = `[${i + 1}/${pages.length}]`;
    
    process.stdout.write(`${progress} Testing ${page.name} (${page.path})... `);
    
    const result = await testPage(page);
    results.tests.push(result);
    
    // Update counters
    if (result.status === 'success') {
      results.passed++;
      log('✅ PASS', 'green');
    } else {
      results.failed++;
      if (page.critical) {
        results.critical_failed++;
      }
      const statusColor = result.critical ? 'red' : 'yellow';
      log(`❌ FAIL (${result.statusCode || 'ERR'})`, statusColor);
      
      // Show issues immediately for critical pages
      if (page.critical && result.issues.length > 0) {
        result.issues.forEach(issue => {
          log(`   ⚠️  ${issue}`, 'yellow');
        });
      }
    }
    
    // Brief pause between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

function generateReport() {
  log('\n' + '='.repeat(80), 'blue');
  log('📊 COMPREHENSIVE TEST REPORT', 'blue');
  log('='.repeat(80), 'blue');
  
  // Summary
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`\n📈 SUMMARY:`, 'cyan');
  log(`   Total Pages: ${results.total}`);
  log(`   ✅ Passed: ${results.passed}`, 'green');
  log(`   ❌ Failed: ${results.failed}`, 'red');
  log(`   🚨 Critical Failed: ${results.critical_failed}`, 'red');
  log(`   📊 Success Rate: ${successRate}%`);
  
  // Critical Issues
  const criticalIssues = results.tests.filter(t => t.critical && t.status !== 'success');
  if (criticalIssues.length > 0) {
    log(`\n🚨 CRITICAL ISSUES (Must Fix Immediately):`, 'red');
    criticalIssues.forEach((test, index) => {
      log(`\n${index + 1}. ${test.page} (${test.path})`, 'red');
      log(`   Status: ${test.statusCode || 'No Response'}`, 'red');
      if (test.issues.length > 0) {
        log(`   Issues:`, 'yellow');
        test.issues.forEach(issue => log(`     - ${issue}`, 'yellow'));
      }
      if (test.recommendations.length > 0) {
        log(`   Recommendations:`, 'cyan');
        test.recommendations.forEach(rec => log(`     - ${rec}`, 'cyan'));
      }
    });
  }
  
  // Non-critical issues
  const nonCriticalIssues = results.tests.filter(t => !t.critical && t.status !== 'success');
  if (nonCriticalIssues.length > 0) {
    log(`\n⚠️  NON-CRITICAL ISSUES:`, 'yellow');
    nonCriticalIssues.forEach((test, index) => {
      log(`\n${index + 1}. ${test.page} (${test.path})`, 'yellow');
      log(`   Status: ${test.statusCode || 'No Response'}`);
      if (test.issues.length > 0) {
        test.issues.forEach(issue => log(`     - ${issue}`));
      }
    });
  }
  
  // Performance Analysis
  const workingPages = results.tests.filter(t => t.status === 'success');
  if (workingPages.length > 0) {
    const responseTimes = workingPages.map(t => t.responseTime);
    const avgTime = (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(0);
    const maxTime = Math.max(...responseTimes);
    const minTime = Math.min(...responseTimes);
    
    log(`\n⚡ PERFORMANCE ANALYSIS:`, 'cyan');
    log(`   Average Response Time: ${avgTime}ms`);
    log(`   Fastest: ${minTime}ms`);
    log(`   Slowest: ${maxTime}ms`);
    
    if (avgTime > 2000) {
      log(`   ⚠️  Warning: Average response time is high`, 'yellow');
    }
  }
  
  // Overall Recommendations
  log(`\n💡 OVERALL RECOMMENDATIONS:`, 'cyan');
  
  if (results.critical_failed > 0) {
    log(`   🚨 FIX CRITICAL ISSUES FIRST:`);
    log(`      1. Focus on the ${results.critical_failed} critical page(s) that failed`);
    log(`      2. Check server logs for error details`);
    log(`      3. Verify page components exist and are properly exported`);
  }
  
  if (results.failed > results.critical_failed) {
    log(`   📋 THEN ADDRESS NON-CRITICAL ISSUES:`);
    log(`      1. Create missing page components`);
    log(`      2. Fix routing configuration`);
    log(`      3. Optimize slow-loading pages`);
  }
  
  if (workingPages.length > 0) {
    log(`   ✅ WORKING PAGES CAN BE ENHANCED:`);
    log(`      1. Add UI interaction testing`);
    log(`      2. Test mobile responsiveness`);
    log(`      3. Validate accessibility compliance`);
  }
  
  log('\n' + '='.repeat(80), 'blue');
  
  // Generate action items
  generateActionItems();
}

function generateActionItems() {
  log('\n📋 ACTION ITEMS:', 'magenta');
  
  const actionItems = [];
  let priority = 1;
  
  // Critical fixes
  const criticalIssues = results.tests.filter(t => t.critical && t.status !== 'success');
  criticalIssues.forEach(test => {
    if (test.statusCode === 404 || test.issues.includes('Page not found')) {
      actionItems.push({
        priority: priority++,
        type: 'CRITICAL',
        task: `Create missing page component for ${test.page}`,
        path: `src/app${test.path === '/' ? '/page.tsx' : test.path + '/page.tsx'}`,
        description: `Page returns 404 - component missing or not properly exported`
      });
    } else if (test.statusCode >= 500) {
      actionItems.push({
        priority: priority++,
        type: 'CRITICAL', 
        task: `Fix server error for ${test.page}`,
        path: test.path,
        description: `Server returning 500 error - check for runtime errors`
      });
    }
  });
  
  // Non-critical fixes
  const nonCriticalIssues = results.tests.filter(t => !t.critical && t.status !== 'success');
  nonCriticalIssues.forEach(test => {
    if (test.statusCode === 404) {
      actionItems.push({
        priority: priority++,
        type: 'HIGH',
        task: `Create page component for ${test.page}`,
        path: `src/app${test.path}/page.tsx`,
        description: `Optional page - consider if needed for user experience`
      });
    }
  });
  
  // Performance improvements
  const slowPages = results.tests.filter(t => t.status === 'success' && t.responseTime > 2000);
  slowPages.forEach(test => {
    actionItems.push({
      priority: priority++,
      type: 'MEDIUM',
      task: `Optimize performance for ${test.page}`,
      path: test.path,
      description: `Page loads slowly (${test.responseTime}ms) - optimize components and data loading`
    });
  });
  
  // Display action items
  actionItems.forEach(item => {
    const typeColor = item.type === 'CRITICAL' ? 'red' : item.type === 'HIGH' ? 'yellow' : 'cyan';
    log(`\n${item.priority}. [${item.type}] ${item.task}`, typeColor);
    log(`   Path: ${item.path}`);
    log(`   Description: ${item.description}`);
  });
  
  // Save detailed report
  saveReport(actionItems);
}

function saveReport(actionItems) {
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      critical_failed: results.critical_failed,
      success_rate: ((results.passed / results.total) * 100).toFixed(1)
    },
    server_info: results.server_info,
    test_results: results.tests,
    action_items: actionItems,
    next_steps: [
      'Fix all critical issues first',
      'Test pages individually after fixes',
      'Run comprehensive UI testing',
      'Implement monitoring for page health'
    ]
  };
  
  try {
    fs.writeFileSync('./page-test-report.json', JSON.stringify(reportData, null, 2));
    log(`\n💾 Detailed report saved to: page-test-report.json`, 'green');
  } catch (error) {
    log(`\n❌ Could not save report: ${error.message}`, 'red');
  }
}

// Main execution
async function main() {
  try {
    await runTests();
    generateReport();
    
    // Exit with appropriate code
    if (results.critical_failed > 0) {
      log(`\n❌ Critical issues found - immediate action required`, 'red');
      process.exit(1);
    } else if (results.failed > 0) {
      log(`\n⚠️  Some pages need attention`, 'yellow');
      process.exit(0);
    } else {
      log(`\n🎉 All pages working correctly!`, 'green');
      process.exit(0);
    }
  } catch (error) {
    log(`\n💥 Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, testPage, results };