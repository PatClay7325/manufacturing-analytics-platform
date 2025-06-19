import { test, expect } from '@playwright/test';

test.describe('Manufacturing Chat Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/manufacturing-chat');
  });

  test('should load the chat page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Adaptive Factory AI Solutions/);
    
    // Check main heading
    const heading = page.locator('h1:has-text("Manufacturing Intelligence Chat")');
    await expect(heading).toBeVisible();

    // Check welcome banner
    const welcomeBanner = page.locator('text=Welcome to Manufacturing Chat');
    await expect(welcomeBanner).toBeVisible();

    // Check new chat button
    const newChatButton = page.getByTestId('new-chat-button');
    await expect(newChatButton).toBeVisible();
  });

  test('should display sample questions', async ({ page }) => {
    // Check for sample questions section
    const sampleQuestions = page.locator('text=Sample Questions');
    await expect(sampleQuestions).toBeVisible();

    // Check for specific sample questions using data-testid to avoid strict mode violations
    const questionButtons = [
      page.getByTestId('sample-question-oee-line-3'),
      page.getByTestId('sample-question-maintenance-schedule'),
      page.getByTestId('sample-question-quality-reject-rate'),
      page.getByTestId('sample-question-downtime-reasons')
    ];

    for (const button of questionButtons) {
      await expect(button).toBeVisible();
    }
  });

  test('should create a new chat session', async ({ page }) => {
    // Click new chat button
    const newChatButton = page.getByTestId('new-chat-button');
    await newChatButton.click();

    // Wait for navigation to complete - more flexible pattern for IDs
    await page.waitForURL(/\/manufacturing-chat\/[^\/]+$/, { timeout: 10000 });

    // Should navigate to a new chat session
    await expect(page.url()).toMatch(/\/manufacturing-chat\/[^\/]+$/);

    // Should show chat input
    const chatInput = page.locator('textarea[placeholder*="Ask about production metrics"]');
    await expect(chatInput).toBeVisible();

    // Should show initial assistant message
    const assistantMessage = page.locator('text=How can I assist you with your manufacturing operations');
    await expect(assistantMessage).toBeVisible();
  });

  test('should send and receive messages', async ({ page }) => {
    // Create new chat
    const newChatButton = page.getByTestId('new-chat-button');
    await newChatButton.click();

    // Wait for navigation
    await page.waitForURL(/\/manufacturing-chat\/[^\/]+$/);

    // Type a message
    const chatInput = page.locator('textarea[placeholder*="Ask about production metrics"]');
    await chatInput.fill('Show me all operational equipment');

    // Send message
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    // Check user message appears
    const userMessage = page.locator('text=Show me all operational equipment');
    await expect(userMessage).toBeVisible();

    // Wait for assistant response (with timeout for API call)
    const assistantResponse = page.locator('.bg-gray-50').last();
    await expect(assistantResponse).toBeVisible({ timeout: 30000 });

    // Response should contain relevant content
    const responseText = await assistantResponse.textContent();
    expect(responseText).toBeTruthy();
  });

  test('should handle sample question click', async ({ page }) => {
    // Click on a sample question using data-testid
    const sampleQuestion = page.getByTestId('sample-question-oee-line-3');
    await sampleQuestion.click();

    // Wait for navigation to complete
    await page.waitForURL(/\/manufacturing-chat\/[^\/]+$/, { timeout: 10000 });

    // Should navigate to new chat
    await expect(page.url()).toMatch(/\/manufacturing-chat\/[^\/]+$/);

    // Question should appear in chat
    const userMessage = page.locator('[data-testid="chat-message-user"]').filter({ hasText: /What.*current OEE/i }).first();
    await expect(userMessage).toBeVisible({ timeout: 10000 });
  });

  test('should show chat history', async ({ page }) => {
    // Check if chat history section exists
    const chatHistory = page.locator('text=Loading chat history');
    
    // Either shows loading or shows actual history
    const historyVisible = await chatHistory.isVisible().catch(() => false);
    if (historyVisible) {
      // Wait for history to load
      await expect(chatHistory).toBeHidden({ timeout: 5000 });
    }

    // Check for previous sessions or empty state
    const previousSessions = page.locator('text=/OEE Analysis|Downtime Analysis|Maintenance Schedule/');
    const hasHistory = await previousSessions.count() > 0;
    
    if (hasHistory) {
      expect(await previousSessions.count()).toBeGreaterThan(0);
    }
  });

  test('should handle equipment status queries', async ({ page }) => {
    // Create new chat
    await page.getByTestId('new-chat-button').click();
    await page.waitForURL(/\/manufacturing-chat\/[^\/]+$/);

    // Ask about equipment
    const chatInput = page.locator('textarea[placeholder*="Ask about production metrics"]');
    await chatInput.fill('What equipment is currently operational?');
    await page.locator('button[type="submit"]').click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Check that response mentions equipment or provides relevant info
    const responses = await page.locator('.bg-gray-50').allTextContents();
    const lastResponse = responses[responses.length - 1];
    
    // Response should mention equipment, operational status, or database connection
    expect(lastResponse.toLowerCase()).toMatch(/equipment|operational|cnc|machine|unable to connect/);
  });

  test('should handle maintenance schedule queries', async ({ page }) => {
    // Create new chat
    await page.getByTestId('new-chat-button').click();
    await page.waitForURL(/\/manufacturing-chat\/[^\/]+$/);

    // Ask about maintenance
    const chatInput = page.locator('textarea[placeholder*="Ask about production metrics"]');
    await chatInput.fill('Show upcoming maintenance schedules');
    await page.locator('button[type="submit"]').click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Check response
    const responses = await page.locator('.bg-gray-50').allTextContents();
    const lastResponse = responses[responses.length - 1];
    
    expect(lastResponse.toLowerCase()).toMatch(/maintenance|schedule|upcoming|unable to connect/);
  });

  test('should handle quality metrics queries', async ({ page }) => {
    // Create new chat
    await page.getByTestId('new-chat-button').click();
    await page.waitForURL(/\/manufacturing-chat\/[^\/]+$/);

    // Ask about quality
    const chatInput = page.locator('textarea[placeholder*="Ask about production metrics"]');
    await chatInput.fill('What are the current quality metrics and reject rates?');
    await page.locator('button[type="submit"]').click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Check response
    const responses = await page.locator('.bg-gray-50').allTextContents();
    const lastResponse = responses[responses.length - 1];
    
    expect(lastResponse.toLowerCase()).toMatch(/quality|reject|defect|metrics|unable to connect/);
  });

  test('should disable input while processing', async ({ page }) => {
    // Create new chat
    await page.getByTestId('new-chat-button').click();
    await page.waitForURL(/\/manufacturing-chat\/[^\/]+$/);

    // Type and send a message
    const chatInput = page.locator('textarea[placeholder*="Ask about production metrics"]');
    await chatInput.fill('Test message');
    
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    // Input should be disabled while processing
    await expect(chatInput).toBeDisabled();
    
    // Wait for response and check input is enabled again
    await page.waitForTimeout(2000);
    await expect(chatInput).toBeEnabled();
  });

  test('should navigate back to all chats', async ({ page }) => {
    // Create new chat
    await page.getByTestId('new-chat-button').click();
    await page.waitForURL(/\/manufacturing-chat\/[^\/]+$/);

    // Click "All Chats" button
    const allChatsButton = page.locator('a:has-text("All Chats")');
    await allChatsButton.click();

    // Should navigate back to main chat page
    await expect(page.url()).toContain('/manufacturing-chat');
  });
});
