import { test, expect } from '@playwright/test';

test('homepage has Manufacturing Intelligence Platform title', async ({ page }) => {
  await page.goto('/');
  
  // Expect a title "to contain" a substring
  await expect(page).toHaveTitle(/Manufacturing Intelligence Platform/);
  
  // Check for the presence of the main heading
  const heading = page.getByRole('heading', { name: /Manufacturing Intelligence Platform/i });
  await expect(heading).toBeVisible();
});

test('navigation works', async ({ page }) => {
  await page.goto('/');
  
  // Click the Dashboard link
  await page.getByRole('link', { name: 'Dashboard' }).click();
  
  // Wait for navigation to complete
  await page.waitForURL('**/dashboard');
  
  // Verify we're on the dashboard page
  const dashboardHeading = page.getByRole('heading', { name: /Manufacturing Dashboard/i });
  await expect(dashboardHeading).toBeVisible();
});