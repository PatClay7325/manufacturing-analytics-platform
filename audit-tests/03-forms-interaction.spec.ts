import { test, expect } from '@playwright/test';

test.describe('Forms and Interaction Audit', () => {
  test('Check all forms on the site', async ({ page }) => {
    const formsToTest = [
      { 
        name: 'Support Ticket Form',
        path: '/support',
        formSelector: 'form',
        requiredFields: ['name', 'email', 'category', 'message']
      },
      {
        name: 'Chat Input Form',
        path: '/manufacturing-chat',
        formSelector: 'form',
        requiredFields: ['message'] // Assuming chat has an input
      },
      {
        name: 'Status Subscribe Form',
        path: '/status',
        formSelector: 'form',
        requiredFields: ['email']
      }
    ];
    
    console.log(`\n=== Forms Interaction Audit ===`);
    
    for (const formTest of formsToTest) {
      console.log(`\nTesting: ${formTest.name}`);
      
      try {
        await page.goto(formTest.path, { waitUntil: 'networkidle' });
        
        // Check if form exists
        const form = await page.$(formTest.formSelector);
        if (!form) {
          console.log(`❌ Form not found at ${formTest.path}`);
          continue;
        }
        
        console.log(`✅ Form found`);
        
        // Check required fields
        for (const fieldName of formTest.requiredFields) {
          const field = await page.$(`[name="${fieldName}"], [id="${fieldName}"], [placeholder*="${fieldName}" i]`);
          if (field) {
            console.log(`✅ Field '${fieldName}' exists`);
            
            // Check if field is properly labeled
            const label = await page.$(`label[for="${fieldName}"]`);
            if (!label) {
              console.log(`⚠️ Field '${fieldName}' missing proper label`);
            }
          } else {
            console.log(`❌ Required field '${fieldName}' not found`);
          }
        }
        
        // Test form submission with empty fields
        const submitButton = await form.$('button[type="submit"], input[type="submit"], button:has-text("Submit")');
        if (submitButton) {
          await submitButton.click();
          
          // Check for validation messages
          await page.waitForTimeout(1000);
          const validationMessages = await page.$$('.error, [class*="error"], [role="alert"]');
          
          if (validationMessages.length > 0) {
            console.log(`✅ Form validation is working (${validationMessages.length} validation messages)`);
          } else {
            console.log(`⚠️ No validation messages shown for empty form submission`);
          }
        } else {
          console.log(`❌ Submit button not found`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing form: ${error.message}`);
      }
    }
  });
  
  test('Check interactive elements', async ({ page }) => {
    console.log(`\n=== Interactive Elements Audit ===`);
    
    // Test dashboard page interactions
    await page.goto('/dashboard');
    
    // Check for interactive charts
    const charts = await page.$$('[class*="highcharts"], canvas, svg[class*="chart"]');
    console.log(`\nCharts found: ${charts.length}`);
    
    // Test equipment page filters
    await page.goto('/equipment');
    
    try {
      // Check for filter buttons or dropdowns
      const filters = await page.$$('select, [role="combobox"], button[class*="filter"]');
      console.log(`\nFilters found: ${filters.length}`);
      
      // Test equipment cards
      const equipmentCards = await page.$$('[data-testid="equipment-card"], [class*="equipment-card"]');
      console.log(`Equipment cards found: ${equipmentCards.length}`);
      
      if (equipmentCards.length > 0) {
        // Try clicking first card
        await equipmentCards[0].click();
        await page.waitForLoadState('networkidle');
        
        // Check if we navigated to detail page
        const url = page.url();
        if (url.includes('/equipment/')) {
          console.log('✅ Equipment card click navigation works');
          
          // Go back
          await page.goBack();
        } else {
          console.log('⚠️ Equipment card click does not navigate to detail page');
        }
      }
    } catch (error) {
      console.log(`❌ Error testing equipment interactions: ${error.message}`);
    }
    
    // Test alerts page
    await page.goto('/alerts');
    
    try {
      // Check for alert items
      const alerts = await page.$$('[class*="alert-item"], [data-testid*="alert"]');
      console.log(`\nAlert items found: ${alerts.length}`);
      
      // Check for acknowledge buttons
      const ackButtons = await page.$$('button:has-text("Acknowledge"), button:has-text("Dismiss")');
      console.log(`Acknowledge buttons found: ${ackButtons.length}`);
      
    } catch (error) {
      console.log(`❌ Error testing alerts: ${error.message}`);
    }
  });
  
  test('Check chat functionality', async ({ page }) => {
    console.log(`\n=== Chat Functionality Audit ===`);
    
    await page.goto('/manufacturing-chat');
    
    try {
      // Check for chat input
      const chatInput = await page.$('input[type="text"], textarea');
      if (chatInput) {
        console.log('✅ Chat input found');
        
        // Type a message
        await chatInput.fill('Test message');
        
        // Look for send button
        const sendButton = await page.$('button:has-text("Send"), button[type="submit"]');
        if (sendButton) {
          console.log('✅ Send button found');
          
          // Check if button is enabled
          const isDisabled = await sendButton.isDisabled();
          if (!isDisabled) {
            console.log('✅ Send button is enabled with text');
          } else {
            console.log('❌ Send button is disabled even with text');
          }
        } else {
          console.log('❌ Send button not found');
        }
        
        // Check for sample questions
        const sampleQuestions = await page.$$('button[class*="sample"], [data-testid*="sample"]');
        console.log(`Sample questions found: ${sampleQuestions.length}`);
        
      } else {
        console.log('❌ Chat input not found');
      }
      
      // Check for chat history
      const chatMessages = await page.$$('[class*="message"], [data-testid*="message"]');
      console.log(`Chat messages displayed: ${chatMessages.length}`);
      
    } catch (error) {
      console.log(`❌ Error testing chat: ${error.message}`);
    }
  });
});