import { test, expect } from '@playwright/test';

/**
 * This test is designed to run even in WSL environments where browser testing may be problematic.
 * It is marked with .skip in the filename so that it can be specially handled in the Playwright config.
 */

test('basic navigation test', async ({ page, isMobile }) => {
  // This test will automatically be skipped in WSL environments
  // and will only run in environments with proper browser support
  
  // Start from the home page
  await page.goto('/');
  
  // Verify page title
  await expect(page).toHaveTitle(/Adaptive Factory AI Solutions/);
  
  // Helper function to open mobile menu if needed
  const openMobileMenuIfNeeded = async () => {
    if (isMobile) {
      const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
      const isMenuVisible = await page.getByLabel('Main navigation').getByRole('link', { name: 'Dashboard' }).isVisible();
      if (!isMenuVisible) {
        await mobileMenuButton.click();
        // Wait for menu to open
        await page.waitForTimeout(300);
      }
    }
  };
  
  // Navigate to Dashboard
  await openMobileMenuIfNeeded();
  await page.getByLabel('Main navigation').getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/.*dashboard/);
  
  // Navigate to Equipment
  await openMobileMenuIfNeeded();
  await page.getByLabel('Main navigation').getByRole('link', { name: 'Equipment' }).click();
  await expect(page).toHaveURL(/.*equipment/);
  
  // Navigate to Alerts
  await openMobileMenuIfNeeded();
  await page.getByLabel('Main navigation').getByRole('link', { name: 'Alerts' }).click();
  await expect(page).toHaveURL(/.*alerts/);
  
  // Navigate to Manufacturing Chat
  await openMobileMenuIfNeeded();
  await page.getByLabel('Main navigation').getByRole('link', { name: 'AI Chat' }).click();
  await expect(page).toHaveURL(/.*manufacturing-chat/);
  
  // Go back to home
  await openMobileMenuIfNeeded();
  await page.getByLabel('Main navigation').getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(/.*\/$/);
});