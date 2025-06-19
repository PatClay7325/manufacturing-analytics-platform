import { test, expect } from '@playwright/test';

test.describe('Find All Broken Buttons and Links', () => {
  
  test('Find all clickable elements and test them', async ({ page }) => {
    const pagesToTest = [
      { url: '/', name: 'Homepage' },
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/equipment', name: 'Equipment' },
      { url: '/alerts', name: 'Alerts' },
      { url: '/manufacturing-chat', name: 'Manufacturing Chat' },
    ];
    
    const brokenElements = [];
    
    for (const pageInfo of pagesToTest) {
      console.log(`\n📄 Testing ${pageInfo.name} (${pageInfo.url})`);
      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      
      // Find all buttons
      const buttons = await page.locator('button').all();
      console.log(`   Found ${buttons.length} buttons`);
      
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const buttonText = await button.textContent().catch(() => 'No text');
        const isVisible = await button.isVisible().catch(() => false);
        const isEnabled = await button.isEnabled().catch(() => false);
        
        if (isVisible) {
          console.log(`   ✓ Button ${i + 1}: "${buttonText?.trim()}" - Visible: ${isVisible}, Enabled: ${isEnabled}`);
          
          if (!isEnabled) {
            brokenElements.push({
              page: pageInfo.name,
              type: 'button',
              text: buttonText?.trim(),
              issue: 'Disabled'
            });
          }
          
          // Try clicking enabled buttons
          if (isEnabled) {
            try {
              // Set up handlers to catch navigation or errors
              const [response] = await Promise.race([
                page.waitForNavigation({ timeout: 1000 }).catch(() => null),
                page.waitForResponse(response => response.status() >= 400, { timeout: 1000 }).catch(() => null),
                button.click().then(() => null)
              ]);
              
              // Check if button did something
              const currentUrl = page.url();
              if (currentUrl === pageInfo.url) {
                // Button didn't navigate, check if it opened modal or changed page state
                await page.waitForTimeout(500);
                // You could add more checks here
              }
            } catch (error) {
              console.log(`   ❌ Button "${buttonText?.trim()}" failed:`, error.message);
              brokenElements.push({
                page: pageInfo.name,
                type: 'button',
                text: buttonText?.trim(),
                issue: 'Click failed'
              });
            }
          }
        }
      }
      
      // Find all links
      const links = await page.locator('a').all();
      console.log(`   Found ${links.length} links`);
      
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const linkText = await link.textContent().catch(() => 'No text');
        const href = await link.getAttribute('href').catch(() => null);
        const isVisible = await link.isVisible().catch(() => false);
        
        if (isVisible && href) {
          console.log(`   ✓ Link ${i + 1}: "${linkText?.trim()}" -> ${href}`);
          
          // Check if href is valid
          if (href === '#' || href === '') {
            brokenElements.push({
              page: pageInfo.name,
              type: 'link',
              text: linkText?.trim(),
              issue: 'No destination'
            });
          }
        }
      }
      
      // Go back to original page if we navigated away
      if (page.url() !== pageInfo.url) {
        await page.goto(pageInfo.url);
      }
    }
    
    // Report findings
    console.log('\n\n🔍 SUMMARY OF FINDINGS:');
    console.log('========================');
    
    if (brokenElements.length === 0) {
      console.log('✅ All buttons and links appear to be functional!');
    } else {
      console.log(`❌ Found ${brokenElements.length} potentially broken elements:\n`);
      brokenElements.forEach((element, index) => {
        console.log(`${index + 1}. ${element.page} - ${element.type}: "${element.text}" - Issue: ${element.issue}`);
      });
    }
    
    // Fail the test if broken elements found
    expect(brokenElements).toHaveLength(0);
  });
  
  // Test forms separately
  test('Find and test all form inputs', async ({ page }) => {
    const pagesToTest = [
      { url: '/equipment', name: 'Equipment' },
      { url: '/manufacturing-chat', name: 'Manufacturing Chat' },
      { url: '/support', name: 'Support' },
    ];
    
    for (const pageInfo of pagesToTest) {
      console.log(`\n📄 Testing forms on ${pageInfo.name}`);
      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      
      // Find all inputs
      const inputs = await page.locator('input, textarea, select').all();
      console.log(`   Found ${inputs.length} form inputs`);
      
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const type = await input.evaluate(el => el.tagName.toLowerCase());
        const inputType = await input.getAttribute('type').catch(() => 'text');
        const placeholder = await input.getAttribute('placeholder').catch(() => '');
        const isVisible = await input.isVisible().catch(() => false);
        const isEnabled = await input.isEnabled().catch(() => false);
        
        if (isVisible) {
          console.log(`   ✓ ${type} (${inputType}): "${placeholder}" - Enabled: ${isEnabled}`);
          
          // Test if we can interact with it
          if (isEnabled && type !== 'select') {
            try {
              await input.click();
              await input.fill('Test input');
              await input.clear();
              console.log(`     ✓ Input is interactive`);
            } catch (error) {
              console.log(`     ❌ Cannot interact with input: ${error.message}`);
            }
          }
        }
      }
    }
  });
});