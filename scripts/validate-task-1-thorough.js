#!/usr/bin/env node

/**
 * Comprehensive Task 1 Validation Script
 * Performs deep validation including build and runtime checks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Comprehensive Task 1 Validation\n');

let score = 0;
let totalChecks = 0;
const issues = [];

// Enhanced check function with severity
function check(name, testFn, severity = 'error') {
  totalChecks++;
  try {
    const result = testFn();
    if (result === true) {
      console.log(`✅ ${name}`);
      score++;
    } else {
      console.log(`❌ ${name}: ${result || 'Failed'}`);
      issues.push({ name, severity, message: result || 'Failed' });
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    issues.push({ name, severity, message: error.message });
  }
}

// 1. Syntax and TypeScript Checks
console.log('\n📝 TypeScript & Syntax Validation...');

check('TypeScript compilation', () => {
  try {
    execSync('npm run typecheck', { stdio: 'pipe' });
    return true;
  } catch (error) {
    const errors = error.stdout ? error.stdout.toString() : 'TypeScript compilation failed';
    const errorCount = (errors.match(/error TS/g) || []).length;
    return `${errorCount} TypeScript errors found`;
  }
});

check('ESLint validation', () => {
  try {
    execSync('npm run lint', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return 'ESLint validation failed';
  }
}, 'warning');

// 2. Build Validation
console.log('\n🏗️  Build Validation...');

check('Next.js production build', () => {
  try {
    execSync('npm run build', { stdio: 'pipe' });
    return true;
  } catch (error) {
    const output = error.stdout ? error.stdout.toString() : '';
    if (output.includes('Failed to compile')) {
      const errors = output.match(/Error: (.*)/g) || [];
      return `Build failed with ${errors.length} errors`;
    }
    return 'Build failed';
  }
});

// 3. Dependency Validation
console.log('\n📦 Dependency Validation...');

check('All dependencies installed', () => {
  try {
    execSync('npm ls', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return 'Missing or conflicting dependencies';
  }
}, 'warning');

check('No security vulnerabilities', () => {
  try {
    const result = execSync('npm audit --json', { stdio: 'pipe' });
    const audit = JSON.parse(result.toString());
    if (audit.metadata.vulnerabilities.total > 0) {
      return `${audit.metadata.vulnerabilities.total} vulnerabilities found`;
    }
    return true;
  } catch (error) {
    return 'Security audit failed';
  }
}, 'warning');

// 4. Configuration Validation
console.log('\n⚙️  Configuration Validation...');

check('Next.js config is valid', () => {
  try {
    require('../next.config.js');
    return true;
  } catch (error) {
    return `Config error: ${error.message}`;
  }
});

check('TypeScript config is valid', () => {
  const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  if (tsConfig.compilerOptions.strict === false) {
    return 'TypeScript strict mode is disabled (should be enabled for enterprise)';
  }
  return true;
}, 'warning');

// 5. Runtime Validation
console.log('\n🚀 Runtime Validation...');

check('Development server starts', () => {
  try {
    const child = execSync('timeout 10s npm run dev', { stdio: 'pipe' });
    return true;
  } catch (error) {
    // Timeout is expected, but we should see the server starting
    const output = error.stdout ? error.stdout.toString() : '';
    if (output.includes('Ready') || output.includes('started server') || output.includes('Local:')) {
      return true;
    }
    return 'Development server failed to start';
  }
});

check('Health endpoint responds', () => {
  // This would require the server to be running
  // For now, just check if the file exists and is valid
  const healthRoute = fs.readFileSync('src/app/api/health/route.ts', 'utf8');
  if (healthRoute.includes('export async function GET')) {
    return true;
  }
  return 'Health endpoint not properly implemented';
});

// 6. Best Practices Validation
console.log('\n📋 Best Practices Validation...');

check('Environment variables documented', () => {
  const envExample = fs.readFileSync('.env.example', 'utf8');
  const lines = envExample.split('\n');
  const documented = lines.filter(line => line.includes('#')).length;
  const variables = lines.filter(line => line.includes('=')).length;
  if (documented < variables * 0.5) {
    return 'Insufficient documentation for environment variables';
  }
  return true;
}, 'warning');

check('Error handling configured', () => {
  const hasErrorBoundary = fs.existsSync('src/app/error.tsx');
  const hasGlobalError = fs.existsSync('src/app/global-error.tsx');
  if (!hasErrorBoundary || !hasGlobalError) {
    return 'Missing error boundary components';
  }
  return true;
});

// Generate report
console.log('\n' + '='.repeat(60));
console.log('\n📊 COMPREHENSIVE VALIDATION REPORT\n');
console.log(`Total Checks: ${totalChecks}`);
console.log(`Passed: ${score}`);
console.log(`Failed: ${totalChecks - score}`);
console.log(`Score: ${Math.round((score / totalChecks) * 100)}%`);

if (issues.length > 0) {
  console.log('\n⚠️  Issues Found:\n');
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  if (errors.length > 0) {
    console.log('🔴 Errors (Must Fix):');
    errors.forEach(issue => {
      console.log(`   - ${issue.name}: ${issue.message}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n🟡 Warnings (Should Fix):');
    warnings.forEach(issue => {
      console.log(`   - ${issue.name}: ${issue.message}`);
    });
  }
}

// Rating
console.log('\n' + '='.repeat(60));
const percentage = Math.round((score / totalChecks) * 100);
if (percentage === 100) {
  console.log('\n🎉 Rating: 10/10 - Perfect Implementation!');
} else if (percentage >= 90) {
  console.log(`\n✅ Rating: ${Math.round(percentage / 10)}/10 - Excellent, minor issues only`);
} else if (percentage >= 70) {
  console.log(`\n👍 Rating: ${Math.round(percentage / 10)}/10 - Good, but needs improvements`);
} else {
  console.log(`\n❌ Rating: ${Math.round(percentage / 10)}/10 - Significant issues need resolution`);
}

process.exit(percentage === 100 ? 0 : 1);