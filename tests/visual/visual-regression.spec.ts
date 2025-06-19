import { test, expect } from '@playwright/test';

// Configure visual regression settings
test.use({
  // Consistent viewport for visual tests
  viewport: { width: 1280, height: 720 },
  
  // Disable animations for consistent screenshots
  launchOptions: {
    args: ['--force-prefers-reduced-motion']
  }
});

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations and transitions
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
    
    // Mock dynamic content for consistency
    await page.addInitScript(() => {
      // Mock dates
      const mockDate = new Date('2024-01-15T10:00:00Z');
      Date.prototype.getTime = () => mockDate.getTime();
      Date.now = () => mockDate.getTime();
      
      // Mock random values
      Math.random = () => 0.5;
    });
  });

  test.describe('Page Screenshots', () => {
    test('Dashboard - Full Page', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Wait for all dynamic content
      await page.waitForSelector('[data-testid="kpi-cards-container"]');
      await page.waitForTimeout(1000); // Allow charts to render
      
      await expect(page).toHaveScreenshot('dashboard-full.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [page.locator('[data-testid="timestamp"]')] // Mask dynamic timestamps
      });
    });

    test('Equipment List - Grid View', async ({ page }) => {
      await page.goto('/equipment');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('equipment-grid.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('Equipment List - List View', async ({ page }) => {
      await page.goto('/equipment');
      await page.click('[data-testid="view-list"]');
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('equipment-list.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('Alerts Page', async ({ page }) => {
      await page.goto('/alerts');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('alerts-page.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [page.locator('[data-testid="alert-timestamp"]')]
      });
    });

    test('Manufacturing Chat', async ({ page }) => {
      await page.goto('/manufacturing-chat');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('chat-interface.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Component Screenshots', () => {
    test('KPI Card - All States', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Normal state
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      await expect(kpiCard).toHaveScreenshot('kpi-card-normal.png');
      
      // Hover state
      await kpiCard.hover();
      await expect(kpiCard).toHaveScreenshot('kpi-card-hover.png');
      
      // Loading state
      await page.evaluate(() => {
        const card = document.querySelector('[data-testid="kpi-overall-oee"]');
        card?.classList.add('loading');
      });
      await expect(kpiCard).toHaveScreenshot('kpi-card-loading.png');
      
      // Error state
      await page.evaluate(() => {
        const card = document.querySelector('[data-testid="kpi-overall-oee"]');
        card?.classList.remove('loading');
        card?.classList.add('error');
      });
      await expect(kpiCard).toHaveScreenshot('kpi-card-error.png');
    });

    test('Alert Severity Badges', async ({ page }) => {
      await page.goto('/alerts');
      
      const severities = ['critical', 'high', 'medium', 'low'];
      
      for (const severity of severities) {
        const badge = page.locator(`[data-testid="alert-severity"].severity-${severity}`).first();
        if (await badge.isVisible()) {
          await expect(badge).toHaveScreenshot(`alert-badge-${severity}.png`);
        }
      }
    });

    test('Equipment Status Badges', async ({ page }) => {
      await page.goto('/equipment');
      
      const statuses = ['operational', 'maintenance', 'offline'];
      
      for (const status of statuses) {
        const badge = page.locator(`[data-testid="equipment-status"].status-${status}`).first();
        if (await badge.isVisible()) {
          await expect(badge).toHaveScreenshot(`equipment-status-${status}.png`);
        }
      }
    });

    test('Charts and Visualizations', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(2000); // Allow charts to fully render
      
      // OEE Trend Chart
      const trendChart = page.locator('[data-testid="production-trend-chart"]');
      await expect(trendChart).toHaveScreenshot('chart-production-trend.png');
      
      // OEE Breakdown Chart
      const breakdownChart = page.locator('[data-testid="oee-breakdown-chart"]');
      await expect(breakdownChart).toHaveScreenshot('chart-oee-breakdown.png');
      
      // Equipment Status Chart
      const statusChart = page.locator('[data-testid="equipment-status-chart"]');
      await expect(statusChart).toHaveScreenshot('chart-equipment-status.png');
    });
  });

  test.describe('Dark Mode Visual Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Enable dark mode
      await page.addInitScript(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
      });
    });

    test('Dashboard - Dark Mode', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('dashboard-dark.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('Equipment - Dark Mode', async ({ page }) => {
      await page.goto('/equipment');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('equipment-dark.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('Alerts - Dark Mode', async ({ page }) => {
      await page.goto('/alerts');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('alerts-dark.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('Components - Dark Mode', async ({ page }) => {
      await page.goto('/dashboard');
      
      // KPI Card in dark mode
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      await expect(kpiCard).toHaveScreenshot('kpi-card-dark.png');
      
      // Navigation in dark mode
      const nav = page.locator('[data-testid="main-navigation"]');
      await expect(nav).toHaveScreenshot('navigation-dark.png');
    });
  });

  test.describe('Responsive Design Screenshots', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      test.describe(`${viewport.name} viewport`, () => {
        test.use({ viewport: { width: viewport.width, height: viewport.height } });

        test(`Dashboard - ${viewport.name}`, async ({ page }) => {
          await page.goto('/dashboard');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
          
          await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, {
            fullPage: true,
            animations: 'disabled'
          });
        });

        test(`Equipment - ${viewport.name}`, async ({ page }) => {
          await page.goto('/equipment');
          await page.waitForLoadState('networkidle');
          
          await expect(page).toHaveScreenshot(`equipment-${viewport.name}.png`, {
            fullPage: true,
            animations: 'disabled'
          });
        });

        test(`Alerts - ${viewport.name}`, async ({ page }) => {
          await page.goto('/alerts');
          await page.waitForLoadState('networkidle');
          
          await expect(page).toHaveScreenshot(`alerts-${viewport.name}.png`, {
            fullPage: true,
            animations: 'disabled'
          });
        });
      });
    }
  });

  test.describe('Interactive States', () => {
    test('Form Input States', async ({ page }) => {
      await page.goto('/login');
      
      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');
      
      // Empty state
      await expect(page.locator('form')).toHaveScreenshot('form-empty.png');
      
      // Focused state
      await emailInput.focus();
      await expect(page.locator('form')).toHaveScreenshot('form-focused.png');
      
      // Filled state
      await emailInput.fill('user@example.com');
      await passwordInput.fill('password123');
      await expect(page.locator('form')).toHaveScreenshot('form-filled.png');
      
      // Error state
      await page.click('[data-testid="login-button"]');
      await page.waitForSelector('[data-testid="error-message"]');
      await expect(page.locator('form')).toHaveScreenshot('form-error.png');
    });

    test('Modal States', async ({ page }) => {
      await page.goto('/equipment');
      
      // Open add equipment modal
      await page.click('[data-testid="add-equipment-button"]');
      await page.waitForSelector('[data-testid="add-equipment-form"]');
      
      await expect(page).toHaveScreenshot('modal-add-equipment.png', {
        animations: 'disabled'
      });
    });

    test('Dropdown and Select States', async ({ page }) => {
      await page.goto('/equipment');
      
      // Closed dropdown
      const sortDropdown = page.locator('[data-testid="sort-select"]');
      await expect(sortDropdown).toHaveScreenshot('dropdown-closed.png');
      
      // Open dropdown
      await sortDropdown.click();
      await expect(page.locator('[data-testid="sort-dropdown-container"]')).toHaveScreenshot('dropdown-open.png');
    });
  });

  test.describe('Error States', () => {
    test('404 Page', async ({ page }) => {
      await page.goto('/non-existent-page');
      await expect(page).toHaveScreenshot('404-page.png', {
        fullPage: true
      });
    });

    test('Empty States', async ({ page }) => {
      // Mock empty equipment list
      await page.route('**/api/equipment*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0 })
        });
      });
      
      await page.goto('/equipment');
      await expect(page).toHaveScreenshot('empty-state-equipment.png', {
        fullPage: true
      });
    });

    test('Loading States', async ({ page }) => {
      // Delay API response to capture loading state
      await page.route('**/api/equipment*', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.continue();
      });
      
      await page.goto('/equipment');
      
      // Capture loading state quickly
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('loading-state-equipment.png', {
        fullPage: true
      });
    });
  });

  test.describe('Cross-browser Visual Tests', () => {
    // These would run in different browsers via Playwright config
    test('Critical Components Cross-browser', async ({ page, browserName }) => {
      await page.goto('/dashboard');
      
      // KPI Card across browsers
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      await expect(kpiCard).toHaveScreenshot(`kpi-card-${browserName}.png`);
      
      // Navigation across browsers
      const nav = page.locator('[data-testid="main-navigation"]');
      await expect(nav).toHaveScreenshot(`navigation-${browserName}.png`);
    });
  });

  test.describe('Accessibility Visual Tests', () => {
    test('Focus States', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Tab through focusable elements
      const focusableElements = [
        '[data-testid="dashboard-link"]',
        '[data-testid="equipment-link"]',
        '[data-testid="alerts-link"]',
        '[data-testid="kpi-overall-oee"]'
      ];
      
      for (const selector of focusableElements) {
        await page.focus(selector);
        const element = page.locator(selector);
        await expect(element).toHaveScreenshot(`focus-state-${selector.replace(/[\[\]="]/g, '-')}.png`);
      }
    });

    test('High Contrast Mode', async ({ page }) => {
      // Enable high contrast
      await page.addInitScript(() => {
        document.documentElement.classList.add('high-contrast');
      });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('dashboard-high-contrast.png', {
        fullPage: true
      });
    });
  });
});

// Visual regression test configuration
export const visualConfig = {
  // Update snapshots with: npx playwright test --update-snapshots
  use: {
    // Threshold for pixel differences (0-1)
    threshold: 0.2,
    
    // Maximum allowed pixel difference
    maxDiffPixels: 100,
    
    // Animation handling
    animations: 'disabled',
    
    // Screenshot options
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    }
  },
  
  // Store snapshots in a dedicated directory
  snapshotDir: './tests/visual/snapshots',
  
  // Different snapshots for different platforms
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-{testName}/{projectName}-{platform}{ext}'
};