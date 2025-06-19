import { Page, expect, Locator } from '@playwright/test';

// Custom wait utilities
export async function waitForLoadingToComplete(page: Page) {
  // Wait for any loading spinners to disappear
  await page.waitForSelector('[data-testid*="loading"], [data-testid*="skeleton"], .loading', { 
    state: 'hidden',
    timeout: 30000 
  }).catch(() => {
    // If no loading elements found, that's fine
  });
  
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
}

// Authentication helpers
export async function loginAs(page: Page, role: 'admin' | 'operator' | 'technician' | 'viewer') {
  const credentials = {
    admin: { email: 'admin@manufacturing.com', password: 'SecurePass123!' },
    operator: { email: 'operator@manufacturing.com', password: 'OperatorPass123!' },
    technician: { email: 'technician@manufacturing.com', password: 'TechPass123!' },
    viewer: { email: 'viewer@manufacturing.com', password: 'ViewerPass123!' }
  };

  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', credentials[role].email);
  await page.fill('[data-testid="password-input"]', credentials[role].password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('/login');
}

// Data validation helpers
export async function expectValidOEEValue(locator: Locator) {
  const text = await locator.textContent();
  const value = parseFloat(text?.replace('%', '') || '0');
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThanOrEqual(100);
}

export async function expectValidTimestamp(locator: Locator) {
  const text = await locator.textContent();
  const date = new Date(text || '');
  expect(date.getTime()).not.toBeNaN();
  expect(date.getTime()).toBeLessThanOrEqual(Date.now());
}

// API helpers
export async function mockAPIResponse(page: Page, endpoint: string, response: any, status = 200) {
  await page.route(`**/api/${endpoint}`, route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}

export async function waitForAPICall(page: Page, endpoint: string) {
  return page.waitForResponse(response => 
    response.url().includes(`/api/${endpoint}`) && response.status() === 200
  );
}

// WebSocket helpers
export async function simulateWebSocketMessage(page: Page, message: any) {
  await page.evaluate((msg) => {
    window.dispatchEvent(new CustomEvent('ws-message', {
      detail: msg
    }));
  }, message);
}

// Accessibility helpers
export async function checkAccessibility(page: Page, options?: any) {
  const AxeBuilder = require('@axe-core/playwright').default;
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
    
  return accessibilityScanResults;
}

export async function expectNoAccessibilityViolations(page: Page) {
  const results = await checkAccessibility(page);
  expect(results.violations).toHaveLength(0);
}

// Visual testing helpers
export async function hideTimestamps(page: Page) {
  await page.addStyleTag({
    content: `
      [data-testid*="timestamp"],
      [data-testid*="time"],
      .timestamp,
      .time {
        visibility: hidden !important;
      }
    `
  });
}

export async function disableAnimations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
  });
}

// Performance helpers
export async function measurePageLoadTime(page: Page, url: string) {
  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  const loadTime = Date.now() - startTime;
  
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
    };
  });
  
  return {
    totalLoadTime: loadTime,
    ...metrics
  };
}

// Data generation helpers
export function generateRandomMetrics() {
  return {
    oee: Math.random() * 40 + 60, // 60-100
    availability: Math.random() * 30 + 70, // 70-100
    performance: Math.random() * 35 + 65, // 65-100
    quality: Math.random() * 15 + 85, // 85-100
    temperature: Math.random() * 40 + 50, // 50-90
    pressure: Math.random() * 2 + 2, // 2-4
    vibration: Math.random() * 3 + 0.5 // 0.5-3.5
  };
}

// Retry helpers
export async function retryOnFailure<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Assertion helpers
export async function expectToBeWithinRange(
  actual: number,
  min: number,
  max: number,
  message?: string
) {
  const errorMessage = message || `Expected ${actual} to be between ${min} and ${max}`;
  expect(actual).toBeGreaterThanOrEqual(min);
  expect(actual).toBeLessThanOrEqual(max);
}

// Screenshot helpers
export async function takeDebugScreenshot(page: Page, name: string) {
  await page.screenshot({ 
    path: `test-results/debug-${name}-${Date.now()}.png`,
    fullPage: true 
  });
}

// Element interaction helpers
export async function safeClick(page: Page, selector: string, options?: any) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.scrollIntoViewIfNeeded();
  await element.click(options);
}

export async function safeFill(page: Page, selector: string, value: string) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.clear();
  await element.fill(value);
}

// Table helpers
export async function getTableData(page: Page, tableSelector: string) {
  return page.evaluate((selector) => {
    const table = document.querySelector(selector);
    if (!table) return [];
    
    const rows = Array.from(table.querySelectorAll('tr'));
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      return cells.map(cell => cell.textContent?.trim() || '');
    });
  }, tableSelector);
}

// Form helpers
export async function fillForm(page: Page, formData: Record<string, string>) {
  for (const [field, value] of Object.entries(formData)) {
    const selector = `[name="${field}"], [data-testid="${field}-input"], #${field}`;
    await safeFill(page, selector, value);
  }
}

export async function submitForm(page: Page, submitButtonSelector = '[type="submit"]') {
  await safeClick(page, submitButtonSelector);
}

// Error handling helpers
export async function expectErrorMessage(page: Page, expectedText: string | RegExp) {
  const errorLocator = page.locator('[data-testid="error-message"], [role="alert"], .error');
  await expect(errorLocator).toBeVisible();
  await expect(errorLocator).toContainText(expectedText);
}

export async function expectSuccessMessage(page: Page, expectedText: string | RegExp) {
  const successLocator = page.locator('[data-testid="success-message"], [data-testid="success-toast"], .success');
  await expect(successLocator).toBeVisible();
  await expect(successLocator).toContainText(expectedText);
}

// Navigation helpers
export async function navigateToSection(page: Page, section: string) {
  const navLinks = {
    dashboard: '[data-testid="dashboard-link"]',
    equipment: '[data-testid="equipment-link"]',
    alerts: '[data-testid="alerts-link"]',
    chat: '[data-testid="chat-link"]',
    reports: '[data-testid="reports-link"]'
  };
  
  const selector = navLinks[section.toLowerCase()] || `[href="/${section}"]`;
  await safeClick(page, selector);
  await waitForLoadingToComplete(page);
}

// Mobile testing helpers
export async function setMobileViewport(page: Page, device: 'iphone' | 'android' | 'tablet' = 'iphone') {
  const viewports = {
    iphone: { width: 375, height: 667 },
    android: { width: 360, height: 640 },
    tablet: { width: 768, height: 1024 }
  };
  
  await page.setViewportSize(viewports[device]);
}

export async function toggleMobileMenu(page: Page) {
  await safeClick(page, '[data-testid="mobile-menu-button"]');
  await page.waitForSelector('[data-testid="mobile-menu"]', { state: 'visible' });
}

// Export test data
export * from '../fixtures/factories';
export * from '../fixtures/mock-data';