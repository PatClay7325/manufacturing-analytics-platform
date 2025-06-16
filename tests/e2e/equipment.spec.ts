import { test, expect } from '@playwright/test';

/**
 * Equipment page E2E tests
 * 
 * These tests verify functionality on the equipment page.
 */
test('equipment page displays list of equipment', async ({ page }) => {
  // Navigate to equipment page
  await page.goto('/equipment');
  
  // Verify page title
  await expect(page.getByRole('heading', { name: /equipment/i, level: 1 })).toBeVisible();
  
  // Wait for equipment list to load
  await page.waitForSelector('[data-testid="equipment-list"]');
  
  // Check if equipment items are displayed
  const equipmentItems = page.locator('[data-testid="equipment-item"]');
  await expect(equipmentItems.count()).resolves.toBeGreaterThanOrEqual(1);
  
  // Check if equipment details are displayed
  await expect(page.getByTestId('equipment-name')).toBeVisible();
  await expect(page.getByTestId('equipment-status')).toBeVisible();
});

test('user can filter equipment list', async ({ page }) => {
  // Navigate to equipment page
  await page.goto('/equipment');
  
  // Wait for equipment list to load
  await page.waitForSelector('[data-testid="equipment-list"]');
  
  // Get initial count of equipment items
  const initialItemCount = await page.locator('[data-testid="equipment-item"]').count();
  
  // Filter by status "Operational"
  await page.getByTestId('status-filter').click();
  await page.getByRole('option', { name: /operational/i }).click();
  
  // Check if the list has been filtered
  const filteredItemCount = await page.locator('[data-testid="equipment-item"]').count();
  
  // If filter works, filtered count should be less than or equal to initial count
  expect(filteredItemCount).toBeLessThanOrEqual(initialItemCount);
  
  // All visible items should have "Operational" status
  const visibleStatusTexts = await page.locator('[data-testid="equipment-status"]').allTextContents();
  for (const status of visibleStatusTexts) {
    expect(status.toLowerCase()).toContain('operational');
  }
});

test('user can view equipment details', async ({ page }) => {
  // Navigate to equipment page
  await page.goto('/equipment');
  
  // Wait for equipment list to load
  await page.waitForSelector('[data-testid="equipment-list"]');
  
  // Click on the first equipment item
  await page.locator('[data-testid="equipment-item"]').first().click();
  
  // Check if we navigated to the equipment details page
  await expect(page).toHaveURL(/.*equipment\/[^/]+$/);
  
  // Check if equipment details are displayed
  await expect(page.getByTestId('equipment-details')).toBeVisible();
  await expect(page.getByTestId('equipment-name')).toBeVisible();
  await expect(page.getByTestId('equipment-status')).toBeVisible();
  
  // Check if specific sections are present
  await expect(page.getByRole('heading', { name: /specifications/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /maintenance/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /metrics/i })).toBeVisible();
});

test('equipment search functionality works', async ({ page }) => {
  // Navigate to equipment page
  await page.goto('/equipment');
  
  // Wait for equipment list to load
  await page.waitForSelector('[data-testid="equipment-list"]');
  
  // Get initial count of equipment items
  const initialItemCount = await page.locator('[data-testid="equipment-item"]').count();
  
  // Search for "CNC"
  await page.getByTestId('equipment-search').fill('CNC');
  await page.getByTestId('equipment-search').press('Enter');
  
  // Wait for search results
  await page.waitForTimeout(500);
  
  // Check if the list has been filtered
  const searchResultsCount = await page.locator('[data-testid="equipment-item"]').count();
  
  // If search works, results count should be less than or equal to initial count
  expect(searchResultsCount).toBeLessThanOrEqual(initialItemCount);
  
  // All visible items should contain "CNC" in their name or type
  const visibleNames = await page.locator('[data-testid="equipment-name"]').allTextContents();
  const visibleTypes = await page.locator('[data-testid="equipment-type"]').allTextContents();
  
  for (let i = 0; i < visibleNames.length; i++) {
    const nameContainsCNC = visibleNames[i].toLowerCase().includes('cnc');
    const typeContainsCNC = visibleTypes[i].toLowerCase().includes('cnc');
    expect(nameContainsCNC || typeContainsCNC).toBeTruthy();
  }
});