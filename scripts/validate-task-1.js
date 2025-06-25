#!/usr/bin/env node

/**
 * Task 1 Validation Script
 * Validates all optimizations made to Next.js infrastructure
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Task 1: Optimize Existing Next.js Infrastructure\n');

let score = 0;
let totalChecks = 0;

// Check function
function check(name, condition, errorMsg) {
  totalChecks++;
  if (condition) {
    console.log(`✅ ${name}`);
    score++;
  } else {
    console.log(`❌ ${name}: ${errorMsg}`);
  }
}

// 1. Check package.json dependencies
console.log('\n📦 Checking package.json dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

check(
  'Sentry dependency added',
  packageJson.dependencies['@sentry/nextjs'],
  'Missing @sentry/nextjs dependency'
);

check(
  'Lodash dependency added',
  packageJson.dependencies['lodash'],
  'Missing lodash dependency'
);

check(
  'Joi dependency added',
  packageJson.dependencies['joi'],
  'Missing joi dependency'
);

check(
  'Enterprise scripts added',
  packageJson.scripts['build:analyze'] && 
  packageJson.scripts['build:production'] &&
  packageJson.scripts['performance:audit'],
  'Missing enterprise scripts'
);

check(
  'Bundle analyzer dev dependency',
  packageJson.devDependencies['webpack-bundle-analyzer'],
  'Missing webpack-bundle-analyzer'
);

// 2. Check Next.js configuration
console.log('\n⚙️  Checking Next.js configuration...');
const nextConfig = fs.readFileSync('next.config.js', 'utf8');

check(
  'Security headers configured',
  nextConfig.includes('X-Frame-Options') && 
  nextConfig.includes('X-Content-Type-Options'),
  'Missing security headers'
);

check(
  'Performance optimizations',
  nextConfig.includes('poweredByHeader: false') && 
  nextConfig.includes('compress: true'),
  'Missing performance optimizations'
);

check(
  'Image optimization configured',
  nextConfig.includes('formats: [\'image/webp\', \'image/avif\']'),
  'Missing image format optimizations'
);

check(
  'Webpack optimization configured',
  nextConfig.includes('splitChunks') && 
  nextConfig.includes('vendor'),
  'Missing webpack optimizations'
);

// 3. Check TypeScript configuration
console.log('\n📝 Checking TypeScript configuration...');
const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));

check(
  'ES2022 target configured',
  tsConfig.compilerOptions.target === 'es2022',
  'TypeScript target should be es2022'
);

check(
  'Path aliases configured',
  tsConfig.compilerOptions.paths &&
  tsConfig.compilerOptions.paths['@/components/*'] &&
  tsConfig.compilerOptions.paths['@/lib/*'],
  'Missing path aliases'
);

// 4. Check environment configuration
console.log('\n🔐 Checking environment configuration...');
const envExample = fs.readFileSync('.env.example', 'utf8');

check(
  'Enterprise authentication configured',
  envExample.includes('LDAP_SERVER') && 
  envExample.includes('OAUTH_GOOGLE_CLIENT_ID') &&
  envExample.includes('SAML_ENTRY_POINT'),
  'Missing enterprise authentication variables'
);

check(
  'Data source configurations',
  envExample.includes('INFLUXDB_URL') && 
  envExample.includes('MYSQL_HOST') &&
  envExample.includes('ELASTICSEARCH_URL'),
  'Missing data source configurations'
);

check(
  'Alerting configurations',
  envExample.includes('SMTP_HOST') && 
  envExample.includes('SLACK_WEBHOOK_URL') &&
  envExample.includes('TWILIO_ACCOUNT_SID'),
  'Missing alerting configurations'
);

check(
  'Feature flags configured',
  envExample.includes('FEATURE_ADVANCED_ANALYTICS') && 
  envExample.includes('FEATURE_ENTERPRISE_AUTH'),
  'Missing feature flags'
);

// 5. Check health endpoint
console.log('\n🏥 Checking health endpoint...');
const healthRoute = path.join('src', 'app', 'api', 'health', 'route.ts');
check(
  'Health endpoint exists',
  fs.existsSync(healthRoute),
  'Health endpoint not found'
);

// 6. Check if development server can start
console.log('\n🚀 Checking development environment...');
check(
  'Node modules directory exists',
  fs.existsSync('node_modules'),
  'Node modules not installed - run npm install'
);

// Calculate final score
console.log('\n' + '='.repeat(50));
const percentage = Math.round((score / totalChecks) * 100);
console.log(`\n📊 Task 1 Score: ${score}/${totalChecks} (${percentage}%)\n`);

if (percentage === 100) {
  console.log('🎉 Perfect! Task 1 is fully implemented correctly.');
  process.exit(0);
} else if (percentage >= 80) {
  console.log('👍 Good progress, but some items need attention.');
  process.exit(1);
} else {
  console.log('⚠️  Significant issues found. Please review and fix.');
  process.exit(1);
}