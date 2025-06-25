
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('   Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    
    console.log('   Filling login form...');
    await page.fill('input[name="email"]', 'demo@manufacturing.local');
    await page.fill('input[name="password"]', 'demo123');
    
    console.log('   Clicking login button...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    await page.waitForTimeout(2000);
    
    const url = page.url();
    console.log('   Current URL:', url);
    
    if (url.includes('/dashboard') || url.includes('/home') || !url.includes('/login')) {
      console.log('✓ Login successful - redirected from login page');
    } else {
      // Check for error messages
      const errorText = await page.textContent('body');
      if (errorText.includes('Invalid credentials') || errorText.includes('Authentication failed')) {
        console.log('✗ Login failed - invalid credentials');
      } else {
        console.log('✗ Login failed - still on login page');
      }
    }
    
  } catch (error) {
    console.error('✗ Playwright test error:', error.message);
  } finally {
    await browser.close();
  }
})();
