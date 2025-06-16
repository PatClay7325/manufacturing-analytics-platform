import { test, expect } from '@playwright/test';

/**
 * This test is designed to run even in WSL environments where browser testing may be problematic.
 * It is marked with .skip in the filename so that it can be specially handled in the Playwright config.
 */

test('basic navigation test', async ({ page }) => {
  // This test will automatically be skipped in WSL environments
  // and will only run in environments with proper browser support
  
  // Start from the home page
  await page.goto('/');
  
  // Verify page title
  await expect(page).toHaveTitle(/Manufacturing Analytics Platform/);
  
  // Navigate to Dashboard and verify URL
  await page.getByRole('link', { name: /dashboard/i }).click();
  await expect(page).toHaveURL(/.*dashboard/);
  
  // Navigate to Equipment and verify URL
  await page.getByRole('link', { name: /equipment/i }).click();
  await expect(page).toHaveURL(/.*equipment/);
  
  // Navigate to Alerts and verify URL
  await page.getByRole('link', { name: /alerts/i }).click();
  await expect(page).toHaveURL(/.*alerts/);
  
  // Navigate to Manufacturing Chat and verify URL
  await page.getByRole('link', { name: /manufacturing chat/i }).click();
  await expect(page).toHaveURL(/.*manufacturing-chat/);
  
  // Go back to home
  await page.getByRole('link', { name: /home/i }).click();
  await expect(page).toHaveURL(/.*\/$/);
});