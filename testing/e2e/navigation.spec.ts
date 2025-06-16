import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to all main pages', async ({ page }) => {
    // Start at the home page
    await page.goto('/');
    
    // Verify home page loaded
    await expect(page).toHaveTitle(/Manufacturing Intelligence Platform/);
    
    // Navigate to Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Manufacturing Dashboard' })).toBeVisible();
    
    // Navigate to Equipment
    await page.getByRole('link', { name: 'Equipment' }).click();
    await expect(page.getByRole('heading', { name: 'Equipment Monitoring' })).toBeVisible();
    
    // Navigate to Alerts
    await page.getByRole('link', { name: 'Alerts' }).click();
    await expect(page.getByRole('heading', { name: 'Manufacturing Alerts' })).toBeVisible();
    
    // Navigate to AI Chat
    await page.getByRole('link', { name: 'AI Chat' }).click();
    await expect(page.getByRole('heading', { name: /manufacturing chat/i })).toBeVisible();
    
    // Navigate back to Home
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page.getByRole('heading', { name: 'Ready to transform your manufacturing operations?' })).toBeVisible();
  });

  test('dashboard shows key performance indicators', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for OEE card
    await expect(page.getByText('OEE')).toBeVisible();
    
    // Check for Availability card
    await expect(page.getByText('Availability')).toBeVisible();
    
    // Check for Performance card
    await expect(page.getByText('Performance')).toBeVisible();
    
    // Check for Quality card
    await expect(page.getByText('Quality')).toBeVisible();
  });
});