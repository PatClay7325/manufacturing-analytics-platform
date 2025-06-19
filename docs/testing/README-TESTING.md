# Testing Guide for Manufacturing Analytics Platform

This document outlines the testing strategy, tools, and best practices for the Manufacturing Analytics Platform.

## Table of Contents

1. [Testing Stack](#testing-stack)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Test Directory Structure](#test-directory-structure)
5. [Test Utilities](#test-utilities)
6. [Mocking](#mocking)
7. [Continuous Integration](#continuous-integration)
8. [Troubleshooting](#troubleshooting)

## Testing Stack

The Manufacturing Analytics Platform uses the following testing tools:

- **Unit and Integration Tests**: [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- **End-to-End Tests**: [Playwright](https://playwright.dev/)
- **Test Coverage**: V8 Coverage Provider integrated with Vitest
- **Mocking**: Built-in Vitest mocks and MSW (Mock Service Worker)

## Running Tests

### Unit and Integration Tests

```bash
# Run all unit and integration tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit
```

### End-to-End Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

### Running All Tests

```bash
# Run all tests (unit, integration, and E2E)
npm run test:all
```

## Writing Tests

### Unit Tests

Unit tests should focus on testing individual components, functions, and modules in isolation. Use the following pattern:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    render(<MyComponent />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Integration Tests

Integration tests verify that multiple components or modules work together correctly. They're similar to unit tests but with a wider scope:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Parent } from './Parent';

describe('Parent with Child integration', () => {
  it('passes data from parent to child correctly', () => {
    render(<Parent initialData={testData} />);
    expect(screen.getByTestId('child-display')).toHaveTextContent('expected value');
  });
});
```

### End-to-End Tests

E2E tests verify that the application works correctly from a user's perspective. Use Playwright to simulate user interactions:

```typescript
import { test, expect } from '@playwright/test';

test('user can navigate to dashboard', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Dashboard');
  await expect(page).toHaveURL(/.*dashboard/);
});
```

## Test Directory Structure

The project follows this test directory structure:

```
/src
  /__tests__/            # Unit and integration tests for source code
    /components/         # Component tests
    /hooks/              # Hook tests
    /utils/              # Utility function tests
  /test-utils/           # Test utilities, factories, and mocks
/tests
  /e2e/                  # End-to-end tests
  /unit/                 # Additional unit tests (if needed)
```

## Test Utilities

### Using Test Utilities

The project provides several test utilities to simplify testing:

```typescript
import { render, screen, userEvent } from '@/test-utils';
import { createEquipment, createAlert, mockApiHandlers } from '@/test-utils';

// Use custom render function (includes providers if needed)
render(<MyComponent />);

// Use test data factories
const equipment = createEquipment({ status: 'maintenance' });

// Use mock API handlers
const mockApi = mockApiHandlers.getEquipment();
```

### Available Test Utilities

- **Custom render function**: Includes necessary providers
- **userEvent**: For simulating user interactions
- **Test data factories**: For creating test data
- **Mock API handlers**: For mocking API responses
- **Mock router**: For mocking Next.js router

## Mocking

### Mocking API Requests

Use the built-in Vitest mocking capabilities:

```typescript
import { vi } from 'vitest';
import { mockFetch } from '@/test-utils';

// Mock global fetch
global.fetch = mockFetch(mockData);

// Mock specific module
vi.mock('@/utils/api', () => ({
  fetchData: vi.fn().mockResolvedValue(mockData)
}));
```

### Mocking Next.js Components

The `vitest.setup.ts` file includes mocks for common Next.js components:

- `next/router`
- `next/image`
- `next/link`
- `next/navigation`

## Continuous Integration

The project uses CI to run tests automatically:

1. All tests run on pull requests and merges to main
2. Unit and integration tests must pass for PR approval
3. Test coverage is reported for each PR
4. E2E tests run in headless mode in CI

## Troubleshooting

### Common Issues

- **WSL Environments**: In WSL environments, E2E tests may fail due to missing browser dependencies. Use `CI=true npm run test:e2e` to run tests in CI mode.

- **Test Timeouts**: If tests timeout, increase the timeout value:
  ```typescript
  // In a specific test
  test('slow test', async ({ page }) => {
    test.setTimeout(60000); // 60 seconds
    // Test code...
  });
  ```

- **Visual Regression**: If visual tests are failing, regenerate the snapshots:
  ```bash
  npm run test:e2e -- --update-snapshots
  ```

### Debugging Tips

- Use `console.log` in tests (will show in Vitest output)
- Use `test.only` to run a specific test in isolation
- Use the debug mode for E2E tests: `npm run test:e2e:debug`
- Check the HTML snapshot when a test fails in React Testing Library