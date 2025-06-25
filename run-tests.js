#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Manufacturing Analytics Platform
 * This is the main test runner that replaces all other test scripts
 */

const { spawn } = require('child_process');
const path = require('path');

// Command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';
const watch = args.includes('--watch');
const coverage = args.includes('--coverage');

// Test configurations
const testConfigs = {
  unit: {
    name: 'Unit Tests',
    pattern: 'src/__tests__/lib src/__tests__/utils',
    timeout: 30000
  },
  components: {
    name: 'Component Tests',
    pattern: 'src/__tests__/components',
    timeout: 30000
  },
  integration: {
    name: 'Integration Tests',
    pattern: 'src/__tests__/integration',
    timeout: 60000
  },
  all: {
    name: 'All Tests',
    pattern: '',
    timeout: 120000
  }
};

// Get test configuration
const config = testConfigs[testType];
if (!config) {
  console.log(`
📋 Manufacturing Analytics Platform - Test Runner

Usage: node run-tests.js [test-type] [options]

Test Types:
  all         - Run all tests (default)
  unit        - Run unit tests only
  components  - Run component tests only
  integration - Run integration tests only

Options:
  --watch     - Run tests in watch mode
  --coverage  - Generate coverage report

Examples:
  node run-tests.js              # Run all tests
  node run-tests.js unit         # Run unit tests only
  node run-tests.js --watch      # Run all tests in watch mode
  node run-tests.js unit --coverage  # Run unit tests with coverage
`);
  process.exit(0);
}

// Build command
const vitestArgs = ['vitest'];

if (!watch) {
  vitestArgs.push('run');
}

if (config.pattern) {
  vitestArgs.push(config.pattern);
}

if (coverage) {
  vitestArgs.push('--coverage');
}

vitestArgs.push('--reporter=default');

// Set environment
process.env.NODE_ENV = 'test';
process.env.NODE_OPTIONS = '--max-old-space-size=2048';

console.log(`
🧪 Running ${config.name}
${'─'.repeat(50)}
Command: npx ${vitestArgs.join(' ')}
Timeout: ${config.timeout / 1000}s
`);

// Run tests
const testProcess = spawn('npx', vitestArgs, {
  stdio: 'inherit',
  env: process.env
});

// Set timeout
let timeoutId;
if (!watch) {
  timeoutId = setTimeout(() => {
    console.log(`\n⏱️  Test timeout after ${config.timeout / 1000}s`);
    testProcess.kill('SIGTERM');
    process.exit(1);
  }, config.timeout);
}

// Handle exit
testProcess.on('close', (code) => {
  if (timeoutId) clearTimeout(timeoutId);
  
  if (code === 0) {
    console.log('\n✅ Tests completed successfully!');
  } else {
    console.log(`\n❌ Tests failed with code ${code}`);
  }
  
  process.exit(code);
});

// Handle errors
testProcess.on('error', (err) => {
  console.error('Failed to start test process:', err);
  process.exit(1);
});