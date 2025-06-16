import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './audit-tests',
  testMatch: '**/*.spec.ts',
  outputDir: './audit-results',
  
  // Maximum time for the entire audit
  timeout: 60 * 1000, // 60 seconds per test
  
  // Fail fast - continue even if tests fail to get full audit
  fullyParallel: true,
  forbidOnly: true,
  retries: 0, // No retries - we want to see all failures
  workers: 4,
  
  // Detailed reporting
  reporter: [
    ['html', { outputFolder: 'audit-report', open: 'never' }],
    ['json', { outputFile: 'audit-results/audit-summary.json' }],
    ['list'],
    ['junit', { outputFile: 'audit-results/junit-report.xml' }]
  ],
  
  use: {
    // Base URL for your application
    baseURL: 'http://localhost:3000',
    
    // Collect trace for debugging
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Viewport and device settings
    viewport: { width: 1280, height: 720 },
    
    // Don't fail on console errors - just record them
    ignoreHTTPSErrors: true,
  },
  
  // Test against multiple browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  
  // Run local dev server before tests
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});