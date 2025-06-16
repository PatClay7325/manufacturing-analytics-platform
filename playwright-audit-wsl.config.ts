import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './audit-tests',
  testMatch: '**/*.spec.ts',
  outputDir: './audit-results',
  
  // Maximum time for the entire audit
  timeout: 60 * 1000, // 60 seconds per test
  
  // WSL-friendly configuration
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  
  // Simple reporting for WSL
  reporter: [
    ['list'],
    ['json', { outputFile: 'audit-results/audit-summary.json' }]
  ],
  
  use: {
    // Base URL for your application
    baseURL: 'http://localhost:3000',
    
    // Minimal trace/video for WSL performance
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    
    // Viewport and device settings
    viewport: { width: 1280, height: 720 },
    
    // Don't fail on console errors - just record them
    ignoreHTTPSErrors: true,
    
    // Headless mode for WSL
    headless: true,
    
    // Additional browser args for WSL
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials'
      ]
    }
  },
  
  // Only test with chromium in WSL
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
  
  // Server should already be running
  webServer: {
    command: 'echo "Using existing server"',
    port: 3000,
    reuseExistingServer: true,
    timeout: 5 * 1000,
  },
});