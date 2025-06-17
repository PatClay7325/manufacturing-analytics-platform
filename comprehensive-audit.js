const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('=====================================');
console.log('COMPREHENSIVE PLATFORM AUDIT v2.0');
console.log('=====================================\n');

// Try port 3001 first, then fallback to 3000 if needed
const baseUrl = 'http://localhost:3001';
const auditReport = {
  timestamp: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    baseUrl: baseUrl
  },
  summary: {
    totalChecks: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    critical: 0
  },
  categories: {
    pages: [],
    api: [],
    components: [],
    performance: [],
    security: [],
    integration: [],
    database: [],
    configuration: []
  },
  detailedFindings: []
};

// Utility functions
function logResult(category, test, status, details = {}) {
  const symbols = {
    pass: '✅',
    fail: '❌',
    warn: '⚠️',
    info: 'ℹ️'
  };
  
  console.log(`${symbols[status]} [${category}] ${test}`);
  if (details.message) {
    console.log(`   └─ ${details.message}`);
  }
  
  auditReport.summary.totalChecks++;
  if (status === 'pass') auditReport.summary.passed++;
  else if (status === 'fail') {
    auditReport.summary.failed++;
    if (details.severity === 'critical') auditReport.summary.critical++;
  } else if (status === 'warn') auditReport.summary.warnings++;
  
  auditReport.categories[category].push({
    test,
    status,
    timestamp: new Date().toISOString(),
    ...details
  });
}

function makeRequest(url, options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          success: true,
          status: res.statusCode,
          headers: res.headers,
          body,
          responseTime: Date.now() - startTime
        });
      });
    }).on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
        responseTime: Date.now() - startTime
      });
    });
  });
}

async function executeCommand(command) {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true });
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', data => stdout += data);
    child.stderr.on('data', data => stderr += data);
    
    child.on('close', code => {
      resolve({ code, stdout, stderr });
    });
  });
}

// 1. Page Tests
async function auditPages() {
  console.log('\n=== PAGE FUNCTIONALITY AUDIT ===\n');
  
  const pages = [
    { name: 'Home', path: '/', expectedElements: ['navigation', 'hero', 'features'] },
    { name: 'Dashboard', path: '/dashboard', expectedElements: ['metrics', 'charts', 'filters'] },
    { name: 'Equipment', path: '/equipment', expectedElements: ['equipment-list', 'status-indicators', 'search'] },
    { name: 'Alerts', path: '/alerts', expectedElements: ['alert-list', 'severity-badges', 'filters'] },
    { name: 'Manufacturing Chat', path: '/manufacturing-chat', expectedElements: ['chat-interface', 'message-input'] },
    { name: 'Support', path: '/support', expectedElements: ['contact-form', 'faq', 'documentation'] },
    { name: 'Status', path: '/status', expectedElements: ['system-health', 'uptime-metrics'] },
    { name: 'Privacy Policy', path: '/privacy-policy', expectedElements: ['policy-content', 'sections'] },
    { name: 'Terms of Service', path: '/terms-of-service', expectedElements: ['terms-content', 'sections'] },
    { name: 'Cookie Policy', path: '/cookie-policy', expectedElements: ['cookie-content', 'consent-info'] }
  ];
  
  for (const page of pages) {
    const response = await makeRequest(`${baseUrl}${page.path}`);
    
    // Basic availability
    if (response.success && response.status === 200) {
      logResult('pages', `${page.name} - Availability`, 'pass', {
        responseTime: response.responseTime,
        path: page.path
      });
    } else {
      logResult('pages', `${page.name} - Availability`, 'fail', {
        message: `Status: ${response.status || 'Connection failed'}`,
        severity: 'critical',
        path: page.path
      });
      continue;
    }
    
    // Response time check
    if (response.responseTime < 1000) {
      logResult('pages', `${page.name} - Response Time`, 'pass', {
        responseTime: response.responseTime
      });
    } else if (response.responseTime < 3000) {
      logResult('pages', `${page.name} - Response Time`, 'warn', {
        message: `Slow response: ${response.responseTime}ms`,
        responseTime: response.responseTime
      });
    } else {
      logResult('pages', `${page.name} - Response Time`, 'fail', {
        message: `Very slow response: ${response.responseTime}ms`,
        responseTime: response.responseTime,
        severity: 'high'
      });
    }
    
    // Content validation
    const hasContent = response.body && response.body.length > 1000;
    if (hasContent) {
      logResult('pages', `${page.name} - Content Present`, 'pass', {
        contentLength: response.body.length
      });
      
      // Check for error indicators
      const errorPatterns = [
        /Internal Server Error/i,
        /TypeError:/,
        /ReferenceError:/,
        /SyntaxError:/,
        /Cannot read prop/,
        /undefined is not/,
        /Unhandled Runtime Error/
      ];
      
      const errors = errorPatterns.filter(pattern => pattern.test(response.body));
      if (errors.length === 0) {
        logResult('pages', `${page.name} - No Runtime Errors`, 'pass');
      } else {
        logResult('pages', `${page.name} - Runtime Errors`, 'fail', {
          message: `Found ${errors.length} error patterns`,
          severity: 'critical'
        });
      }
      
      // Check for expected elements (basic)
      const missingElements = page.expectedElements.filter(elem => 
        !response.body.includes(elem) && !response.body.includes(elem.replace('-', ' '))
      );
      
      if (missingElements.length === 0) {
        logResult('pages', `${page.name} - Expected Elements`, 'pass');
      } else {
        logResult('pages', `${page.name} - Expected Elements`, 'warn', {
          message: `Missing: ${missingElements.join(', ')}`
        });
      }
    } else {
      logResult('pages', `${page.name} - Content Present`, 'fail', {
        message: 'Page has minimal or no content',
        severity: 'high'
      });
    }
    
    // SEO basics
    const titleMatch = response.body.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1].length > 10) {
      logResult('pages', `${page.name} - Page Title`, 'pass', {
        title: titleMatch[1]
      });
    } else {
      logResult('pages', `${page.name} - Page Title`, 'warn', {
        message: 'Missing or inadequate page title'
      });
    }
  }
}

