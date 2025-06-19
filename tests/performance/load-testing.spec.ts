import { test, expect } from '@playwright/test';

// Performance budget thresholds
const PERFORMANCE_BUDGETS = {
  FCP: 1800,  // First Contentful Paint
  LCP: 2500,  // Largest Contentful Paint
  FID: 100,   // First Input Delay
  CLS: 0.1,   // Cumulative Layout Shift
  TTI: 3500,  // Time to Interactive
  TBT: 300,   // Total Blocking Time
  pageLoadTime: 3000,
  apiResponseTime: 500,
};

test.describe('Performance and Load Testing', () => {
  test.describe('Core Web Vitals', () => {
    test('should meet Core Web Vitals thresholds on dashboard', async ({ page }) => {
      // Start measuring
      await page.goto('/dashboard');
      
      // Measure Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise(resolve => {
          let fcp, lcp, cls = 0, entries = [];
          
          // First Contentful Paint
          new PerformanceObserver((list) => {
            const fcpEntry = list.getEntries().find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) fcp = fcpEntry.startTime;
          }).observe({ entryTypes: ['paint'] });
          
          // Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            lcp = entries[entries.length - 1].startTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Cumulative Layout Shift
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                cls += entry.value;
              }
            }
          }).observe({ entryTypes: ['layout-shift'] });
          
          // Wait for page to stabilize
          setTimeout(() => {
            resolve({ fcp, lcp, cls });
          }, 5000);
        });
      });
      
      // Assert metrics are within budget
      expect(metrics.fcp).toBeLessThan(PERFORMANCE_BUDGETS.FCP);
      expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP);
      expect(metrics.cls).toBeLessThan(PERFORMANCE_BUDGETS.CLS);
    });

    test('should measure Time to Interactive', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      
      // Wait for page to be interactive
      await page.waitForLoadState('networkidle');
      
      // Measure TTI
      const tti = await page.evaluate(() => {
        return new Promise(resolve => {
          if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.name === 'first-input') {
                  resolve(entry.startTime);
                }
              }
            });
            observer.observe({ entryTypes: ['first-input'] });
            
            // Simulate user interaction
            setTimeout(() => {
              document.body.click();
            }, 100);
          } else {
            resolve(Date.now() - performance.timing.navigationStart);
          }
        });
      });
      
      expect(tti).toBeLessThan(PERFORMANCE_BUDGETS.TTI);
    });

    test('should have minimal Total Blocking Time', async ({ page }) => {
      await page.goto('/dashboard');
      
      const tbt = await page.evaluate(() => {
        return new Promise(resolve => {
          let totalBlockingTime = 0;
          
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) {
                totalBlockingTime += entry.duration - 50;
              }
            }
          });
          
          observer.observe({ entryTypes: ['longtask'] });
          
          setTimeout(() => {
            resolve(totalBlockingTime);
          }, 5000);
        });
      });
      
      expect(tbt).toBeLessThan(PERFORMANCE_BUDGETS.TBT);
    });
  });

  test.describe('Page Load Performance', () => {
    const pages = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Equipment', url: '/equipment' },
      { name: 'Alerts', url: '/alerts' },
      { name: 'Manufacturing Chat', url: '/manufacturing-chat' }
    ];

    for (const pageInfo of pages) {
      test(`${pageInfo.name} page should load within performance budget`, async ({ page }) => {
        const startTime = Date.now();
        
        const response = await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
        
        const loadTime = Date.now() - startTime;
        
        // Check response time
        expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.pageLoadTime);
        
        // Check response status
        expect(response?.status()).toBe(200);
        
        // Measure resource loading
        const resourceTimings = await page.evaluate(() => {
          const resources = performance.getEntriesByType('resource');
          return {
            totalResources: resources.length,
            totalSize: resources.reduce((acc, r) => acc + (r.transferSize || 0), 0),
            slowestResource: Math.max(...resources.map(r => r.duration)),
            jsResources: resources.filter(r => r.name.endsWith('.js')).length,
            cssResources: resources.filter(r => r.name.endsWith('.css')).length,
            imageResources: resources.filter(r => r.initiatorType === 'img').length
          };
        });
        
        // Log metrics for analysis
        console.log(`${pageInfo.name} Page Metrics:`, {
          loadTime,
          ...resourceTimings
        });
        
        // Assert reasonable resource counts
        expect(resourceTimings.jsResources).toBeLessThan(20);
        expect(resourceTimings.cssResources).toBeLessThan(10);
        expect(resourceTimings.slowestResource).toBeLessThan(2000);
      });
    }
  });

  test.describe('API Performance', () => {
    test('should handle API requests within performance budget', async ({ page, request }) => {
      await page.goto('/dashboard');
      
      const endpoints = [
        '/api/equipment',
        '/api/alerts',
        '/api/metrics/kpis',
        '/api/equipment/1/metrics'
      ];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await request.get(endpoint);
        const responseTime = Date.now() - startTime;
        
        expect(response.ok()).toBeTruthy();
        expect(responseTime).toBeLessThan(PERFORMANCE_BUDGETS.apiResponseTime);
        
        // Check response size
        const contentLength = response.headers()['content-length'];
        if (contentLength) {
          expect(parseInt(contentLength)).toBeLessThan(1024 * 1024); // 1MB max
        }
      }
    });

    test('should efficiently handle pagination', async ({ request }) => {
      const pageSizes = [10, 50, 100];
      
      for (const pageSize of pageSizes) {
        const startTime = Date.now();
        const response = await request.get(`/api/equipment?pageSize=${pageSize}`);
        const responseTime = Date.now() - startTime;
        
        expect(response.ok()).toBeTruthy();
        
        // Response time should scale reasonably with page size
        const expectedMaxTime = PERFORMANCE_BUDGETS.apiResponseTime * (1 + pageSize / 100);
        expect(responseTime).toBeLessThan(expectedMaxTime);
      }
    });
  });

  test.describe('Concurrent User Load Testing', () => {
    test('should handle multiple concurrent users on dashboard', async ({ browser }) => {
      const userCount = 10;
      const contexts = [];
      const pages = [];
      
      // Create multiple browser contexts (simulating different users)
      for (let i = 0; i < userCount; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        const page = await context.newPage();
        pages.push(page);
      }
      
      // All users navigate simultaneously
      const startTime = Date.now();
      const navigationPromises = pages.map(page => page.goto('/dashboard'));
      
      await Promise.all(navigationPromises);
      
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / userCount;
      
      // Average load time should still be reasonable
      expect(averageTime).toBeLessThan(PERFORMANCE_BUDGETS.pageLoadTime * 1.5);
      
      // Verify all pages loaded successfully
      for (const page of pages) {
        await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      }
      
      // Cleanup
      for (const context of contexts) {
        await context.close();
      }
    });

    test('should handle concurrent API requests', async ({ request }) => {
      const requestCount = 50;
      const endpoint = '/api/metrics/kpis';
      
      const startTime = Date.now();
      
      // Send concurrent requests
      const requests = Array(requestCount).fill(null).map(() => 
        request.get(endpoint)
      );
      
      const responses = await Promise.all(requests);
      
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / requestCount;
      
      // Check all requests succeeded
      responses.forEach(response => {
        expect(response.ok()).toBeTruthy();
      });
      
      // Average response time should be reasonable
      expect(averageTime).toBeLessThan(PERFORMANCE_BUDGETS.apiResponseTime * 2);
    });
  });

  test.describe('Memory Performance', () => {
    test('should not have memory leaks during navigation', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/dashboard');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Navigate between pages multiple times
      for (let i = 0; i < 10; i++) {
        await page.goto('/equipment');
        await page.goto('/alerts');
        await page.goto('/dashboard');
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ('gc' in window) {
          (window as any).gc();
        }
      });
      
      // Wait a bit for cleanup
      await page.waitForTimeout(1000);
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Memory growth should be reasonable
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        const growthPercentage = (memoryGrowth / initialMemory) * 100;
        
        expect(growthPercentage).toBeLessThan(50); // Less than 50% growth
      }
    });

    test('should handle real-time updates without memory leaks', async ({ page }) => {
      await page.goto('/dashboard');
      
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Simulate many WebSocket updates
      for (let i = 0; i < 100; i++) {
        await page.evaluate((index) => {
          window.dispatchEvent(new CustomEvent('ws-message', {
            detail: {
              type: 'kpi-update',
              data: {
                'overall-oee': { value: 85 + Math.random() * 10 },
                'availability': { value: 90 + Math.random() * 10 },
                'performance': { value: 88 + Math.random() * 8 },
                'quality': { value: 95 + Math.random() * 5 }
              }
            }
          }));
        }, i);
        
        if (i % 10 === 0) {
          await page.waitForTimeout(100);
        }
      }
      
      // Check memory after updates
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        const growthPerMB = memoryGrowth / (1024 * 1024);
        
        expect(growthPerMB).toBeLessThan(10); // Less than 10MB growth
      }
    });
  });

  test.describe('Network Performance', () => {
    test('should optimize resource loading with caching', async ({ page }) => {
      // First visit
      await page.goto('/dashboard');
      
      const firstLoadResources = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map(r => ({
          name: r.name,
          duration: r.duration,
          transferSize: r.transferSize
        }));
      });
      
      // Second visit (should use cache)
      await page.goto('/equipment');
      await page.goto('/dashboard');
      
      const secondLoadResources = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map(r => ({
          name: r.name,
          duration: r.duration,
          transferSize: r.transferSize
        }));
      });
      
      // Find common resources
      const cachedResources = secondLoadResources.filter(r2 => {
        const r1 = firstLoadResources.find(r => r.name === r2.name);
        return r1 && r2.transferSize === 0; // transferSize 0 means cached
      });
      
      // Should have cached resources
      expect(cachedResources.length).toBeGreaterThan(0);
    });

    test('should handle slow network gracefully', async ({ page, context }) => {
      // Simulate slow 3G
      await context.route('**/*', route => route.continue());
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 200); // Add 200ms delay
      });
      
      const startTime = Date.now();
      await page.goto('/dashboard');
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time
      expect(loadTime).toBeLessThan(10000); // 10 seconds for slow network
      
      // Critical content should be visible
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      
      // Should show loading states
      const skeletons = await page.locator('[data-testid*="skeleton"]').count();
      expect(skeletons).toBeGreaterThan(0);
    });
  });

  test.describe('Bundle Size Analysis', () => {
    test('should have optimized JavaScript bundles', async ({ page }) => {
      await page.goto('/');
      
      const jsResources = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        return resources
          .filter(r => r.name.endsWith('.js'))
          .map(r => ({
            name: r.name.split('/').pop(),
            size: r.transferSize,
            duration: r.duration
          }));
      });
      
      // Check main bundle size
      const mainBundle = jsResources.find(r => r.name?.includes('main'));
      if (mainBundle) {
        expect(mainBundle.size).toBeLessThan(500 * 1024); // 500KB max for main bundle
      }
      
      // Check vendor bundle size
      const vendorBundle = jsResources.find(r => r.name?.includes('vendor'));
      if (vendorBundle) {
        expect(vendorBundle.size).toBeLessThan(1024 * 1024); // 1MB max for vendor bundle
      }
      
      // Total JS size
      const totalJsSize = jsResources.reduce((acc, r) => acc + (r.size || 0), 0);
      expect(totalJsSize).toBeLessThan(2 * 1024 * 1024); // 2MB total JS
    });

    test('should lazy load non-critical resources', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Get initially loaded JS files
      const initialJs = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter(r => r.name.endsWith('.js'))
          .map(r => r.name);
      });
      
      // Navigate to a feature that should lazy load
      await page.goto('/manufacturing-chat');
      
      // Get new JS files
      const afterNavigationJs = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter(r => r.name.endsWith('.js'))
          .map(r => r.name);
      });
      
      // Should have loaded additional chunks
      const lazyLoadedFiles = afterNavigationJs.filter(f => !initialJs.includes(f));
      expect(lazyLoadedFiles.length).toBeGreaterThan(0);
    });
  });

  test.describe('Database Query Performance', () => {
    test('should execute queries efficiently', async ({ request }) => {
      // Test various query complexities
      const queries = [
        { endpoint: '/api/equipment?pageSize=10', expectedTime: 200 },
        { endpoint: '/api/equipment?pageSize=100', expectedTime: 500 },
        { endpoint: '/api/equipment?include=metrics,maintenance', expectedTime: 800 },
        { endpoint: '/api/metrics/aggregate?interval=hour&days=7', expectedTime: 1000 }
      ];
      
      for (const query of queries) {
        const startTime = Date.now();
        const response = await request.get(query.endpoint);
        const queryTime = Date.now() - startTime;
        
        expect(response.ok()).toBeTruthy();
        expect(queryTime).toBeLessThan(query.expectedTime);
      }
    });
  });

  test.describe('Real-time Performance', () => {
    test('should handle high-frequency updates efficiently', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Monitor frame rate during updates
      const frameRates = await page.evaluate(() => {
        return new Promise(resolve => {
          const rates: number[] = [];
          let lastTime = performance.now();
          let frameCount = 0;
          
          const measureFrameRate = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
              rates.push(frameCount);
              frameCount = 0;
              lastTime = currentTime;
            }
            
            if (rates.length < 5) {
              requestAnimationFrame(measureFrameRate);
            } else {
              resolve(rates);
            }
          };
          
          // Start measurement
          requestAnimationFrame(measureFrameRate);
          
          // Simulate high-frequency updates
          const interval = setInterval(() => {
            window.dispatchEvent(new CustomEvent('ws-message', {
              detail: {
                type: 'metrics-update',
                data: { timestamp: Date.now(), value: Math.random() }
              }
            }));
          }, 50); // 20 updates per second
          
          setTimeout(() => clearInterval(interval), 5000);
        });
      });
      
      // Average frame rate should be close to 60fps
      const avgFrameRate = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
      expect(avgFrameRate).toBeGreaterThan(50); // At least 50fps average
    });
  });
});