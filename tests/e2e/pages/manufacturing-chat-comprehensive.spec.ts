import { test, expect, type Page } from '@playwright/test';

test.describe('Manufacturing Chat - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/manufacturing-chat');
  });

  test.describe('Chat Interface', () => {
    test('should display chat interface with all components', async ({ page }) => {
      // Main chat components
      await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-messages"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-input-container"]')).toBeVisible();
      
      // Header elements
      await expect(page.locator('[data-testid="assistant-name"]')).toContainText(/Manufacturing Assistant/i);
      await expect(page.locator('[data-testid="assistant-status"]')).toContainText(/Online/i);
      
      // Welcome message
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText(/How can I help/i);
    });

    test('should display sample questions', async ({ page }) => {
      const sampleQuestions = page.locator('[data-testid="sample-questions"]');
      await expect(sampleQuestions).toBeVisible();
      
      // Should have multiple sample questions
      const questions = sampleQuestions.locator('[data-testid^="sample-question-"]');
      await expect(questions).toHaveCount(await questions.count());
      expect(await questions.count()).toBeGreaterThan(2);
      
      // Click a sample question
      const firstQuestion = questions.first();
      const questionText = await firstQuestion.textContent();
      await firstQuestion.click();
      
      // Should populate input
      await expect(page.locator('[data-testid="chat-input"]')).toHaveValue(questionText || '');
    });

    test('should send and receive messages', async ({ page }) => {
      // Type a message
      const testMessage = 'What is the current OEE for CNC Machine 1?';
      await page.fill('[data-testid="chat-input"]', testMessage);
      
      // Send message
      await page.click('[data-testid="send-message-button"]');
      
      // User message should appear
      await expect(page.locator('[data-testid="user-message"]').last()).toContainText(testMessage);
      
      // Should show typing indicator
      await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
      
      // Assistant response should appear
      await expect(page.locator('[data-testid="assistant-message"]').last()).toBeVisible({ timeout: 10000 });
      
      // Response should contain relevant information
      const response = await page.locator('[data-testid="assistant-message"]').last().textContent();
      expect(response?.toLowerCase()).toContain('oee');
    });

    test('should support keyboard shortcuts', async ({ page }) => {
      const input = page.locator('[data-testid="chat-input"]');
      
      // Focus input
      await input.focus();
      
      // Type message
      await input.type('Test message');
      
      // Ctrl/Cmd + Enter to send
      await page.keyboard.press('Control+Enter');
      
      // Message should be sent
      await expect(page.locator('[data-testid="user-message"]').last()).toContainText('Test message');
      
      // Test new line with Shift+Enter
      await input.type('Line 1');
      await page.keyboard.press('Shift+Enter');
      await input.type('Line 2');
      
      const inputValue = await input.inputValue();
      expect(inputValue).toContain('Line 1\nLine 2');
    });

    test('should handle markdown formatting in responses', async ({ page }) => {
      // Send a question that typically returns formatted response
      await page.fill('[data-testid="chat-input"]', 'Show me the maintenance schedule table');
      await page.click('[data-testid="send-message-button"]');
      
      // Wait for response
      await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });
      
      const lastResponse = page.locator('[data-testid="assistant-message"]').last();
      
      // Check for markdown elements
      const hasTable = await lastResponse.locator('table').count() > 0;
      const hasHeaders = await lastResponse.locator('h1, h2, h3, h4').count() > 0;
      const hasList = await lastResponse.locator('ul, ol').count() > 0;
      const hasCode = await lastResponse.locator('code, pre').count() > 0;
      
      // At least some formatting should be present
      expect(hasTable || hasHeaders || hasList || hasCode).toBe(true);
    });

    test('should display charts and visualizations', async ({ page }) => {
      // Ask for data visualization
      await page.fill('[data-testid="chat-input"]', 'Show me OEE trends for the last week');
      await page.click('[data-testid="send-message-button"]');
      
      // Wait for response with chart
      await expect(page.locator('[data-testid="assistant-message"]').last()).toBeVisible({ timeout: 10000 });
      
      // Check for chart
      const lastMessage = page.locator('[data-testid="assistant-message"]').last();
      const chartContainer = lastMessage.locator('[data-testid="message-chart"]');
      
      if (await chartContainer.isVisible()) {
        // Chart should have rendered
        const canvas = chartContainer.locator('canvas');
        const svg = chartContainer.locator('svg');
        expect(await canvas.count() > 0 || (await svg.count()) > 0).toBe(true);
        
        // Chart should have controls
        await expect(chartContainer.locator('[data-testid="chart-download"]')).toBeVisible();
        await expect(chartContainer.locator('[data-testid="chart-fullscreen"]')).toBeVisible();
      }
    });
  });

  test.describe('Context and Memory', () => {
    test('should maintain conversation context', async ({ page }) => {
      // First message
      await page.fill('[data-testid="chat-input"]', 'My name is John and I work on CNC Machine 5');
      await page.click('[data-testid="send-message-button"]');
      
      // Wait for response
      await expect(page.locator('[data-testid="assistant-message"]')).toHaveCount(2, { timeout: 10000 });
      
      // Follow-up message that requires context
      await page.fill('[data-testid="chat-input"]', 'What machine did I mention?');
      await page.click('[data-testid="send-message-button"]');
      
      // Response should reference CNC Machine 5
      await expect(page.locator('[data-testid="assistant-message"]').last()).toContainText(/CNC Machine 5/i, { timeout: 10000 });
    });

    test('should handle multi-turn conversations', async ({ page }) => {
      // Start a troubleshooting conversation
      await page.fill('[data-testid="chat-input"]', 'Equipment ABC-123 is showing low performance');
      await page.click('[data-testid="send-message-button"]');
      
      await expect(page.locator('[data-testid="assistant-message"]').last()).toBeVisible({ timeout: 10000 });
      
      // Continue conversation
      await page.fill('[data-testid="chat-input"]', 'The performance dropped after maintenance yesterday');
      await page.click('[data-testid="send-message-button"]');
      
      await expect(page.locator('[data-testid="assistant-message"]').last()).toBeVisible({ timeout: 10000 });
      
      // Assistant should provide relevant follow-up
      const response = await page.locator('[data-testid="assistant-message"]').last().textContent();
      expect(response?.toLowerCase()).toMatch(/maintenance|calibration|check|verify/);
    });

    test('should save and load conversation history', async ({ page }) => {
      // Send a message
      const uniqueMessage = `Test message ${Date.now()}`;
      await page.fill('[data-testid="chat-input"]', uniqueMessage);
      await page.click('[data-testid="send-message-button"]');
      
      // Wait for response
      await expect(page.locator('[data-testid="assistant-message"]').last()).toBeVisible({ timeout: 10000 });
      
      // Reload page
      await page.reload();
      
      // Previous messages should be visible
      await expect(page.locator('[data-testid="user-message"]', { hasText: uniqueMessage })).toBeVisible();
    });
  });

  test.describe('Advanced Features', () => {
    test('should handle file uploads', async ({ page }) => {
      // Click attach button
      await page.click('[data-testid="attach-file-button"]');
      
      // Upload file
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles('./tests/fixtures/maintenance-report.csv');
      
      // File should be attached
      await expect(page.locator('[data-testid="attached-file"]')).toBeVisible();
      await expect(page.locator('[data-testid="attached-file-name"]')).toContainText('maintenance-report.csv');
      
      // Send message with attachment
      await page.fill('[data-testid="chat-input"]', 'Analyze this maintenance report');
      await page.click('[data-testid="send-message-button"]');
      
      // Should process file
      await expect(page.locator('[data-testid="assistant-message"]').last()).toContainText(/maintenance|report|analysis/i, { timeout: 15000 });
    });

    test('should support voice input', async ({ page, context }) => {
      // Grant microphone permission
      await context.grantPermissions(['microphone']);
      
      // Click voice input button
      await page.click('[data-testid="voice-input-button"]');
      
      // Should show recording indicator
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();
      
      // Simulate recording (in real test, would use actual audio)
      await page.waitForTimeout(2000);
      
      // Stop recording
      await page.click('[data-testid="stop-recording-button"]');
      
      // Should show transcription in progress
      await expect(page.locator('[data-testid="transcribing-indicator"]')).toBeVisible();
    });

    test('should export conversation', async ({ page }) => {
      // Send some messages
      await page.fill('[data-testid="chat-input"]', 'What is the MTBF for all equipment?');
      await page.click('[data-testid="send-message-button"]');
      
      await expect(page.locator('[data-testid="assistant-message"]').last()).toBeVisible({ timeout: 10000 });
      
      // Open chat menu
      await page.click('[data-testid="chat-menu-button"]');
      
      // Click export
      await page.click('[data-testid="export-conversation"]');
      
      // Export dialog
      await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
      
      // Select format
      await page.click('[data-testid="export-format-pdf"]');
      
      // Download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-conversation"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/conversation.*\.pdf/);
    });

    test('should provide contextual suggestions', async ({ page }) => {
      // Type partial query
      await page.fill('[data-testid="chat-input"]', 'Show me OEE for');
      
      // Suggestions should appear
      await expect(page.locator('[data-testid="suggestions-dropdown"]')).toBeVisible();
      
      // Should have relevant suggestions
      const suggestions = page.locator('[data-testid^="suggestion-"]');
      await expect(suggestions).toHaveCount(await suggestions.count());
      
      // Click a suggestion
      await suggestions.first().click();
      
      // Should complete the input
      const inputValue = await page.locator('[data-testid="chat-input"]').inputValue();
      expect(inputValue.length).toBeGreaterThan('Show me OEE for'.length);
    });

    test('should handle real-time data queries', async ({ page }) => {
      // Ask for real-time data
      await page.fill('[data-testid="chat-input"]', 'What is the current status of all equipment?');
      await page.click('[data-testid="send-message-button"]');
      
      // Should show live data indicator
      await expect(page.locator('[data-testid="live-data-indicator"]')).toBeVisible();
      
      // Response should include real-time information
      const response = page.locator('[data-testid="assistant-message"]').last();
      await expect(response).toBeVisible({ timeout: 10000 });
      
      // Should have timestamp
      await expect(response.locator('[data-testid="data-timestamp"]')).toBeVisible();
      
      // Should have refresh option
      await expect(response.locator('[data-testid="refresh-data-button"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);
      
      // Try to send message
      await page.fill('[data-testid="chat-input"]', 'Test message');
      await page.click('[data-testid="send-message-button"]');
      
      // Should show error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/offline|network/i);
      
      // Should show retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      
      // Retry
      await page.click('[data-testid="retry-button"]');
      
      // Should send successfully
      await expect(page.locator('[data-testid="assistant-message"]').last()).toBeVisible({ timeout: 10000 });
    });

    test('should handle API errors', async ({ page }) => {
      // Mock API error
      await page.route('**/api/chat/generate', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });
      
      // Send message
      await page.fill('[data-testid="chat-input"]', 'Test message');
      await page.click('[data-testid="send-message-button"]');
      
      // Should show error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/error|failed/i);
    });

    test('should handle timeout errors', async ({ page }) => {
      // Mock slow response
      await page.route('**/api/chat/generate', async route => {
        await new Promise(resolve => setTimeout(resolve, 35000)); // Longer than timeout
        route.continue();
      });
      
      // Send message
      await page.fill('[data-testid="chat-input"]', 'Test message');
      await page.click('[data-testid="send-message-button"]');
      
      // Should show timeout error after 30s
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({ timeout: 35000 });
    });

    test('should validate input', async ({ page }) => {
      // Try to send empty message
      await page.click('[data-testid="send-message-button"]');
      
      // Should not send
      await expect(page.locator('[data-testid="user-message"]')).toHaveCount(0);
      
      // Try to send very long message
      const longMessage = 'a'.repeat(5001); // Assuming 5000 char limit
      await page.fill('[data-testid="chat-input"]', longMessage);
      
      // Should show character limit warning
      await expect(page.locator('[data-testid="char-limit-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="char-count"]')).toContainText('5001/5000');
    });
  });

  test.describe('Performance', () => {
    test('should handle message streaming efficiently', async ({ page }) => {
      // Send message that returns streaming response
      await page.fill('[data-testid="chat-input"]', 'Explain the complete maintenance process');
      await page.click('[data-testid="send-message-button"]');
      
      // Should show streaming indicator
      await expect(page.locator('[data-testid="streaming-indicator"]')).toBeVisible();
      
      // Message should update progressively
      const messageElement = page.locator('[data-testid="assistant-message"]').last();
      let previousLength = 0;
      let updates = 0;
      
      for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(500);
        const currentText = await messageElement.textContent();
        const currentLength = currentText?.length || 0;
        
        if (currentLength > previousLength) {
          updates++;
          previousLength = currentLength;
        }
      }
      
      // Should have multiple updates (streaming)
      expect(updates).toBeGreaterThan(2);
    });

    test('should handle rapid message sending', async ({ page }) => {
      // Send multiple messages quickly
      const messages = ['Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5'];
      
      for (const msg of messages) {
        await page.fill('[data-testid="chat-input"]', msg);
        await page.click('[data-testid="send-message-button"]');
        await page.waitForTimeout(100); // Small delay
      }
      
      // All messages should be queued and sent
      for (const msg of messages) {
        await expect(page.locator('[data-testid="user-message"]', { hasText: msg })).toBeVisible();
      }
      
      // Should handle responses properly
      const assistantMessages = page.locator('[data-testid="assistant-message"]');
      await expect(assistantMessages).toHaveCount(messages.length + 1, { timeout: 30000 }); // +1 for welcome message
    });

    test('should lazy load conversation history', async ({ page }) => {
      // Mock large conversation history
      await page.route('**/api/chat/history*', route => {
        const messages = Array.from({ length: 100 }, (_, i) => ({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: new Date(Date.now() - (100 - i) * 60000).toISOString()
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages })
        });
      });
      
      await page.reload();
      
      // Should not render all messages initially
      const visibleMessages = await page.locator('[data-testid^="user-message"], [data-testid^="assistant-message"]').count();
      expect(visibleMessages).toBeLessThan(100);
      
      // Scroll to top to load more
      const chatContainer = page.locator('[data-testid="chat-messages"]');
      await chatContainer.evaluate(el => el.scrollTop = 0);
      
      // Should load more messages
      await page.waitForTimeout(500);
      const newVisibleMessages = await page.locator('[data-testid^="user-message"], [data-testid^="assistant-message"]').count();
      expect(newVisibleMessages).toBeGreaterThan(visibleMessages);
    });
  });

  test.describe('Accessibility', () => {
    test('should be fully keyboard navigable', async ({ page }) => {
      // Tab to input
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="chat-input"]')).toBeFocused();
      
      // Tab to send button
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="send-message-button"]')).toBeFocused();
      
      // Tab to attach file
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="attach-file-button"]')).toBeFocused();
      
      // Navigate messages with arrow keys
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('ArrowUp');
      
      // Should focus on messages
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toMatch(/message/);
    });

    test('should announce new messages', async ({ page }) => {
      // Check for live region
      await expect(page.locator('[aria-live="polite"][aria-label="Chat messages"]')).toHaveCount(1);
      
      // Send message
      await page.fill('[data-testid="chat-input"]', 'Test accessibility');
      await page.click('[data-testid="send-message-button"]');
      
      // New messages should be in live region
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toContainText('Test accessibility');
      
      // Assistant response should also be announced
      await expect(liveRegion.locator('[data-testid="assistant-message"]').last()).toBeVisible({ timeout: 10000 });
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Check main elements
      await expect(page.locator('[data-testid="chat-container"]')).toHaveAttribute('role', 'main');
      await expect(page.locator('[data-testid="chat-messages"]')).toHaveAttribute('role', 'log');
      await expect(page.locator('[data-testid="chat-input"]')).toHaveAttribute('aria-label', /message|chat/i);
      
      // Check buttons
      await expect(page.locator('[data-testid="send-message-button"]')).toHaveAttribute('aria-label', /send/i);
      await expect(page.locator('[data-testid="attach-file-button"]')).toHaveAttribute('aria-label', /attach/i);
    });
  });

  test.describe('Mobile Experience', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should have mobile-optimized layout', async ({ page }) => {
      await page.goto('/manufacturing-chat');
      
      // Chat should be full screen on mobile
      const chatContainer = page.locator('[data-testid="chat-container"]');
      const containerBox = await chatContainer.boundingBox();
      expect(containerBox?.width).toBe(375);
      
      // Input should be at bottom
      const inputContainer = page.locator('[data-testid="chat-input-container"]');
      await expect(inputContainer).toHaveCSS('position', 'fixed');
      await expect(inputContainer).toHaveCSS('bottom', '0px');
      
      // Sample questions should be collapsible
      await expect(page.locator('[data-testid="toggle-samples-button"]')).toBeVisible();
    });

    test('should handle virtual keyboard properly', async ({ page }) => {
      await page.goto('/manufacturing-chat');
      
      // Focus input
      await page.click('[data-testid="chat-input"]');
      
      // Simulate keyboard appearance
      await page.evaluate(() => {
        window.visualViewport?.addEventListener('resize', () => {
          document.documentElement.style.setProperty('--keyboard-height', '300px');
        });
        window.dispatchEvent(new Event('resize'));
      });
      
      // Chat messages should still be visible above keyboard
      const messagesContainer = page.locator('[data-testid="chat-messages"]');
      const messagesBox = await messagesContainer.boundingBox();
      expect(messagesBox?.height).toBeLessThan(367); // 667 - 300 (keyboard)
    });

    test('should support touch interactions', async ({ page }) => {
      await page.goto('/manufacturing-chat');
      
      // Long press on message for options
      const message = page.locator('[data-testid="assistant-message"]').first();
      const box = await message.boundingBox();
      
      if (box) {
        // Simulate long press
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(500); // Long press duration
        await page.mouse.up();
        
        // Context menu should appear
        await expect(page.locator('[data-testid="message-context-menu"]')).toBeVisible();
        await expect(page.locator('[data-testid="copy-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="share-message"]')).toBeVisible();
      }
    });
  });
});
