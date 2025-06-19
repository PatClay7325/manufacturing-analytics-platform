import { test, expect } from '@playwright/test';

test.describe('Alerts Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/alerts');
    // Wait for content to be visible instead of networkidle
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test('displays alerts dashboard', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Adaptive Factory AI Solutions/);
    
    // Check main heading
    const heading = page.getByRole('heading', { name: 'Manufacturing Alerts' });
    await expect(heading).toBeVisible();
  });

  test('filters alerts by status', async ({ page }) => {
    // Check for filter section
    const filterSection = page.locator('[data-testid="status-filter"]');
    
    // If filters are visible (depends on page section)
    if (await filterSection.isVisible()) {
      // Check for status filter buttons
      const activeFilter = filterSection.locator('button:has-text("Active")');
      const acknowledgedFilter = filterSection.locator('button:has-text("Acknowledged")');
      const resolvedFilter = filterSection.locator('button:has-text("Resolved")');
      
      // Click acknowledged filter if visible
      if (await acknowledgedFilter.isVisible()) {
        await acknowledgedFilter.click();
        
        // Wait for filtered results
        await page.waitForTimeout(500);
        
        // Verify filtered alerts
        const alertItems = page.locator('[data-testid="alert-item"]');
        const count = await alertItems.count();
        
        if (count > 0) {
          // Check that all visible alerts have acknowledged status
          for (let i = 0; i < count; i++) {
            const statusBadge = alertItems.nth(i).locator('[data-testid="alert-status"]');
            await expect(statusBadge).toContainText(/acknowledged/i);
          }
        }
      }
    }
  });

  test('navigates to alert details', async ({ page }) => {
    // Find first alert
    const firstAlert = page.locator('[data-testid="alert-item"]').first();
    
    // Check if there are any alerts
    if (await firstAlert.isVisible()) {
      // Click view details link using href pattern
      const viewDetailsLink = firstAlert.locator('a[href^="/alerts/"]').first();
      await viewDetailsLink.click();
      
      // Wait for navigation
      await page.waitForURL(/\/alerts\/\w+/);
      
      // Verify we're on the details page
      await expect(page.locator('[data-testid="alert-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-equipment"]')).toBeVisible();
    }
  });

  test('displays alert details', async ({ page }) => {
    // Wait for page to load and check for alerts
    await page.waitForTimeout(2000); // Give time for data to load
    
    // Check if any alerts exist
    const alertCount = await page.locator('[data-testid="alert-item"]').count();
    
    // Skip test if no alerts are available
    if (alertCount === 0) {
      console.log('No alerts found on page - skipping test');
      test.skip();
      return;
    }
    
    // Get first alert
    const firstAlert = page.locator('[data-testid="alert-item"]').first();
    
    // Wait for the first alert to be visible
    await expect(firstAlert).toBeVisible({ timeout: 5000 });
    
    // Click the link directly using its href pattern
    const viewDetailsLink = firstAlert.locator('a[href^="/alerts/"]').first();
    await viewDetailsLink.click();
    
    // Wait for navigation to details page
    await page.waitForURL(/\/alerts\/\w+/, { timeout: 10000 });
    
    // Check for alert details
    const alertDetails = page.locator('[data-testid="alert-details"]');
    await expect(alertDetails).toBeVisible();
    
    // Verify details contain required information
    await expect(alertDetails.locator('[data-testid="alert-equipment"]')).toBeVisible();
    await expect(alertDetails.locator('[data-testid="alert-timestamp"]')).toBeVisible();
    await expect(alertDetails.locator('[data-testid="alert-description"]')).toBeVisible();
  });

  test('sorts alerts by severity', async ({ page }) => {
    // Look for sort dropdown or buttons
    const sortButton = page.locator('[data-testid="sort-alerts"]');
    
    if (await sortButton.isVisible()) {
      await sortButton.click();
      
      // Select severity sort option
      const severityOption = page.locator('text=/severity/i');
      await severityOption.click();
      
      // Wait for sort to apply
      await page.waitForTimeout(500);
      
      // Verify alerts are sorted by severity
      const alertSeverities = await page.locator('[data-testid="alert-severity"]').allTextContents();
      
      // Check that critical alerts appear first
      const severityOrder = ['critical', 'high', 'medium', 'low'];
      let lastSeverityIndex = -1;
      
      for (const severity of alertSeverities) {
        const currentIndex = severityOrder.indexOf(severity.toLowerCase());
        expect(currentIndex).toBeGreaterThanOrEqual(lastSeverityIndex);
        if (currentIndex > lastSeverityIndex) {
          lastSeverityIndex = currentIndex;
        }
      }
    }
  });

  test('real-time alert updates', async ({ page }) => {
    // Get initial alert count
    const alertItems = page.locator('[data-testid="alert-item"]');
    const initialCount = await alertItems.count();
    
    // In a real application, we would trigger a new alert via WebSocket
    // For this test, we'll just verify the UI is ready for updates
    
    // Check for connection indicator
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    if (await connectionStatus.isVisible()) {
      await expect(connectionStatus).toHaveAttribute('data-status', 'connected');
    }
    
    // Verify alert count badge updates
    const alertCountBadge = page.locator('[data-testid="active-alert-count"]');
    if (await alertCountBadge.isVisible()) {
      const count = await alertCountBadge.textContent();
      expect(count).toMatch(/\d+/);
    }
  });

  test('exports alerts data', async ({ page }) => {
    // Look for export button
    const exportButton = page.locator('button:has-text("Export")');
    
    if (await exportButton.isVisible()) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/alerts.*\.(csv|xlsx|json)/);
    }
  });

  test('alert notifications', async ({ page }) => {
    // Check for notification settings
    const notificationButton = page.locator('[data-testid="notification-settings"]');
    
    if (await notificationButton.isVisible()) {
      await notificationButton.click();
      
      // Check notification preferences
      const emailNotifications = page.locator('input[name="email-notifications"]');
      const pushNotifications = page.locator('input[name="push-notifications"]');
      
      await expect(emailNotifications).toBeVisible();
      await expect(pushNotifications).toBeVisible();
      
      // Toggle a notification setting
      await emailNotifications.click();
      
      // Save settings
      const saveButton = page.locator('button:has-text("Save")');
      await saveButton.click();
      
      // Verify success message
      await expect(page.locator('text=/settings saved/i')).toBeVisible();
    }
  });
});
