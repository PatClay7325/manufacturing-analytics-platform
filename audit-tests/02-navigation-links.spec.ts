import { test, expect } from '@playwright/test';

test.describe('Navigation and Links Audit', () => {
  test('Check all navigation links', async ({ page }) => {
    const results = {
      totalLinks: 0,
      workingLinks: [],
      brokenLinks: [],
      slowLinks: [],
      externalLinks: [],
    };
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Get all links on the page
    const links = await page.$$eval('a[href]', links => 
      links.map(link => ({
        href: link.href,
        text: link.textContent?.trim() || '',
        isExternal: !link.href.startsWith(window.location.origin)
      }))
    );
    
    results.totalLinks = links.length;
    console.log(`\n=== Navigation Links Audit ===`);
    console.log(`Total links found: ${links.length}`);
    
    // Check each link
    for (const link of links) {
      if (link.isExternal) {
        results.externalLinks.push(link);
        console.log(`External link: ${link.text} -> ${link.href}`);
        continue;
      }
      
      try {
        const startTime = Date.now();
        const response = await page.request.get(link.href);
        const loadTime = Date.now() - startTime;
        
        if (response.ok()) {
          results.workingLinks.push({ ...link, loadTime });
          
          if (loadTime > 3000) {
            results.slowLinks.push({ ...link, loadTime });
            console.log(`⚠️ Slow link (${loadTime}ms): ${link.text} -> ${link.href}`);
          }
        } else {
          results.brokenLinks.push({ ...link, status: response.status() });
          console.log(`❌ Broken link (${response.status()}): ${link.text} -> ${link.href}`);
        }
      } catch (error) {
        results.brokenLinks.push({ ...link, error: error.message });
        console.log(`❌ Error checking link: ${link.text} -> ${link.href}`);
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`✅ Working links: ${results.workingLinks.length}`);
    console.log(`❌ Broken links: ${results.brokenLinks.length}`);
    console.log(`⚠️ Slow links: ${results.slowLinks.length}`);
    console.log(`🔗 External links: ${results.externalLinks.length}`);
  });
  
  test('Check navigation menu functionality', async ({ page }) => {
    await page.goto('/');
    
    const navItems = [
      { text: 'Dashboard', expectedUrl: '/dashboard' },
      { text: 'Equipment', expectedUrl: '/equipment' },
      { text: 'Alerts', expectedUrl: '/alerts' },
      { text: 'AI Chat', expectedUrl: '/manufacturing-chat' },
    ];
    
    console.log(`\n=== Navigation Menu Audit ===`);
    
    for (const item of navItems) {
      try {
        // Click navigation item
        await page.click(`nav a:has-text("${item.text}")`);
        await page.waitForLoadState('networkidle');
        
        // Check if we're on the correct page
        const currentUrl = page.url();
        const isCorrectPage = currentUrl.includes(item.expectedUrl);
        
        if (isCorrectPage) {
          console.log(`✅ ${item.text} navigation works correctly`);
        } else {
          console.log(`❌ ${item.text} navigation failed - Expected: ${item.expectedUrl}, Got: ${currentUrl}`);
        }
        
        // Check if page has content
        const mainContent = await page.$('main');
        const hasContent = mainContent !== null;
        
        if (!hasContent) {
          console.log(`⚠️ ${item.text} page appears to have no main content`);
        }
        
      } catch (error) {
        console.log(`❌ Error navigating to ${item.text}: ${error.message}`);
      }
    }
  });
  
  test('Check mobile navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    console.log(`\n=== Mobile Navigation Audit ===`);
    
    try {
      // Check if mobile menu button exists
      const mobileMenuButton = await page.$('[data-testid="mobile-menu-button"], button[aria-label*="menu" i]');
      
      if (mobileMenuButton) {
        console.log('✅ Mobile menu button found');
        
        // Click to open menu
        await mobileMenuButton.click();
        await page.waitForTimeout(500);
        
        // Check if menu is visible
        const mobileMenu = await page.$('#mobile-menu, [data-testid="mobile-menu"]');
        const isMenuVisible = await mobileMenu?.isVisible();
        
        if (isMenuVisible) {
          console.log('✅ Mobile menu opens correctly');
        } else {
          console.log('❌ Mobile menu does not open');
        }
      } else {
        console.log('❌ Mobile menu button not found');
      }
    } catch (error) {
      console.log(`❌ Error testing mobile navigation: ${error.message}`);
    }
  });
});