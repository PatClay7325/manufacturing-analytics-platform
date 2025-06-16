#!/usr/bin/env node

// Senior Engineer Framework - Continuous Monitoring Launcher
// 
// This script starts the continuous verification engine to monitor
// and verify code in real-time during development.
// 
// Usage: node start-monitoring.js [--paths=src/**/*.{ts,tsx}] [--ignore=node_modules]

// This is a Node.js script that will be completed with TypeScript when the
// project is built. For now, we're creating a simple launcher that can
// be run directly with Node.js.

const fs = require('fs');
const path = require('path');

console.log('🔍 Senior Engineer Framework v9.0 - Continuous Monitoring');
console.log('='.repeat(60));

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  watchPaths: ['src/**/*.{ts,tsx,js,jsx}'],
  ignorePaths: ['**/node_modules/**', '**/*.test.{ts,tsx,js,jsx}', '**/.git/**'],
  gitMonitoring: true,
  autoFix: false,
  reportingInterval: 3600000 // 1 hour
};

// Parse command line arguments
args.forEach(arg => {
  if (arg.startsWith('--paths=')) {
    options.watchPaths = arg.substring(8).split(',');
  } else if (arg.startsWith('--ignore=')) {
    options.ignorePaths = arg.substring(9).split(',');
  } else if (arg === '--auto-fix') {
    options.autoFix = true;
  } else if (arg === '--no-git') {
    options.gitMonitoring = false;
  } else if (arg.startsWith('--report-interval=')) {
    const interval = parseInt(arg.substring(17), 10);
    if (!isNaN(interval)) {
      options.reportingInterval = interval * 60000; // Convert minutes to ms
    }
  } else if (arg === '--help') {
    console.log('Usage: node start-monitoring.js [options]');
    console.log('\nOptions:');
    console.log('  --paths=src/**/*.{ts,tsx}       Comma-separated glob patterns of files to watch');
    console.log('  --ignore=node_modules          Comma-separated glob patterns of files to ignore');
    console.log('  --auto-fix                     Enable automatic fixing of certain issues');
    console.log('  --no-git                       Disable Git integration');
    console.log('  --report-interval=60           Reporting interval in minutes');
    console.log('  --help                         Show this help message');
    process.exit(0);
  }
});

// Display configuration
console.log('Configuration:');
console.log(`- Watch paths: ${options.watchPaths.join(', ')}`);
console.log(`- Ignore paths: ${options.ignorePaths.join(', ')}`);
console.log(`- Git monitoring: ${options.gitMonitoring ? 'Enabled' : 'Disabled'}`);
console.log(`- Auto-fix: ${options.autoFix ? 'Enabled' : 'Disabled'}`);
console.log(`- Reporting interval: ${options.reportingInterval / 60000} minutes`);
console.log('='.repeat(60));

// Check if the required files exist
const enginePath = path.join(__dirname, '..', 'core', 'ContinuousVerificationEngine.ts');

if (!fs.existsSync(enginePath)) {
  console.error(`❌ Error: Required file not found: ${enginePath}`);
  console.error('Make sure you have the complete Senior Engineer Framework installed.');
  process.exit(1);
}

// We need to compile the TypeScript files first
console.log('🔧 Compiling TypeScript files...');

try {
  // Check if TypeScript is installed
  require.resolve('typescript');
  
  // Create temporary directory for compiled files
  const outDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  // Compile TypeScript files
  const { execSync } = require('child_process');
  
  execSync(`npx tsc --project ${path.join(__dirname, '..', 'tsconfig.json')}`, {
    stdio: 'inherit'
  });
  
  console.log('✅ Compilation successful');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('❌ TypeScript is not installed. Please install it with: npm install typescript');
    process.exit(1);
  }
  
  console.error('❌ Compilation failed:', error.message);
  process.exit(1);
}

// Start the engine
console.log('🚀 Starting continuous verification engine...');

try {
  // Import the compiled engine
  const { ContinuousVerificationEngine } = require('../dist/core/ContinuousVerificationEngine');
  
  // Create and start the engine
  const engine = new ContinuousVerificationEngine(options);
  engine.start();
  
  console.log('✅ Continuous verification engine started');
  console.log('Press Ctrl+C to stop monitoring');
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping continuous verification engine...');
    engine.stop();
    console.log('✅ Continuous verification engine stopped');
    process.exit(0);
  });
} catch (error) {
  console.error('❌ Failed to start continuous verification engine:', error.message);
  process.exit(1);
}