#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Comprehensive Error Check for Manufacturing Analytics Platform\n');
console.log('=' .repeat(60));

const checks = [
  {
    name: 'TypeScript Type Checking',
    command: 'npx tsc --noEmit --incremental --tsBuildInfoFile .tsbuildinfo',
    timeout: 120000,
    errorPattern: /error TS\d+:/g
  },
  {
    name: 'ESLint Code Quality',
    command: 'npx next lint',
    timeout: 60000,
    errorPattern: /error/gi
  },
  {
    name: 'Build Verification',
    command: 'npm run build',
    timeout: 180000,
    errorPattern: /Error:|Failed|error/gi
  }
];

const results = [];

// Helper to run command with timeout
function runCheck(check) {
  console.log(`\n📋 Running: ${check.name}`);
  console.log('-'.repeat(40));
  
  const startTime = Date.now();
  let output = '';
  let errorCount = 0;
  let success = false;
  
  try {
    output = execSync(check.command, {
      encoding: 'utf8',
      timeout: check.timeout,
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    success = true;
    console.log('✅ Passed');
  } catch (error) {
    if (error.signal === 'SIGTERM') {
      console.log('⏱️  Timeout');
      output = 'Check timed out after ' + (check.timeout / 1000) + ' seconds';
    } else {
      output = error.stdout || error.stderr || error.message;
      
      // Count errors
      const matches = output.match(check.errorPattern);
      errorCount = matches ? matches.length : 1;
      
      console.log(`❌ Failed with ${errorCount} error(s)`);
      
      // Show first few errors
      if (matches && matches.length > 0) {
        console.log('\nFirst errors:');
        const lines = output.split('\n');
        let shown = 0;
        for (const line of lines) {
          if (line.match(check.errorPattern) && shown < 5) {
            console.log('  ' + line.trim());
            shown++;
          }
        }
        if (errorCount > 5) {
          console.log(`  ... and ${errorCount - 5} more errors`);
        }
      }
    }
  }
  
  const duration = Date.now() - startTime;
  
  results.push({
    name: check.name,
    success,
    errorCount,
    duration,
    output: output.substring(0, 1000) // Store first 1000 chars
  });
  
  return success;
}

// Run all checks
async function runAllChecks() {
  console.log('\nStarting comprehensive error check...\n');
  
  // Set environment
  process.env.NODE_ENV = 'production';
  process.env.CI = 'true';
  
  let allPassed = true;
  
  for (const check of checks) {
    const passed = runCheck(check);
    if (!passed) allPassed = false;
    
    // Save progress
    fs.writeFileSync(
      'error-check-results.json',
      JSON.stringify(results, null, 2)
    );
  }
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY:');
  console.log('='.repeat(60));
  
  let totalErrors = 0;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const time = (result.duration / 1000).toFixed(1) + 's';
    const errors = result.errorCount > 0 ? ` (${result.errorCount} errors)` : '';
    
    console.log(`${status} ${result.name.padEnd(30)} ${time}${errors}`);
    totalErrors += result.errorCount;
  });
  
  console.log('='.repeat(60));
  
  if (allPassed) {
    console.log('🎉 All checks passed! Your project is error-free!');
  } else {
    console.log(`❌ Total errors found: ${totalErrors}`);
    console.log('\n📝 Detailed results saved to: error-check-results.json');
    console.log('\n🔧 Next steps:');
    console.log('1. Review error-check-results.json for details');
    console.log('2. Fix TypeScript errors first (they often cause other issues)');
    console.log('3. Run this check again after fixes');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run checks
runAllChecks().catch(console.error);