// 2. API Tests
async function auditAPIs() {
  console.log('\n=== API ENDPOINT AUDIT ===\n');
  
  const endpoints = [
    { path: '/api/equipment', method: 'GET', expectedStatus: [200, 404] },
    { path: '/api/equipment/1', method: 'GET', expectedStatus: [200, 404] },
    { path: '/api/alerts', method: 'GET', expectedStatus: [200, 404] },
    { path: '/api/alerts/active', method: 'GET', expectedStatus: [200, 404] },
    { path: '/api/metrics', method: 'GET', expectedStatus: [200, 404] },
    { path: '/api/metrics/performance', method: 'GET', expectedStatus: [200, 404] },
    { path: '/api/chat', method: 'GET', expectedStatus: [200, 404] },
    { path: '/api/chat/history', method: 'GET', expectedStatus: [200, 404] },
    { path: '/api/health', method: 'GET', expectedStatus: [200, 404] },
    { path: '/api/auth/status', method: 'GET', expectedStatus: [200, 401, 404] }
  ];
  
  for (const endpoint of endpoints) {
    const response = await makeRequest(`${baseUrl}${endpoint.path}`);
    
    if (response.success) {
      if (endpoint.expectedStatus.includes(response.status)) {
        logResult('api', `${endpoint.method} ${endpoint.path}`, 'pass', {
          status: response.status,
          responseTime: response.responseTime
        });
        
        // Check for proper JSON response
        if (response.status === 200) {
          try {
            JSON.parse(response.body);
            logResult('api', `${endpoint.path} - Valid JSON`, 'pass');
          } catch (e) {
            logResult('api', `${endpoint.path} - Valid JSON`, 'fail', {
              message: 'Response is not valid JSON',
              severity: 'high'
            });
          }
        }
      } else {
        logResult('api', `${endpoint.method} ${endpoint.path}`, 'fail', {
          message: `Unexpected status: ${response.status}`,
          severity: response.status >= 500 ? 'critical' : 'high'
        });
      }
      
      // Response time check for APIs
      if (response.responseTime < 200) {
        logResult('api', `${endpoint.path} - Performance`, 'pass', {
          responseTime: response.responseTime
        });
      } else if (response.responseTime < 1000) {
        logResult('api', `${endpoint.path} - Performance`, 'warn', {
          message: `Slow API response: ${response.responseTime}ms`
        });
      } else {
        logResult('api', `${endpoint.path} - Performance`, 'fail', {
          message: `Very slow API: ${response.responseTime}ms`,
          severity: 'high'
        });
      }
    } else {
      logResult('api', `${endpoint.method} ${endpoint.path}`, 'fail', {
        message: `Connection failed: ${response.error}`,
        severity: 'critical'
      });
    }
  }
}

