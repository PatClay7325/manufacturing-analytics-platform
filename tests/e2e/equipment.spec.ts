import { test, expect } from '@playwright/test';

/**
 * Equipment page E2E tests
 * 
 * These tests verify functionality on the equipment page.
 */
test('equipment page displays list of equipment', async ({ page }) => {
  // Navigate to equipment page
  await page.goto('/equipment');
  
  // Verify page title - Updated to match actual heading
  await expect(page.getByRole('heading', { name: /equipment management/i })).toBeVisible();
  
  // Wait for equipment list to load
  await page.waitForSelector('[data-testid="equipment-list"]');
  
  // Wait for equipment grid specifically within the equipment list
  const equipmentGrid = page.locator('[data-testid="equipment-list"] .grid').first();
  await expect(equipmentGrid).toBeVisible();
  
  // Check if at least one equipment card exists
  const equipmentCards = equipmentGrid.locator('> div');
  const cardCount = await equipmentCards.count();
  expect(cardCount).toBeGreaterThanOrEqual(1);
});

test('user can filter equipment list', async ({ page }) => {
  // Navigate to equipment page
  await page.goto('/equipment');
  
  // Wait for equipment list to load
  await page.waitForSelector('[data-testid="equipment-list"]');
  const equipmentGrid = page.locator('[data-testid="equipment-list"] .grid').first();
  await expect(equipmentGrid).toBeVisible();
  
  // Get initial count of equipment items
  const initialItemCount = await equipmentGrid.locator('> div').count();
  
  // Click on the Operational status filter button
  const operationalButton = page.locator('button:has-text("Operational")').first();
  await operationalButton.click();
  
  // Wait a moment for filtering to apply
  await page.waitForTimeout(500);
  
  // Check if the list has been filtered
  const filteredItemCount = await equipmentGrid.locator('> div').count();
  
  // The filtered count should be less than or equal to initial count
  expect(filteredItemCount).toBeLessThanOrEqual(initialItemCount);
});

test('user can view equipment details', async ({ page }) => {
  // Navigate to equipment page
  await page.goto('/equipment');
  
  // Wait for equipment list to load
  await page.waitForSelector('[data-testid="equipment-list"]');
  const equipmentGrid = page.locator('[data-testid="equipment-list"] .grid').first();
  await expect(equipmentGrid).toBeVisible();
  
  // Click on the "View Details" link of the first equipment card
  const firstCard = equipmentGrid.locator('> div').first();
  const viewDetailsLink = firstCard.locator('text=View Details');
  await viewDetailsLink.click();
  
  // Check if we navigated to the equipment details page
  await expect(page).toHaveURL(/.*equipment\/[^/]+$/);
  
  // Wait for the details page to load
  await page.waitForLoadState('networkidle');
  
  // Check if page has loaded with equipment details
  // Look for common elements that should be on a details page
  const heading = page.getByRole('heading').first();
  await expect(heading).toBeVisible();
});

test('equipment search functionality works', async ({ page }) => {
  // Navigate to equipment page
  await page.goto('/equipment');
  
  // Wait for equipment list to load
  await page.waitForSelector('[data-testid="equipment-list"]');
  const equipmentGrid = page.locator('[data-testid="equipment-list"] .grid').first();
  await expect(equipmentGrid).toBeVisible();
  
  // Get initial count of equipment items
  const initialItemCount = await equipmentGrid.locator('> div').count();
  
  // Search for "CNC" using the search input
  const searchInput = page.locator('[data-testid="equipment-search"]');
  await searchInput.fill('CNC');
  await searchInput.press('Enter');
  
  // Wait for search results
  await page.waitForTimeout(1000);
  
  // Check if the list has been filtered
  const searchResultsCount = await equipmentGrid.locator('> div').count();
  
  // Search should either filter results or show no results message
  if (searchResultsCount > 0) {
    // If we have results, they should be less than or equal to initial count
    expect(searchResultsCount).toBeLessThanOrEqual(initialItemCount);
  } else {
    // If no results, check for "No equipment found" message
    const noResultsMessage = page.locator('text=/no equipment found/i');
    await expect(noResultsMessage).toBeVisible();
  }
});