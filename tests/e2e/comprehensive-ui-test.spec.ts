import { test, expect } from '@playwright/test';

test.describe('Comprehensive UI Testing - Every Page, Button, and Field', () => {
  
  // Test Homepage
  test.describe('Homepage', () => {
    test('should load homepage and test all elements', async ({ page }) => {
      await page.goto('/');
      
      // Check page title
      await expect(page).toHaveTitle(/Manufacturing Analytics Platform/);
      
      // Test hero section
      const heroTitle = page.locator('h1');
      await expect(heroTitle).toContainText('Manufacturing Analytics Platform');
      
      // Test all buttons
      const getStartedButton = page.getByRole('link', { name: /get started/i });
      await expect(getStartedButton).toBeVisible();
      await getStartedButton.click();
      await expect(page).toHaveURL('/dashboard');
      
      await page.goBack();
      
      // Test View Documentation button
      const viewDocsButton = page.getByRole('link', { name: /view documentation/i });
      await expect(viewDocsButton).toBeVisible();
      await viewDocsButton.click();
      await expect(page).toHaveURL('/documentation');
      
      await page.goBack();
      
      // Test feature cards
      const featureCards = page.locator('.grid > div');
      await expect(featureCards).toHaveCount(4);
      
      // Test each feature card link
      const realTimeLink = page.getByRole('link', { name: /real-time monitoring/i });
      await expect(realTimeLink).toBeVisible();
      
      const predictiveLink = page.getByRole('link', { name: /predictive analytics/i });
      await expect(predictiveLink).toBeVisible();
      
      const qualityLink = page.getByRole('link', { name: /quality management/i });
      await expect(qualityLink).toBeVisible();
      
      const integrationLink = page.getByRole('link', { name: /integration hub/i });
      await expect(integrationLink).toBeVisible();
    });
  });

  // Test Dashboard
  test.describe('Dashboard', () => {
    test('should test all dashboard elements', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Wait for dashboard to load
      await page.waitForLoadState('networkidle');
      
      // Test page header
      await expect(page.locator('h1')).toContainText('Operations Dashboard');
      
      // Test KPI Cards
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      const kpiCount = await kpiCards.count();
      expect(kpiCount).toBeGreaterThanOrEqual(4);
      
      // Test each KPI card has title and value
      for (let i = 0; i < kpiCount; i++) {
        const card = kpiCards.nth(i);
        await expect(card).toBeVisible();
        
        // Check card has value
        const value = card.locator('text=/\\d+(\\.\\d+)?%?/');
        await expect(value).toBeVisible();
      }
      
      // Test Equipment Status section
      const equipmentSection = page.locator('text=Equipment Status').first();
      await expect(equipmentSection).toBeVisible();
      
      // Test View All Equipment button
      const viewAllEquipmentBtn = page.getByRole('link', { name: /view all equipment/i });
      await expect(viewAllEquipmentBtn).toBeVisible();
      await viewAllEquipmentBtn.click();
      await expect(page).toHaveURL('/equipment');
      await page.goBack();
      
      // Test Active Alerts section
      const alertsSection = page.locator('text=Active Alerts').first();
      await expect(alertsSection).toBeVisible();
      
      // Test View All Alerts button
      const viewAllAlertsBtn = page.getByRole('link', { name: /view all alerts/i });
      await expect(viewAllAlertsBtn).toBeVisible();
      await viewAllAlertsBtn.click();
      await expect(page).toHaveURL('/alerts');
      await page.goBack();
    });
  });

  // Test Equipment Page
  test.describe('Equipment Page', () => {
    test('should test equipment list and interactions', async ({ page }) => {
      await page.goto('/equipment');
      
      // Test page header
      await expect(page.locator('h1')).toContainText('Equipment Management');
      
      // Test search input
      const searchInput = page.getByPlaceholder(/search equipment/i);
      await expect(searchInput).toBeVisible();
      await searchInput.fill('Machine');
      await page.waitForTimeout(500); // Wait for search to filter
      
      // Test status filter buttons
      const allFilter = page.getByRole('button', { name: /all/i }).first();
      const operationalFilter = page.getByRole('button', { name: /operational/i });
      const maintenanceFilter = page.getByRole('button', { name: /maintenance/i });
      const offlineFilter = page.getByRole('button', { name: /offline/i });
      
      await expect(allFilter).toBeVisible();
      await expect(operationalFilter).toBeVisible();
      await expect(maintenanceFilter).toBeVisible();
      await expect(offlineFilter).toBeVisible();
      
      // Test filter clicks
      await operationalFilter.click();
      await page.waitForTimeout(500);
      
      await maintenanceFilter.click();
      await page.waitForTimeout(500);
      
      await allFilter.click();
      await page.waitForTimeout(500);
      
      // Test equipment cards
      const equipmentCards = page.locator('[class*="border"][class*="rounded"]').filter({ hasText: /Machine|Equipment|Line/ });
      const cardCount = await equipmentCards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      // Test clicking on first equipment card
      if (cardCount > 0) {
        const firstCard = equipmentCards.first();
        const viewDetailsBtn = firstCard.getByRole('button', { name: /view details/i });
        await expect(viewDetailsBtn).toBeVisible();
        await viewDetailsBtn.click();
        
        // Should navigate to equipment detail page
        await expect(page.url()).toMatch(/\/equipment\/[a-zA-Z0-9]+/);
        
        // Test equipment detail page
        await expect(page.locator('h1')).toBeVisible();
        
        // Test tabs
        const overviewTab = page.getByRole('tab', { name: /overview/i });
        const metricsTab = page.getByRole('tab', { name: /metrics/i });
        const maintenanceTab = page.getByRole('tab', { name: /maintenance/i });
        
        await expect(overviewTab).toBeVisible();
        await expect(metricsTab).toBeVisible();
        await expect(maintenanceTab).toBeVisible();
        
        // Test tab clicks
        await metricsTab.click();
        await page.waitForTimeout(500);
        
        await maintenanceTab.click();
        await page.waitForTimeout(500);
        
        await overviewTab.click();
        await page.waitForTimeout(500);
        
        // Go back to equipment list
        await page.goBack();
      }
    });
  });

  // Test Alerts Page
  test.describe('Alerts Page', () => {
    test('should test alerts list and filters', async ({ page }) => {
      await page.goto('/alerts');
      
      // Test page header
      await expect(page.locator('h1')).toContainText('Alerts Management');
      
      // Test severity filter buttons
      const allSeverity = page.getByRole('button', { name: /all/i }).first();
      const criticalFilter = page.getByRole('button', { name: /critical/i });
      const highFilter = page.getByRole('button', { name: /high/i });
      const mediumFilter = page.getByRole('button', { name: /medium/i });
      const lowFilter = page.getByRole('button', { name: /low/i });
      
      await expect(allSeverity).toBeVisible();
      await expect(criticalFilter).toBeVisible();
      await expect(highFilter).toBeVisible();
      await expect(mediumFilter).toBeVisible();
      await expect(lowFilter).toBeVisible();
      
      // Test filter clicks
      await criticalFilter.click();
      await page.waitForTimeout(500);
      
      await highFilter.click();
      await page.waitForTimeout(500);
      
      await allSeverity.click();
      await page.waitForTimeout(500);
      
      // Test alert cards
      const alertCards = page.locator('[class*="border"][class*="rounded"]').filter({ hasText: /alert|maintenance|quality|performance/i });
      
      // If there are alerts, test interactions
      const alertCount = await alertCards.count();
      if (alertCount > 0) {
        const firstAlert = alertCards.first();
        
        // Test View Details button
        const viewDetailsBtn = firstAlert.getByRole('button', { name: /view details/i });
        if (await viewDetailsBtn.isVisible()) {
          await viewDetailsBtn.click();
          await expect(page.url()).toMatch(/\/alerts\/[a-zA-Z0-9]+/);
          await page.goBack();
        }
        
        // Test Acknowledge button
        const acknowledgeBtn = firstAlert.getByRole('button', { name: /acknowledge/i });
        if (await acknowledgeBtn.isVisible()) {
          await acknowledgeBtn.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  // Test Manufacturing Chat
  test.describe('Manufacturing Chat', () => {
    test('should test chat interface and interactions', async ({ page }) => {
      await page.goto('/manufacturing-chat');
      
      // Test page header
      await expect(page.locator('h1')).toContainText('Manufacturing Assistant');
      
      // Test chat input
      const chatInput = page.getByPlaceholder(/ask.*question|type.*message/i);
      await expect(chatInput).toBeVisible();
      
      // Test send button
      const sendButton = page.getByRole('button', { name: /send/i });
      await expect(sendButton).toBeVisible();
      
      // Test sending a message
      await chatInput.fill('What is my OEE?');
      await sendButton.click();
      
      // Wait for response (with timeout)
      await page.waitForTimeout(2000);
      
      // Test sample questions if visible
      const sampleQuestions = page.locator('text=/What.*OEE|Show.*equipment|.*production/i');
      const sampleCount = await sampleQuestions.count();
      
      if (sampleCount > 0) {
        // Click first sample question
        await sampleQuestions.first().click();
        await page.waitForTimeout(2000);
      }
      
      // Test new chat button if exists
      const newChatBtn = page.getByRole('button', { name: /new chat/i });
      if (await newChatBtn.isVisible()) {
        await newChatBtn.click();
        await page.waitForTimeout(500);
      }
    });
  });

  // Test Navigation
  test.describe('Navigation', () => {
    test('should test all navigation menu items', async ({ page }) => {
      await page.goto('/');
      
      // Test logo link
      const logo = page.locator('a[href="/"]').first();
      await expect(logo).toBeVisible();
      
      // Test main navigation items
      const navItems = [
        { name: /dashboard/i, url: '/dashboard' },
        { name: /equipment/i, url: '/equipment' },
        { name: /alerts/i, url: '/alerts' },
        { name: /chat/i, url: '/manufacturing-chat' },
      ];
      
      for (const item of navItems) {
        const navLink = page.getByRole('link', { name: item.name });
        await expect(navLink).toBeVisible();
        await navLink.click();
        await expect(page).toHaveURL(item.url);
        await page.waitForTimeout(500);
      }
      
      // Test mobile menu if exists
      const mobileMenuBtn = page.getByRole('button', { name: /menu/i });
      if (await mobileMenuBtn.isVisible()) {
        await mobileMenuBtn.click();
        await page.waitForTimeout(500);
        
        // Test mobile menu items
        for (const item of navItems) {
          const mobileLink = page.getByRole('link', { name: item.name }).last();
          await expect(mobileLink).toBeVisible();
        }
        
        // Close mobile menu
        await mobileMenuBtn.click();
      }
    });
  });

  // Test Footer Links
  test.describe('Footer', () => {
    test('should test all footer links', async ({ page }) => {
      await page.goto('/');
      
      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      
      // Test footer links
      const footerLinks = [
        { name: /privacy policy/i, url: '/privacy-policy' },
        { name: /terms of service/i, url: '/terms-of-service' },
        { name: /cookie policy/i, url: '/cookie-policy' },
        { name: /documentation/i, url: '/documentation' },
        { name: /support/i, url: '/support' },
        { name: /status/i, url: '/status' },
      ];
      
      for (const link of footerLinks) {
        const footerLink = page.getByRole('link', { name: link.name });
        await expect(footerLink).toBeVisible();
        await footerLink.click();
        await expect(page).toHaveURL(link.url);
        await page.goBack();
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
      }
    });
  });

  // Test Form Inputs
  test.describe('Form Inputs and Interactions', () => {
    test('should test various form inputs across pages', async ({ page }) => {
      // Test search inputs
      await page.goto('/equipment');
      const equipmentSearch = page.getByPlaceholder(/search/i);
      await expect(equipmentSearch).toBeVisible();
      await equipmentSearch.fill('Test Search');
      await expect(equipmentSearch).toHaveValue('Test Search');
      await equipmentSearch.clear();
      
      // Test dropdowns if any
      const selects = page.locator('select');
      const selectCount = await selects.count();
      
      for (let i = 0; i < selectCount; i++) {
        const select = selects.nth(i);
        if (await select.isVisible()) {
          const options = await select.locator('option').count();
          expect(options).toBeGreaterThan(0);
        }
      }
    });
  });

  // Test Error States
  test.describe('Error Handling', () => {
    test('should handle 404 pages', async ({ page }) => {
      await page.goto('/non-existent-page');
      await expect(page.locator('text=/404|not found/i')).toBeVisible();
      
      // Test back to home button
      const homeButton = page.getByRole('link', { name: /home|back/i });
      await expect(homeButton).toBeVisible();
      await homeButton.click();
      await expect(page).toHaveURL('/');
    });
  });

  // Test Responsive Design
  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Test mobile menu
      const mobileMenuBtn = page.getByRole('button', { name: /menu/i });
      await expect(mobileMenuBtn).toBeVisible();
      await mobileMenuBtn.click();
      
      // Test mobile navigation visibility
      const mobileNav = page.getByRole('link', { name: /dashboard/i });
      await expect(mobileNav).toBeVisible();
    });
    
    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/dashboard');
      
      // Test layout adjustments
      const dashboardTitle = page.locator('h1');
      await expect(dashboardTitle).toBeVisible();
    });
  });
});

