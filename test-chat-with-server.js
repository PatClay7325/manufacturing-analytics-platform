#!/usr/bin/env node
/**
 * Comprehensive Chat E2E Test with Embedded Server
 * Starts the Next.js server and runs tests against it
 */

const { spawn } = require('child_process');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

// Colors for output
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

class ComprehensiveChatTester {
  constructor() {
    this.serverProcess = null;
    this.serverPort = 3000;
    this.baseUrl = `http://localhost:${this.serverPort}`;
    this.testResults = [];
    this.prisma = new PrismaClient();
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      log('🚀 Starting Next.js development server...', colors.cyan);
      
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'development',
          NEXT_PUBLIC_DEV_AUTO_LOGIN: 'true',
          PORT: this.serverPort.toString(),
        },
      });

      let serverReady = false;
      let timeout;

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Ready') || output.includes('started server')) {
          if (!serverReady) {
            serverReady = true;
            clearTimeout(timeout);
            log('✅ Server is ready', colors.green);
            resolve();
          }
        }
        // Log server output for debugging
        if (output.includes('Error') || output.includes('Warning')) {
          log(`Server: ${output.trim()}`, colors.yellow);
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        log(`Server Error: ${error.trim()}`, colors.red);
      });

      this.serverProcess.on('error', (error) => {
        log(`Failed to start server: ${error.message}`, colors.red);
        reject(error);
      });

      // Timeout after 60 seconds
      timeout = setTimeout(() => {
        if (!serverReady) {
          this.serverProcess.kill();
          reject(new Error('Server startup timeout'));
        }
      }, 60000);
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      log('🛑 Stopping server...', colors.cyan);
      this.serverProcess.kill('SIGTERM');
      
      return new Promise((resolve) => {
        this.serverProcess.on('exit', () => {
          log('✅ Server stopped', colors.green);
          resolve();
        });
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (this.serverProcess && !this.serverProcess.killed) {
            this.serverProcess.kill('SIGKILL');
            resolve();
          }
        }, 5000);
      });
    }
  }

  async waitForServer() {
    log('⏳ Waiting for server to be fully ready...', colors.cyan);
    
    for (let i = 0; i < 30; i++) {
      try {
        const response = await this.makeRequest('/api/health-check');
        if (response.status === 200) {
          log('✅ Server is responding', colors.green);
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Server did not become responsive within 60 seconds');
  }

  async makeRequest(path, options = {}) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    
    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: 30000,
      ...options,
    };

    return new Promise((resolve, reject) => {
      const req = http.request(url, requestOptions, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
            json: () => {
              try {
                return JSON.parse(body);
              } catch (e) {
                throw new Error(`Invalid JSON: ${body}`);
              }
            },
          });
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  async test(name, testFn) {
    const startTime = Date.now();
    try {
      log(`\n🧪 Testing: ${name}`, colors.blue);
      await testFn();
      const duration = Date.now() - startTime;
      this.testResults.push({ name, status: 'PASS', duration });
      log(`✅ PASS: ${name} (${duration}ms)`, colors.green);
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({ name, status: 'FAIL', duration, error: error.message });
      log(`❌ FAIL: ${name} (${duration}ms)`, colors.red);
      log(`   Error: ${error.message}`, colors.red);
      return false;
    }
  }

  async runAllTests() {
    log('🚀 Starting Comprehensive Chat System E2E Tests', colors.bold + colors.cyan);
    log('=' . repeat(60), colors.cyan);

    try {
      // Start the server
      await this.startServer();
      await this.waitForServer();

      // Test basic health check
      await this.test('Server Health Check', async () => {
        const response = await this.makeRequest('/api/health-check');
        if (response.status !== 200) {
          throw new Error(`Health check failed with status ${response.status}: ${response.body}`);
        }
        log(`   Health Status: ${response.json().status}`, colors.green);
      });

      // Test database connectivity
      await this.test('Database Connection', async () => {
        await this.prisma.$connect();
        await this.prisma.$queryRaw`SELECT 1`;
        const userCount = await this.prisma.user.count();
        log(`   Database ready with ${userCount} users`, colors.green);
      });

      // Test simple chat without authentication (should fail properly)
      await this.test('Authentication Required Test', async () => {
        const response = await this.makeRequest('/api/chat', {
          method: 'POST',
          body: {
            messages: [{ role: 'user', content: 'This should fail' }],
          },
        });

        if (response.status !== 401) {
          throw new Error(`Expected 401 unauthorized, got ${response.status}: ${response.body}`);
        }
        log(`   ✅ Correctly rejected unauthenticated request`, colors.green);
      });

      // Test authenticated chat
      await this.test('Authenticated Chat Request', async () => {
        const response = await this.makeRequest('/api/chat', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer dev-token',
            'Cookie': 'auth-token=dev-token',
          },
          body: {
            messages: [{ role: 'user', content: 'Hello, how are you?' }],
          },
        });

        if (response.status !== 200) {
          throw new Error(`Chat failed with status ${response.status}: ${response.body}`);
        }

        const data = response.json();
        if (!data.message || !data.message.content) {
          throw new Error('Invalid response format');
        }

        log(`   Response: ${data.message.content.substring(0, 100)}...`, colors.blue);
      });

      // Test manufacturing-specific query
      await this.test('Manufacturing Intelligence Query', async () => {
        const response = await this.makeRequest('/api/chat', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer dev-token',
            'Cookie': 'auth-token=dev-token',
          },
          body: {
            messages: [{ 
              role: 'user', 
              content: 'What is the current OEE for our manufacturing equipment?' 
            }],
          },
        });

        if (response.status !== 200) {
          throw new Error(`Manufacturing query failed with status ${response.status}: ${response.body}`);
        }

        const data = response.json();
        log(`   Manufacturing Response: ${data.message.content.substring(0, 150)}...`, colors.blue);
        
        // Check if the response contains manufacturing context
        if (data.context && data.context.queryAnalysis) {
          log(`   ✅ Query analysis detected: ${data.context.queryAnalysis.detectedPatterns?.join(', ') || 'general'}`, colors.green);
        }
      });

    } finally {
      // Always clean up
      await this.prisma.$disconnect();
      await this.stopServer();
    }
  }

  printSummary() {
    log('\n' + '=' . repeat(60), colors.cyan);
    log('📊 Test Results Summary', colors.bold + colors.cyan);
    log('=' . repeat(60), colors.cyan);

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;

    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      const color = result.status === 'PASS' ? colors.green : colors.red;
      log(`${icon} ${result.name} (${result.duration}ms)`, color);
      
      if (result.error) {
        log(`   Error: ${result.error}`, colors.red);
      }
    });

    log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}`, 
        failed === 0 ? colors.green : colors.red);

    if (failed === 0) {
      log('\n🎉 ALL TESTS PASSED!', colors.green + colors.bold);
      log('🚀 Chat system is fully functional and production-ready!', colors.green);
      return true;
    } else {
      log('\n⚠️ SOME TESTS FAILED', colors.red + colors.bold);
      log('Please review the failures above and fix the issues.', colors.yellow);
      return false;
    }
  }
}

// Main execution
async function main() {
  const tester = new ComprehensiveChatTester();
  
  try {
    await tester.runAllTests();
    const success = tester.printSummary();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`\n💥 Fatal error: ${error.message}`, colors.red);
    await tester.stopServer();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  log('\n\n⏹️ Test interrupted by user', colors.yellow);
  process.exit(0);
});

main();