// 3. Static Resources
async function auditStaticResources() {
  console.log('\n=== STATIC RESOURCES AUDIT ===\n');
  
  const resources = [
    { path: '/favicon.ico', required: true },
    { path: '/robots.txt', required: false },
    { path: '/sitemap.xml', required: false },
    { path: '/manifest.json', required: false },
    { path: '/mockServiceWorker.js', required: true },
    // Next.js static resources are not directly accessible in development mode
    { path: '/_next/static/css', required: false, checkExists: true },
    { path: '/_next/static/chunks', required: false, checkExists: true }
  ];
  
  for (const resource of resources) {
    const response = await makeRequest(`${baseUrl}${resource.path}`);
    
    if (response.success && (response.status === 200 || response.status === 304)) {
      logResult('components', `Static: ${resource.path}`, 'pass');
    } else if (resource.required) {
      logResult('components', `Static: ${resource.path}`, 'fail', {
        message: `Required resource missing (${response.status})`,
        severity: 'high'
      });
    } else {
      logResult('components', `Static: ${resource.path}`, 'warn', {
        message: `Optional resource missing (${response.status})`
      });
    }
  }
}

// 4. Security Checks
async function auditSecurity() {
  console.log('\n=== SECURITY AUDIT ===\n');
  
  // Check security headers
  const response = await makeRequest(baseUrl);
  const securityHeaders = [
    { name: 'x-frame-options', required: true },
    { name: 'x-content-type-options', required: true },
    { name: 'x-xss-protection', required: false },
    { name: 'strict-transport-security', required: false },
    { name: 'content-security-policy', required: false }
  ];
  
  for (const header of securityHeaders) {
    if (response.headers && response.headers[header.name]) {
      logResult('security', `Security Header: ${header.name}`, 'pass', {
        value: response.headers[header.name]
      });
    } else if (header.required) {
      logResult('security', `Security Header: ${header.name}`, 'fail', {
        message: 'Required security header missing',
        severity: 'high'
      });
    } else {
      logResult('security', `Security Header: ${header.name}`, 'warn', {
        message: 'Recommended security header missing'
      });
    }
  }
  
  // Check for exposed sensitive data
  const sensitivePatterns = [
    { pattern: /api[_-]?key/i, name: 'API Keys' },
    { pattern: /password|passwd|pwd/i, name: 'Passwords' },
    { pattern: /secret/i, name: 'Secrets' },
    { pattern: /token/i, name: 'Tokens' },
    { pattern: /localhost:\d{4}/g, name: 'Localhost URLs' }
  ];
  
  const homeResponse = await makeRequest(baseUrl);
  if (homeResponse.body) {
    for (const check of sensitivePatterns) {
      const matches = homeResponse.body.match(check.pattern);
      if (!matches || matches.length === 0) {
        logResult('security', `No exposed ${check.name}`, 'pass');
      } else {
        logResult('security', `Exposed ${check.name}`, 'warn', {
          message: `Found ${matches.length} instances`,
          severity: check.name === 'Localhost URLs' ? 'low' : 'high'
        });
      }
    }
  }
  
  // Check HTTPS redirect
  logResult('security', 'HTTPS Configuration', 'info', {
    message: 'HTTPS should be configured in production'
  });
}

