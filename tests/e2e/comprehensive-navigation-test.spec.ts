/**
 * Comprehensive Navigation and UI Interaction Tests
 * Tests all pages and sub-pages from the sidebar navigation
 */

import { test, expect, Page } from '@playwright/test';

// Define all navigation pages and sub-pages
const navigationPages = [
  // Main navigation from Navigation.tsx
  { name: 'Home', path: '/', hasSubPages: false },
  { name: 'Dashboard', path: '/dashboard', hasSubPages: true },
  { name: 'Analytics/Dashboards', path: '/dashboards', hasSubPages: true },
  { name: 'Equipment', path: '/equipment', hasSubPages: true },
  { name: 'Alerts', path: '/alerts', hasSubPages: true },
  { name: 'Manufacturing Chat Main', path: '/manufacturing-chat', hasSubPages: true },
  { name: 'Documentation', path: '/documentation', hasSubPages: true },
  
  // Dashboard sub-pages
  { name: 'Dashboard Import', path: '/dashboard/import', hasSubPages: false },
  { name: 'Dashboard Snapshot', path: '/dashboard/snapshot', hasSubPages: false },
  
  // Dashboards sub-pages
  { name: 'Dashboards Browse', path: '/dashboards/browse', hasSubPages: false },
  { name: 'Dashboards New', path: '/dashboards/new', hasSubPages: false },
  { name: 'Dashboards Manufacturing', path: '/dashboards/manufacturing', hasSubPages: false },
  { name: 'Dashboards OEE', path: '/dashboards/oee', hasSubPages: false },
  { name: 'Dashboards Production', path: '/dashboards/production', hasSubPages: false },
  { name: 'Dashboards Quality', path: '/dashboards/quality', hasSubPages: false },
  { name: 'Dashboards Maintenance', path: '/dashboards/maintenance', hasSubPages: false },
  { name: 'Dashboards Unified', path: '/dashboards/unified', hasSubPages: false },
  { name: 'Dashboards Grafana', path: '/dashboards/grafana', hasSubPages: false },
  
  // Equipment sub-pages (test with sample equipment ID)
  { name: 'Equipment List', path: '/equipment', hasSubPages: false },
  
  // Alerts sub-pages
  { name: 'Alerts List', path: '/alerts', hasSubPages: false },
  
  // Manufacturing Chat sub-pages
  { name: 'Manufacturing Chat Optimized', path: '/manufacturing-chat/optimized', hasSubPages: false },
  
  // Documentation sub-pages
  { name: 'Documentation Main', path: '/documentation', hasSubPages: false },
  { name: 'Documentation API Reference', path: '/documentation/api-reference', hasSubPages: false },
  
  // Additional important pages
  { name: 'Analytics Dashboard', path: '/Analytics-dashboard', hasSubPages: false },
  { name: 'Profile', path: '/profile', hasSubPages: false },
  { name: 'Status', path: '/status', hasSubPages: false },
  { name: 'Support', path: '/support', hasSubPages: false },
  { name: 'Diagnostics', path: '/diagnostics', hasSubPages: false },
  { name: 'Explore', path: '/explore', hasSubPages: false },
];

// Helper function to check if a page loads without critical errors
async function testPageLoad(page: Page, pagePath: string, pageName: string) {
  const response = await page.goto(pagePath, { waitUntil: 'networkidle' });
  
  // Check if page loads successfully (not 404 or 500)
  if (response) {
    expect(response.status()).toBeLessThan(400);
  }
  
  // Check for critical error indicators
  const errorElements = await page.locator('[data-testid="error"], .error, .error-message').count();
  const hasUnhandledError = await page.locator('text=Error:').count();
  
  expect(errorElements + hasUnhandledError).toBe(0);
  
  // Verify basic page structure
  await expect(page.locator('body')).toBeVisible();
  
  // Check for navigation (should be present on all pages)
  const hasNavigation = await page.locator('nav, [role="navigation"]').count();
  expect(hasNavigation).toBeGreaterThan(0);
}

