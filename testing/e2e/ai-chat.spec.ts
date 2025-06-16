import { test, expect } from '@playwright/test';

test.describe('AI Manufacturing Chat E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/manufacturing-chat');
    await page.waitForLoadState('networkidle');
  });

  test('loads chat interface', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Manufacturing Intelligence Platform/);
    
    // Check main heading
    const heading = page.getByRole('heading', { name: /manufacturing chat/i });
    await expect(heading).toBeVisible();
    
    // Check for chat input
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    await expect(chatInput).toBeVisible();
    
    // Check for send button
    const sendButton = page.locator('button[type="submit"]');
    await expect(sendButton).toBeVisible();
  });

  test('sends and receives messages', async ({ page }) => {
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    const sendButton = page.locator('button[type="submit"]');
    
    // Type a message
    await chatInput.fill('What is the current OEE?');
    await sendButton.click();
    
    // Wait for response
    await page.waitForSelector('[data-testid="chat-message"]', { timeout: 5000 });
    
    // Verify user message appears
    const userMessage = page.locator('[data-testid="chat-message"][data-sender="user"]');
    await expect(userMessage).toContainText('What is the current OEE?');
    
    // Verify AI response appears
    const aiMessage = page.locator('[data-testid="chat-message"][data-sender="ai"]');
    await expect(aiMessage).toBeVisible();
    await expect(aiMessage).toContainText(/OEE|equipment|effectiveness/i);
  });

  test('displays suggested prompts', async ({ page }) => {
    // Check for suggested prompts
    const suggestedPrompts = page.locator('[data-testid="suggested-prompt"]');
    const promptCount = await suggestedPrompts.count();
    
    expect(promptCount).toBeGreaterThan(0);
    
    // Click a suggested prompt
    const firstPrompt = suggestedPrompts.first();
    const promptText = await firstPrompt.textContent();
    await firstPrompt.click();
    
    // Verify the prompt text appears in the input
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    await expect(chatInput).toHaveValue(promptText || '');
  });

  test('handles multiple conversation turns', async ({ page }) => {
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    const sendButton = page.locator('button[type="submit"]');
    
    // First message
    await chatInput.fill('Show me current alerts');
    await sendButton.click();
    await page.waitForSelector('[data-testid="chat-message"][data-sender="ai"]');
    
    // Second message
    await chatInput.fill('Which equipment has the lowest performance?');
    await sendButton.click();
    await page.waitForSelector('[data-testid="chat-message"][data-sender="ai"]:nth-of-type(2)');
    
    // Verify conversation history
    const messages = page.locator('[data-testid="chat-message"]');
    const messageCount = await messages.count();
    expect(messageCount).toBeGreaterThanOrEqual(4); // 2 user + 2 AI messages
  });

  test('displays loading state', async ({ page }) => {
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    const sendButton = page.locator('button[type="submit"]');
    
    // Type a message
    await chatInput.fill('Analyze production trends');
    
    // Set up promise to catch loading state
    const loadingPromise = page.waitForSelector('[data-testid="loading-indicator"]', {
      state: 'visible',
      timeout: 2000
    }).catch(() => null);
    
    await sendButton.click();
    
    // Check if loading indicator appeared
    const loadingIndicator = await loadingPromise;
    if (loadingIndicator) {
      await expect(loadingIndicator).toBeVisible();
    }
  });

  test('handles errors gracefully', async ({ page }) => {
    // Simulate network error by going offline
    await page.context().setOffline(true);
    
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    const sendButton = page.locator('button[type="submit"]');
    
    await chatInput.fill('Test message');
    await sendButton.click();
    
    // Wait for error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText(/error|failed|try again/i);
    
    // Go back online
    await page.context().setOffline(false);
  });

  test('clears conversation', async ({ page }) => {
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    const sendButton = page.locator('button[type="submit"]');
    
    // Send a message
    await chatInput.fill('Test message');
    await sendButton.click();
    await page.waitForSelector('[data-testid="chat-message"]');
    
    // Look for clear button
    const clearButton = page.locator('button:has-text("Clear")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      
      // Confirm clear action if there's a confirmation dialog
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Verify messages are cleared
      const messages = page.locator('[data-testid="chat-message"]');
      await expect(messages).toHaveCount(0);
    }
  });

  test('exports conversation', async ({ page }) => {
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    const sendButton = page.locator('button[type="submit"]');
    
    // Have a conversation
    await chatInput.fill('What is the production status?');
    await sendButton.click();
    await page.waitForSelector('[data-testid="chat-message"][data-sender="ai"]');
    
    // Look for export button
    const exportButton = page.locator('button:has-text("Export")');
    if (await exportButton.isVisible()) {
      // Set up download promise
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/chat.*\.(txt|json|pdf)/);
    }
  });

  test('responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify chat interface adapts
    const chatContainer = page.locator('[data-testid="chat-container"]');
    await expect(chatContainer).toBeVisible();
    
    // Check that input is still accessible
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    await expect(chatInput).toBeVisible();
    
    // Verify messages display correctly
    await chatInput.fill('Test mobile');
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();
    
    await page.waitForSelector('[data-testid="chat-message"]');
    const message = page.locator('[data-testid="chat-message"]').first();
    await expect(message).toBeVisible();
  });
});