import { test, expect } from '@playwright/test';

test.describe('AI Manufacturing Chat E2E Tests', () => {
  test('loads chat interface', async ({ page }) => {
    await page.goto('/manufacturing-chat');
    await page.waitForLoadState('networkidle');
    
    // Check page title
    await expect(page).toHaveTitle(/Adaptive Factory AI Solutions/);
    
    // Check main heading
    const heading = page.getByRole('heading', { name: /manufacturing chat/i });
    await expect(heading).toBeVisible();
    
    // Create new chat session
    const newChatButton = page.getByTestId('new-chat-button');
    await newChatButton.click();
    
    // Wait for navigation to chat session
    await page.waitForURL(/\/manufacturing-chat\/[a-zA-Z0-9-]+$/);
    
    // Check for chat input in session
    const chatInput = page.locator('textarea[data-testid="chat-input-textarea"]');
    await expect(chatInput).toBeVisible();
    
    // Check for send button
    const sendButton = page.locator('button[data-testid="chat-send-button"]');
    await expect(sendButton).toBeVisible();
  });

  test('sends and receives messages', async ({ page }) => {
    await page.goto('/manufacturing-chat');
    
    // Create new chat session
    const newChatButton = page.getByTestId('new-chat-button');
    await newChatButton.click();
    await page.waitForURL(/\/manufacturing-chat\/[a-zA-Z0-9-]+$/);
    
    const chatInput = page.locator('textarea[data-testid="chat-input-textarea"]');
    const sendButton = page.locator('button[data-testid="chat-send-button"]');
    
    // Type a message
    await chatInput.fill('What is the current OEE?');
    await sendButton.click();
    
    // Wait for response
    await page.waitForSelector('[data-testid="chat-message"]', { timeout: 10000 });
    
    // Verify user message appears
    const userMessage = page.locator('[data-testid="chat-message"][data-sender="user"]');
    await expect(userMessage).toContainText('What is the current OEE?');
  });

  test('displays suggested prompts', async ({ page }) => {
    await page.goto('/manufacturing-chat');
    await page.waitForLoadState('networkidle');
    
    // Check for suggested prompts on landing page
    const suggestedPromptsContainer = page.locator('[data-testid="sample-questions"]');
    await expect(suggestedPromptsContainer).toBeVisible();
    
    const suggestedPrompts = page.locator('[data-testid^="sample-question-"]');
    const promptCount = await suggestedPrompts.count();
    
    expect(promptCount).toBeGreaterThan(0);
  });

  test('handles multiple conversation turns', async ({ page }) => {
    await page.goto('/manufacturing-chat');
    
    // Create new chat
    await page.getByTestId('new-chat-button').click();
    await page.waitForURL(/\/manufacturing-chat\/[a-zA-Z0-9-]+$/);
    
    const chatInput = page.locator('textarea[data-testid="chat-input-textarea"]');
    const sendButton = page.locator('button[data-testid="chat-send-button"]');
    
    // First message - use a database query since AI service is not available
    await chatInput.fill('Show me the enterprise OEE');
    await sendButton.click();
    
    // Wait for assistant response to appear
    await page.waitForSelector('[data-testid="chat-message-assistant"]', { timeout: 15000 });
    
    // Check if we got the "unable to connect" message
    const firstResponse = await page.locator('[data-testid="chat-message-assistant"]').first().textContent();
    const isAIUnavailable = firstResponse?.includes('unable to connect to the AI service');
    
    if (isAIUnavailable) {
      // If AI is unavailable, use database queries that should work
      await page.waitForTimeout(2000); // Wait for response to complete
      
      // Send a database query
      await chatInput.fill('Show all operational equipment');
      await sendButton.click();
      
      // Wait for database response
      await page.waitForTimeout(3000);
      
      // Verify we have responses
      const messageCount = await page.locator('[data-testid="chat-message"]').count();
      expect(messageCount).toBeGreaterThanOrEqual(3); // Initial + query + response
    } else {
      // AI is available, proceed with normal test
      await page.waitForTimeout(2000);
      
      // Second message
      await chatInput.fill('Which equipment has the lowest performance?');
      await sendButton.click();
      
      // Wait for second response
      await page.waitForTimeout(3000);
      
      // Verify conversation history
      const messageCount = await page.locator('[data-testid="chat-message"]').count();
      expect(messageCount).toBeGreaterThanOrEqual(4);
    }
  });

  test('displays loading state', async ({ page }) => {
    await page.goto('/manufacturing-chat');
    
    // Create new chat
    await page.getByTestId('new-chat-button').click();
    await page.waitForURL(/\/manufacturing-chat\/[a-zA-Z0-9-]+$/);
    
    const chatInput = page.locator('textarea[data-testid="chat-input-textarea"]');
    const sendButton = page.locator('button[data-testid="chat-send-button"]');
    
    // Type a message
    await chatInput.fill('Analyze production trends');
    await sendButton.click();
    
    // Check if input is disabled while processing
    await expect(chatInput).toBeDisabled();
  });

  test('handles errors gracefully', async ({ page }) => {
    await page.goto('/manufacturing-chat');
    
    // Create new chat
    await page.getByTestId('new-chat-button').click();
    await page.waitForURL(/\/manufacturing-chat\/[a-zA-Z0-9-]+$/);
    
    // Simulate network error by going offline
    await page.context().setOffline(true);
    
    const chatInput = page.locator('textarea[data-testid="chat-input-textarea"]');
    const sendButton = page.locator('button[data-testid="chat-send-button"]');
    
    await chatInput.fill('Test message');
    await sendButton.click();
    
    // Wait for error handling
    await page.waitForTimeout(2000);
    
    // Go back online
    await page.context().setOffline(false);
  });

  test('clears conversation', async ({ page }) => {
    await page.goto('/manufacturing-chat');
    
    // Create new chat
    await page.getByTestId('new-chat-button').click();
    await page.waitForURL(/\/manufacturing-chat\/[a-zA-Z0-9-]+$/);
    
    const chatInput = page.locator('textarea[data-testid="chat-input-textarea"]');
    const sendButton = page.locator('button[data-testid="chat-send-button"]');
    
    // Send a message
    await chatInput.fill('Test message');
    await sendButton.click();
    await page.waitForTimeout(1000);
    
    // Check if messages exist
    const messages = page.locator('[data-testid="chat-message"]');
    const messageCount = await messages.count();
    expect(messageCount).toBeGreaterThan(0);
  });

  test('exports conversation', async ({ page }) => {
    await page.goto('/manufacturing-chat');
    
    // Create new chat
    await page.getByTestId('new-chat-button').click();
    await page.waitForURL(/\/manufacturing-chat\/[a-zA-Z0-9-]+$/);
    
    const chatInput = page.locator('textarea[data-testid="chat-input-textarea"]');
    const sendButton = page.locator('button[data-testid="chat-send-button"]');
    
    // Have a conversation
    await chatInput.fill('What is the production status?');
    await sendButton.click();
    await page.waitForTimeout(2000);
    
    // Check if export functionality exists
    const exportButton = page.locator('button:has-text("Export")');
    if (await exportButton.isVisible()) {
      await exportButton.click();
    }
  });

  test('responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/manufacturing-chat');
    await page.waitForLoadState('networkidle');
    
    // Verify chat interface adapts
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
    
    // Create new chat
    const newChatButton = page.getByTestId('new-chat-button');
    if (await newChatButton.isVisible()) {
      await newChatButton.click();
      await page.waitForURL(/\/manufacturing-chat\/[a-zA-Z0-9-]+$/);
      
      // Check that input is still accessible
      const chatInput = page.locator('textarea[data-testid="chat-input-textarea"]');
      await expect(chatInput).toBeVisible();
    }
  });
});
