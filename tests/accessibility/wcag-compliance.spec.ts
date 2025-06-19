import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// WCAG 2.1 Level AA compliance tests
test.describe('WCAG 2.1 Accessibility Compliance', () => {
  test.describe('Automated Accessibility Scans', () => {
    const pages = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Equipment', url: '/equipment' },
      { name: 'Alerts', url: '/alerts' },
      { name: 'Manufacturing Chat', url: '/manufacturing-chat' },
      { name: 'Login', url: '/login' }
    ];

    for (const pageInfo of pages) {
      test(`${pageInfo.name} - WCAG AA Compliance`, async ({ page }) => {
        await page.goto(pageInfo.url);
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        // Report violations
        if (accessibilityScanResults.violations.length > 0) {
          console.log(`Accessibility violations on ${pageInfo.name}:`);
          accessibilityScanResults.violations.forEach(violation => {
            console.log(`- ${violation.description} (${violation.id})`);
            console.log(`  Impact: ${violation.impact}`);
            console.log(`  Affected elements: ${violation.nodes.length}`);
          });
        }

        expect(accessibilityScanResults.violations).toEqual([]);
      });
    }
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate entire application with keyboard only', async ({ page }) => {
      await page.goto('/dashboard');

      // Tab through all interactive elements
      const interactiveElements = await page.evaluate(() => {
        const elements = [];
        let currentElement = document.body;
        const maxIterations = 100;
        let iterations = 0;

        // Simulate tabbing through page
        while (iterations < maxIterations) {
          const event = new KeyboardEvent('keydown', { key: 'Tab' });
          document.dispatchEvent(event);
          
          if (document.activeElement && document.activeElement !== currentElement) {
            currentElement = document.activeElement;
            elements.push({
              tag: currentElement.tagName,
              text: currentElement.textContent?.slice(0, 50),
              focusable: true,
              tabIndex: currentElement.tabIndex
            });
          }
          iterations++;
        }

        return elements;
      });

      // Verify logical tab order
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      // Check for keyboard traps
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }
      
      // Should be able to shift+tab backwards
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Shift+Tab');
      }

      // Verify we can reach main content with skip link
      await page.keyboard.press('Tab');
      const skipLink = await page.evaluate(() => {
        return document.activeElement?.textContent?.includes('Skip');
      });
      expect(skipLink).toBeTruthy();
    });

    test('should operate all controls with keyboard', async ({ page }) => {
      await page.goto('/dashboard');

      // Test button activation
      await page.focus('[data-testid="refresh-dashboard-button"]');
      await page.keyboard.press('Enter');
      
      // Test dropdown navigation
      await page.focus('[data-testid="time-range-selector"]');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      // Test modal interaction
      await page.goto('/equipment');
      await page.focus('[data-testid="add-equipment-button"]');
      await page.keyboard.press('Enter');
      
      // Should trap focus in modal
      const modalOpen = await page.locator('[data-testid="add-equipment-form"]').isVisible();
      expect(modalOpen).toBeTruthy();
      
      // Escape should close modal
      await page.keyboard.press('Escape');
      const modalClosed = await page.locator('[data-testid="add-equipment-form"]').isVisible();
      expect(modalClosed).toBeFalsy();
    });

    test('should show focus indicators', async ({ page }) => {
      await page.goto('/dashboard');

      // Check focus styles
      const focusableSelectors = [
        'button',
        'a',
        'input',
        'select',
        '[tabindex="0"]'
      ];

      for (const selector of focusableSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          await element.focus();
          
          const focusStyles = await element.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
              outline: styles.outline,
              outlineWidth: styles.outlineWidth,
              outlineColor: styles.outlineColor,
              boxShadow: styles.boxShadow
            };
          });

          // Should have visible focus indicator
          const hasOutline = focusStyles.outline !== 'none' && 
                           parseInt(focusStyles.outlineWidth) > 0;
          const hasFocusBoxShadow = focusStyles.boxShadow.includes('0 0 0');
          
          expect(hasOutline || hasFocusBoxShadow).toBeTruthy();
        }
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/dashboard');

      const headingStructure = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headings.map(h => ({
          level: parseInt(h.tagName[1]),
          text: h.textContent,
          visible: window.getComputedStyle(h).display !== 'none'
        }));
      });

      // Should have exactly one h1
      const h1Count = headingStructure.filter(h => h.level === 1 && h.visible).length;
      expect(h1Count).toBe(1);

      // Check heading hierarchy (no skipping levels)
      let previousLevel = 0;
      for (const heading of headingStructure.filter(h => h.visible)) {
        if (previousLevel > 0) {
          expect(heading.level).toBeLessThanOrEqual(previousLevel + 1);
        }
        previousLevel = heading.level;
      }
    });

    test('should have appropriate ARIA labels and roles', async ({ page }) => {
      await page.goto('/dashboard');

      // Check main landmarks
      await expect(page.locator('nav[aria-label]')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
      
      // Check form labels
      await page.goto('/login');
      const inputs = page.locator('input:not([type="hidden"])');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const hasLabel = await input.evaluate(el => {
          const id = el.id;
          const label = id ? document.querySelector(`label[for="${id}"]`) : null;
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          
          return !!(label || ariaLabel || ariaLabelledBy);
        });
        
        expect(hasLabel).toBeTruthy();
      }

      // Check buttons have accessible names
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        const accessibleName = await button.evaluate(el => {
          return el.textContent || 
                 el.getAttribute('aria-label') || 
                 el.getAttribute('title');
        });
        
        expect(accessibleName).toBeTruthy();
      }
    });

    test('should announce live updates', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for live regions
      const liveRegions = await page.locator('[aria-live]').all();
      expect(liveRegions.length).toBeGreaterThan(0);

      // Check live region politeness levels
      for (const region of liveRegions) {
        const politeness = await region.getAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(politeness);
      }

      // Test alert announcements
      await page.goto('/alerts');
      
      // Simulate new alert
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'new-alert',
            data: {
              severity: 'critical',
              title: 'Test Critical Alert'
            }
          }
        }));
      });

      // Check if announced in live region
      const alertLiveRegion = page.locator('[aria-live="assertive"]');
      await expect(alertLiveRegion).toContainText(/alert/i);
    });

    test('should have descriptive link text', async ({ page }) => {
      await page.goto('/dashboard');

      const links = await page.locator('a').all();
      const genericTexts = ['click here', 'read more', 'link', 'here'];

      for (const link of links.slice(0, 20)) { // Check first 20 links
        const linkText = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        
        const accessibleText = ariaLabel || linkText;
        
        if (accessibleText) {
          // Should not use generic link text
          const isGeneric = genericTexts.some(generic => 
            accessibleText.toLowerCase().trim() === generic
          );
          expect(isGeneric).toBeFalsy();
        }
      }
    });
  });

  test.describe('Color and Contrast', () => {
    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/dashboard');

      // Use axe-core for contrast checking
      const contrastResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .withRules(['color-contrast'])
        .analyze();

      expect(contrastResults.violations).toEqual([]);
    });

    test('should not rely solely on color', async ({ page }) => {
      await page.goto('/alerts');

      // Check severity badges have text/icons in addition to color
      const severityBadges = await page.locator('[data-testid="alert-severity"]').all();
      
      for (const badge of severityBadges.slice(0, 5)) {
        const hasText = await badge.textContent();
        const hasIcon = await badge.locator('svg, [class*="icon"]').count() > 0;
        
        expect(hasText || hasIcon).toBeTruthy();
      }

      // Check status indicators
      await page.goto('/equipment');
      const statusIndicators = await page.locator('[data-testid="equipment-status"]').all();
      
      for (const indicator of statusIndicators.slice(0, 5)) {
        const hasText = await indicator.textContent();
        const hasIcon = await indicator.locator('svg, [class*="icon"]').count() > 0;
        
        expect(hasText || hasIcon).toBeTruthy();
      }
    });

    test('should support high contrast mode', async ({ page }) => {
      // Enable high contrast mode
      await page.addInitScript(() => {
        document.documentElement.classList.add('high-contrast');
      });

      await page.goto('/dashboard');

      // Check if high contrast styles are applied
      const hasHighContrastStyles = await page.evaluate(() => {
        const element = document.querySelector('button');
        if (!element) return false;
        
        const styles = window.getComputedStyle(element);
        const borderWidth = parseInt(styles.borderWidth);
        
        return borderWidth > 1; // High contrast mode should have thicker borders
      });

      expect(hasHighContrastStyles).toBeTruthy();
    });
  });

  test.describe('Forms and Inputs', () => {
    test('should have accessible form controls', async ({ page }) => {
      await page.goto('/login');

      // Check all form inputs
      const formControls = await page.locator('input, select, textarea').all();
      
      for (const control of formControls) {
        const type = await control.getAttribute('type');
        
        // Skip hidden inputs
        if (type === 'hidden') continue;

        // Check for label association
        const id = await control.getAttribute('id');
        const hasLabel = await page.locator(`label[for="${id}"]`).count() > 0;
        const hasAriaLabel = await control.getAttribute('aria-label') !== null;
        const hasAriaLabelledBy = await control.getAttribute('aria-labelledby') !== null;
        
        expect(hasLabel || hasAriaLabel || hasAriaLabelledBy).toBeTruthy();

        // Check for error messages association
        const ariaDescribedBy = await control.getAttribute('aria-describedby');
        if (ariaDescribedBy) {
          const errorElement = await page.locator(`#${ariaDescribedBy}`).count();
          expect(errorElement).toBeGreaterThan(0);
        }
      }
    });

    test('should show inline validation errors accessibly', async ({ page }) => {
      await page.goto('/login');

      // Submit empty form
      await page.click('[data-testid="login-button"]');

      // Check error messages
      const errorMessages = await page.locator('[role="alert"], [aria-live="polite"]').all();
      expect(errorMessages.length).toBeGreaterThan(0);

      // Check inputs have aria-invalid
      const emailInput = page.locator('[data-testid="email-input"]');
      await expect(emailInput).toHaveAttribute('aria-invalid', 'true');

      // Check error association
      const ariaDescribedBy = await emailInput.getAttribute('aria-describedby');
      if (ariaDescribedBy) {
        const errorMessage = page.locator(`#${ariaDescribedBy}`);
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText(/required|invalid/i);
      }
    });

    test('should group related form controls', async ({ page }) => {
      await page.goto('/equipment');
      await page.click('[data-testid="filter-button"]');

      // Check for fieldset/legend or role="group" with aria-label
      const groups = await page.locator('fieldset, [role="group"]').all();
      
      for (const group of groups) {
        const hasLegend = await group.locator('legend').count() > 0;
        const hasAriaLabel = await group.getAttribute('aria-label') !== null;
        const hasAriaLabelledBy = await group.getAttribute('aria-labelledby') !== null;
        
        expect(hasLegend || hasAriaLabel || hasAriaLabelledBy).toBeTruthy();
      }
    });
  });

  test.describe('Images and Media', () => {
    test('should have alt text for informative images', async ({ page }) => {
      await page.goto('/equipment');

      const images = await page.locator('img').all();
      
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');
        const ariaLabel = await img.getAttribute('aria-label');
        
        // Decorative images should have empty alt or role="presentation"
        const isDecorative = alt === '' || role === 'presentation';
        
        // Informative images should have descriptive alt text
        if (!isDecorative) {
          expect(alt || ariaLabel).toBeTruthy();
          expect(alt?.length).toBeGreaterThan(0);
        }
      }
    });

    test('should have captions for charts', async ({ page }) => {
      await page.goto('/dashboard');

      const charts = await page.locator('[data-testid$="-chart"]').all();
      
      for (const chart of charts) {
        // Check for accessible description
        const ariaLabel = await chart.getAttribute('aria-label');
        const ariaDescribedBy = await chart.getAttribute('aria-describedby');
        const title = await chart.locator('title').first().textContent();
        
        expect(ariaLabel || ariaDescribedBy || title).toBeTruthy();

        // Check for data table alternative
        const hasTable = await chart.locator('table').count() > 0;
        const hasDetailsLink = await page.locator(`[aria-controls="${await chart.getAttribute('id')}"]`).count() > 0;
        
        // Should provide alternative access to data
        expect(hasTable || hasDetailsLink || ariaDescribedBy).toBeTruthy();
      }
    });
  });

  test.describe('Time-based Content', () => {
    test('should allow pausing auto-updating content', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for pause controls
      const hasPauseControl = await page.locator('[aria-label*="pause"], [aria-label*="stop"]').count() > 0;
      
      // If content auto-updates, should have pause control
      const hasLiveRegion = await page.locator('[aria-live]').count() > 0;
      if (hasLiveRegion) {
        expect(hasPauseControl).toBeTruthy();
      }
    });

    test('should not have content that flashes', async ({ page }) => {
      await page.goto('/alerts');

      // Check for flashing content
      const hasFlashingAnimation = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          const animation = window.getComputedStyle(el).animation;
          if (animation && animation.includes('flash')) {
            return true;
          }
        }
        return false;
      });

      expect(hasFlashingAnimation).toBeFalsy();
    });
  });

  test.describe('Error Identification', () => {
    test('should clearly identify and describe errors', async ({ page }) => {
      await page.goto('/login');

      // Submit invalid form
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', '123'); // Too short
      await page.click('[data-testid="login-button"]');

      // Check error summary
      const errorSummary = await page.locator('[role="alert"], .error-summary').first();
      await expect(errorSummary).toBeVisible();

      // Check individual field errors
      const fieldErrors = await page.locator('[id$="-error"], .field-error').all();
      
      for (const error of fieldErrors) {
        const errorText = await error.textContent();
        expect(errorText).toBeTruthy();
        
        // Error should be specific, not generic
        expect(errorText).not.toBe('Error');
        expect(errorText?.length).toBeGreaterThan(10);
      }
    });
  });

  test.describe('Responsive Accessibility', () => {
    test('should maintain accessibility on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Touch targets should be at least 44x44px
      const buttons = await page.locator('button, a').all();
      
      for (const button of buttons.slice(0, 10)) {
        if (await button.isVisible()) {
          const box = await button.boundingBox();
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      }

      // Check mobile menu accessibility
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenu.isVisible()) {
        await expect(mobileMenu).toHaveAttribute('aria-expanded');
        await expect(mobileMenu).toHaveAttribute('aria-label');
      }
    });
  });

  test.describe('Cognitive Accessibility', () => {
    test('should use clear and simple language', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for clear button labels
      const buttons = await page.locator('button').all();
      const unclearLabels = ['Submit', 'OK', 'Cancel']; // Without context
      
      for (const button of buttons.slice(0, 10)) {
        const label = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        
        const text = ariaLabel || label;
        if (text && unclearLabels.includes(text.trim())) {
          // Should have more context
          const hasContext = text.length > 6 || ariaLabel !== null;
          expect(hasContext).toBeTruthy();
        }
      }
    });

    test('should provide consistent navigation', async ({ page }) => {
      const pages = ['/dashboard', '/equipment', '/alerts'];
      const navStructures = [];

      for (const pageUrl of pages) {
        await page.goto(pageUrl);
        
        const navItems = await page.locator('nav a').allTextContents();
        navStructures.push(navItems);
      }

      // Navigation should be consistent across pages
      for (let i = 1; i < navStructures.length; i++) {
        expect(navStructures[i]).toEqual(navStructures[0]);
      }
    });

    test('should show clear feedback for user actions', async ({ page }) => {
      await page.goto('/equipment');

      // Check for loading states
      await page.click('[data-testid="refresh-button"]');
      const loadingIndicator = await page.locator('[role="status"], .loading').isVisible();
      expect(loadingIndicator).toBeTruthy();

      // Check for success messages
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');

      // Should show clear feedback (error or redirect)
      const hasErrorMessage = await page.locator('[role="alert"]').isVisible();
      const hasRedirected = page.url().includes('/dashboard');
      
      expect(hasErrorMessage || hasRedirected).toBeTruthy();
    });
  });
});