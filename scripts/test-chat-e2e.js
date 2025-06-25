#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log('===============================================', colors.cyan);
  log(message, colors.cyan + colors.bold);
  log('===============================================', colors.cyan);
}

async function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', colors.blue);
  
  // Check Node.js
  try {
    const nodeVersion = process.version;
    log(`✅ Node.js ${nodeVersion}`, colors.green);
  } catch (error) {
    log('❌ Node.js not available', colors.red);
    process.exit(1);
  }
  
  // Check if we're in the right directory
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  try {
    require.resolve(packageJsonPath);
    log('✅ Found package.json', colors.green);
  } catch (error) {
    log('❌ package.json not found. Are you in the project root?', colors.red);
    process.exit(1);
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    log(`\n🚀 Running: ${command} ${args.join(' ')}`, colors.blue);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        NEXT_PUBLIC_DEV_AUTO_LOGIN: 'true',
        TEST_MODE: 'e2e',
        ...options.env,
      },
      ...options,
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runTests() {
  logHeader('Chat E2E Tests with Vitest');
  
  await checkPrerequisites();
  
  log('\n📋 Test Suite Overview:', colors.yellow);
  log('  ✅ Authentication and authorization', colors.green);
  log('  ✅ Basic chat functionality', colors.green);
  log('  ✅ Manufacturing-specific queries', colors.green);
  log('  ✅ Streaming responses', colors.green);
  log('  ✅ Conversation context', colors.green);
  log('  ✅ Error handling', colors.green);
  log('  ✅ Performance and reliability', colors.green);
  
  try {
    // Run the E2E tests
    await runCommand('npx', [
      'vitest',
      'run',
      '--config',
      'vitest.e2e.config.ts',
      'tests/e2e/chat.e2e.test.ts',
      '--reporter=verbose'
    ]);
    
    logHeader('✅ ALL CHAT E2E TESTS PASSED!');
    
    log('\n🎉 The chat system is fully functional with:', colors.green);
    log('  ✅ Complete authentication flow', colors.green);
    log('  ✅ Robust error handling', colors.green);
    log('  ✅ Manufacturing domain knowledge', colors.green);
    log('  ✅ Streaming capabilities', colors.green);
    log('  ✅ Context awareness', colors.green);
    log('  ✅ Performance within acceptable limits', colors.green);
    
    log('\n🚀 Chat system is production-ready!', colors.green + colors.bold);
    
  } catch (error) {
    logHeader('❌ SOME TESTS FAILED');
    
    log('\n⚠️ Please review the test output above to identify issues.', colors.yellow);
    log('\nCommon issues:', colors.yellow);
    log('  • Server not running (start with: npm run dev)', colors.red);
    log('  • Ollama not available (start with: ollama serve)', colors.red);
    log('  • Database connection issues', colors.red);
    log('  • Authentication configuration problems', colors.red);
    
    log('\n🔧 Fix the issues and run the tests again.', colors.yellow);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n\n⏹️ Test run interrupted by user', colors.yellow);
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n\n⏹️ Test run terminated', colors.yellow);
  process.exit(0);
});

// Run the tests
runTests().catch((error) => {
  log('\n💥 Fatal error:', colors.red);
  console.error(error);
  process.exit(1);
});