# Testing Guide for Manufacturing Analytics Platform

This project uses Vitest for unit and component testing, and Playwright for end-to-end testing.

## Unit and Component Testing with Vitest

### Running Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### Test Files Structure

- Unit and component tests are located in the `src/__tests__` directory
- Tests should follow the naming convention: `*.test.ts` or `*.test.tsx`

### Writing Tests

Example of a component test:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## End-to-End Testing with Playwright

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in a specific browser
npx playwright test --project=chromium

# Run tests with UI
npx playwright test --ui

# Run a specific test file
npx playwright test e2e/example.spec.ts
```

### Test Files Structure

- E2E tests are located in the `e2e` directory
- Tests should follow the naming convention: `*.spec.ts`

### Writing Tests

Example of an E2E test:

```ts
import { test, expect } from '@playwright/test';

test('navigation works', async ({ page }) => {
  // Navigate to the homepage
  await page.goto('/');
  
  // Click on a navigation link
  await page.getByRole('link', { name: 'Dashboard' }).click();
  
  // Assert that we've navigated to the correct page
  await expect(page).toHaveURL(/.*dashboard/);
});
```

## Configuration

- `vitest.config.ts`: Configuration for Vitest
- `vitest.setup.ts`: Setup file for Vitest tests
- `playwright.config.ts`: Configuration for Playwright tests

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on the state of other tests
2. **Mock External Dependencies**: Use mocks for external services, APIs, and databases
3. **Test Coverage**: Aim for good test coverage, especially for critical components
4. **Snapshots**: Use snapshots for testing UI components when appropriate
5. **Accessibility Testing**: Include tests for accessibility using Playwright's accessibility features