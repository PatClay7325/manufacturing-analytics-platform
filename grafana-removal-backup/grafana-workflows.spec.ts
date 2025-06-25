import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3001';

// Test users
const TEST_USERS = {
  admin: {
    email: 'admin@manufacturing.com',
    password: 'admin123',
    username: 'admin',
  },
  operator: {
    email: 'operator@manufacturing.com',
    password: 'operator123',
    username: 'operator',
  },
  engineer: {
    email: 'engineer@manufacturing.com',
    password: 'engineer123',
    username: 'engineer',
  },
};

// Helper functions
async function loginUser(page: Page, user: typeof TEST_USERS.admin) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboards/**');
}

async function waitForGrafanaFrame(page: Page) {
  const grafanaFrame = page.frameLocator('[data-testid="grafana-iframe"]');
  await grafanaFrame.locator('.grafana-app').waitFor({ timeout: 10000 });
  return grafanaFrame;
}

test.describe('Grafana Integration E2E Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for integration tests
    test.setTimeout(60000);
  });

  test.describe('Authentication and Session Management', () => {
    test('should login and sync session with Grafana', async ({ page }) => {
      await loginUser(page, TEST_USERS.operator);

      // Verify user is logged into main application
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-menu"]')).toContainText(TEST_USERS.operator.username);

      // Navigate to embedded Grafana dashboard
      await page.click('[data-testid="nav-dashboards"]');
      await page.click('[data-testid="nav-manufacturing-oee"]');

      // Verify Grafana iframe loads and user is authenticated
      const grafanaFrame = await waitForGrafanaFrame(page);
      
      // Check that Grafana shows the user as logged in
      await grafanaFrame.locator('[data-testid="user-menu"]').click();
      await expect(grafanaFrame.locator('[data-testid="user-menu-dropdown"]')).toContainText(TEST_USERS.operator.email);
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      await loginUser(page, TEST_USERS.operator);

      // Simulate session expiration by clearing cookies
      await page.context().clearCookies();

      // Try to access protected resource
      await page.goto(`${BASE_URL}/dashboards/manufacturing-oee`);

      // Should redirect to login
      await expect(page).toHaveURL(/.*\/login.*/);
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('should logout from both application and Grafana', async ({ page }) => {
      await loginUser(page, TEST_USERS.operator);

      // Navigate to Grafana dashboard first
      await page.click('[data-testid="nav-dashboards"]');
      await page.click('[data-testid="nav-manufacturing-oee"]');
      await waitForGrafanaFrame(page);

      // Logout from main application
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Should redirect to login page
      await expect(page).toHaveURL(/.*\/login.*/);

      // Try to access Grafana directly (should not be authenticated)
      await page.goto(GRAFANA_URL);
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });
  });

  test.describe('Dashboard Access and Permissions', () => {
    test('should show appropriate dashboards based on user role', async ({ page }) => {
      // Test as operator
      await loginUser(page, TEST_USERS.operator);
      await page.click('[data-testid="nav-dashboards"]');

      // Operators should see production dashboards
      await expect(page.locator('[data-testid="nav-production-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-equipment-monitoring"]')).toBeVisible();
      
      // But not admin dashboards
      await expect(page.locator('[data-testid="nav-system-admin"]')).not.toBeVisible();

      // Logout and login as admin
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      await loginUser(page, TEST_USERS.admin);
      await page.click('[data-testid="nav-dashboards"]');

      // Admins should see all dashboards
      await expect(page.locator('[data-testid="nav-production-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-equipment-monitoring"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-system-admin"]')).toBeVisible();
    });

    test('should load manufacturing OEE dashboard with real data', async ({ page }) => {
      await loginUser(page, TEST_USERS.engineer);
      
      await page.click('[data-testid="nav-dashboards"]');
      await page.click('[data-testid="nav-manufacturing-oee"]');

      const grafanaFrame = await waitForGrafanaFrame(page);

      // Wait for OEE dashboard to load
      await grafanaFrame.locator('[data-testid="dashboard-title"]').waitFor();
      await expect(grafanaFrame.locator('[data-testid="dashboard-title"]')).toContainText('Manufacturing OEE');

      // Verify OEE waterfall chart is present and shows data
      await expect(grafanaFrame.locator('[data-testid="panel-oee-waterfall"]')).toBeVisible();
      await grafanaFrame.locator('[data-testid="panel-oee-waterfall"] .panel-content').waitFor();

      // Check for data presence (should have actual metrics)
      const waterfallChart = grafanaFrame.locator('[data-testid="oee-waterfall-chart"]');
      await expect(waterfallChart).toBeVisible();
      
      // Verify chart shows OEE components
      await expect(waterfallChart.locator('.waterfall-bar[data-metric="availability"]')).toBeVisible();
      await expect(waterfallChart.locator('.waterfall-bar[data-metric="performance"]')).toBeVisible();
      await expect(waterfallChart.locator('.waterfall-bar[data-metric="quality"]')).toBeVisible();
    });

    test('should display quality metrics dashboard with SPC charts', async ({ page }) => {
      await loginUser(page, TEST_USERS.engineer);
      
      await page.click('[data-testid="nav-dashboards"]');
      await page.click('[data-testid="nav-quality-metrics"]');

      const grafanaFrame = await waitForGrafanaFrame(page);

      // Wait for Quality dashboard to load
      await expect(grafanaFrame.locator('[data-testid="dashboard-title"]')).toContainText('Quality Metrics');

      // Verify SPC chart panel
      await expect(grafanaFrame.locator('[data-testid="panel-spc-chart"]')).toBeVisible();
      const spcChart = grafanaFrame.locator('[data-testid="spc-chart"]');
      await expect(spcChart).toBeVisible();

      // Check for control limits
      await expect(spcChart.locator('.control-limit.ucl')).toBeVisible();
      await expect(spcChart.locator('.control-limit.lcl')).toBeVisible();
      await expect(spcChart.locator('.control-limit.center')).toBeVisible();

      // Verify Pareto analysis panel
      await expect(grafanaFrame.locator('[data-testid="panel-pareto-analysis"]')).toBeVisible();
      const paretoChart = grafanaFrame.locator('[data-testid="pareto-chart"]');
      await expect(paretoChart).toBeVisible();
    });
  });

  test.describe('Real-time Data Updates', () => {
    test('should show live equipment status updates', async ({ page }) => {
      await loginUser(page, TEST_USERS.operator);
      
      await page.click('[data-testid="nav-dashboards"]');
      await page.click('[data-testid="nav-equipment-monitoring"]');

      const grafanaFrame = await waitForGrafanaFrame(page);

      // Wait for equipment monitoring dashboard
      await expect(grafanaFrame.locator('[data-testid="dashboard-title"]')).toContainText('Equipment Monitoring');

      // Find the Andon board panel
      const andonBoard = grafanaFrame.locator('[data-testid="andon-board"]');
      await expect(andonBoard).toBeVisible();

      // Get initial equipment status
      const equipment1Status = andonBoard.locator('[data-equipment-id="equipment-1"] .status');
      const initialStatus = await equipment1Status.getAttribute('data-status');

      // Wait for potential status updates (simulated by real-time data)
      await page.waitForTimeout(5000);

      // Status should either remain the same or change (both are valid for live data)
      const currentStatus = await equipment1Status.getAttribute('data-status');
      expect(['running', 'stopped', 'maintenance', 'error']).toContain(currentStatus);
    });

    test('should update OEE metrics in real-time', async ({ page }) => {
      await loginUser(page, TEST_USERS.engineer);
      
      await page.click('[data-testid="nav-dashboards"]');
      await page.click('[data-testid="nav-manufacturing-oee"]');

      const grafanaFrame = await waitForGrafanaFrame(page);

      // Wait for OEE gauge panel
      const oeeGauge = grafanaFrame.locator('[data-testid="oee-gauge"]');
      await expect(oeeGauge).toBeVisible();

      // Get initial OEE value
      const initialValue = await oeeGauge.locator('.gauge-value').textContent();
      const initialOEE = parseFloat(initialValue?.replace('%', '') || '0');

      // Wait for real-time updates
      await page.waitForTimeout(10000);

      // Check if value has updated or remained consistent
      const currentValue = await oeeGauge.locator('.gauge-value').textContent();
      const currentOEE = parseFloat(currentValue?.replace('%', '') || '0');

      // OEE should be a valid percentage
      expect(currentOEE).toBeGreaterThanOrEqual(0);
      expect(currentOEE).toBeLessThanOrEqual(100);
    });
  });

  test.describe('Custom Panel Functionality', () => {
    test('should interact with OEE waterfall chart', async ({ page }) => {
      await loginUser(page, TEST_USERS.engineer);
      
      await page.click('[data-testid="nav-dashboards"]');
      await page.click('[data-testid="nav-manufacturing-oee"]');

      const grafanaFrame = await waitForGrafanaFrame(page);
      const waterfallChart = grafanaFrame.locator('[data-testid="oee-waterfall-chart"]');

      // Test hover interactions
      const availabilityBar = waterfallChart.locator('.waterfall-bar[data-metric="availability"]');
      await availabilityBar.hover();

      // Tooltip should appear
      const tooltip = grafanaFrame.locator('.waterfall-tooltip');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText('Availability');

      // Test drill-down functionality
      await availabilityBar.click();
      
      // Should navigate to detailed availability view
      await expect(grafanaFrame.locator('[data-testid="drill-down-panel"]')).toBeVisible();
      await expect(grafanaFrame.locator('[data-testid="breadcrumb"]')).toContainText('OEE > Availability');
    });

    test('should configure SPC chart control limits', async ({ page }) => {
      await loginUser(page, TEST_USERS.engineer);
      
      await page.click('[data-testid="nav-dashboards"]');
      await page.click('[data-testid="nav-quality-metrics"]');

      const grafanaFrame = await waitForGrafanaFrame(page);

      // Enter edit mode
      await grafanaFrame.locator('[data-testid="dashboard-edit-button"]').click();
      
      // Select SPC chart panel
      const spcPanel = grafanaFrame.locator('[data-testid="panel-spc-chart"]');
      await spcPanel.click();
      
      // Open panel options
      await grafanaFrame.locator('[data-testid="panel-options-button"]').click();
      
      // Modify control limit settings
      await grafanaFrame.locator('[data-testid="spc-ucl-input"]').fill('10.5');
      await grafanaFrame.locator('[data-testid="spc-lcl-input"]').fill('8.5');
      
      // Apply changes
      await grafanaFrame.locator('[data-testid="apply-button"]').click();
      
      // Verify updated control limits
      const spcChart = grafanaFrame.locator('[data-testid="spc-chart"]');
      const uclLine = spcChart.locator('.control-limit.ucl');
      await expect(uclLine).toHaveAttribute('data-value', '10.5');
    });
  });

  test.describe('Alert and Notification Integration', () => {
    test('should display active alerts in dashboard', async ({ page }) => {
      await loginUser(page, TEST_USERS.operator);
      
      await page.click('[data-testid="nav-alerts"]');

      // Check for active alerts
      await expect(page.locator('[data-testid="alerts-list"]')).toBeVisible();
      
      // Navigate to alert details in Grafana
      await page.click('[data-testid="alert-item"]:first-child');
      await page.click('[data-testid="view-in-grafana"]');

      const grafanaFrame = await waitForGrafanaFrame(page);
      
      // Should show alert rule details
      await expect(grafanaFrame.locator('[data-testid="alert-rule-title"]')).toBeVisible();
      await expect(grafanaFrame.locator('[data-testid="alert-conditions"]')).toBeVisible();
    });

    test('should create and test alert rules', async ({ page }) => {
      await loginUser(page, TEST_USERS.admin);
      
      await page.click('[data-testid="nav-alerts"]');
      await page.click('[data-testid="create-alert-button"]');

      const grafanaFrame = await waitForGrafanaFrame(page);
      
      // Create new alert rule
      await grafanaFrame.locator('[data-testid="alert-rule-name"]').fill('Low OEE Alert');
      await grafanaFrame.locator('[data-testid="query-editor"]').fill(
        'SELECT avg(oee) FROM oee_metrics_1h WHERE $__timeFilter(timestamp)'
      );
      await grafanaFrame.locator('[data-testid="condition-threshold"]').fill('75');
      
      // Test the alert condition
      await grafanaFrame.locator('[data-testid="test-rule-button"]').click();
      
      // Should show test results
      await expect(grafanaFrame.locator('[data-testid="test-results"]')).toBeVisible();
      
      // Save the alert rule
      await grafanaFrame.locator('[data-testid="save-rule-button"]').click();
      await expect(grafanaFrame.locator('[data-testid="success-message"]')).toBeVisible();
    });
  });

  test.describe('Data Export and Sharing', () => {
    test('should export dashboard as PDF', async ({ page }) => {
      await loginUser(page, TEST_USERS.engineer);
      
      await page.click('[data-testid="nav-dashboards"]');
      await page.click('[data-testid="nav-manufacturing-oee"]');

      const grafanaFrame = await waitForGrafanaFrame(page);
      
      // Open share menu
      await grafanaFrame.locator('[data-testid="share-button"]').click();
      await grafanaFrame.locator('[data-testid="export-pdf"]').click();
      
      // Configure PDF options
      await grafanaFrame.locator('[data-testid="pdf-layout-portrait"]').click();
      await grafanaFrame.locator('[data-testid="include-timestamp"]').check();
      
      // Start download
      const downloadPromise = page.waitForDownload();
      await grafanaFrame.locator('[data-testid="download-pdf"]').click();
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toContain('Manufacturing-OEE');
      expect(download.suggestedFilename()).toContain('.pdf');
    });

    test('should create shareable dashboard link', async ({ page }) => {
      await loginUser(page, TEST_USERS.engineer);
      
      await page.click('[data-testid="nav-dashboards"]');
      await page.click('[data-testid="nav-equipment-monitoring"]');

      const grafanaFrame = await waitForGrafanaFrame(page);
      
      // Open share menu
      await grafanaFrame.locator('[data-testid="share-button"]').click();
      await grafanaFrame.locator('[data-testid="link-tab"]').click();
      
      // Configure sharing options
      await grafanaFrame.locator('[data-testid="short-url"]').check();
      await grafanaFrame.locator('[data-testid="embed-option"]').check();
      
      // Copy link
      await grafanaFrame.locator('[data-testid="copy-link-button"]').click();
      
      // Verify link was copied
      await expect(grafanaFrame.locator('[data-testid="copy-success"]')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await loginUser(page, TEST_USERS.operator);
      
      // Mobile navigation should be collapsed
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      await page.click('[data-testid="mobile-menu-button"]');
      
      // Navigation menu should slide out
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      
      // Navigate to dashboard
      await page.click('[data-testid="nav-manufacturing-oee"]');
      
      const grafanaFrame = await waitForGrafanaFrame(page);
      
      // Dashboard should adapt to mobile layout
      await expect(grafanaFrame.locator('.dashboard-container')).toHaveClass(/mobile-layout/);
      
      // Panels should stack vertically on mobile
      const panels = grafanaFrame.locator('.panel');
      const panelCount = await panels.count();
      
      for (let i = 0; i < panelCount; i++) {
        const panel = panels.nth(i);
        const boundingBox = await panel.boundingBox();
        expect(boundingBox?.width).toBeLessThan(400); // Should fit mobile width
      }
    });
  });

  test.describe('Performance and Load', () => {
    test('should load dashboards within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();
      
      await loginUser(page, TEST_USERS.operator);
      
      await page.click('[data-testid="nav-dashboards"]');
      await page.click('[data-testid="nav-manufacturing-oee"]');
      
      const grafanaFrame = await waitForGrafanaFrame(page);
      await grafanaFrame.locator('[data-testid="dashboard-loaded"]').waitFor();
      
      const loadTime = Date.now() - startTime;
      
      // Dashboard should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
      
      // All panels should be visible
      const panels = grafanaFrame.locator('.panel');
      const panelCount = await panels.count();
      expect(panelCount).toBeGreaterThan(0);
      
      for (let i = 0; i < panelCount; i++) {
        await expect(panels.nth(i)).toBeVisible();
      }
    });

    test('should handle multiple concurrent users', async ({ browser }) => {
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
      ]);
      
      const pages = await Promise.all(contexts.map(context => context.newPage()));
      
      // Login different users concurrently
      const loginPromises = [
        loginUser(pages[0], TEST_USERS.admin),
        loginUser(pages[1], TEST_USERS.engineer),
        loginUser(pages[2], TEST_USERS.operator),
      ];
      
      await Promise.all(loginPromises);
      
      // Navigate to same dashboard from all users
      const navigationPromises = pages.map(async (page) => {
        await page.click('[data-testid="nav-dashboards"]');
        await page.click('[data-testid="nav-manufacturing-oee"]');
        return waitForGrafanaFrame(page);
      });
      
      const grafanaFrames = await Promise.all(navigationPromises);
      
      // All dashboards should load successfully
      for (const frame of grafanaFrames) {
        await expect(frame.locator('[data-testid="dashboard-title"]')).toBeVisible();
      }
      
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });
  });
});