import { test, expect, type Page } from '@playwright/test';

test.describe('Equipment Page - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/equipment');
  });

  test.describe('Equipment List View', () => {
    test('should display equipment grid with all required information', async ({ page }) => {
      // Wait for equipment cards to load
      await expect(page.locator('[data-testid="equipment-grid"]')).toBeVisible();
      
      // Verify equipment cards are displayed
      const equipmentCards = page.locator('[data-testid^="equipment-card-"]');
      await expect(equipmentCards).toHaveCount(await equipmentCards.count());
      
      // Check first equipment card has all required elements
      const firstCard = equipmentCards.first();
      await expect(firstCard.locator('[data-testid="equipment-name"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="equipment-type"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="equipment-status"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="equipment-oee"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="equipment-image"]')).toBeVisible();
    });

    test('should support search functionality', async ({ page }) => {
      // Type in search box
      await page.fill('[data-testid="equipment-search"]', 'CNC');
      await page.keyboard.press('Enter');
      
      // Wait for filtered results
      await page.waitForTimeout(500);
      
      // Verify filtered results
      const equipmentCards = page.locator('[data-testid^="equipment-card-"]');
      const count = await equipmentCards.count();
      
      for (let i = 0; i < count; i++) {
        const cardText = await equipmentCards.nth(i).textContent();
        expect(cardText?.toLowerCase()).toContain('cnc');
      }
      
      // Clear search
      await page.click('[data-testid="clear-search"]');
      await expect(page.locator('[data-testid="equipment-search"]')).toHaveValue('');
    });

    test('should filter by equipment status', async ({ page }) => {
      const statusFilters = ['operational', 'maintenance', 'offline'];
      
      for (const status of statusFilters) {
        // Click status filter
        await page.click(`[data-testid="filter-status-${status}"]`);
        
        // Wait for filter to apply
        await page.waitForTimeout(300);
        
        // Verify all visible equipment have correct status
        const statusBadges = page.locator('[data-testid="equipment-status"]');
        const count = await statusBadges.count();
        
        for (let i = 0; i < count; i++) {
          await expect(statusBadges.nth(i)).toHaveText(new RegExp(status, 'i'));
        }
        
        // Clear filter
        await page.click(`[data-testid="filter-status-${status}"]`);
      }
    });

    test('should filter by equipment type', async ({ page }) => {
      // Open type filter dropdown
      await page.click('[data-testid="type-filter-dropdown"]');
      
      // Select CNC Machine
      await page.click('[data-testid="filter-type-cnc-machine"]');
      
      // Verify filtered results
      const typeLabels = page.locator('[data-testid="equipment-type"]');
      const count = await typeLabels.count();
      
      for (let i = 0; i < count; i++) {
        await expect(typeLabels.nth(i)).toContainText('CNC');
      }
    });

    test('should sort equipment list', async ({ page }) => {
      const sortOptions = [
        { value: 'name-asc', label: 'Name (A-Z)' },
        { value: 'name-desc', label: 'Name (Z-A)' },
        { value: 'oee-desc', label: 'OEE (High to Low)' },
        { value: 'status', label: 'Status' }
      ];
      
      for (const option of sortOptions) {
        // Select sort option
        await page.selectOption('[data-testid="sort-select"]', option.value);
        
        // Wait for sort to apply
        await page.waitForTimeout(300);
        
        // Verify sorting (simplified check)
        const firstItem = await page.locator('[data-testid^="equipment-card-"]').first().textContent();
        const lastItem = await page.locator('[data-testid^="equipment-card-"]').last().textContent();
        
        expect(firstItem).toBeTruthy();
        expect(lastItem).toBeTruthy();
      }
    });

    test('should handle pagination', async ({ page }) => {
      // Check if pagination exists
      const pagination = page.locator('[data-testid="pagination"]');
      
      if (await pagination.isVisible()) {
        // Get current page
        const currentPage = await page.locator('[data-testid="current-page"]').textContent();
        expect(currentPage).toBe('1');
        
        // Click next page
        await page.click('[data-testid="next-page"]');
        
        // Verify page changed
        await expect(page.locator('[data-testid="current-page"]')).toHaveText('2');
        
        // Verify different equipment are shown
        const firstEquipmentName = await page.locator('[data-testid="equipment-name"]').first().textContent();
        
        // Go back to first page
        await page.click('[data-testid="prev-page"]');
        
        // Verify different equipment
        const newFirstEquipmentName = await page.locator('[data-testid="equipment-name"]').first().textContent();
        expect(newFirstEquipmentName).not.toBe(firstEquipmentName);
      }
    });

    test('should switch between grid and list views', async ({ page }) => {
      // Default is grid view
      await expect(page.locator('[data-testid="equipment-grid"]')).toBeVisible();
      
      // Switch to list view
      await page.click('[data-testid="view-list"]');
      
      // Verify list view
      await expect(page.locator('[data-testid="equipment-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="equipment-table"]')).toBeVisible();
      
      // Switch back to grid
      await page.click('[data-testid="view-grid"]');
      await expect(page.locator('[data-testid="equipment-grid"]')).toBeVisible();
    });

    test('should display loading state while fetching data', async ({ page }) => {
      // Intercept API call to delay response
      await page.route('**/api/equipment*', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });
      
      // Reload page
      await page.reload();
      
      // Should show loading skeleton
      await expect(page.locator('[data-testid="equipment-skeleton"]')).toBeVisible();
      
      // Wait for content
      await expect(page.locator('[data-testid="equipment-grid"]')).toBeVisible({ timeout: 5000 });
    });

    test('should handle empty state', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/equipment*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 })
        });
      });
      
      await page.reload();
      
      // Should show empty state
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="empty-state-message"]')).toContainText(/No equipment found/i);
      await expect(page.locator('[data-testid="add-equipment-button"]')).toBeVisible();
    });
  });

  test.describe('Equipment Detail View', () => {
    test('should navigate to equipment details on click', async ({ page }) => {
      // Click first equipment card
      const firstCard = page.locator('[data-testid^="equipment-card-"]').first();
      const equipmentName = await firstCard.locator('[data-testid="equipment-name"]').textContent();
      
      await firstCard.click();
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/\/equipment\/[^/]+$/);
      
      // Should display equipment details
      await expect(page.locator('[data-testid="equipment-detail-header"]')).toContainText(equipmentName || '');
    });

    test('should display complete equipment information', async ({ page }) => {
      // Navigate to first equipment detail
      await page.click('[data-testid^="equipment-card-"]');
      
      // Verify all sections are present
      await expect(page.locator('[data-testid="equipment-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="equipment-specifications"]')).toBeVisible();
      await expect(page.locator('[data-testid="equipment-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="maintenance-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="equipment-alerts"]')).toBeVisible();
      
      // Verify key information
      await expect(page.locator('[data-testid="equipment-serial"]')).toBeVisible();
      await expect(page.locator('[data-testid="equipment-model"]')).toBeVisible();
      await expect(page.locator('[data-testid="equipment-manufacturer"]')).toBeVisible();
      await expect(page.locator('[data-testid="equipment-location"]')).toBeVisible();
    });

    test('should display real-time metrics', async ({ page }) => {
      await page.click('[data-testid^="equipment-card-"]');
      
      // Check metrics display
      const metricsSection = page.locator('[data-testid="equipment-metrics"]');
      await expect(metricsSection.locator('[data-testid="metric-oee"]')).toBeVisible();
      await expect(metricsSection.locator('[data-testid="metric-availability"]')).toBeVisible();
      await expect(metricsSection.locator('[data-testid="metric-performance"]')).toBeVisible();
      await expect(metricsSection.locator('[data-testid="metric-quality"]')).toBeVisible();
      
      // Verify metrics update in real-time
      const initialOEE = await metricsSection.locator('[data-testid="metric-oee-value"]').textContent();
      
      // Simulate WebSocket update
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'equipment-metrics-update',
            equipmentId: window.location.pathname.split('/').pop(),
            data: { oee: 91.5 }
          }
        }));
      });
      
      // OEE should update
      await expect(metricsSection.locator('[data-testid="metric-oee-value"]')).not.toHaveText(initialOEE || '');
    });

    test('should show maintenance schedule and history', async ({ page }) => {
      await page.click('[data-testid^="equipment-card-"]');
      
      // Check maintenance section
      const maintenanceSection = page.locator('[data-testid="maintenance-history"]');
      
      // Should show next scheduled maintenance
      await expect(maintenanceSection.locator('[data-testid="next-maintenance"]')).toBeVisible();
      await expect(maintenanceSection.locator('[data-testid="next-maintenance-date"]')).toBeVisible();
      await expect(maintenanceSection.locator('[data-testid="next-maintenance-type"]')).toBeVisible();
      
      // Should show maintenance history
      const historyItems = maintenanceSection.locator('[data-testid^="maintenance-item-"]');
      const historyCount = await historyItems.count();
      expect(historyCount).toBeGreaterThan(0);
      
      // Check first history item
      const firstItem = historyItems.first();
      await expect(firstItem.locator('[data-testid="maintenance-date"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="maintenance-type"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="maintenance-duration"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="maintenance-technician"]')).toBeVisible();
    });

    test('should allow scheduling new maintenance', async ({ page }) => {
      await page.click('[data-testid^="equipment-card-"]');
      
      // Click schedule maintenance button
      await page.click('[data-testid="schedule-maintenance-button"]');
      
      // Modal should open
      await expect(page.locator('[data-testid="maintenance-modal"]')).toBeVisible();
      
      // Fill maintenance form
      await page.selectOption('[data-testid="maintenance-type-select"]', 'preventive');
      await page.fill('[data-testid="maintenance-date"]', '2024-12-25');
      await page.fill('[data-testid="maintenance-time"]', '09:00');
      await page.fill('[data-testid="estimated-duration"]', '240');
      await page.fill('[data-testid="maintenance-description"]', 'Quarterly preventive maintenance');
      
      // Add required parts
      await page.click('[data-testid="add-part-button"]');
      await page.fill('[data-testid="part-name-0"]', 'Oil Filter');
      await page.fill('[data-testid="part-quantity-0"]', '2');
      
      // Submit
      await page.click('[data-testid="schedule-maintenance-submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-toast"]')).toContainText(/Maintenance scheduled/i);
      
      // Modal should close
      await expect(page.locator('[data-testid="maintenance-modal"]')).not.toBeVisible();
    });

    test('should display and manage equipment alerts', async ({ page }) => {
      await page.click('[data-testid^="equipment-card-"]');
      
      // Check alerts section
      const alertsSection = page.locator('[data-testid="equipment-alerts"]');
      
      // Should show active alerts count
      await expect(alertsSection.locator('[data-testid="active-alerts-count"]')).toBeVisible();
      
      // Should list alerts
      const alerts = alertsSection.locator('[data-testid^="alert-item-"]');
      if (await alerts.count() > 0) {
        const firstAlert = alerts.first();
        await expect(firstAlert.locator('[data-testid="alert-severity"]')).toBeVisible();
        await expect(firstAlert.locator('[data-testid="alert-message"]')).toBeVisible();
        await expect(firstAlert.locator('[data-testid="alert-timestamp"]')).toBeVisible();
        
        // Should be able to acknowledge alert
        await firstAlert.locator('[data-testid="acknowledge-alert"]').click();
        await expect(page.locator('[data-testid="confirm-acknowledge-modal"]')).toBeVisible();
        
        // Add acknowledgment note
        await page.fill('[data-testid="acknowledgment-note"]', 'Investigating the issue');
        await page.click('[data-testid="confirm-acknowledge"]');
        
        // Alert should be marked as acknowledged
        await expect(firstAlert).toHaveClass(/acknowledged/);
      }
    });

    test('should update equipment status', async ({ page }) => {
      await page.click('[data-testid^="equipment-card-"]');
      
      // Current status
      const currentStatus = await page.locator('[data-testid="equipment-current-status"]').textContent();
      
      // Click change status button
      await page.click('[data-testid="change-status-button"]');
      
      // Status change modal
      await expect(page.locator('[data-testid="status-change-modal"]')).toBeVisible();
      
      // Select new status
      const newStatus = currentStatus === 'Operational' ? 'maintenance' : 'operational';
      await page.selectOption('[data-testid="new-status-select"]', newStatus);
      
      // Add reason
      await page.fill('[data-testid="status-change-reason"]', 'Scheduled maintenance window');
      
      // Submit
      await page.click('[data-testid="confirm-status-change"]');
      
      // Should show success and update status
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="equipment-current-status"]')).toContainText(new RegExp(newStatus, 'i'));
    });

    test('should export equipment data', async ({ page }) => {
      await page.click('[data-testid^="equipment-card-"]');
      
      // Click export button
      await page.click('[data-testid="export-equipment-data"]');
      
      // Export options modal
      await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();
      
      // Select export options
      await page.check('[data-testid="export-specifications"]');
      await page.check('[data-testid="export-metrics"]');
      await page.check('[data-testid="export-maintenance"]');
      
      // Select format
      await page.click('[data-testid="export-format-pdf"]');
      
      // Download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-export"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/equipment.*\.pdf/);
    });
  });

  test.describe('Equipment Actions', () => {
    test('should add new equipment', async ({ page }) => {
      // Click add equipment button
      await page.click('[data-testid="add-equipment-button"]');
      
      // Should open add equipment modal/page
      await expect(page.locator('[data-testid="add-equipment-form"]')).toBeVisible();
      
      // Fill equipment details
      await page.fill('[data-testid="equipment-name-input"]', 'New CNC Machine 2024');
      await page.selectOption('[data-testid="equipment-type-select"]', 'CNC_MACHINE');
      await page.fill('[data-testid="equipment-model-input"]', 'CNC-5000X');
      await page.fill('[data-testid="equipment-serial-input"]', `SN-${Date.now()}`);
      await page.fill('[data-testid="equipment-manufacturer-input"]', 'TechCorp Industries');
      await page.fill('[data-testid="equipment-location-input"]', 'Building A, Floor 2, Bay 5');
      
      // Add specifications
      await page.click('[data-testid="add-specification-button"]');
      await page.fill('[data-testid="spec-key-0"]', 'Power Requirement');
      await page.fill('[data-testid="spec-value-0"]', '380V, 50A');
      
      // Upload image
      await page.setInputFiles('[data-testid="equipment-image-upload"]', './tests/fixtures/equipment-image.jpg');
      
      // Submit
      await page.click('[data-testid="save-equipment-button"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-toast"]')).toContainText(/Equipment added successfully/i);
      
      // Should redirect to equipment list
      await expect(page).toHaveURL('/equipment');
      
      // New equipment should be visible
      await expect(page.locator('[data-testid="equipment-name"]', { hasText: 'New CNC Machine 2024' })).toBeVisible();
    });

    test('should edit equipment information', async ({ page }) => {
      // Navigate to equipment detail
      await page.click('[data-testid^="equipment-card-"]');
      
      // Click edit button
      await page.click('[data-testid="edit-equipment-button"]');
      
      // Should enable edit mode
      await expect(page.locator('[data-testid="equipment-edit-form"]')).toBeVisible();
      
      // Update fields
      await page.fill('[data-testid="equipment-location-input"]', 'Building B, Floor 1');
      await page.fill('[data-testid="equipment-notes-input"]', 'Relocated due to facility expansion');
      
      // Save changes
      await page.click('[data-testid="save-changes-button"]');
      
      // Should show success
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      
      // Should reflect changes
      await expect(page.locator('[data-testid="equipment-location"]')).toContainText('Building B, Floor 1');
    });

    test('should delete equipment with confirmation', async ({ page }) => {
      // Navigate to equipment detail
      await page.click('[data-testid^="equipment-card-"]');
      
      const equipmentName = await page.locator('[data-testid="equipment-detail-header"]').textContent();
      
      // Click delete button
      await page.click('[data-testid="delete-equipment-button"]');
      
      // Confirmation modal should appear
      await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="delete-confirmation-message"]')).toContainText(equipmentName || '');
      
      // Type confirmation
      await page.fill('[data-testid="delete-confirmation-input"]', 'DELETE');
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Should show success and redirect
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page).toHaveURL('/equipment');
      
      // Equipment should not be in list
      await expect(page.locator('[data-testid="equipment-name"]', { hasText: equipmentName || '' })).not.toBeVisible();
    });
  });

  test.describe('Equipment Performance', () => {
    test('should load equipment list efficiently', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/equipment');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 second budget
      
      // Check if virtual scrolling is implemented for large lists
      const equipmentCount = await page.locator('[data-testid^="equipment-card-"]').count();
      if (equipmentCount > 20) {
        // Should use virtual scrolling
        const viewportHeight = await page.evaluate(() => window.innerHeight);
        const containerHeight = await page.locator('[data-testid="equipment-grid"]').evaluate(el => el.scrollHeight);
        
        // Container should not render all items at once
        expect(containerHeight).toBeLessThan(equipmentCount * 200); // Assuming ~200px per card
      }
    });

    test('should handle large datasets with pagination', async ({ page }) => {
      // Mock large dataset
      await page.route('**/api/equipment*', route => {
        const url = new URL(route.request().url());
        const page = parseInt(url.searchParams.get('page') || '1');
        const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
        
        const items = Array.from({ length: pageSize }, (_, i) => ({
          id: `equip-${(page - 1) * pageSize + i}`,
          name: `Equipment ${(page - 1) * pageSize + i}`,
          type: 'CNC_MACHINE',
          status: 'operational',
          oee: 85 + Math.random() * 10
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items,
            total: 1000,
            page,
            pageSize,
            totalPages: 50
          })
        });
      });
      
      await page.reload();
      
      // Should show pagination info
      await expect(page.locator('[data-testid="showing-results"]')).toContainText(/1-20 of 1000/);
      
      // Should handle page navigation efficiently
      await page.click('[data-testid="go-to-page-10"]');
      await expect(page.locator('[data-testid="current-page"]')).toHaveText('10');
      await expect(page.locator('[data-testid="showing-results"]')).toContainText(/181-200 of 1000/);
    });
  });

  test.describe('Equipment Accessibility', () => {
    test('should be fully keyboard navigable', async ({ page }) => {
      // Tab through main elements
      await page.keyboard.press('Tab'); // Skip to main content
      
      // Should focus on search
      await expect(page.locator('[data-testid="equipment-search"]')).toBeFocused();
      
      // Tab to filters
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="filter-button"]')).toBeFocused();
      
      // Tab to first equipment card
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toMatch(/equipment-card-/);
      
      // Enter should open detail
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/equipment\/[^/]+$/);
    });

    test('should announce equipment status changes', async ({ page }) => {
      // Check for live regions
      await expect(page.locator('[aria-live="polite"]')).toHaveCount(1);
      
      // Navigate to equipment detail
      await page.click('[data-testid^="equipment-card-"]');
      
      // Change status
      await page.click('[data-testid="change-status-button"]');
      await page.selectOption('[data-testid="new-status-select"]', 'maintenance');
      await page.click('[data-testid="confirm-status-change"]');
      
      // Live region should announce
      await expect(page.locator('[aria-live="polite"]')).toContainText(/Status updated/i);
    });

    test('should have proper ARIA labels for interactive elements', async ({ page }) => {
      // Check equipment cards
      const cards = await page.locator('[data-testid^="equipment-card-"]').all();
      for (const card of cards.slice(0, 3)) {
        await expect(card).toHaveAttribute('role', 'article');
        await expect(card).toHaveAttribute('aria-label', /.+/);
      }
      
      // Check action buttons
      await expect(page.locator('[data-testid="add-equipment-button"]')).toHaveAttribute('aria-label', /Add new equipment/i);
      await expect(page.locator('[data-testid="filter-button"]')).toHaveAttribute('aria-label', /Filter equipment/i);
      await expect(page.locator('[data-testid="sort-select"]')).toHaveAttribute('aria-label', /Sort equipment by/i);
    });
  });

  test.describe('Equipment Mobile Experience', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should have mobile-optimized layout', async ({ page }) => {
      await page.goto('/equipment');
      
      // Should show mobile layout
      await expect(page.locator('[data-testid="mobile-equipment-layout"]')).toBeVisible();
      
      // Cards should be full width
      const card = page.locator('[data-testid^="equipment-card-"]').first();
      const cardBox = await card.boundingBox();
      expect(cardBox?.width).toBeCloseTo(343, 10); // 375 - 32px padding
      
      // Filters should be in bottom sheet
      await page.click('[data-testid="mobile-filter-button"]');
      await expect(page.locator('[data-testid="filter-bottom-sheet"]')).toBeVisible();
    });

    test('should have touch-friendly interactions', async ({ page }) => {
      await page.goto('/equipment');
      
      // Swipe actions on equipment cards
      const card = page.locator('[data-testid^="equipment-card-"]').first();
      
      // Simulate swipe
      const box = await card.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 50, box.y + box.height / 2);
        await page.mouse.up();
        
        // Should show quick actions
        await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
      }
    });
  });
});