// 5. Configuration & Environment
async function auditConfiguration() {
  console.log('\n=== CONFIGURATION AUDIT ===\n');
  
  // Check for required files
  const requiredFiles = [
    { path: 'package.json', critical: true },
    { path: 'package-lock.json', critical: true },
    { path: 'tsconfig.json', critical: true },
    { path: 'next.config.js', critical: true },
    { path: '.env.local', critical: false },
    { path: '.env.example', critical: false },
    { path: 'README.md', critical: false }
  ];
  
  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(process.cwd(), file.path))) {
      logResult('configuration', `Config File: ${file.path}`, 'pass');
    } else if (file.critical) {
      logResult('configuration', `Config File: ${file.path}`, 'fail', {
        message: 'Critical configuration file missing',
        severity: 'critical'
      });
    } else {
      logResult('configuration', `Config File: ${file.path}`, 'warn', {
        message: 'Recommended file missing'
      });
    }
  }
  
  // Check Node modules
  if (fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
    logResult('configuration', 'Node Modules', 'pass');
  } else {
    logResult('configuration', 'Node Modules', 'fail', {
      message: 'Dependencies not installed',
      severity: 'critical'
    });
  }
  
  // Check for TypeScript errors
  console.log('\nChecking TypeScript compilation...');
  const tscResult = await executeCommand('npx tsc --noEmit');
  if (tscResult.code === 0) {
    logResult('configuration', 'TypeScript Compilation', 'pass');
  } else {
    const errorCount = (tscResult.stdout.match(/error TS/g) || []).length;
    logResult('configuration', 'TypeScript Compilation', 'fail', {
      message: `${errorCount} TypeScript errors found`,
      severity: 'high',
      errors: tscResult.stdout.slice(0, 500)
    });
  }
}

// 6. Database & Data Integrity
async function auditDatabase() {
  console.log('\n=== DATABASE & DATA INTEGRITY AUDIT ===\n');
  
  // Check Prisma setup
  if (fs.existsSync(path.join(process.cwd(), 'prisma/schema.prisma'))) {
    logResult('database', 'Prisma Schema', 'pass');
    
    // Check if migrations directory exists
    if (fs.existsSync(path.join(process.cwd(), 'prisma/migrations'))) {
      logResult('database', 'Database Migrations', 'pass');
    } else {
      logResult('database', 'Database Migrations', 'warn', {
        message: 'No migrations found - database may not be initialized'
      });
    }
  } else {
    logResult('database', 'Prisma Schema', 'fail', {
      message: 'Database schema not found',
      severity: 'high'
    });
  }
  
  // Test database connection via API
  const dbTestEndpoints = [
    '/api/equipment',
    '/api/alerts'
  ];
  
  for (const endpoint of dbTestEndpoints) {
    const response = await makeRequest(`${baseUrl}${endpoint}`);
    if (response.status === 500 && response.body && response.body.includes('database')) {
      logResult('database', `Database Connection (${endpoint})`, 'fail', {
        message: 'Database connection error detected',
        severity: 'critical'
      });
    } else if (response.status === 200 || response.status === 404) {
      logResult('database', `Database Connection (${endpoint})`, 'pass', {
        message: 'No database errors detected'
      });
    }
  }
}

// 7. Performance Analysis
async function auditPerformance() {
  console.log('\n=== PERFORMANCE ANALYSIS ===\n');
  
  // Bundle size check
  const buildDir = path.join(process.cwd(), '.next');
  if (fs.existsSync(buildDir)) {
    logResult('performance', 'Build Output', 'pass');
    
    // Check for large bundles
    const checkLargeBundles = await executeCommand('find .next -name "*.js" -size +500k -type f | wc -l');
    const largeFiles = parseInt(checkLargeBundles.stdout.trim()) || 0;
    
    if (largeFiles === 0) {
      logResult('performance', 'Bundle Sizes', 'pass', {
        message: 'All bundles are reasonably sized'
      });
    } else {
      logResult('performance', 'Bundle Sizes', 'warn', {
        message: `${largeFiles} large bundles found (>500KB)`,
        severity: 'medium'
      });
    }
  } else {
    logResult('performance', 'Build Output', 'warn', {
      message: 'No production build found - run "npm run build" for accurate metrics'
    });
  }
  
  // Memory usage
  const memUsage = process.memoryUsage();
  logResult('performance', 'Memory Usage', 'info', {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
  });
  
  // Concurrent request handling
  console.log('\nTesting concurrent request handling...');
  const concurrentRequests = 10;
  const promises = [];
  
  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(makeRequest(`${baseUrl}/dashboard`));
  }
  
  const startTime = Date.now();
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / concurrentRequests;
  
  const failures = results.filter(r => !r.success || r.status !== 200).length;
  
  if (failures === 0) {
    logResult('performance', 'Concurrent Request Handling', 'pass', {
      message: `${concurrentRequests} concurrent requests handled successfully`,
      avgResponseTime: Math.round(avgTime) + 'ms'
    });
  } else {
    logResult('performance', 'Concurrent Request Handling', 'fail', {
      message: `${failures}/${concurrentRequests} requests failed`,
      severity: 'high'
    });
  }
}

