import { test, expect } from '@playwright/test';

/**
 * Navigation E2E tests
 * 
 * These tests verify that navigation throughout the application works correctly.
 * They check that users can navigate between the main sections of the application.
 */
test('user can navigate between main sections', async ({ page }) => {
  // Start from the home page
  await page.goto('/');
  
  // Verify that we're on the home page
  await expect(page).toHaveTitle(/Manufacturing Analytics Platform/);
  
  // Navigate to Dashboard and verify URL
  const dashboardLink = page.getByRole('link', { name: /dashboard/i });
  await expect(dashboardLink).toBeVisible();
  await dashboardLink.click();
  await expect(page).toHaveURL(/.*dashboard/);
  
  // Navigate to Equipment and verify URL
  const equipmentLink = page.getByRole('link', { name: /equipment/i });
  await expect(equipmentLink).toBeVisible();
  await equipmentLink.click();
  await expect(page).toHaveURL(/.*equipment/);
  
  // Navigate to Alerts and verify URL
  const alertsLink = page.getByRole('link', { name: /alerts/i });
  await expect(alertsLink).toBeVisible();
  await alertsLink.click();
  await expect(page).toHaveURL(/.*alerts/);
  
  // Navigate to Manufacturing Chat and verify URL
  const chatLink = page.getByRole('link', { name: /manufacturing chat/i });
  await expect(chatLink).toBeVisible();
  await chatLink.click();
  await expect(page).toHaveURL(/.*manufacturing-chat/);
  
  // Navigate back to home and verify URL
  const homeLink = page.getByRole('link', { name: /home/i });
  await expect(homeLink).toBeVisible();
  await homeLink.click();
  await expect(page).toHaveURL(/.*\/$/);
});

test('navigation maintains state between page changes', async ({ page }) => {
  // Start from the home page
  await page.goto('/');
  
  // Navigate to Dashboard
  await page.getByRole('link', { name: /dashboard/i }).click();
  await expect(page).toHaveURL(/.*dashboard/);
  
  // Check if Dashboard title is visible
  await expect(page.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeVisible();
  
  // Navigate to Alerts
  await page.getByRole('link', { name: /alerts/i }).click();
  await expect(page).toHaveURL(/.*alerts/);
  
  // Check if Alerts title is visible
  await expect(page.getByRole('heading', { name: /alerts/i, level: 1 })).toBeVisible();
  
  // Navigate back to Dashboard
  await page.getByRole('link', { name: /dashboard/i }).click();
  await expect(page).toHaveURL(/.*dashboard/);
  
  // Check if Dashboard title is still visible
  await expect(page.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeVisible();
});

test('mobile navigation menu works correctly', async ({ page }) => {
  // Set a mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  
  // Start from the home page
  await page.goto('/');
  
  // Check if the mobile menu button is visible
  const menuButton = page.getByRole('button', { name: /menu/i });
  await expect(menuButton).toBeVisible();
  
  // Open the mobile menu
  await menuButton.click();
  
  // Check if all navigation links are visible in the menu
  await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /equipment/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /alerts/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /manufacturing chat/i })).toBeVisible();
  
  // Navigate to Dashboard through the mobile menu
  await page.getByRole('link', { name: /dashboard/i }).click();
  await expect(page).toHaveURL(/.*dashboard/);
  
  // Check if the menu is closed after navigation
  await expect(menuButton).toBeVisible();
  await expect(page.getByRole('link', { name: /equipment/i })).not.toBeVisible();
});