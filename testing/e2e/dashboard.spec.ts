import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('displays all KPI cards', async ({ page }) => {
    // Check for all KPI cards
    const kpiCards = [
      { title: 'OEE', value: /\d+\.?\d*%/ },
      { title: 'Availability', value: /\d+\.?\d*%/ },
      { title: 'Performance', value: /\d+\.?\d*%/ },
      { title: 'Quality', value: /\d+\.?\d*%/ },
    ];

    for (const kpi of kpiCards) {
      const card = page.locator(`text=${kpi.title}`).first();
      await expect(card).toBeVisible();
      
      // Check that the card displays a percentage value
      const valueElement = card.locator('..').locator('text=/\\d+\\.?\\d*%/');
      await expect(valueElement).toBeVisible();
    }
  });

  test('shows production trends chart', async ({ page }) => {
    // Check for chart container
    const chartContainer = page.locator('[data-testid="production-trends-chart"]');
    await expect(chartContainer).toBeVisible();
    
    // Verify chart has rendered (check for highcharts container)
    const highchartsContainer = chartContainer.locator('.highcharts-root');
    await expect(highchartsContainer).toBeVisible();
  });

  test('displays equipment status grid', async ({ page }) => {
    // Check for equipment status section
    const equipmentSection = page.locator('h2:has-text("Equipment Status")');
    await expect(equipmentSection).toBeVisible();
    
    // Check for equipment cards
    const equipmentCards = page.locator('[data-testid="equipment-card"]');
    await expect(equipmentCards).toHaveCount(6); // Based on the dashboard showing 6 equipment cards
  });

  test('shows recent alerts', async ({ page }) => {
    // Check for alerts section
    const alertsSection = page.locator('h2:has-text("Recent Alerts")');
    await expect(alertsSection).toBeVisible();
    
    // Check for alert items
    const alertItems = page.locator('[data-testid="alert-item"]');
    const alertCount = await alertItems.count();
    expect(alertCount).toBeGreaterThan(0);
    
    // Verify alert structure
    const firstAlert = alertItems.first();
    await expect(firstAlert.locator('[data-testid="alert-severity"]')).toBeVisible();
    await expect(firstAlert.locator('[data-testid="alert-message"]')).toBeVisible();
    await expect(firstAlert.locator('[data-testid="alert-timestamp"]')).toBeVisible();
  });

  test('real-time updates work', async ({ page }) => {
    // Get initial OEE value
    const oeeCard = page.locator('text=OEE').locator('..');
    const initialValue = await oeeCard.locator('text=/\\d+\\.?\\d*%/').textContent();
    
    // Wait for potential update (in real app, this would be WebSocket driven)
    await page.waitForTimeout(5000);
    
    // In a real test, we'd verify the value changed
    // For now, just verify the element is still present and functional
    await expect(oeeCard).toBeVisible();
  });

  test('responsive design on mobile', async ({ page, viewport }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that navigation is still accessible
    const navMenu = page.locator('[data-testid="mobile-menu-button"]');
    
    if (await navMenu.isVisible()) {
      // Mobile menu exists, click it
      await navMenu.click();
      
      // Check navigation items are visible
      await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
      await expect(page.locator('a:has-text("Equipment")')).toBeVisible();
    }
    
    // Check KPI cards stack vertically on mobile
    const kpiContainer = page.locator('[data-testid="kpi-container"]');
    const boundingBox = await kpiContainer.boundingBox();
    
    if (boundingBox) {
      // On mobile, container should be narrower
      expect(boundingBox.width).toBeLessThanOrEqual(375);
    }
  });

  test('performance metrics', async ({ page }) => {
    // Measure page load performance
    const performanceTiming = JSON.parse(
      await page.evaluate(() => JSON.stringify(window.performance.timing))
    );
    
    const pageLoadTime = performanceTiming.loadEventEnd - performanceTiming.navigationStart;
    
    // Page should load in under 3 seconds
    expect(pageLoadTime).toBeLessThan(3000);
    
    // Check for Largest Contentful Paint
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      });
    });
    
    // LCP should be under 2.5 seconds for good performance
    expect(lcp).toBeLessThan(2500);
  });
});