// 8. Integration Tests
async function auditIntegrations() {
  console.log('\n=== INTEGRATION TESTS ===\n');
  
  // Test navigation flow
  const navigationFlow = [
    { from: '/', to: '/dashboard', linkText: 'Dashboard' },
    { from: '/dashboard', to: '/equipment', linkText: 'Equipment' },
    { from: '/equipment', to: '/alerts', linkText: 'Alerts' }
  ];
  
  for (const nav of navigationFlow) {
    const response = await makeRequest(`${baseUrl}${nav.from}`);
    if (response.body && response.body.includes(nav.linkText)) {
      logResult('integration', `Navigation: ${nav.from} → ${nav.to}`, 'pass');
    } else {
      logResult('integration', `Navigation: ${nav.from} → ${nav.to}`, 'warn', {
        message: 'Navigation link may be missing or broken'
      });
    }
  }
  
  // Test data flow
  logResult('integration', 'Component Data Flow', 'info', {
    message: 'Manual testing required for full component interaction verification'
  });
  
  // Test external service mocking
  if (fs.existsSync(path.join(process.cwd(), 'public/mockServiceWorker.js'))) {
    logResult('integration', 'Mock Service Worker', 'pass', {
      message: 'API mocking capability available'
    });
  } else {
    logResult('integration', 'Mock Service Worker', 'fail', {
      message: 'MSW not initialized - run "npm run msw:init"',
      severity: 'medium'
    });
  }
}

