import { test, expect } from '@playwright/test';

test.describe('AI Chat Page Verification', () => {
  test('AI Chat page loads successfully', async ({ page }) => {
    // Navigate to AI Chat page
    await page.goto('/ai-chat');
    
    // Check page title
    await expect(page).toHaveTitle(/AI/i);
    
    // Check if main elements are visible
    await expect(page.locator('text=AI Assistant')).toBeVisible();
    
    // Check for model selector
    const modelSelector = page.locator('select').filter({ hasText: /Llama|Gemma|Mistral/i });
    await expect(modelSelector).toBeVisible();
    
    // Check for chat input
    const chatInput = page.locator('textarea, input[type="text"]').filter({ hasText: '' });
    await expect(chatInput).toBeVisible();
    
    // Check for new chat button
    await expect(page.locator('button', { hasText: 'New Chat' })).toBeVisible();
  });

  test('AI Assistant link appears in manufacturingPlatform navigation', async ({ page }) => {
    // Go to home page
    await page.goto('/');
    
    // Check for AI Assistant link in navigation
    const aiAssistantLink = page.locator('a', { hasText: 'AI Assistant' });
    await expect(aiAssistantLink).toBeVisible();
    
    // Click the link and verify navigation
    await aiAssistantLink.click();
    await expect(page).toHaveURL('/ai-chat');
  });

  test('Chat UI components render properly', async ({ page }) => {
    await page.goto('/ai-chat');
    
    // Check for sidebar with sessions
    const sidebar = page.locator('div').filter({ hasText: 'No conversations yet' }).first();
    await expect(sidebar).toBeVisible();
    
    // Check for main chat area
    const chatArea = page.locator('text=Start a conversation');
    await expect(chatArea).toBeVisible();
    
    // Check for thought process panel toggle
    const thoughtToggle = page.locator('button').filter({ hasText: /Thought|Settings/i });
    await expect(thoughtToggle.first()).toBeVisible();
    
    // Check for export and regenerate buttons
    await expect(page.locator('button[title="Export chat"]')).toBeVisible();
    await expect(page.locator('button[title="Regenerate response"]')).toBeVisible();
  });

  test('Model selector has correct options', async ({ page }) => {
    await page.goto('/ai-chat');
    
    // Find and click the model selector
    const modelSelector = page.locator('select').first();
    await expect(modelSelector).toBeVisible();
    
    // Get all options
    const options = await modelSelector.locator('option').allTextContents();
    
    // Verify expected models are present
    expect(options).toContain('Llama 3');
    expect(options).toContain('Command R+');
    expect(options).toContain('Mistral');
    expect(options).toContain('Gemma');
  });

  test('Chat input accepts and sends messages', async ({ page }) => {
    await page.goto('/ai-chat');
    
    // Find chat input
    const chatInput = page.locator('textarea, input[type="text"]').last();
    await expect(chatInput).toBeVisible();
    
    // Type a message
    await chatInput.fill('Hello, AI Assistant!');
    
    // Find and click send button
    const sendButton = page.locator('button[type="submit"], button').filter({ hasText: /Send|Submit/i });
    if (await sendButton.count() > 0) {
      await sendButton.click();
    } else {
      // Try pressing Enter
      await chatInput.press('Enter');
    }
    
    // Wait for message to appear in chat
    await expect(page.locator('text=Hello, AI Assistant!')).toBeVisible({ timeout: 5000 });
  });

  test('Streaming API endpoint is accessible', async ({ page, request }) => {
    // Test the streaming endpoint directly
    const response = await request.post('/api/chat/stream', {
      data: {
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'gemma',
        stream: true
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Check response status
    expect(response.status()).toBeLessThan(500); // Should not be a server error
    
    // Check content type for SSE
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/event-stream');
  });
});

test.describe('AI Chat Page Error Handling', () => {
  test('Shows error message when Ollama is not available', async ({ page }) => {
    // Mock Ollama being unavailable
    await page.route('**/api/chat/stream', async route => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Ollama service unavailable' })
      });
    });
    
    await page.goto('/ai-chat');
    
    // Send a message
    const chatInput = page.locator('textarea, input[type="text"]').last();
    await chatInput.fill('Test message');
    await chatInput.press('Enter');
    
    // Check for error message
    await expect(page.locator('text=/error|sorry|encountered/i')).toBeVisible({ timeout: 10000 });
  });
});