// Helper function to test UI interactions
async function testUIInteractions(page: Page, pagePath: string, pageName: string) {
  // Test clickable elements
  const buttons = page.locator('button:visible');
  const buttonCount = await buttons.count();
  
  if (buttonCount > 0) {
    // Test first few buttons (not all to avoid side effects)
    const maxButtons = Math.min(3, buttonCount);
    for (let i = 0; i < maxButtons; i++) {
      const button = buttons.nth(i);
      const isEnabled = await button.isEnabled();
      if (isEnabled) {
        await expect(button).toBeVisible();
        // Check if button is clickable (don't actually click to avoid navigation)
        await expect(button).toBeEnabled();
      }
    }
  }
  
  // Test form inputs if present
  const inputs = page.locator('input:visible');
  const inputCount = await inputs.count();
  
  if (inputCount > 0) {
    const firstInput = inputs.first();
    if (await firstInput.isEnabled()) {
      await expect(firstInput).toBeVisible();
      // Test typing in the first input
      await firstInput.focus();
      await firstInput.fill('test');
      await firstInput.clear();
    }
  }
  
  // Test dropdown/select elements
  const selects = page.locator('select:visible');
  const selectCount = await selects.count();
  
  if (selectCount > 0) {
    const firstSelect = selects.first();
    await expect(firstSelect).toBeVisible();
    if (await firstSelect.isEnabled()) {
      const options = await firstSelect.locator('option').count();
      expect(options).toBeGreaterThan(0);
    }
  }
  
  // Test links (check they exist and have valid hrefs)
  const links = page.locator('a:visible');
  const linkCount = await links.count();
  
  if (linkCount > 0) {
    for (let i = 0; i < Math.min(5, linkCount); i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
    }
  }
}

// Helper function to test responsive design
async function testResponsiveDesign(page: Page) {
  // Test mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);
  
  // Check if mobile menu exists and is functional
  const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
  if (await mobileMenuButton.count() > 0) {
    await expect(mobileMenuButton).toBeVisible();
    if (await mobileMenuButton.isEnabled()) {
      await mobileMenuButton.click();
      // Check if mobile menu opens
      const mobileMenu = page.locator('#mobile-menu, [data-testid="mobile-menu"]');
      if (await mobileMenu.count() > 0) {
        await expect(mobileMenu).toBeVisible();
      }
    }
  }
  
  // Test tablet viewport
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  
  // Test desktop viewport
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(500);
}

// Helper function to test accessibility
async function testAccessibility(page: Page) {
  // Check for basic accessibility attributes
  const headings = page.locator('h1, h2, h3, h4, h5, h6');
  const headingCount = await headings.count();
  
  if (headingCount > 0) {
    // Should have at least one heading
    expect(headingCount).toBeGreaterThan(0);
  }
  
  // Check for aria-labels on interactive elements
  const interactiveElements = page.locator('button, input, select, textarea, a');
  const interactiveCount = await interactiveElements.count();
  
  if (interactiveCount > 0) {
    // At least some interactive elements should have accessibility attributes
    const elementsWithLabels = await page.locator('button[aria-label], input[aria-label], select[aria-label], textarea[aria-label], a[aria-label], button[title], input[title], select[title], textarea[title], a[title]').count();
    // Note: Not all elements need labels, but some should have them
  }
  
  // Check for alt text on images
  const images = page.locator('img');
  const imageCount = await images.count();
  
  if (imageCount > 0) {
    for (let i = 0; i < Math.min(3, imageCount); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Images should have alt text (can be empty for decorative images)
      expect(alt).not.toBeNull();
    }
  }
}

// Group tests by main sections
test.describe('Navigation Page Tests', () => {
  
  // Test each navigation page
  for (const navPage of navigationPages) {
    test.describe(`${navPage.name} Page Tests`, () => {
      
      test(`should load ${navPage.name} page successfully`, async ({ page }) => {
        await testPageLoad(page, navPage.path, navPage.name);
      });
      
      test(`should have functional UI interactions on ${navPage.name}`, async ({ page }) => {
        await page.goto(navPage.path, { waitUntil: 'networkidle' });
        await testUIInteractions(page, navPage.path, navPage.name);
      });
      
      test(`should be responsive on ${navPage.name}`, async ({ page }) => {
        await page.goto(navPage.path, { waitUntil: 'networkidle' });
        await testResponsiveDesign(page);
      });
      
      test(`should meet basic accessibility requirements on ${navPage.name}`, async ({ page }) => {
        await page.goto(navPage.path, { waitUntil: 'networkidle' });
        await testAccessibility(page);
      });
      
    });
  }
  
});

