# Comprehensive Testing Guide

## Overview
This guide provides complete documentation for the Manufacturing Analytics Platform test suite, covering unit tests, integration tests, end-to-end tests, performance tests, accessibility tests, and visual regression tests.

## Table of Contents
1. [Test Architecture](#test-architecture)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Test Data Management](#test-data-management)
5. [CI/CD Integration](#cicd-integration)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Test Architecture

### Test Suite Structure
```
tests/
├── __tests__/          # Unit and integration tests (Vitest)
├── e2e/               # End-to-end tests (Playwright)
│   ├── api/           # API endpoint tests
│   ├── components/    # Component interaction tests
│   └── pages/         # Page-level tests
├── performance/       # Performance and load tests
├── accessibility/     # WCAG compliance tests
├── visual/           # Visual regression tests
├── fixtures/         # Test data factories and mocks
└── utils/            # Test utilities and helpers
```

### Testing Stack
- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Playwright
- **Performance**: Playwright + Lighthouse
- **Accessibility**: Playwright + axe-core
- **Visual**: Playwright visual comparisons

## Running Tests

### Prerequisites
```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm playwright install

# Set up test database
pnpm prisma db push --skip-seed
pnpm run test:seed
```

### Test Commands

#### Unit and Integration Tests
```bash
# Run all unit tests
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch

# UI mode
pnpm test:ui
```

#### E2E Tests
```bash
# Run all E2E tests
pnpm e2e

# Run specific test file
pnpm e2e tests/e2e/authentication.spec.ts

# Run in headed mode (see browser)
pnpm e2e:headed

# Debug mode
pnpm e2e:debug

# Run specific browser
pnpm e2e --project=chromium
pnpm e2e --project=firefox
pnpm e2e --project=webkit

# Generate test code
pnpm e2e:codegen
```

#### Specialized Tests
```bash
# Performance tests
pnpm test:perf

# Accessibility tests
pnpm test:a11y

# Visual regression tests
pnpm test:visual

# Update visual snapshots
pnpm test:visual:update

# Run all tests
pnpm test:all
```

## Writing Tests

### Unit Test Example
```typescript
// src/__tests__/utils/calculations.test.ts
import { describe, it, expect } from 'vitest';
import { calculateOEE } from '@/utils/calculations';

describe('calculateOEE', () => {
  it('should calculate OEE correctly', () => {
    const result = calculateOEE({
      availability: 90,
      performance: 85,
      quality: 95
    });
    
    expect(result).toBeCloseTo(72.675, 2);
  });

  it('should handle zero values', () => {
    const result = calculateOEE({
      availability: 0,
      performance: 85,
      quality: 95
    });
    
    expect(result).toBe(0);
  });
});
```

### E2E Test Example
```typescript
// tests/e2e/equipment-crud.spec.ts
import { test, expect } from '@playwright/test';
import { EquipmentFactory } from '../fixtures/factories';

test.describe('Equipment CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/equipment');
  });

  test('should create new equipment', async ({ page }) => {
    const equipment = EquipmentFactory.create();
    
    await page.click('[data-testid="add-equipment-button"]');
    
    await page.fill('[data-testid="equipment-name-input"]', equipment.name);
    await page.selectOption('[data-testid="equipment-type-select"]', equipment.type);
    await page.fill('[data-testid="equipment-serial-input"]', equipment.serialNumber);
    
    await page.click('[data-testid="save-equipment-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator(`text=${equipment.name}`)).toBeVisible();
  });
});
```

### Performance Test Example
```typescript
// tests/performance/dashboard-load.spec.ts
import { test, expect } from '@playwright/test';

test('Dashboard should load within performance budget', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/dashboard');
  
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000); // 3 second budget
  
  // Measure Core Web Vitals
  const metrics = await page.evaluate(() => ({
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
    lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime
  }));
  
  expect(metrics.fcp).toBeLessThan(1800);
  expect(metrics.lcp).toBeLessThan(2500);
});
```

### Accessibility Test Example
```typescript
// tests/accessibility/dashboard-a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Dashboard should be accessible', async ({ page }) => {
  await page.goto('/dashboard');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Test Data Management

### Using Factories
```typescript
import { UserFactory, EquipmentFactory, AlertFactory } from '@/tests/fixtures/factories';

// Create single instance
const admin = UserFactory.createAdmin();
const equipment = EquipmentFactory.create({ status: 'operational' });

// Create multiple instances
const alerts = AlertFactory.createBatch(10, { severity: 'high' });

// Create related data
const equipment = EquipmentFactory.create();
const metrics = MetricFactory.createTimeSeries(equipment.id, 24);
```

### Database Seeding
```bash
# Seed test database
pnpm run test:seed

# Seed with specific scenario
pnpm run test:seed --scenario=high-alerts

# Clear and reseed
pnpm run test:seed --clean
```

### Mock API Responses
```typescript
import { mockApiResponses } from '@/tests/fixtures/mock-data';

test('should handle API errors', async ({ page }) => {
  await page.route('**/api/equipment', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    });
  });
  
  await page.goto('/equipment');
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
});
```

## CI/CD Integration

### GitHub Actions Workflow
The test suite runs automatically on:
- Push to main/develop branches
- Pull requests
- Nightly schedule (full suite)
- Manual trigger

### Test Matrix
- **Browsers**: Chromium, Firefox, WebKit
- **Node versions**: 18.x, 20.x
- **Operating Systems**: Ubuntu, Windows, macOS

### Parallel Execution
Tests are distributed across multiple runners:
```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
```

### Test Reports
- **Coverage**: Uploaded to Codecov
- **Performance**: Published as PR comments
- **Accessibility**: Available as artifacts
- **Visual**: Diff reports on failures

## Best Practices

### 1. Test Organization
- Group related tests with `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests focused and independent

