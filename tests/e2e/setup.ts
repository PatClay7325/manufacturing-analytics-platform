import { beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { createServer } from 'http';

// Global test state
let nextServer: ChildProcess | null = null;
let serverReady = false;

// Check if server is already running
async function isServerRunning(port: number = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(port, () => {
      server.close();
      resolve(false); // Port is available, server not running
    });
    
    server.on('error', () => {
      resolve(true); // Port is in use, server is running
    });
  });
}

// Wait for server to be ready
async function waitForServer(port: number = 3000, maxRetries: number = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/api/test`);
      if (response.ok) {
        console.log('✅ Test server is ready');
        return;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server did not become ready within ${maxRetries} seconds`);
}

// Start Next.js development server
async function startTestServer(): Promise<void> {
  if (await isServerRunning()) {
    console.log('✅ Server is already running');
    serverReady = true;
    return;
  }

  console.log('🚀 Starting Next.js development server for E2E tests...');
  
  nextServer = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NEXT_PUBLIC_DEV_AUTO_LOGIN: 'true',
      PORT: '3000',
    },
  });

  // Handle server output
  nextServer.stdout?.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Ready') || output.includes('started server')) {
      serverReady = true;
    }
    // Log important server messages
    if (output.includes('Error') || output.includes('Warning')) {
      console.log('Server:', output.trim());
    }
  });

  nextServer.stderr?.on('data', (data) => {
    const error = data.toString();
    console.error('Server Error:', error.trim());
  });

  // Wait for server to be ready
  await waitForServer();
}

// Stop test server
async function stopTestServer(): Promise<void> {
  if (nextServer) {
    console.log('🛑 Stopping test server...');
    nextServer.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise<void>((resolve) => {
      nextServer!.on('exit', () => {
        console.log('✅ Test server stopped');
        resolve();
      });
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (nextServer && !nextServer.killed) {
          nextServer.kill('SIGKILL');
          resolve();
        }
      }, 5000);
    });
    
    nextServer = null;
    serverReady = false;
  }
}

// Check required services
async function checkServices(): Promise<void> {
  const services = [];
  
  // Check Ollama
  try {
    const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/version`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json();
      services.push(`✅ Ollama ${data.version}`);
    } else {
      services.push('⚠️ Ollama not responding');
    }
  } catch (error) {
    services.push('❌ Ollama unavailable');
  }
  
  // Check Database
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    services.push(`✅ Database (${userCount} users)`);
    await prisma.$disconnect();
  } catch (error) {
    services.push('❌ Database unavailable');
  }
  
  console.log('📋 Service Status:');
  services.forEach(service => console.log(`  ${service}`));
}

// Global setup
beforeAll(async () => {
  console.log('🔧 Setting up E2E test environment...');
  
  // Check services first
  await checkServices();
  
  // Start test server
  await startTestServer();
  
  console.log('✅ E2E test environment ready');
}, 60000); // 60 second timeout for setup

// Global teardown
afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Stop test server only if we started it
  if (nextServer) {
    await stopTestServer();
  }
  
  console.log('✅ E2E test environment cleaned up');
}, 10000);