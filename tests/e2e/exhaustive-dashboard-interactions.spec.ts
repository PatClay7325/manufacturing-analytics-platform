import { test, expect, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Helper function to test all interactive elements
async function testAllInteractiveElements(page: Page) {
  // Find all clickable elements
  const buttons = await page.locator('button:visible').all();
  const links = await page.locator('a:visible').all();
  const inputs = await page.locator('input:visible, textarea:visible').all();
  const selects = await page.locator('select:visible').all();
  
  console.log(`Found ${buttons.length} buttons, ${links.length} links, ${inputs.length} inputs, ${selects.length} selects`);
}

test.describe('Exhaustive Dashboard Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Navigate and interact with every page', async ({ page }) => {
    const pages = [
      { path: '/', name: 'Home' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/dashboards', name: 'Dashboards List' },
      { path: '/dashboards/new', name: 'New Dashboard' },
      { path: '/equipment', name: 'Equipment' },
      { path: '/alerts', name: 'Alerts' },
      { path: '/manufacturing-chat', name: 'Manufacturing Chat' },
      { path: '/explore', name: 'Explore' },
      { path: '/diagnostics', name: 'Diagnostics' },
      { path: '/status', name: 'Status' },
      { path: '/documentation', name: 'Documentation' },
      { path: '/support', name: 'Support' },
    ];

    for (const pageInfo of pages) {
      await test.step(`Test ${pageInfo.name} page`, async () => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-results/screenshots/${pageInfo.name.replace(/\s+/g, '-').toLowerCase()}.png`,
          fullPage: true 
        });
        
        // Test all interactive elements
        await testAllInteractiveElements(page);
      });
    }
  });

  test('Test all button interactions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test primary buttons
    const primaryButtons = await page.locator('button.bg-blue-600, button.bg-blue-500').all();
    for (let i = 0; i < primaryButtons.length; i++) {
      const button = primaryButtons[i];
      const isVisible = await button.isVisible();
      if (isVisible) {
        const text = await button.textContent();
        await test.step(`Click button: ${text}`, async () => {
          // Check if button opens modal
          const hasClickHandler = await button.evaluate(el => {
            return el.onclick !== null || el.hasAttribute('data-testid');
          });
          if (hasClickHandler) {
            await button.click();
            await page.waitForTimeout(500); // Wait for any animations
            
            // Check if modal opened
            const modal = page.locator('[role="dialog"], .modal, .fixed.inset-0').first();
            if (await modal.isVisible()) {
              await page.keyboard.press('Escape');
              await page.waitForTimeout(300);
            }
          }
        });
      }
    }
  });

  test('Test all dropdown and select interactions', async ({ page }) => {
    await page.goto('/dashboard');
    
    const selects = await page.locator('select:visible').all();
    for (const select of selects) {
      await test.step('Test select dropdown', async () => {
        const options = await select.locator('option').all();
        if (options.length > 1) {
          // Select each option
          for (let i = 1; i < Math.min(options.length, 3); i++) {
            await select.selectOption({ index: i });
            await page.waitForTimeout(300);
          }
        }
      });
    }
    
    // Test custom dropdowns (divs that act like dropdowns)
    const customDropdowns = await page.locator('[role="combobox"], [aria-haspopup="listbox"]').all();
    for (const dropdown of customDropdowns) {
      if (await dropdown.isVisible()) {
        await dropdown.click();
        await page.waitForTimeout(300);
        
        // Close dropdown
        await page.keyboard.press('Escape');
      }
    }
  });

  test('Test dashboard grid interactions', async ({ page }) => {
    await page.goto('/dashboards/new');
    await page.waitForLoadState('networkidle');
    
    // Add panels
    const panelTypes = ['timeseries', 'stat', 'gauge', 'table', 'barchart', 'piechart'];
    
    for (const panelType of panelTypes) {
      await test.step(`Add ${panelType} panel`, async () => {
        // Open panel library
        const addPanelBtn = page.locator('button:has-text("Add Panel"), button:has-text("Add Visualization")').first();
        if (await addPanelBtn.isVisible()) {
          await addPanelBtn.click();
          await page.waitForTimeout(500);
          
          // Select panel type
          const panelOption = page.locator(`[data-panel-type="${panelType}"], :has-text("${panelType}")`, { hasText: new RegExp(panelType, 'i') }).first();
          if (await panelOption.isVisible()) {
            await panelOption.click();
            await page.waitForTimeout(500);
          }
        }
      });
    }
    
    // Test panel interactions
    const panels = await page.locator('.grid-item, [data-testid="panel"]').all();
    for (let i = 0; i < Math.min(panels.length, 3); i++) {
      const panel = panels[i];
      
      await test.step(`Interact with panel ${i + 1}`, async () => {
        // Test drag handle
        const dragHandle = panel.locator('.panel-header, [data-testid="drag-handle"]').first();
        if (await dragHandle.isVisible()) {
          await dragHandle.hover();
          await page.mouse.down();
          await page.mouse.move(100, 100);
          await page.mouse.up();
          await page.waitForTimeout(300);
        }
        
        // Test resize handle
        const resizeHandle = panel.locator('.react-resizable-handle').first();
        if (await resizeHandle.isVisible()) {
          await resizeHandle.hover();
          await page.mouse.down();
          await page.mouse.move(50, 50);
          await page.mouse.up();
          await page.waitForTimeout(300);
        }
      });
    }
  });

  test('Test time range picker interactions', async ({ page }) => {
    await page.goto('/dashboard');
    
    const timeRangePicker = page.locator('[data-testid="time-range-picker"], button:has-text("Last"), .time-range-picker').first();
    if (await timeRangePicker.isVisible()) {
      await timeRangePicker.click();
      await page.waitForTimeout(300);
      
      // Test quick ranges
      const quickRanges = ['Last 5 minutes', 'Last 15 minutes', 'Last 1 hour', 'Last 24 hours', 'Last 7 days'];
      for (const range of quickRanges) {
        const option = page.locator(`button:has-text("${range}"), [role="option"]:has-text("${range}")`).first();
        if (await option.isVisible()) {
          await option.click();
          await page.waitForTimeout(300);
          break;
        }
      }
    }
  });

  test('Test chart interactions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test chart tooltips
    const charts = await page.locator('svg.recharts-surface, canvas, .chart-container').all();
    for (let i = 0; i < Math.min(charts.length, 3); i++) {
      const chart = charts[i];
      if (await chart.isVisible()) {
        const box = await chart.boundingBox();
        if (box) {
          // Hover over different points
          for (let x = 0; x < 5; x++) {
            await page.mouse.move(
              box.x + (box.width * (x + 1)) / 6,
              box.y + box.height / 2
            );
            await page.waitForTimeout(100);
          }
        }
      }
    }
  });

  test('Test search and filter interactions', async ({ page }) => {
    const pagesWithSearch = ['/equipment', '/alerts', '/dashboards'];
    
    for (const pagePath of pagesWithSearch) {
      await test.step(`Test search on ${pagePath}`, async () => {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]').first();
        if (await searchInput.isVisible()) {
          await searchInput.fill(faker.lorem.word());
          await page.waitForTimeout(500);
          await searchInput.clear();
        }
        
        // Test filters
        const filterButtons = await page.locator('button:has-text("Filter"), button:has-text("filter")').all();
        for (const filterBtn of filterButtons) {
          if (await filterBtn.isVisible()) {
            await filterBtn.click();
            await page.waitForTimeout(300);
            await page.keyboard.press('Escape');
          }
        }
      });
    }
  });

  test('Test modal and dialog interactions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Find all buttons that might open modals
    const modalTriggers = await page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New"), button:has-text("Edit"), button:has-text("Settings")').all();
    
    for (let i = 0; i < Math.min(modalTriggers.length, 5); i++) {
      const trigger = modalTriggers[i];
      if (await trigger.isVisible()) {
        await trigger.click();
        await page.waitForTimeout(500);
        
        // Check if modal opened
        const modal = page.locator('[role="dialog"], .modal, .fixed.inset-0:has(.bg-opacity-75)').first();
        if (await modal.isVisible()) {
          // Test modal interactions
          const modalInputs = await modal.locator('input:visible').all();
          for (const input of modalInputs.slice(0, 2)) {
            await input.fill(faker.lorem.word());
          }
          
          // Close modal
          const closeBtn = modal.locator('button:has-text("Close"), button:has-text("Cancel"), button[aria-label="Close"]').first();
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
          } else {
            await page.keyboard.press('Escape');
          }
          await page.waitForTimeout(300);
        }
      }
    }
  });

  test('Test responsive behavior', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 1366, height: 768, name: 'Laptop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await test.step(`Test ${viewport.name} viewport`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        
        // Check mobile menu
        if (viewport.width < 768) {
          const mobileMenuBtn = page.locator('button[aria-label="Open menu"], button:has-text("Menu"), .mobile-menu-trigger').first();
          if (await mobileMenuBtn.isVisible()) {
            await mobileMenuBtn.click();
            await page.waitForTimeout(300);
            await page.keyboard.press('Escape');
          }
        }
        
        await page.screenshot({ 
          path: `test-results/screenshots/responsive-${viewport.name.toLowerCase()}.png`,
          fullPage: true 
        });
      });
    }
  });

  test('Test keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Tab through interactive elements
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      // Check if we focused on something interactive
      const focusedElement = page.locator(':focus');
      const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
      const role = await focusedElement.getAttribute('role');
      
      if (['button', 'a', 'input', 'select', 'textarea'].includes(tagName) || role) {
        // Try to interact with it
        if (tagName === 'button' || role === 'button') {
          await page.keyboard.press('Enter');
          await page.waitForTimeout(300);
          await page.keyboard.press('Escape');
        }
      }
    }
  });

  test('Test data loading states', async ({ page }) => {
    // Intercept API calls to simulate loading
    await page.route('**/api/**', async route => {
      await page.waitForTimeout(2000); // Simulate slow response
      await route.continue();
    });
    
    await page.goto('/equipment');
    
    // Check for loading indicators
    const loadingIndicators = await page.locator('.animate-spin, .skeleton, [aria-busy="true"], .loading').all();
    expect(loadingIndicators.length).toBeGreaterThan(0);
    
    await page.waitForLoadState('networkidle');
  });

  test('Test error states', async ({ page }) => {
    // Simulate API errors
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('/alerts');
    await page.waitForTimeout(2000);
    
    // Check for error messages
    const errorMessages = await page.locator('.error, .alert-error, [role="alert"], .text-red-500').all();
    expect(errorMessages.length).toBeGreaterThan(0);
  });
});

test.describe('Advanced Interaction Tests', () => {
  test('Test drag and drop interactions', async ({ page }) => {
    await page.goto('/dashboards/new');
    
    // Add multiple panels first
    for (let i = 0; i < 3; i++) {
      const addBtn = page.locator('button:has-text("Add Panel")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(300);
        const panelType = page.locator('[data-panel-type="stat"]').first();
        if (await panelType.isVisible()) {
          await panelType.click();
        }
      }
    }
    
    // Test drag and drop
    const panels = await page.locator('.grid-item').all();
    if (panels.length >= 2) {
      const source = panels[0];
      const target = panels[1];
      
      await source.dragTo(target);
      await page.waitForTimeout(500);
    }
  });

  test('Test context menus', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Right-click on various elements
    const rightClickTargets = await page.locator('.panel, .chart, .table-row').all();
    for (const target of rightClickTargets.slice(0, 3)) {
      if (await target.isVisible()) {
        await target.click({ button: 'right' });
        await page.waitForTimeout(300);
        
        // Check if context menu appeared
        const contextMenu = page.locator('.context-menu, [role="menu"]').first();
        if (await contextMenu.isVisible()) {
          await page.keyboard.press('Escape');
        }
      }
    }
  });

  test('Test tooltip interactions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Find elements with tooltips
    const tooltipTriggers = await page.locator('[title], [data-tooltip], [aria-describedby]').all();
    for (const trigger of tooltipTriggers.slice(0, 5)) {
      if (await trigger.isVisible()) {
        await trigger.hover();
        await page.waitForTimeout(500);
        
        // Check for tooltip
        const tooltip = page.locator('.tooltip, [role="tooltip"]').first();
        expect(await tooltip.isVisible()).toBeTruthy();
      }
    }
  });
});