### 2. Selectors
```typescript
// ✅ Good - Use data-testid
await page.click('[data-testid="submit-button"]');

// ❌ Bad - Avoid implementation details
await page.click('.btn-primary.submit');
```

### 3. Waiting Strategies
```typescript
// ✅ Good - Wait for specific conditions
await page.waitForSelector('[data-testid="data-loaded"]');
await expect(page.locator('[data-testid="spinner"]')).not.toBeVisible();

// ❌ Bad - Arbitrary waits
await page.waitForTimeout(5000);
```

### 4. Assertions
```typescript
// ✅ Good - Specific assertions
await expect(page.locator('[data-testid="oee-value"]')).toHaveText('87.5%');
await expect(page.locator('[data-testid="status"]')).toHaveClass(/operational/);

// ❌ Bad - Generic assertions
await expect(page.locator('div')).toBeVisible();
```

### 5. Test Data
```typescript
// ✅ Good - Use factories
const equipment = EquipmentFactory.create({ name: 'Test CNC' });

// ❌ Bad - Hardcoded data
const equipment = {
  id: '123',
  name: 'CNC Machine',
  // ... lots of properties
};
```

### 6. Error Handling
```typescript
test('should handle errors gracefully', async ({ page }) => {
  // Intercept console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  await page.goto('/equipment');
  
  // Verify no unexpected errors
  expect(errors).toHaveLength(0);
});
```

## Troubleshooting

### Common Issues

#### 1. Flaky Tests
```typescript
// Add retry logic
test.describe('Flaky test suite', () => {
  test.describe.configure({ retries: 2 });
  
  test('potentially flaky test', async ({ page }) => {
    // Test implementation
  });
});
```

#### 2. Timeout Issues
```typescript
// Increase timeout for slow operations
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  
  // Long-running operations
});
```

#### 3. Database State
```typescript
// Reset database between tests
test.beforeEach(async ({ request }) => {
  await request.post('/api/test/reset-db');
});
```

#### 4. Visual Test Failures
```bash
# Update snapshots after intentional changes
pnpm test:visual:update

# Review changes
git diff tests/visual/snapshots/
```

### Debug Commands
```bash
# Run with debug output
DEBUG=pw:api pnpm e2e

# Headed mode with slow motion
pnpm e2e --headed --slow-mo=1000

# Keep browser open on failure
pnpm e2e --debug

# Generate trace on failure
pnpm e2e --trace on-first-retry
```

### Analyzing Test Failures
1. Check test reports in `playwright-report/`
2. Review screenshots in `test-results/`
3. Analyze traces with `pnpm playwright show-trace`
4. Check coverage gaps in `coverage/`

## Performance Optimization

### Speed Up Tests
1. **Parallel execution**: Tests run in parallel by default
2. **Shared setup**: Use `globalSetup` for expensive operations
3. **Smart waits**: Use `waitForLoadState('networkidle')` sparingly
4. **Mock external services**: Avoid real API calls when possible

### Resource Management
```typescript
// Clean up resources
test.afterEach(async ({ page }) => {
  // Clear local storage
  await page.evaluate(() => localStorage.clear());
  
  // Close any open modals
  await page.keyboard.press('Escape');
});
```

## Continuous Improvement

### Metrics to Track
- Test execution time
- Flakiness rate
- Code coverage percentage
- Number of accessibility violations
- Performance budget violations

### Regular Maintenance
- Review and update test data monthly
- Refactor duplicate test code
- Update visual snapshots quarterly
- Audit accessibility rules
- Performance benchmark reviews

## Resources
- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/)
- [Web Vitals](https://web.dev/vitals/)