// Additional specific page tests
test.describe('Additional Pages', () => {
  test('should test Documentation page', async ({ page }) => {
    await page.goto('/documentation');
    await expect(page.locator('h1')).toContainText('Documentation');
    
    // Test API Reference link
    const apiRefLink = page.getByRole('link', { name: /api reference/i });
    if (await apiRefLink.isVisible()) {
      await apiRefLink.click();
      await expect(page).toHaveURL('/documentation/api-reference');
    }
  });
  
  test('should test Support page', async ({ page }) => {
    await page.goto('/support');
    await expect(page.locator('h1')).toContainText('Support');
    
    // Test contact form if exists
    const nameInput = page.getByLabel(/name/i);
    const emailInput = page.getByLabel(/email/i);
    const messageInput = page.getByLabel(/message/i);
    
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User');
      await emailInput.fill('test@example.com');
      await messageInput.fill('Test message');
      
      const submitBtn = page.getByRole('button', { name: /submit|send/i });
      await expect(submitBtn).toBeVisible();
    }
  });
  
  test('should test Status page', async ({ page }) => {
    await page.goto('/status');
    await expect(page.locator('h1')).toContainText('System Status');
    
    // Test status indicators
    const statusIndicators = page.locator('[class*="status"]');
    const statusCount = await statusIndicators.count();
    expect(statusCount).toBeGreaterThan(0);
  });
});

// Performance tests
test.describe('Performance', () => {
  test('should load pages within acceptable time', async ({ page }) => {
    const pages = ['/', '/dashboard', '/equipment', '/alerts', '/manufacturing-chat'];
    
    for (const url of pages) {
      const startTime = Date.now();
      await page.goto(url);
      const loadTime = Date.now() - startTime;
      
      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    }
  });
});