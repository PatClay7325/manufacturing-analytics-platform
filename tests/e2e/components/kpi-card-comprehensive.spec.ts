import { test, expect, type Page } from '@playwright/test';

test.describe('KPI Card Component - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page containing KPI cards
    await page.goto('/dashboard');
  });

  test.describe('Component Rendering', () => {
    test('should render all KPI card elements correctly', async ({ page }) => {
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]').first();
      
      // Wait for card to be visible
      await expect(kpiCard).toBeVisible();
      
      // Check all required elements
      await expect(kpiCard.locator('[data-testid="kpi-value"]')).toBeVisible();
      await expect(kpiCard.locator('[data-testid="kpi-label"]')).toBeVisible();
      await expect(kpiCard.locator('[data-testid="kpi-trend"]')).toBeVisible();
      await expect(kpiCard.locator('[data-testid="kpi-icon"]')).toBeVisible();
      
      // Verify content
      const value = await kpiCard.locator('[data-testid="kpi-value"]').textContent();
      expect(value).toMatch(/^\d+\.?\d*%?$/); // Number with optional decimal and %
      
      const label = await kpiCard.locator('[data-testid="kpi-label"]').textContent();
      expect(label).toBeTruthy();
    });

    test('should display different KPI types correctly', async ({ page }) => {
      const kpiTypes = [
        { testId: 'kpi-overall-oee', format: 'percentage' },
        { testId: 'kpi-production-output', format: 'number' },
        { testId: 'kpi-active-alerts', format: 'count' },
        { testId: 'kpi-mtbf', format: 'duration' }
      ];
      
      for (const kpi of kpiTypes) {
        const card = page.locator(`[data-testid="${kpi.testId}"]`);
        await expect(card).toBeVisible();
        
        const value = await card.locator('[data-testid="kpi-value"]').textContent();
        
        switch (kpi.format) {
          case 'percentage':
            expect(value).toMatch(/\d+\.?\d*%/);
            break;
          case 'number':
            expect(value).toMatch(/[\d,]+\.?\d*/);
            break;
          case 'count':
            expect(value).toMatch(/^\d+$/);
            break;
          case 'duration':
            expect(value).toMatch(/\d+\.?\d*\s*(h|hours?|m|minutes?|d|days?)/i);
            break;
        }
      }
    });

    test('should handle loading states', async ({ page }) => {
      // Intercept API to delay response
      await page.route('**/api/metrics/kpis', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.continue();
      });
      
      await page.reload();
      
      // Should show skeleton loader
      await expect(page.locator('[data-testid="kpi-skeleton"]')).toBeVisible();
      
      // Should have proper loading animation
      const skeleton = page.locator('[data-testid="kpi-skeleton"]').first();
      const animationName = await skeleton.evaluate(el => 
        window.getComputedStyle(el).animationName
      );
      expect(animationName).not.toBe('none');
      
      // Wait for content to load
      await expect(page.locator('[data-testid="kpi-overall-oee"]')).toBeVisible({ timeout: 5000 });
    });

    test('should handle error states', async ({ page }) => {
      // Simulate API error
      await page.route('**/api/metrics/kpis', route => {
        route.fulfill({ status: 500, body: 'Server Error' });
      });
      
      await page.reload();
      
      // Should show error state
      const kpiCard = page.locator('[data-testid="kpi-card"]').first();
      await expect(kpiCard.locator('[data-testid="kpi-error"]')).toBeVisible();
      await expect(kpiCard.locator('[data-testid="kpi-error-icon"]')).toBeVisible();
      
      // Should show error message
      await expect(kpiCard.locator('[data-testid="kpi-error-message"]')).toContainText(/Unable to load/i);
      
      // Should not show value when in error state
      await expect(kpiCard.locator('[data-testid="kpi-value"]')).not.toBeVisible();
    });
  });

  test.describe('Trend Indicators', () => {
    test('should display correct trend arrows and colors', async ({ page }) => {
      // Mock different trend scenarios
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('kpi-update', {
          detail: {
            'overall-oee': { value: 85.5, trend: 'up', change: 2.3 },
            'availability': { value: 92.1, trend: 'down', change: -1.5 },
            'performance': { value: 88.0, trend: 'stable', change: 0.1 }
          }
        }));
      });
      
      // Check up trend
      const upTrend = page.locator('[data-testid="kpi-overall-oee"] [data-testid="kpi-trend"]');
      await expect(upTrend).toHaveClass(/trend-up/);
      await expect(upTrend.locator('svg')).toHaveAttribute('data-icon', 'arrow-up');
      const upColor = await upTrend.evaluate(el => window.getComputedStyle(el).color);
      expect(upColor).toMatch(/rgb.*\(.*[0-9]+.*,.*[1-9][0-9]+.*,.*[0-9]+.*\)/); // Green-ish
      
      // Check down trend
      const downTrend = page.locator('[data-testid="kpi-availability"] [data-testid="kpi-trend"]');
      await expect(downTrend).toHaveClass(/trend-down/);
      await expect(downTrend.locator('svg')).toHaveAttribute('data-icon', 'arrow-down');
      
      // Check stable trend
      const stableTrend = page.locator('[data-testid="kpi-performance"] [data-testid="kpi-trend"]');
      await expect(stableTrend).toHaveClass(/trend-stable/);
    });

    test('should show percentage change', async ({ page }) => {
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      const trend = kpiCard.locator('[data-testid="kpi-trend"]');
      
      // Should show change percentage
      await expect(trend).toContainText(/[+-]?\d+\.?\d*%/);
      
      // Hover for more details
      await trend.hover();
      await expect(page.locator('[data-testid="trend-tooltip"]')).toBeVisible();
      await expect(page.locator('[data-testid="trend-tooltip"]')).toContainText(/compared to/i);
    });
  });

  test.describe('Interactivity', () => {
    test('should be clickable and navigate to details', async ({ page }) => {
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      
      // Card should have pointer cursor
      const cursor = await kpiCard.evaluate(el => window.getComputedStyle(el).cursor);
      expect(cursor).toBe('pointer');
      
      // Click should navigate
      await kpiCard.click();
      await expect(page).toHaveURL(/\/metrics\/overall-oee/);
    });

    test('should show hover effects', async ({ page }) => {
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      
      // Get initial styles
      const initialBg = await kpiCard.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const initialShadow = await kpiCard.evaluate(el => window.getComputedStyle(el).boxShadow);
      
      // Hover
      await kpiCard.hover();
      
      // Should show hover state
      const hoverBg = await kpiCard.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const hoverShadow = await kpiCard.evaluate(el => window.getComputedStyle(el).boxShadow);
      
      expect(hoverBg).not.toBe(initialBg);
      expect(hoverShadow).not.toBe(initialShadow);
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Focus first KPI card
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Skip header navigation
      
      // Should focus on KPI card
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toContain('kpi-');
      
      // Enter should activate
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/metrics\//);
    });

    test('should show context menu on right-click', async ({ page }) => {
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      
      // Right-click
      await kpiCard.click({ button: 'right' });
      
      // Context menu should appear
      await expect(page.locator('[data-testid="kpi-context-menu"]')).toBeVisible();
      
      // Should have options
      await expect(page.locator('[data-testid="export-kpi-data"]')).toBeVisible();
      await expect(page.locator('[data-testid="pin-to-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="view-history"]')).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should update values in real-time', async ({ page }) => {
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      const initialValue = await kpiCard.locator('[data-testid="kpi-value"]').textContent();
      
      // Simulate WebSocket update
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'kpi-update',
            data: { 'overall-oee': { value: 91.2, trend: 'up' } }
          }
        }));
      });
      
      // Value should update
      await expect(kpiCard.locator('[data-testid="kpi-value"]')).not.toHaveText(initialValue || '');
      await expect(kpiCard.locator('[data-testid="kpi-value"]')).toHaveText('91.2%');
    });

    test('should animate value changes', async ({ page }) => {
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      const valueElement = kpiCard.locator('[data-testid="kpi-value"]');
      
      // Watch for animation
      const animationPromise = valueElement.evaluate(el => {
        return new Promise(resolve => {
          el.addEventListener('animationstart', () => resolve(true), { once: true });
          setTimeout(() => resolve(false), 2000);
        });
      });
      
      // Trigger update
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'kpi-update',
            data: { 'overall-oee': { value: 89.8, trend: 'up' } }
          }
        }));
      });
      
      // Should animate
      const animated = await animationPromise;
      expect(animated).toBe(true);
    });

    test('should highlight significant changes', async ({ page }) => {
      // Simulate significant increase
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'kpi-update',
            data: { 'overall-oee': { value: 95.0, trend: 'up', change: 10.5 } }
          }
        }));
      });
      
      // Should show highlight
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      await expect(kpiCard).toHaveClass(/highlight-positive/);
      
      // Highlight should fade after animation
      await page.waitForTimeout(3000);
      await expect(kpiCard).not.toHaveClass(/highlight-positive/);
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should adapt to container size', async ({ page }) => {
      // Test in different container sizes
      const containerSizes = [
        { width: 300, height: 150 },
        { width: 200, height: 120 },
        { width: 400, height: 200 }
      ];
      
      for (const size of containerSizes) {
        await page.evaluate(({ w, h }) => {
          const container = document.querySelector('[data-testid="kpi-cards-container"]');
          if (container) {
            (container as HTMLElement).style.width = `${w}px`;
            (container as HTMLElement).style.height = `${h}px`;
          }
        }, { w: size.width, h: size.height });
        
        // Card should still be functional
        const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
        await expect(kpiCard).toBeVisible();
        
        // Text should not overflow
        const isOverflowing = await kpiCard.evaluate(el => {
          return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
        });
        expect(isOverflowing).toBe(false);
      }
    });

    test('should truncate long values appropriately', async ({ page }) => {
      // Inject KPI with long value
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('kpi-update', {
          detail: {
            'custom-kpi': { 
              value: '123,456,789.123456', 
              label: 'Very Long KPI Label That Might Overflow The Card'
            }
          }
        }));
      });
      
      const kpiCard = page.locator('[data-testid="kpi-custom-kpi"]');
      
      // Label should be truncated with ellipsis
      const label = kpiCard.locator('[data-testid="kpi-label"]');
      const labelOverflow = await label.evaluate(el => window.getComputedStyle(el).textOverflow);
      expect(labelOverflow).toBe('ellipsis');
      
      // Full text should be in title attribute
      await expect(label).toHaveAttribute('title', /Very Long KPI Label/);
    });
  });

  test.describe('Accessibility Features', () => {
    test('should have proper ARIA attributes', async ({ page }) => {
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      
      // Should have role
      await expect(kpiCard).toHaveAttribute('role', 'article');
      
      // Should have aria-label
      const ariaLabel = await kpiCard.getAttribute('aria-label');
      expect(ariaLabel).toContain('Overall OEE');
      expect(ariaLabel).toMatch(/\d+\.?\d*%/); // Should include value
      
      // Trend should have description
      const trend = kpiCard.locator('[data-testid="kpi-trend"]');
      await expect(trend).toHaveAttribute('aria-label', /trending/i);
    });

    test('should work with screen readers', async ({ page }) => {
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      
      // Should have screen reader only content
      const srContent = await kpiCard.locator('.sr-only').allTextContents();
      expect(srContent.length).toBeGreaterThan(0);
      
      // Should announce updates
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'kpi-update',
            data: { 'overall-oee': { value: 88.5, trend: 'down' } }
          }
        }));
      });
      
      // Live region should update
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toContainText(/OEE.*updated.*88.5/i);
    });

    test('should have sufficient color contrast', async ({ page }) => {
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      
      // Get colors
      const bgColor = await kpiCard.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const textColor = await kpiCard.locator('[data-testid="kpi-value"]').evaluate(el => 
        window.getComputedStyle(el).color
      );
      
      // Calculate contrast ratio (simplified check)
      const getRelativeLuminance = (rgb: string) => {
        const matches = rgb.match(/\d+/g);
        if (!matches) return 0;
        const [r, g, b] = matches.map(n => parseInt(n) / 255);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      
      const bgLuminance = getRelativeLuminance(bgColor);
      const textLuminance = getRelativeLuminance(textColor);
      const contrast = (Math.max(bgLuminance, textLuminance) + 0.05) / 
                      (Math.min(bgLuminance, textLuminance) + 0.05);
      
      // WCAG AA requires 4.5:1 for normal text
      expect(contrast).toBeGreaterThan(4.5);
    });
  });

  test.describe('Theme Support', () => {
    test('should support dark mode', async ({ page }) => {
      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      
      // Should have dark mode styles
      await expect(kpiCard).toHaveClass(/dark:/);
      
      // Background should be dark
      const bgColor = await kpiCard.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const bgLuminance = await page.evaluate((color) => {
        const matches = color.match(/\d+/g);
        if (!matches) return 1;
        const [r, g, b] = matches.map(n => parseInt(n) / 255);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }, bgColor);
      
      expect(bgLuminance).toBeLessThan(0.5); // Dark background
    });

    test('should support high contrast mode', async ({ page }) => {
      // Enable high contrast
      await page.evaluate(() => {
        document.documentElement.classList.add('high-contrast');
      });
      
      const kpiCard = page.locator('[data-testid="kpi-overall-oee"]');
      
      // Should have increased contrast
      const borderWidth = await kpiCard.evaluate(el => 
        parseInt(window.getComputedStyle(el).borderWidth)
      );
      expect(borderWidth).toBeGreaterThan(0);
    });
  });

  test.describe('Performance', () => {
    test('should render efficiently with many cards', async ({ page }) => {
      // Create many KPI cards
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid="kpi-cards-container"]');
        if (!container) return;
        
        // Add 50 KPI cards
        for (let i = 0; i < 50; i++) {
          const card = document.createElement('div');
          card.setAttribute('data-testid', `kpi-test-${i}`);
          card.className = 'kpi-card';
          card.innerHTML = `
            <div data-testid="kpi-value">${Math.random() * 100}%</div>
            <div data-testid="kpi-label">Test KPI ${i}</div>
          `;
          container.appendChild(card);
        }
      });
      
      // Measure render performance
      const renderTime = await page.evaluate(() => {
        return new Promise<number>(resolve => {
          const start = performance.now();
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve(performance.now() - start);
            });
          });
        });
      });
      
      // Should render quickly even with many cards
      expect(renderTime).toBeLessThan(100); // 100ms budget
    });

    test('should not cause memory leaks with updates', async ({ page }) => {
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Perform many updates
      for (let i = 0; i < 100; i++) {
        await page.evaluate((iteration) => {
          window.dispatchEvent(new CustomEvent('ws-message', {
            detail: {
              type: 'kpi-update',
              data: { 'overall-oee': { value: 80 + iteration % 20, trend: 'up' } }
            }
          }));
        }, i);
        await page.waitForTimeout(50);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ('gc' in window) {
          (window as any).gc();
        }
      });
      
      // Check memory usage hasn't grown excessively
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        const growthPercentage = (memoryGrowth / initialMemory) * 100;
        expect(growthPercentage).toBeLessThan(50); // Less than 50% growth
      }
    });
  });
});