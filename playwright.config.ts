import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

// Check if we're running in a CI environment
const CI = !!process.env.CI;

// Check if we're running in WSL
const isWSL = (): boolean => {
  try {
    // Check for WSL by looking at environment variables or file system
    if (process.platform === 'win32') {
      return false; // We're on Windows, not WSL
    }
    
    // Only run uname on non-Windows platforms
    if (process.platform === 'linux') {
      const release = execSync('uname -r').toString().toLowerCase();
      return release.includes('microsoft') || release.includes('wsl');
    }
    
    return false;
  } catch {
    return false;
  }
};

// Environment-specific configuration
const isTestEnv = process.env.NODE_ENV === 'test';
const isWslEnv = isWSL();
const skipBrowsers = isWslEnv && !CI;

// Base URL for tests
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Test files pattern
  testMatch: '**/*.spec.ts',
  
  // Maximum time one test can run
  timeout: 30 * 1000,
  
  // Run tests in files in parallel
  fullyParallel: !isWslEnv,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on failure
  retries: isTestEnv ? 0 : 2,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/test-results.json' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL,
    
    // Collect trace when retrying a failed test
    trace: 'on-first-retry',
    
    // Record video on retry
    video: 'on-first-retry',
    
    // Record screenshots on failure
    screenshot: 'only-on-failure',
  },
  
  // Configure projects for different browsers
  projects: skipBrowsers
    ? [{ name: 'chromium-skip-browser', testMatch: /.*\.skip\.spec\.ts/ }]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        
        // Test in mobile viewport
        {
          name: 'mobile-chrome',
          use: { ...devices['Pixel 5'] },
        },
      ],
  
  // Local development server
  webServer: isTestEnv
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 60000,
      },
  
  // Output directory for artifacts
  outputDir: path.join(os.tmpdir(), 'playwright-artifacts'),
});