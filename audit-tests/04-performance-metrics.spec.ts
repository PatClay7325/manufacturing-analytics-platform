import { test, expect } from '@playwright/test';

test.describe('Performance Metrics Audit', () => {
  test('Measure page load performance', async ({ page }) => {
    const pages = [
      { name: 'Home', path: '/' },
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Equipment', path: '/equipment' },
      { name: 'Alerts', path: '/alerts' },
      { name: 'Manufacturing Chat', path: '/manufacturing-chat' },
    ];
    
    console.log(`\n=== Performance Metrics Audit ===`);
    
    for (const pageInfo of pages) {
      console.log(`\n${pageInfo.name} Page Performance:`);
      
      try {
        // Navigate and measure
        const startTime = Date.now();
        await page.goto(pageInfo.path, { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;
        
        // Get performance metrics
        const metrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const paint = performance.getEntriesByName('first-contentful-paint')[0];
          
          return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstContentfulPaint: paint ? paint.startTime : null,
            domInteractive: navigation.domInteractive,
            resources: performance.getEntriesByType('resource').length,
          };
        });
        
        console.log(`  Total load time: ${loadTime}ms`);
        console.log(`  DOM Content Loaded: ${metrics.domContentLoaded}ms`);
        console.log(`  First Contentful Paint: ${metrics.firstContentfulPaint?.toFixed(2)}ms`);
        console.log(`  Resources loaded: ${metrics.resources}`);
        
        // Check for performance issues
        if (loadTime > 3000) {
          console.log(`  ⚠️ Page load time exceeds 3 seconds`);
        }
        
        // Check resource sizes
        const resourceSizes = await page.evaluate(() => {
          return performance.getEntriesByType('resource').map(entry => {
            const resource = entry as PerformanceResourceTiming;
            return {
              name: resource.name,
              size: resource.transferSize,
              duration: resource.duration
            };
          }).filter(r => r.size > 100000); // Resources over 100KB
        });
        
        if (resourceSizes.length > 0) {
          console.log(`  ⚠️ Large resources detected:`);
          resourceSizes.forEach(resource => {
            console.log(`    - ${resource.name.split('/').pop()}: ${(resource.size / 1024).toFixed(2)}KB`);
          });
        }
        
        // Check for memory leaks (basic check)
        const memoryUsage = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize / 1048576; // Convert to MB
          }
          return null;
        });
        
        if (memoryUsage) {
          console.log(`  Memory usage: ${memoryUsage.toFixed(2)}MB`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error measuring performance: ${error.message}`);
      }
    }
  });
  
  test('Check image optimization', async ({ page }) => {
    console.log(`\n=== Image Optimization Audit ===`);
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const images = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.naturalWidth,
        height: img.naturalHeight,
        displayWidth: img.clientWidth,
        displayHeight: img.clientHeight,
        loading: img.loading,
      }));
    });
    
    console.log(`\nTotal images found: ${images.length}`);
    
    images.forEach((img, index) => {
      const issues = [];
      
      // Check for missing alt text
      if (!img.alt) {
        issues.push('Missing alt text');
      }
      
      // Check if image is oversized
      if (img.width > img.displayWidth * 2 || img.height > img.displayHeight * 2) {
        issues.push(`Oversized (${img.width}x${img.height} displayed as ${img.displayWidth}x${img.displayHeight})`);
      }
      
      // Check for lazy loading
      if (!img.loading && index > 2) { // First few images don't need lazy loading
        issues.push('No lazy loading');
      }
      
      if (issues.length > 0) {
        console.log(`\nImage ${index + 1}: ${img.src.split('/').pop()}`);
        issues.forEach(issue => console.log(`  ⚠️ ${issue}`));
      }
    });
  });
  
  test('Check API response times', async ({ page }) => {
    console.log(`\n=== API Response Time Audit ===`);
    
    const apiCalls: any[] = [];
    
    // Monitor network requests
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/') || url.includes('localhost:3001')) {
        apiCalls.push({
          url: url,
          status: response.status(),
          timing: response.timing(),
        });
      }
    });
    
    // Navigate through pages to trigger API calls
    const pagesToVisit = ['/dashboard', '/equipment', '/alerts'];
    
    for (const path of pagesToVisit) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // Wait for any async calls
    }
    
    console.log(`\nAPI calls detected: ${apiCalls.length}`);
    
    apiCalls.forEach(call => {
      const endpoint = call.url.split('/').slice(-2).join('/');
      const responseTime = call.timing?.responseEnd - call.timing?.requestStart;
      
      console.log(`\n${endpoint}:`);
      console.log(`  Status: ${call.status}`);
      console.log(`  Response time: ${responseTime?.toFixed(2)}ms`);
      
      if (responseTime > 1000) {
        console.log(`  ⚠️ Slow API response (>1s)`);
      }
      
      if (call.status >= 400) {
        console.log(`  ❌ API error response`);
      }
    });
  });
});