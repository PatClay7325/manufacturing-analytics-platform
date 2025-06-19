import { test, expect } from '@playwright/test';

test.describe('AI Chat Basic Tests', () => {
  test('can send a message and receive response', async ({ page }) => {
    await page.goto('/manufacturing-chat');
    
    // Create new chat
    await page.getByTestId('new-chat-button').click();
    await page.waitForURL(/\/manufacturing-chat\/[a-zA-Z0-9-]+$/);
    
    // Send a message
    const chatInput = page.locator('textarea[data-testid="chat-input-textarea"]');
    await chatInput.fill('Hello, show me equipment status');
    
    // Press Enter to send (alternative to clicking button)
    await chatInput.press('Enter');
    
    // Wait for any assistant response
    await page.waitForSelector('[data-testid="chat-message-assistant"]', { timeout: 20000 });
    
    // Verify we have at least one user message and one assistant response
    const messages = await page.locator('[data-testid="chat-message"]').count();
    expect(messages).toBeGreaterThanOrEqual(2);
  });
  
  test('chat persists messages in session', async ({ page }) => {
    await page.goto('/manufacturing-chat');
    
    // Create new chat
    await page.getByTestId('new-chat-button').click();
    await page.waitForURL(/\/manufacturing-chat\/[a-zA-Z0-9-]+$/);
    
    // Get chat ID from URL
    const chatId = page.url().split('/').pop();
    
    // Send a message
    const chatInput = page.locator('textarea[data-testid="chat-input-textarea"]');
    await chatInput.fill('Test message for persistence');
    await chatInput.press('Enter');
    
    // Wait for response
    await page.waitForSelector('[data-testid="chat-message-assistant"]', { timeout: 20000 });
    
    // Navigate away and back
    await page.goto('/manufacturing-chat');
    await page.goto(`/manufacturing-chat/${chatId}`);
    
    // Verify message is still there
    await expect(page.locator('text=Test message for persistence')).toBeVisible();
  });
});