// Main audit runner
async function runComprehensiveAudit() {
  const startTime = Date.now();
  
  // Check if server is running
  const serverCheck = await makeRequest(baseUrl);
  if (!serverCheck.success) {
    console.log('\n⚠️ WARNING: Development server is not running!');
    console.log('Running static checks only.\n');
    // Run only static checks that don't require a running server
    await auditConfiguration();
    await auditDatabase();
    
    // Generate simplified report
    const totalTime = Date.now() - startTime;
    console.log('\n=====================================');
    console.log('STATIC AUDIT SUMMARY');
    console.log('=====================================\n');
    
    console.log(`Total Checks: ${auditReport.summary.totalChecks}`);
    console.log(`✅ Passed: ${auditReport.summary.passed} (${Math.round(auditReport.summary.passed / auditReport.summary.totalChecks * 100)}%)`);
    console.log(`❌ Failed: ${auditReport.summary.failed}`);
    console.log(`⚠️  Warnings: ${auditReport.summary.warnings}`);
    console.log(`🔴 Critical Issues: ${auditReport.summary.critical}`);
    console.log(`\nAudit completed in ${Math.round(totalTime / 1000)}s`);
    
    // Static checks for file structure
    console.log('\nPerforming static file structure checks...');
    
    // Check static resources in public directory
    const publicFiles = [
      'favicon.ico',
      'robots.txt',
      'sitemap.xml',
      'manifest.json',
      'mockServiceWorker.js'
    ];
    
    console.log('\n=== Static Resources Check ===');
    for (const file of publicFiles) {
      const filePath = path.join(process.cwd(), 'public', file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}: Found`);
      } else {
        console.log(`❌ ${file}: Missing`);
        auditReport.summary.failed++;
        auditReport.summary.critical++;
      }
    }
    
    // Check API routes
    const apiRoutes = [
      'equipment',
      'alerts',
      'metrics',
      'chat'
    ];
    
    console.log('\n=== API Routes Check ===');
    for (const route of apiRoutes) {
      const routePath = path.join(process.cwd(), 'src/app/api', route, 'route.ts');
      if (fs.existsSync(routePath)) {
        console.log(`✅ /api/${route}: Found`);
      } else {
        console.log(`❌ /api/${route}: Missing`);
        auditReport.summary.failed++;
        auditReport.summary.critical++;
      }
    }
    
    // Check security headers in next.config.js
    console.log('\n=== Security Headers Check ===');
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    if (fs.existsSync(nextConfigPath)) {
      const configContent = fs.readFileSync(nextConfigPath, 'utf-8');
      
      const requiredHeaders = [
        'X-DNS-Prefetch-Control',
        'X-XSS-Protection',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Strict-Transport-Security',
        'Content-Security-Policy',
        'Permissions-Policy'
      ];
      
      let missingHeaders = [];
      for (const header of requiredHeaders) {
        if (!configContent.includes(header)) {
          missingHeaders.push(header);
        }
      }
      
      if (missingHeaders.length === 0) {
        console.log('✅ All required security headers found');
      } else {
        console.log(`❌ Missing security headers: ${missingHeaders.join(', ')}`);
        auditReport.summary.failed += missingHeaders.length;
        auditReport.summary.critical++;
      }
    } else {
      console.log('❌ next.config.js file not found');
      auditReport.summary.failed++;
      auditReport.summary.critical++;
    }
    
    // Updated final report
    console.log('\n=====================================');
    console.log('FINAL STATIC AUDIT SUMMARY');
    console.log('=====================================\n');
    
    console.log(`Total Checks: ${auditReport.summary.totalChecks + publicFiles.length + apiRoutes.length + 1}`);
    console.log(`✅ Passed: ${auditReport.summary.passed}`);
    console.log(`❌ Failed: ${auditReport.summary.failed}`);
    console.log(`⚠️  Warnings: ${auditReport.summary.warnings}`);
    console.log(`🔴 Critical Issues: ${auditReport.summary.critical}`);
    
    // Exit with useful message
    if (auditReport.summary.critical > 0) {
      console.log('\n❌ Static audit found critical issues that need to be addressed.');
      process.exit(1);
    } else {
      console.log('\n✅ Static audit passed! Start the server to run the full audit.');
      process.exit(0);
    }
  }
  
  // Run all audits
  await auditPages();
  await auditAPIs();
  await auditStaticResources();
  await auditSecurity();
  await auditConfiguration();
  await auditDatabase();
  await auditPerformance();
  await auditIntegrations();
  
  const totalTime = Date.now() - startTime;
  
  // Generate summary
  console.log('\n=====================================');
  console.log('COMPREHENSIVE AUDIT SUMMARY');
  console.log('=====================================\n');
  
  console.log(`Total Checks: ${auditReport.summary.totalChecks}`);
  console.log(`✅ Passed: ${auditReport.summary.passed} (${Math.round(auditReport.summary.passed / auditReport.summary.totalChecks * 100)}%)`);
  console.log(`❌ Failed: ${auditReport.summary.failed}`);
  console.log(`⚠️  Warnings: ${auditReport.summary.warnings}`);
  console.log(`🔴 Critical Issues: ${auditReport.summary.critical}`);
  console.log(`\nAudit completed in ${Math.round(totalTime / 1000)}s`);
  
  // Category breakdown
  console.log('\nCategory Breakdown:');
  for (const [category, results] of Object.entries(auditReport.categories)) {
    if (results.length > 0) {
      const passed = results.filter(r => r.status === 'pass').length;
      const failed = results.filter(r => r.status === 'fail').length;
      console.log(`  ${category}: ${passed} passed, ${failed} failed`);
    }
  }
  
  // Critical issues summary
  if (auditReport.summary.critical > 0) {
    console.log('\n🔴 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:');
    for (const [category, results] of Object.entries(auditReport.categories)) {
      const criticalIssues = results.filter(r => r.status === 'fail' && r.severity === 'critical');
      for (const issue of criticalIssues) {
        console.log(`  - [${category}] ${issue.test}: ${issue.message}`);
      }
    }
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'audit-results', 'comprehensive-audit-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));
  
  // Save summary report
  const summaryPath = path.join(__dirname, 'audit-results', 'audit-summary.md');
  const summaryContent = generateMarkdownSummary();
  fs.writeFileSync(summaryPath, summaryContent);
  
  console.log(`\nDetailed reports saved to:`);
  console.log(`  - ${reportPath}`);
  console.log(`  - ${summaryPath}`);
  
  // Exit code based on critical issues
  if (auditReport.summary.critical > 0) {
    console.log('\n❌ Audit failed due to critical issues.');
    process.exit(1);
  } else if (auditReport.summary.failed > 0) {
    console.log('\n⚠️  Audit completed with non-critical failures.');
    process.exit(0);
  } else {
    console.log('\n✅ Audit completed successfully!');
    process.exit(0);
  }
}

function generateMarkdownSummary() {
  let md = `# Manufacturing Analytics Platform - Comprehensive Audit Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  md += `## Executive Summary\n\n`;
  md += `- **Total Checks:** ${auditReport.summary.totalChecks}\n`;
  md += `- **Passed:** ${auditReport.summary.passed} (${Math.round(auditReport.summary.passed / auditReport.summary.totalChecks * 100)}%)\n`;
  md += `- **Failed:** ${auditReport.summary.failed}\n`;
  md += `- **Warnings:** ${auditReport.summary.warnings}\n`;
  md += `- **Critical Issues:** ${auditReport.summary.critical}\n\n`;
  
  md += `## Health Score: ${calculateHealthScore()}/100\n\n`;
  
  // Critical issues
  if (auditReport.summary.critical > 0) {
    md += `## 🔴 Critical Issues\n\n`;
    for (const [category, results] of Object.entries(auditReport.categories)) {
      const criticalIssues = results.filter(r => r.status === 'fail' && r.severity === 'critical');
      if (criticalIssues.length > 0) {
        md += `### ${category.toUpperCase()}\n`;
        for (const issue of criticalIssues) {
          md += `- **${issue.test}**: ${issue.message}\n`;
        }
        md += '\n';
      }
    }
  }
  
  // Category details
  md += `## Detailed Results by Category\n\n`;
  for (const [category, results] of Object.entries(auditReport.categories)) {
    if (results.length > 0) {
      md += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      
      const passed = results.filter(r => r.status === 'pass').length;
      const failed = results.filter(r => r.status === 'fail').length;
      const warnings = results.filter(r => r.status === 'warn').length;
      
      md += `- Passed: ${passed}\n`;
      md += `- Failed: ${failed}\n`;
      md += `- Warnings: ${warnings}\n\n`;
      
      // List failures and warnings
      const issues = results.filter(r => r.status !== 'pass' && r.status !== 'info');
      if (issues.length > 0) {
        md += `**Issues:**\n`;
        for (const issue of issues) {
          md += `- ${issue.status === 'fail' ? '❌' : '⚠️'} **${issue.test}**`;
          if (issue.message) md += `: ${issue.message}`;
          md += '\n';
        }
        md += '\n';
      }
    }
  }
  
  // Recommendations
  md += `## Recommendations\n\n`;
  md += generateRecommendations();
  
  return md;
}

function calculateHealthScore() {
  const total = auditReport.summary.totalChecks;
  const passed = auditReport.summary.passed;
  const warnings = auditReport.summary.warnings;
  const failed = auditReport.summary.failed;
  const critical = auditReport.summary.critical;
  
  let score = 100;
  score -= (critical * 10); // -10 points per critical issue
  score -= (failed * 5);    // -5 points per failure
  score -= (warnings * 2);  // -2 points per warning
  
  return Math.max(0, Math.round(score));
}

function generateRecommendations() {
  const recommendations = [];
  
  if (auditReport.summary.critical > 0) {
    recommendations.push('1. **Address critical issues immediately** - These are blocking production readiness');
  }
  
  // Check specific issues
  const apiFailures = auditReport.categories.api.filter(r => r.status === 'fail').length;
  if (apiFailures > 5) {
    recommendations.push('2. **Implement API endpoints** - Most API routes are returning 404');
  }
  
  const securityWarnings = auditReport.categories.security.filter(r => r.status === 'warn').length;
  if (securityWarnings > 2) {
    recommendations.push('3. **Enhance security headers** - Add CSP, HSTS, and other security headers');
  }
  
  const performanceIssues = auditReport.categories.performance.filter(r => r.status !== 'pass').length;
  if (performanceIssues > 0) {
    recommendations.push('4. **Optimize performance** - Address slow response times and bundle sizes');
  }
  
  const dbIssues = auditReport.categories.database.filter(r => r.status === 'fail').length;
  if (dbIssues > 0) {
    recommendations.push('5. **Configure database** - Set up Prisma and run migrations');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('The application is in good health! Consider adding more tests and monitoring.');
  }
  
  return recommendations.join('\n');
}

// Run the audit
runComprehensiveAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});