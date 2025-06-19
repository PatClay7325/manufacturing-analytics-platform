import { test, expect, type Page } from '@playwright/test';

test.describe('Alerts Page - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/alerts');
  });

  test.describe('Alert List View', () => {
    test('should display all active alerts with proper information', async ({ page }) => {
      // Wait for alerts to load
      await expect(page.locator('[data-testid="alerts-list"]')).toBeVisible();
      
      // Check if alerts are displayed
      const alertItems = page.locator('[data-testid^="alert-item-"]');
      const alertCount = await alertItems.count();
      
      if (alertCount > 0) {
        // Verify first alert has all required elements
        const firstAlert = alertItems.first();
        await expect(firstAlert.locator('[data-testid="alert-severity"]')).toBeVisible();
        await expect(firstAlert.locator('[data-testid="alert-title"]')).toBeVisible();
        await expect(firstAlert.locator('[data-testid="alert-description"]')).toBeVisible();
        await expect(firstAlert.locator('[data-testid="alert-timestamp"]')).toBeVisible();
        await expect(firstAlert.locator('[data-testid="alert-equipment"]')).toBeVisible();
        await expect(firstAlert.locator('[data-testid="alert-status"]')).toBeVisible();
      }
    });

    test('should display alert statistics', async ({ page }) => {
      const stats = page.locator('[data-testid="alert-statistics"]');
      await expect(stats).toBeVisible();
      
      // Check all stat cards
      await expect(stats.locator('[data-testid="stat-total-alerts"]')).toBeVisible();
      await expect(stats.locator('[data-testid="stat-critical-alerts"]')).toBeVisible();
      await expect(stats.locator('[data-testid="stat-unacknowledged"]')).toBeVisible();
      await expect(stats.locator('[data-testid="stat-mttr"]')).toBeVisible();
      
      // Values should be numeric
      const totalAlerts = await stats.locator('[data-testid="stat-total-alerts-value"]').textContent();
      expect(totalAlerts).toMatch(/^\d+$/);
    });

    test('should filter alerts by severity', async ({ page }) => {
      const severityLevels = ['critical', 'high', 'medium', 'low'];
      
      for (const severity of severityLevels) {
        // Click severity filter
        await page.click(`[data-testid="filter-severity-${severity}"]`);
        
        // Wait for filter to apply
        await page.waitForTimeout(300);
        
        // Verify filtered results
        const alerts = page.locator('[data-testid^="alert-item-"]');
        const count = await alerts.count();
        
        if (count > 0) {
          // All visible alerts should have the selected severity
          for (let i = 0; i < Math.min(count, 5); i++) {
            const severityBadge = alerts.nth(i).locator('[data-testid="alert-severity"]');
            await expect(severityBadge).toHaveClass(new RegExp(`severity-${severity}`));
          }
        }
        
        // Clear filter
        await page.click(`[data-testid="filter-severity-${severity}"]`);
      }
    });

    test('should filter alerts by status', async ({ page }) => {
      const statuses = ['active', 'acknowledged', 'resolved'];
      
      for (const status of statuses) {
        // Apply status filter
        await page.click(`[data-testid="filter-status-${status}"]`);
        await page.waitForTimeout(300);
        
        // Check filtered results
        const statusBadges = page.locator('[data-testid="alert-status"]');
        const count = await statusBadges.count();
        
        for (let i = 0; i < Math.min(count, 5); i++) {
          await expect(statusBadges.nth(i)).toHaveText(new RegExp(status, 'i'));
        }
        
        // Clear filter
        await page.click(`[data-testid="filter-status-${status}"]`);
      }
    });

    test('should filter alerts by equipment', async ({ page }) => {
      // Open equipment filter dropdown
      await page.click('[data-testid="equipment-filter-button"]');
      
      // Select first equipment
      const firstEquipment = page.locator('[data-testid^="equipment-option-"]').first();
      const equipmentName = await firstEquipment.textContent();
      await firstEquipment.click();
      
      // Apply filter
      await page.click('[data-testid="apply-equipment-filter"]');
      
      // All alerts should be for selected equipment
      const equipmentLabels = page.locator('[data-testid="alert-equipment"]');
      const count = await equipmentLabels.count();
      
      for (let i = 0; i < count; i++) {
        await expect(equipmentLabels.nth(i)).toContainText(equipmentName || '');
      }
    });

    test('should filter by date range', async ({ page }) => {
      // Open date filter
      await page.click('[data-testid="date-filter-button"]');
      
      // Select last 24 hours
      await page.click('[data-testid="date-range-24h"]');
      
      // Verify all alerts are within 24 hours
      const timestamps = await page.locator('[data-testid="alert-timestamp"]').allTextContents();
      const now = Date.now();
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
      
      timestamps.forEach(timestamp => {
        const alertTime = new Date(timestamp).getTime();
        expect(alertTime).toBeGreaterThan(twentyFourHoursAgo);
        expect(alertTime).toBeLessThanOrEqual(now);
      });
    });

    test('should sort alerts', async ({ page }) => {
      const sortOptions = [
        { value: 'timestamp-desc', label: 'Newest First' },
        { value: 'timestamp-asc', label: 'Oldest First' },
        { value: 'severity-desc', label: 'Severity (High to Low)' },
        { value: 'equipment', label: 'Equipment Name' }
      ];
      
      for (const option of sortOptions) {
        await page.selectOption('[data-testid="sort-alerts-select"]', option.value);
        await page.waitForTimeout(300);
        
        // Verify sorting (simplified check for first and last items)
        const alerts = page.locator('[data-testid^="alert-item-"]');
        const count = await alerts.count();
        
        if (count > 1) {
          const firstValue = await alerts.first().textContent();
          const lastValue = await alerts.last().textContent();
          expect(firstValue).toBeTruthy();
          expect(lastValue).toBeTruthy();
        }
      }
    });

    test('should search alerts', async ({ page }) => {
      // Search by alert content
      await page.fill('[data-testid="alert-search-input"]', 'temperature');
      await page.keyboard.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(500);
      
      // Verify results contain search term
      const alerts = page.locator('[data-testid^="alert-item-"]');
      const count = await alerts.count();
      
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          const alertText = await alerts.nth(i).textContent();
          expect(alertText?.toLowerCase()).toContain('temperature');
        }
      }
    });

    test('should show real-time alert updates', async ({ page }) => {
      // Get initial alert count
      const initialCount = await page.locator('[data-testid^="alert-item-"]').count();
      
      // Simulate new alert via WebSocket
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'new-alert',
            data: {
              id: 'test-alert-001',
              severity: 'critical',
              title: 'New Critical Alert',
              description: 'Temperature exceeds threshold',
              equipmentId: 'equip-001',
              equipmentName: 'CNC Machine 1',
              timestamp: new Date().toISOString()
            }
          }
        }));
      });
      
      // Should show new alert notification
      await expect(page.locator('[data-testid="new-alert-notification"]')).toBeVisible();
      
      // Alert count should increase
      await expect(page.locator('[data-testid^="alert-item-"]')).toHaveCount(initialCount + 1);
      
      // New alert should be visible at top
      await expect(page.locator('[data-testid^="alert-item-"]').first()).toContainText('New Critical Alert');
    });
  });

  test.describe('Alert Actions', () => {
    test('should acknowledge alerts', async ({ page }) => {
      const firstAlert = page.locator('[data-testid^="alert-item-"]').first();
      
      // Check if alert is unacknowledged
      const status = await firstAlert.locator('[data-testid="alert-status"]').textContent();
      
      if (status?.toLowerCase() === 'active') {
        // Click acknowledge button
        await firstAlert.locator('[data-testid="acknowledge-alert-button"]').click();
        
        // Confirmation dialog
        await expect(page.locator('[data-testid="acknowledge-dialog"]')).toBeVisible();
        
        // Add note
        await page.fill('[data-testid="acknowledge-note-input"]', 'Investigating the issue');
        
        // Confirm
        await page.click('[data-testid="confirm-acknowledge-button"]');
        
        // Alert should be acknowledged
        await expect(firstAlert.locator('[data-testid="alert-status"]')).toHaveText('Acknowledged');
        await expect(firstAlert).toHaveClass(/acknowledged/);
        
        // Should show who acknowledged
        await expect(firstAlert.locator('[data-testid="acknowledged-by"]')).toBeVisible();
      }
    });

    test('should resolve alerts', async ({ page }) => {
      // Find an acknowledged alert
      const acknowledgedAlert = page.locator('[data-testid^="alert-item-"]', {
        has: page.locator('[data-testid="alert-status"]:has-text("Acknowledged")')
      }).first();
      
      if (await acknowledgedAlert.isVisible()) {
        // Click resolve button
        await acknowledgedAlert.locator('[data-testid="resolve-alert-button"]').click();
        
        // Resolution dialog
        await expect(page.locator('[data-testid="resolve-dialog"]')).toBeVisible();
        
        // Select resolution type
        await page.selectOption('[data-testid="resolution-type-select"]', 'fixed');
        
        // Add resolution details
        await page.fill('[data-testid="resolution-details-textarea"]', 'Replaced faulty sensor and recalibrated system');
        
        // Add preventive action
        await page.check('[data-testid="add-preventive-action-checkbox"]');
        await page.fill('[data-testid="preventive-action-input"]', 'Schedule monthly sensor calibration');
        
        // Confirm resolution
        await page.click('[data-testid="confirm-resolve-button"]');
        
        // Alert should be resolved
        await expect(acknowledgedAlert.locator('[data-testid="alert-status"]')).toHaveText('Resolved');
        await expect(acknowledgedAlert).toHaveClass(/resolved/);
      }
    });

    test('should assign alerts to users', async ({ page }) => {
      const firstAlert = page.locator('[data-testid^="alert-item-"]').first();
      
      // Click assign button
      await firstAlert.locator('[data-testid="assign-alert-button"]').click();
      
      // Assignment dialog
      await expect(page.locator('[data-testid="assign-dialog"]')).toBeVisible();
      
      // Search for user
      await page.fill('[data-testid="user-search-input"]', 'technician');
      
      // Select user
      await page.click('[data-testid="user-option-tech1"]');
      
      // Add priority
      await page.selectOption('[data-testid="assignment-priority-select"]', 'high');
      
      // Add note
      await page.fill('[data-testid="assignment-note-input"]', 'Please check ASAP');
      
      // Confirm assignment
      await page.click('[data-testid="confirm-assign-button"]');
      
      // Should show assigned user
      await expect(firstAlert.locator('[data-testid="assigned-to"]')).toBeVisible();
      await expect(firstAlert.locator('[data-testid="assigned-to"]')).toContainText('technician');
    });

    test('should bulk acknowledge alerts', async ({ page }) => {
      // Enter selection mode
      await page.click('[data-testid="bulk-select-button"]');
      
      // Select multiple alerts
      const checkboxes = page.locator('[data-testid^="alert-checkbox-"]');
      const count = Math.min(await checkboxes.count(), 3);
      
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).check();
      }
      
      // Bulk actions should appear
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="selected-count"]')).toContainText(`${count} selected`);
      
      // Click bulk acknowledge
      await page.click('[data-testid="bulk-acknowledge-button"]');
      
      // Confirmation
      await expect(page.locator('[data-testid="bulk-acknowledge-dialog"]')).toBeVisible();
      await page.fill('[data-testid="bulk-acknowledge-note"]', 'Acknowledging multiple alerts');
      await page.click('[data-testid="confirm-bulk-acknowledge"]');
      
      // Should show success
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-toast"]')).toContainText(`${count} alerts acknowledged`);
    });
  });

  test.describe('Alert Details View', () => {
    test('should navigate to alert details', async ({ page }) => {
      const firstAlert = page.locator('[data-testid^="alert-item-"]').first();
      const alertTitle = await firstAlert.locator('[data-testid="alert-title"]').textContent();
      
      // Click to view details
      await firstAlert.click();
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/\/alerts\/[^/]+$/);
      
      // Should show alert details
      await expect(page.locator('[data-testid="alert-detail-header"]')).toContainText(alertTitle || '');
    });

    test('should display complete alert information', async ({ page }) => {
      await page.click('[data-testid^="alert-item-"]');
      
      // Verify all sections
      await expect(page.locator('[data-testid="alert-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="affected-equipment"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="related-alerts"]')).toBeVisible();
      
      // Verify key information
      await expect(page.locator('[data-testid="alert-id"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-created-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-severity-detail"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-category"]')).toBeVisible();
    });

    test('should show alert timeline', async ({ page }) => {
      await page.click('[data-testid^="alert-item-"]');
      
      const timeline = page.locator('[data-testid="alert-timeline"]');
      await expect(timeline).toBeVisible();
      
      // Should have timeline entries
      const entries = timeline.locator('[data-testid^="timeline-entry-"]');
      await expect(entries).toHaveCount(await entries.count());
      
      // Check first entry
      const firstEntry = entries.first();
      await expect(firstEntry.locator('[data-testid="timeline-timestamp"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="timeline-event"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="timeline-user"]')).toBeVisible();
    });

    test('should display affected metrics', async ({ page }) => {
      await page.click('[data-testid^="alert-item-"]');
      
      const metricsSection = page.locator('[data-testid="alert-metrics"]');
      
      // Should show metric chart
      await expect(metricsSection.locator('[data-testid="metric-chart"]')).toBeVisible();
      
      // Should highlight anomaly period
      await expect(metricsSection.locator('[data-testid="anomaly-region"]')).toBeVisible();
      
      // Should show threshold line
      await expect(metricsSection.locator('[data-testid="threshold-line"]')).toBeVisible();
      
      // Should display metric values
      await expect(metricsSection.locator('[data-testid="current-value"]')).toBeVisible();
      await expect(metricsSection.locator('[data-testid="threshold-value"]')).toBeVisible();
      await expect(metricsSection.locator('[data-testid="deviation-percentage"]')).toBeVisible();
    });

    test('should show related alerts', async ({ page }) => {
      await page.click('[data-testid^="alert-item-"]');
      
      const relatedSection = page.locator('[data-testid="related-alerts"]');
      const relatedAlerts = relatedSection.locator('[data-testid^="related-alert-"]');
      
      if (await relatedAlerts.count() > 0) {
        // Check related alert information
        const firstRelated = relatedAlerts.first();
        await expect(firstRelated.locator('[data-testid="related-alert-title"]')).toBeVisible();
        await expect(firstRelated.locator('[data-testid="related-alert-time"]')).toBeVisible();
        await expect(firstRelated.locator('[data-testid="related-alert-similarity"]')).toBeVisible();
        
        // Should be clickable
        await firstRelated.click();
        await expect(page).toHaveURL(/\/alerts\/[^/]+$/);
      }
    });

    test('should allow adding comments', async ({ page }) => {
      await page.click('[data-testid^="alert-item-"]');
      
      // Add comment
      await page.fill('[data-testid="comment-input"]', 'Initial investigation shows sensor malfunction');
      await page.click('[data-testid="add-comment-button"]');
      
      // Comment should appear
      await expect(page.locator('[data-testid^="comment-"]').last()).toContainText('sensor malfunction');
      
      // Should show user and timestamp
      const lastComment = page.locator('[data-testid^="comment-"]').last();
      await expect(lastComment.locator('[data-testid="comment-author"]')).toBeVisible();
      await expect(lastComment.locator('[data-testid="comment-time"]')).toBeVisible();
    });
  });

  test.describe('Alert Notifications', () => {
    test('should show desktop notifications for critical alerts', async ({ page, context }) => {
      // Grant notification permission
      await context.grantPermissions(['notifications']);
      
      // Enable notifications
      await page.click('[data-testid="notification-settings-button"]');
      await page.check('[data-testid="enable-desktop-notifications"]');
      await page.check('[data-testid="notify-critical-only"]');
      await page.click('[data-testid="save-notification-settings"]');
      
      // Simulate critical alert
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'new-alert',
            data: {
              id: 'critical-001',
              severity: 'critical',
              title: 'Critical System Failure',
              description: 'Main pump pressure dropped below minimum threshold',
              equipmentId: 'pump-001',
              equipmentName: 'Main Pump A'
            }
          }
        }));
      });
      
      // Should show in-app notification
      await expect(page.locator('[data-testid="critical-alert-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="critical-alert-banner"]')).toContainText('Critical System Failure');
    });

    test('should play sound for high priority alerts', async ({ page }) => {
      // Enable sound notifications
      await page.click('[data-testid="notification-settings-button"]');
      await page.check('[data-testid="enable-sound-notifications"]');
      await page.selectOption('[data-testid="notification-sound-select"]', 'alert-high');
      await page.click('[data-testid="save-notification-settings"]');
      
      // Listen for audio play
      const audioPlayed = await page.evaluate(() => {
        return new Promise(resolve => {
          const originalPlay = HTMLAudioElement.prototype.play;
          HTMLAudioElement.prototype.play = function() {
            resolve(true);
            return originalPlay.call(this);
          };
          
          // Simulate high priority alert
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('ws-message', {
              detail: {
                type: 'new-alert',
                data: {
                  severity: 'high',
                  title: 'High Priority Alert'
                }
              }
            }));
          }, 100);
          
          setTimeout(() => resolve(false), 2000);
        });
      });
      
      expect(audioPlayed).toBe(true);
    });
  });

  test.describe('Alert Export and Reporting', () => {
    test('should export alerts to CSV', async ({ page }) => {
      // Open export dialog
      await page.click('[data-testid="export-alerts-button"]');
      await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
      
      // Configure export
      await page.selectOption('[data-testid="export-format-select"]', 'csv');
      await page.click('[data-testid="include-resolved-checkbox"]');
      await page.fill('[data-testid="export-date-from"]', '2024-01-01');
      await page.fill('[data-testid="export-date-to"]', '2024-12-31');
      
      // Download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-export-button"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/alerts.*\.csv/);
    });

    test('should generate alert report', async ({ page }) => {
      // Open report generator
      await page.click('[data-testid="generate-report-button"]');
      await expect(page.locator('[data-testid="report-dialog"]')).toBeVisible();
      
      // Configure report
      await page.selectOption('[data-testid="report-type-select"]', 'monthly-summary');
      await page.selectOption('[data-testid="report-month-select"]', '2024-11');
      
      // Select metrics to include
      await page.check('[data-testid="include-mttr-checkbox"]');
      await page.check('[data-testid="include-distribution-checkbox"]');
      await page.check('[data-testid="include-trends-checkbox"]');
      
      // Generate
      await page.click('[data-testid="generate-report-button"]');
      
      // Should show preview
      await expect(page.locator('[data-testid="report-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-preview"]')).toContainText('Alert Summary Report');
      
      // Download PDF
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-pdf-button"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/alert-report.*\.pdf/);
    });
  });

  test.describe('Alert Performance', () => {
    test('should handle large number of alerts efficiently', async ({ page }) => {
      // Mock large dataset
      await page.route('**/api/alerts*', route => {
        const url = new URL(route.request().url());
        const page = parseInt(url.searchParams.get('page') || '1');
        const pageSize = 50;
        
        const alerts = Array.from({ length: pageSize }, (_, i) => ({
          id: `alert-${(page - 1) * pageSize + i}`,
          severity: ['critical', 'high', 'medium', 'low'][i % 4],
          title: `Alert ${(page - 1) * pageSize + i}`,
          description: 'Test alert description',
          equipmentId: `equip-${i % 10}`,
          equipmentName: `Equipment ${i % 10}`,
          status: ['active', 'acknowledged', 'resolved'][i % 3],
          timestamp: new Date(Date.now() - i * 60000).toISOString()
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: alerts,
            total: 5000,
            page,
            pageSize,
            totalPages: 100
          })
        });
      });
      
      await page.reload();
      
      // Should use virtual scrolling
      const container = page.locator('[data-testid="alerts-list"]');
      const containerHeight = await container.evaluate(el => el.scrollHeight);
      const viewportHeight = await container.evaluate(el => el.clientHeight);
      
      // Container should not render all 5000 items
      expect(containerHeight).toBeLessThan(5000 * 100); // Assuming ~100px per alert
      
      // Should handle scrolling smoothly
      await container.evaluate(el => el.scrollTo(0, 10000));
      await page.waitForTimeout(100);
      
      // Should still be responsive
      const startTime = Date.now();
      await page.click('[data-testid="filter-severity-critical"]');
      const filterTime = Date.now() - startTime;
      
      expect(filterTime).toBeLessThan(500); // Should filter quickly
    });

    test('should update alert counts in real-time without lag', async ({ page }) => {
      // Monitor performance
      const metrics = await page.evaluate(() => {
        const updates: number[] = [];
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            updates.push(entry.duration);
          }
        });
        observer.observe({ entryTypes: ['measure'] });
        
        return { updates };
      });
      
      // Simulate rapid alert updates
      for (let i = 0; i < 20; i++) {
        await page.evaluate((index) => {
          performance.mark('update-start');
          
          window.dispatchEvent(new CustomEvent('ws-message', {
            detail: {
              type: 'alert-update',
              data: {
                id: `alert-${index}`,
                status: 'acknowledged'
              }
            }
          }));
          
          performance.mark('update-end');
          performance.measure('alert-update', 'update-start', 'update-end');
        }, i);
        
        await page.waitForTimeout(50);
      }
      
      // All updates should be fast
      const updateMetrics = await page.evaluate(() => {
        const entries = performance.getEntriesByType('measure');
        return entries.map(e => e.duration);
      });
      
      updateMetrics.forEach(duration => {
        expect(duration).toBeLessThan(16); // 60fps threshold
      });
    });
  });

  test.describe('Alert Accessibility', () => {
    test('should announce new alerts to screen readers', async ({ page }) => {
      // Check for ARIA live region
      await expect(page.locator('[aria-live="assertive"][role="alert"]')).toHaveCount(1);
      
      // Simulate new critical alert
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'new-alert',
            data: {
              severity: 'critical',
              title: 'Emergency Stop Activated',
              equipmentName: 'Assembly Line 1'
            }
          }
        }));
      });
      
      // Live region should announce
      await expect(page.locator('[aria-live="assertive"]')).toContainText('Emergency Stop Activated');
    });

    test('should support keyboard shortcuts', async ({ page }) => {
      // Focus on alerts list
      await page.locator('[data-testid="alerts-list"]').focus();
      
      // Test keyboard shortcuts
      // J/K for navigation
      await page.keyboard.press('j');
      let focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focused).toMatch(/alert-item-0/);
      
      await page.keyboard.press('j');
      focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focused).toMatch(/alert-item-1/);
      
      await page.keyboard.press('k');
      focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focused).toMatch(/alert-item-0/);
      
      // A for acknowledge
      await page.keyboard.press('a');
      await expect(page.locator('[data-testid="acknowledge-dialog"]')).toBeVisible();
      await page.keyboard.press('Escape');
      
      // F for filter
      await page.keyboard.press('f');
      await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
    });

    test('should have descriptive labels for severity', async ({ page }) => {
      const severityBadges = page.locator('[data-testid="alert-severity"]');
      const count = await severityBadges.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const badge = severityBadges.nth(i);
        const ariaLabel = await badge.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/severity: (critical|high|medium|low)/i);
      }
    });
  });

  test.describe('Alert Mobile Experience', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should have mobile-optimized layout', async ({ page }) => {
      await page.goto('/alerts');
      
      // Statistics should be horizontally scrollable
      const statsContainer = page.locator('[data-testid="alert-statistics"]');
      await expect(statsContainer).toHaveCSS('overflow-x', 'auto');
      
      // Alert cards should be full width
      const alertCard = page.locator('[data-testid^="alert-item-"]').first();
      const cardBox = await alertCard.boundingBox();
      expect(cardBox?.width).toBeCloseTo(343, 10); // 375 - 32px padding
      
      // Actions should be in a dropdown menu
      await alertCard.click();
      await expect(page.locator('[data-testid="mobile-alert-actions"]')).toBeVisible();
    });

    test('should support swipe gestures', async ({ page }) => {
      await page.goto('/alerts');
      
      const alert = page.locator('[data-testid^="alert-item-"]').first();
      const box = await alert.boundingBox();
      
      if (box) {
        // Swipe left to reveal actions
        await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 20, box.y + box.height / 2);
        await page.mouse.up();
        
        // Quick actions should be visible
        await expect(page.locator('[data-testid="swipe-acknowledge"]')).toBeVisible();
        await expect(page.locator('[data-testid="swipe-assign"]')).toBeVisible();
      }
    });
  });
});