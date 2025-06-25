#!/usr/bin/env node

const http = require('http');
const https = require('https');

// List of all pages to check
const pages = [
  '/',
  '/manufacturingPlatform-demo',
  '/dashboard',
  '/dashboards',
  '/dashboards/browse',
  '/dashboards/new',
  '/dashboards/manufacturing',
  '/dashboards/production',
  '/dashboards/quality',
  '/dashboards/maintenance',
  '/dashboards/oee',
  '/dashboards/unified',
  '/Analytics-dashboard',
  '/ai-chat',
  '/chat-demo',
  '/manufacturing-chat',
  '/alerting',
  '/alerting/list',
  '/alerts',
  '/equipment',
  '/monitoring',
  '/diagnostics',
  '/explore',
  '/admin/general',
  '/admin/users',
  '/admin/teams',
  '/users',
  '/teams',
  '/profile',
  '/login',
  '/register',
  '/datasources',
  '/connections',
  '/api-keys',
  '/plugins',
  '/support',
  '/status'
];

const baseUrl = 'http://localhost:3000';
let totalPages = pages.length;
let checkedPages = 0;
let errors404 = [];
let errors500 = [];
let successPages = [];

console.log('==========================================');
console.log('Simple 404 Error Check - Node.js Version');
console.log('==========================================\n');

function checkPage(path) {
  return new Promise((resolve) => {
    const url = baseUrl + path;
    http.get(url, (res) => {
      checkedPages++;
      
      if (res.statusCode === 404) {
        errors404.push({ path, status: res.statusCode });
        console.log(`❌ 404 - ${path}`);
      } else if (res.statusCode >= 500) {
        errors500.push({ path, status: res.statusCode });
        console.log(`❌ ${res.statusCode} - ${path}`);
      } else if (res.statusCode === 200) {
        successPages.push(path);
        console.log(`✅ 200 - ${path}`);
      } else {
        console.log(`⚠️  ${res.statusCode} - ${path}`);
      }
      
      resolve();
    }).on('error', (err) => {
      checkedPages++;
      console.log(`❌ ERROR - ${path}: ${err.message}`);
      resolve();
    });
  });
}

async function runChecks() {
  console.log(`Checking ${totalPages} pages...\n`);
  
  // Check pages in batches to avoid overwhelming the server
  const batchSize = 5;
  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    await Promise.all(batch.map(checkPage));
  }
  
  // Summary
  console.log('\n==========================================');
  console.log('SUMMARY');
  console.log('==========================================');
  console.log(`Total pages checked: ${checkedPages}`);
  console.log(`✅ Successful (200): ${successPages.length}`);
  console.log(`❌ Not Found (404): ${errors404.length}`);
  console.log(`❌ Server Errors (5xx): ${errors500.length}`);
  
  if (errors404.length > 0) {
    console.log('\n404 ERRORS:');
    errors404.forEach(e => console.log(`  - ${e.path}`));
  }
  
  if (errors500.length > 0) {
    console.log('\nSERVER ERRORS:');
    errors500.forEach(e => console.log(`  - ${e.path} (${e.status})`));
  }
  
  console.log('\n==========================================');
  
  // Exit with error code if 404s found
  process.exit(errors404.length > 0 ? 1 : 0);
}

// Check if server is running first
http.get(baseUrl, (res) => {
  console.log('✅ Development server is running\n');
  runChecks();
}).on('error', (err) => {
  console.log('❌ Development server is not running on localhost:3000');
  console.log('Please start the development server first with: npm run dev\n');
  process.exit(1);
});