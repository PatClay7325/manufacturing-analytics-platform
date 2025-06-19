import { test, expect, type Page } from '@playwright/test';

test.describe('Dashboard Page - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for dashboard access
    await page.goto('/dashboard');
  });

  test.describe('Page Loading and Performance', () => {
    test('should load within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 second budget
      
      // Check Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise(resolve => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcp = entries.find(e => e.name === 'first-contentful-paint');
            const lcp = entries.find(e => e.entryType === 'largest-contentful-paint');
            resolve({
              fcp: fcp?.startTime,
              lcp: lcp?.startTime
            });
          }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
          
          // Trigger observation
          setTimeout(() => resolve({}), 2000);
        });
      });
      
      // FCP should be under 1.8s
      if (metrics.fcp) expect(metrics.fcp).toBeLessThan(1800);
      
      // LCP should be under 2.5s
      if (metrics.lcp) expect(metrics.lcp).toBeLessThan(2500);
    });

    test('should handle slow network gracefully', async ({ page }) => {
      // Simulate slow 3G
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 1000);
      });
      
      await page.goto('/dashboard');
      
      // Should show loading states
      await expect(page.locator('[data-testid="dashboard-skeleton"]')).toBeVisible();
      
      // Content should eventually load
      await expect(page.locator('[data-testid="kpi-cards-container"]')).toBeVisible({ timeout: 10000 });
    });

    test('should progressively load content', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Critical content should load first
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible({ timeout: 1000 });
      
      // KPIs should load next
      await expect(page.locator('[data-testid="kpi-cards-container"]')).toBeVisible({ timeout: 2000 });
      
      // Charts should lazy load
      const chartObserver = await page.evaluate(() => {
        return new Promise(resolve => {
          const observer = new IntersectionObserver((entries) => {
            const chartEntry = entries.find(e => e.target.hasAttribute('data-testid') && 
              e.target.getAttribute('data-testid')?.includes('chart'));
            if (chartEntry && chartEntry.isIntersecting) {
              resolve(true);
            }
          });
          
          document.querySelectorAll('[data-testid*="chart"]').forEach(el => {
            observer.observe(el);
          });
          
          setTimeout(() => resolve(false), 5000);
        });
      });
      
      expect(chartObserver).toBe(true);
    });
  });

  test.describe('KPI Cards', () => {
    test('should display all required KPI metrics', async ({ page }) => {
      const requiredKPIs = [
        'overall-oee',
        'availability',
        'performance',
        'quality',
        'production-output',
        'active-alerts'
      ];
      
      for (const kpi of requiredKPIs) {
        const kpiCard = page.locator(`[data-testid="kpi-${kpi}"]`);
        await expect(kpiCard).toBeVisible();
        
        // Each KPI should have value, label, and trend
        await expect(kpiCard.locator('[data-testid="kpi-value"]')).toBeVisible();
        await expect(kpiCard.locator('[data-testid="kpi-label"]')).toBeVisible();
        await expect(kpiCard.locator('[data-testid="kpi-trend"]')).toBeVisible();
      }
    });

    test('should update KPIs in real-time', async ({ page }) => {
      // Get initial OEE value
      const initialOEE = await page.locator('[data-testid="kpi-overall-oee"] [data-testid="kpi-value"]').textContent();
      
      // Wait for WebSocket connection
      await page.waitForTimeout(1000);
      
      // Simulate real-time update via WebSocket
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'kpi-update',
            data: { 'overall-oee': { value: 89.5, trend: 'up' } }
          }
        }));
      });
      
      // Value should update
      await expect(page.locator('[data-testid="kpi-overall-oee"] [data-testid="kpi-value"]')).not.toHaveText(initialOEE || '');
    });

    test('should handle KPI loading errors gracefully', async ({ page }) => {
      // Intercept KPI endpoint and return error
      await page.route('**/api/metrics/kpis', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });
      
      await page.reload();
      
      // Should show error state, not crash
      await expect(page.locator('[data-testid="kpi-error-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="kpi-error-message"]')).toContainText(/Unable to load/i);
      
      // Should offer retry
      await page.click('[data-testid="kpi-retry-button"]');
      
      // Remove error intercept
      await page.unroute('**/api/metrics/kpis');
      
      // KPIs should load after retry
      await expect(page.locator('[data-testid="kpi-cards-container"]')).toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Focus first KPI card
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Skip navigation
      
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toContain('kpi-');
      
      // Navigate through KPIs with arrow keys
      await page.keyboard.press('ArrowRight');
      const nextFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(nextFocused).not.toBe(focusedElement);
    });
  });

  test.describe('Charts and Visualizations', () => {
    test('should render all dashboard charts', async ({ page }) => {
      const charts = [
        'production-trend-chart',
        'oee-breakdown-chart',
        'equipment-status-chart',
        'quality-metrics-chart'
      ];
      
      for (const chartId of charts) {
        const chart = page.locator(`[data-testid="${chartId}"]`);
        await expect(chart).toBeVisible();
        
        // Chart should have rendered canvas or svg
        const hasCanvas = await chart.locator('canvas').count() > 0;
        const hasSvg = await chart.locator('svg').count() > 0;
        expect(hasCanvas || hasSvg).toBe(true);
      }
    });

    test('should support chart interactions', async ({ page }) => {
      const chart = page.locator('[data-testid="production-trend-chart"]');
      
      // Hover over data point
      await chart.hover({ position: { x: 100, y: 100 } });
      
      // Tooltip should appear
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
      
      // Click to drill down
      await chart.click({ position: { x: 100, y: 100 } });
      
      // Should show detailed view
      await expect(page.locator('[data-testid="chart-detail-modal"]')).toBeVisible();
    });

    test('should handle chart resize', async ({ page }) => {
      // Set initial viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      
      // Get initial chart size
      const initialSize = await page.locator('[data-testid="production-trend-chart"]').boundingBox();
      
      // Resize viewport
      await page.setViewportSize({ width: 800, height: 600 });
      
      // Chart should resize
      const newSize = await page.locator('[data-testid="production-trend-chart"]').boundingBox();
      expect(newSize?.width).toBeLessThan(initialSize?.width || 0);
    });

    test('should export chart data', async ({ page }) => {
      // Setup download promise before click
      const downloadPromise = page.waitForEvent('download');
      
      // Open chart menu
      await page.click('[data-testid="production-trend-chart"] [data-testid="chart-menu-button"]');
      
      // Click export
      await page.click('[data-testid="export-csv-option"]');
      
      // Verify download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('production-trend');
      expect(download.suggestedFilename()).toContain('.csv');
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt layout for mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // KPIs should stack vertically
      const kpiCards = await page.locator('[data-testid^="kpi-"]').all();
      const firstCardBox = await kpiCards[0].boundingBox();
      const secondCardBox = await kpiCards[1].boundingBox();
      
      // Second card should be below first card
      expect(secondCardBox?.y).toBeGreaterThan((firstCardBox?.y || 0) + (firstCardBox?.height || 0));
      
      // Charts should be full width
      const chartBox = await page.locator('[data-testid="production-trend-chart"]').boundingBox();
      expect(chartBox?.width).toBeCloseTo(375 - 32, 10); // Accounting for padding
    });

    test('should adapt layout for tablet devices', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // KPIs should be in 2 columns
      const kpiCards = await page.locator('[data-testid^="kpi-"]').all();
      const firstCardBox = await kpiCards[0].boundingBox();
      const secondCardBox = await kpiCards[1].boundingBox();
      
      // Cards should be side by side
      expect(secondCardBox?.y).toBeCloseTo(firstCardBox?.y || 0, 5);
    });

    test('should handle orientation change', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      // Switch to landscape
      await page.setViewportSize({ width: 1024, height: 768 });
      
      // Layout should adjust without breaking
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="kpi-cards-container"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      const headings = await page.evaluate(() => {
        const h1s = document.querySelectorAll('h1');
        const h2s = document.querySelectorAll('h2');
        const h3s = document.querySelectorAll('h3');
        return {
          h1Count: h1s.length,
          h2Count: h2s.length,
          h3Count: h3s.length,
          h1Text: Array.from(h1s).map(h => h.textContent),
          h2Text: Array.from(h2s).map(h => h.textContent)
        };
      });
      
      // Should have exactly one h1
      expect(headings.h1Count).toBe(1);
      expect(headings.h1Text[0]).toContain('Dashboard');
      
      // Should have logical h2s
      expect(headings.h2Count).toBeGreaterThan(0);
      expect(headings.h2Text).toContain(expect.stringContaining('Key Performance'));
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Main sections should have labels
      await expect(page.locator('[role="main"]')).toHaveAttribute('aria-label', /Dashboard/i);
      
      // Charts should have descriptions
      const charts = await page.locator('[data-testid$="-chart"]').all();
      for (const chart of charts) {
        const ariaLabel = await chart.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('should announce live updates', async ({ page }) => {
      // Check for live regions
      const liveRegions = await page.locator('[aria-live]').all();
      expect(liveRegions.length).toBeGreaterThan(0);
      
      // Simulate KPI update
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'kpi-update',
            data: { 'overall-oee': { value: 92.3, trend: 'up' } }
          }
        }));
      });
      
      // Live region should update
      await expect(page.locator('[aria-live="polite"]')).toContainText(/updated/i);
    });

    test('should maintain focus visibility', async ({ page }) => {
      // Tab through elements
      await page.keyboard.press('Tab');
      
      // Focus should be visible
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        const styles = window.getComputedStyle(el as Element);
        return {
          hasOutline: styles.outline !== 'none',
          outlineWidth: parseInt(styles.outlineWidth),
          outlineColor: styles.outlineColor
        };
      });
      
      expect(focusedElement.hasOutline || focusedElement.outlineWidth > 0).toBe(true);
    });

    test('should work with screen readers', async ({ page }) => {
      // Check for screen reader only content
      const srOnly = await page.locator('.sr-only').all();
      expect(srOnly.length).toBeGreaterThan(0);
      
      // Important information should be available to screen readers
      const kpiValue = await page.locator('[data-testid="kpi-overall-oee"] [data-testid="kpi-value"]').textContent();
      const kpiLabel = await page.locator('[data-testid="kpi-overall-oee"] .sr-only').textContent();
      
      expect(kpiLabel).toContain('Overall OEE');
      expect(kpiLabel).toContain(kpiValue);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);
      
      await page.reload();
      
      // Should show offline message
      await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-message"]')).toContainText(/offline/i);
      
      // Go back online
      await page.context().setOffline(false);
      
      // Should auto-reconnect
      await expect(page.locator('[data-testid="offline-banner"]')).not.toBeVisible({ timeout: 10000 });
    });

    test('should handle API errors with retry', async ({ page }) => {
      let attempts = 0;
      
      // Fail first 2 attempts
      await page.route('**/api/metrics/kpis', route => {
        attempts++;
        if (attempts <= 2) {
          route.fulfill({ status: 500, body: 'Server Error' });
        } else {
          route.continue();
        }
      });
      
      await page.reload();
      
      // Should show error after retries
      await expect(page.locator('[data-testid="kpi-error-state"]')).toBeVisible();
      
      // Manual retry should work
      await page.click('[data-testid="kpi-retry-button"]');
      
      // Should load successfully on 3rd attempt
      await expect(page.locator('[data-testid="kpi-cards-container"]')).toBeVisible();
    });

    test('should handle malformed data gracefully', async ({ page }) => {
      // Return invalid JSON
      await page.route('**/api/metrics/kpis', route => {
        route.fulfill({ 
          status: 200, 
          body: 'invalid json{]',
          headers: { 'content-type': 'application/json' }
        });
      });
      
      await page.reload();
      
      // Should show error, not crash
      await expect(page.locator('[data-testid="kpi-error-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="kpi-error-message"]')).toContainText(/Invalid data/i);
    });
  });

  test.describe('Data Refresh and Caching', () => {
    test('should refresh data periodically', async ({ page }) => {
      // Monitor API calls
      let apiCallCount = 0;
      await page.route('**/api/metrics/kpis', route => {
        apiCallCount++;
        route.continue();
      });
      
      await page.goto('/dashboard');
      expect(apiCallCount).toBe(1);
      
      // Wait for auto-refresh (assuming 30s interval)
      await page.waitForTimeout(31000);
      
      // Should have made another call
      expect(apiCallCount).toBe(2);
    });

    test('should use cached data when appropriate', async ({ page }) => {
      // First load
      await page.goto('/dashboard');
      
      // Navigate away and back
      await page.goto('/equipment');
      await page.goto('/dashboard');
      
      // Should load instantly from cache
      const startTime = Date.now();
      await expect(page.locator('[data-testid="kpi-cards-container"]')).toBeVisible();
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(500); // Should be nearly instant
    });

    test('should allow manual refresh', async ({ page }) => {
      let apiCalls = 0;
      await page.route('**/api/metrics/**', route => {
        apiCalls++;
        route.continue();
      });
      
      await page.goto('/dashboard');
      const initialCalls = apiCalls;
      
      // Click refresh button
      await page.click('[data-testid="refresh-dashboard-button"]');
      
      // Should trigger new API calls
      await page.waitForTimeout(1000);
      expect(apiCalls).toBeGreaterThan(initialCalls);
      
      // Should show loading state during refresh
      await page.click('[data-testid="refresh-dashboard-button"]');
      await expect(page.locator('[data-testid="refresh-spinner"]')).toBeVisible();
    });
  });

  test.describe('User Preferences', () => {
    test('should remember dashboard layout preferences', async ({ page }) => {
      // Rearrange dashboard widgets
      const firstWidget = page.locator('[data-testid="widget-production"]');
      const secondWidget = page.locator('[data-testid="widget-quality"]');
      
      // Drag and drop to reorder
      await firstWidget.dragTo(secondWidget);
      
      // Reload page
      await page.reload();
      
      // Order should be preserved
      const widgets = await page.locator('[data-testid^="widget-"]').all();
      const firstId = await widgets[0].getAttribute('data-testid');
      expect(firstId).toBe('widget-quality');
    });

    test('should remember time range selection', async ({ page }) => {
      // Select custom time range
      await page.click('[data-testid="time-range-selector"]');
      await page.click('[data-testid="time-range-7d"]');
      
      // Reload page
      await page.reload();
      
      // Time range should be preserved
      await expect(page.locator('[data-testid="time-range-selector"]')).toContainText('Last 7 days');
    });

    test('should sync preferences across tabs', async ({ browser }) => {
      const context = await browser.newContext();
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      try {
        // Load dashboard in both tabs
        await page1.goto('/dashboard');
        await page2.goto('/dashboard');
        
        // Change preference in first tab
        await page1.click('[data-testid="dashboard-settings"]');
        await page1.click('[data-testid="compact-view-toggle"]');
        
        // Should sync to second tab
        await page2.waitForTimeout(1000);
        await expect(page2.locator('[data-testid="dashboard-container"]')).toHaveClass(/compact-view/);
      } finally {
        await context.close();
      }
    });
  });
});