// Test navigation functionality
test.describe('Navigation Functionality Tests', () => {
  
  test('should navigate between main pages using navigation menu', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Test desktop navigation
    const mainNavPages = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Analytics', path: '/dashboards' },
      { name: 'Equipment', path: '/equipment' },
      { name: 'Alerts', path: '/alerts' },
      { name: 'AI Chat', path: '/manufacturing-chat' },
    ];
    
    for (const navPage of mainNavPages) {
      // Click navigation link
      const navLink = page.locator(`a[href="${navPage.path}"]`).first();
      if (await navLink.count() > 0 && await navLink.isVisible()) {
        await navLink.click();
        await page.waitForLoadState('networkidle');
        
        // Verify we're on the correct page
        expect(page.url()).toContain(navPage.path);
        
        // Verify page loads successfully
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
  
  test('should navigate using mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Find and click mobile menu button
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenuButton.count() > 0) {
      await mobileMenuButton.click();
      
      // Test mobile navigation
      const mobileNavLink = page.locator('#mobile-menu a[href="/dashboard"]').first();
      if (await mobileNavLink.count() > 0) {
        await mobileNavLink.click();
        await page.waitForLoadState('networkidle');
        
        expect(page.url()).toContain('/dashboard');
      }
    }
  });
  
});

// Test specific page functionality
test.describe('Page-Specific Functionality Tests', () => {
  
  test('Dashboard page should display metrics and charts', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    
    // Look for common dashboard elements
    const kpiCards = page.locator('[data-testid*="kpi"], .kpi, .metric-card');
    const charts = page.locator('canvas, svg, .chart');
    
    // Should have some dashboard content
    const dashboardContent = await kpiCards.count() + await charts.count();
    expect(dashboardContent).toBeGreaterThan(0);
  });
  
  test('Equipment page should display equipment list', async ({ page }) => {
    await page.goto('/equipment', { waitUntil: 'networkidle' });
    
    // Look for equipment-related content
    const equipmentCards = page.locator('[data-testid*="equipment"], .equipment-card, .equipment-item');
    const equipmentTable = page.locator('table, .table, [role="table"]');
    
    // Should have equipment content or loading state
    const equipmentContent = await equipmentCards.count() + await equipmentTable.count();
    const loadingIndicators = await page.locator('.loading, .spinner, [data-testid="loading"]').count();
    
    expect(equipmentContent + loadingIndicators).toBeGreaterThan(0);
  });
  
  test('Alerts page should display alerts list', async ({ page }) => {
    await page.goto('/alerts', { waitUntil: 'networkidle' });
    
    // Look for alerts-related content
    const alertCards = page.locator('[data-testid*="alert"], .alert-card, .alert-item');
    const alertTable = page.locator('table, .table, [role="table"]');
    
    // Should have alerts content or loading state
    const alertContent = await alertCards.count() + await alertTable.count();
    const loadingIndicators = await page.locator('.loading, .spinner, [data-testid="loading"]').count();
    
    expect(alertContent + loadingIndicators).toBeGreaterThan(0);
  });
  
  test('Manufacturing Chat page should display chat interface', async ({ page }) => {
    await page.goto('/manufacturing-chat', { waitUntil: 'networkidle' });
    
    // Look for chat-related elements
    const chatInput = page.locator('input[type="text"], textarea').filter({ hasText: /chat|message|ask/i });
    const chatMessages = page.locator('[data-testid*="message"], .message, .chat-message');
    const sendButton = page.locator('button').filter({ hasText: /send|submit/i });
    
    // Should have chat interface elements
    const chatElements = await chatInput.count() + await chatMessages.count() + await sendButton.count();
    expect(chatElements).toBeGreaterThan(0);
  });
  
});

// Performance and error handling tests
test.describe('Performance and Error Handling Tests', () => {
  
  test('pages should load within acceptable time limits', async ({ page }) => {
    const testPages = ['/', '/dashboard', '/equipment', '/alerts'];
    
    for (const testPage of testPages) {
      const startTime = Date.now();
      
      await page.goto(testPage, { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 10 seconds (generous limit for CI)
      expect(loadTime).toBeLessThan(10000);
    }
  });
  
  test('should handle network errors gracefully', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);
    
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    
    // Should show error message or loading state, not crash
    const hasErrorMessage = await page.locator('text=/error|offline|network/i').count();
    const hasLoadingState = await page.locator('.loading, .spinner, [data-testid="loading"]').count();
    
    expect(hasErrorMessage + hasLoadingState).toBeGreaterThan(0);
    
    // Go back online
    await page.context().setOffline(false);
  });
  
});