const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('Manufacturing Analytics Platform Audit');
console.log('========================================\n');

const baseUrl = 'http://localhost:3000';
const pages = [
  { name: 'Home', path: '/' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Equipment', path: '/equipment' },
  { name: 'Alerts', path: '/alerts' },
  { name: 'Manufacturing Chat', path: '/manufacturing-chat' },
  { name: 'Support', path: '/support' },
  { name: 'Status', path: '/status' },
  { name: 'Privacy Policy', path: '/privacy-policy' },
  { name: 'Terms of Service', path: '/terms-of-service' },
  { name: 'Cookie Policy', path: '/cookie-policy' },
];

let totalIssues = 0;
const auditResults = {
  timestamp: new Date().toISOString(),
  baseUrl,
  pages: [],
  summary: {
    totalPages: pages.length,
    pagesChecked: 0,
    totalIssues: 0,
    criticalIssues: 0,
    warnings: 0
  }
};

// Function to check a single page
function checkPage(pageInfo) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const result = {
      name: pageInfo.name,
      path: pageInfo.path,
      status: null,
      loadTime: null,
      issues: []
    };

    http.get(`${baseUrl}${pageInfo.path}`, (res) => {
      result.status = res.statusCode;
      result.loadTime = Date.now() - startTime;
      
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Check status code
        if (res.statusCode !== 200) {
          result.issues.push({
            type: 'HTTP Error',
            severity: 'critical',
            message: `Page returned status ${res.statusCode}`
          });
          auditResults.summary.criticalIssues++;
        }
        
        // Check load time
        if (result.loadTime > 3000) {
          result.issues.push({
            type: 'Performance',
            severity: 'warning',
            message: `Slow load time: ${result.loadTime}ms`
          });
          auditResults.summary.warnings++;
        }
        
        // Basic content checks
        if (body.length > 0) {
          // Check for title
          const titleMatch = body.match(/<title>(.*?)<\/title>/i);
          if (!titleMatch || titleMatch[1].length < 10) {
            result.issues.push({
              type: 'SEO',
              severity: 'warning',
              message: 'Missing or short page title'
            });
            auditResults.summary.warnings++;
          }
          
          // Check for console.log in production
          if (body.includes('console.log') || body.includes('console.error')) {
            result.issues.push({
              type: 'Code Quality',
              severity: 'warning',
              message: 'Console statements found in production code'
            });
            auditResults.summary.warnings++;
          }
          
          // Check for localhost references
          const localhostCount = (body.match(/localhost:\d{4}/g) || []).length;
          if (localhostCount > 0) {
            result.issues.push({
              type: 'Security',
              severity: 'warning',
              message: `Found ${localhostCount} localhost references`
            });
            auditResults.summary.warnings++;
          }
          
          // Check for error messages
          if (body.includes('Error:') || body.includes('Exception')) {
            result.issues.push({
              type: 'Error Handling',
              severity: 'critical',
              message: 'Exposed error messages found'
            });
            auditResults.summary.criticalIssues++;
          }
        }
        
        auditResults.summary.totalIssues += result.issues.length;
        totalIssues += result.issues.length;
        
        // Display results
        console.log(`\n${pageInfo.name} (${pageInfo.path})`);
        console.log(`  Status: ${result.status} | Load time: ${result.loadTime}ms`);
        
        if (result.issues.length > 0) {
          console.log(`  Issues found: ${result.issues.length}`);
          result.issues.forEach(issue => {
            const icon = issue.severity === 'critical' ? '❌' : '⚠️';
            console.log(`    ${icon} [${issue.severity}] ${issue.type}: ${issue.message}`);
          });
        } else {
          console.log('  ✅ No issues found');
        }
        
        auditResults.pages.push(result);
        auditResults.summary.pagesChecked++;
        resolve();
      });
    }).on('error', (err) => {
      result.issues.push({
        type: 'Connection Error',
        severity: 'critical',
        message: err.message
      });
      auditResults.summary.criticalIssues++;
      
      console.log(`\n${pageInfo.name} (${pageInfo.path})`);
      console.log(`  ❌ Error: ${err.message}`);
      
      auditResults.pages.push(result);
      resolve();
    });
  });
}

// Function to check API endpoints
async function checkAPIs() {
  console.log('\n\n=== API Endpoint Checks ===');
  
  const apiEndpoints = [
    '/api/equipment',
    '/api/alerts',
    '/api/metrics',
    '/api/chat'
  ];
  
  for (const endpoint of apiEndpoints) {
    await new Promise((resolve) => {
      http.get(`${baseUrl}${endpoint}`, (res) => {
        console.log(`\n${endpoint}: ${res.statusCode}`);
        if (res.statusCode >= 400) {
          auditResults.summary.criticalIssues++;
        }
        resolve();
      }).on('error', (err) => {
        console.log(`\n${endpoint}: ❌ ${err.message}`);
        auditResults.summary.criticalIssues++;
        resolve();
      });
    });
  }
}

// Function to check static resources
async function checkStaticResources() {
  console.log('\n\n=== Static Resource Checks ===');
  
  const resources = [
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/mockServiceWorker.js'
  ];
  
  for (const resource of resources) {
    await new Promise((resolve) => {
      http.get(`${baseUrl}${resource}`, (res) => {
        const icon = res.statusCode === 200 ? '✅' : res.statusCode === 404 ? '⚠️' : '❌';
        console.log(`${icon} ${resource}: ${res.statusCode}`);
        if (res.statusCode >= 500) {
          auditResults.summary.criticalIssues++;
        }
        resolve();
      }).on('error', (err) => {
        console.log(`❌ ${resource}: ${err.message}`);
        resolve();
      });
    });
  }
}

// Run the audit
async function runAudit() {
  console.log('Starting page checks...\n');
  
  // Check all pages
  for (const page of pages) {
    await checkPage(page);
  }
  
  // Check APIs
  await checkAPIs();
  
  // Check static resources
  await checkStaticResources();
  
  // Display summary
  console.log('\n\n========================================');
  console.log('AUDIT SUMMARY');
  console.log('========================================');
  console.log(`Total pages checked: ${auditResults.summary.pagesChecked}`);
  console.log(`Total issues found: ${auditResults.summary.totalIssues}`);
  console.log(`  Critical issues: ${auditResults.summary.criticalIssues}`);
  console.log(`  Warnings: ${auditResults.summary.warnings}`);
  
  // Save results to file
  const resultsPath = path.join(__dirname, 'audit-results', 'simple-audit-results.json');
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
  fs.writeFileSync(resultsPath, JSON.stringify(auditResults, null, 2));
  
  console.log(`\nDetailed results saved to: ${resultsPath}`);
  
  // Recommendations
  if (auditResults.summary.criticalIssues > 0) {
    console.log('\n⚠️  CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION');
  }
  
  if (auditResults.summary.totalIssues > 0) {
    console.log('\nTop recommendations:');
    if (auditResults.summary.criticalIssues > 0) {
      console.log('1. Fix HTTP errors and connection issues');
    }
    console.log('2. Optimize slow-loading pages (>3s)');
    console.log('3. Add proper SEO metadata');
    console.log('4. Remove console statements from production');
    console.log('5. Update localhost references to environment variables');
  } else {
    console.log('\n✅ All checks passed! Your application appears to be in good health.');
  }
}

// Check if server is running
http.get(baseUrl, (res) => {
  console.log(`Server is running at ${baseUrl}\n`);
  runAudit();
}).on('error', (err) => {
  console.error(`\n❌ Error: Cannot connect to ${baseUrl}`);
  console.error('Please make sure the development server is running.');
  console.error('Run: npm run dev');
  process.exit(1);
});