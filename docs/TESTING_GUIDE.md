# Testing Guide for Manufacturing Analytics Platform

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm run test:all

# Run specific test suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e        # E2E tests only

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Structure

```
manufacturing-Analytics-platform/
├── src/
│   ├── __tests__/           # Unit tests
│   │   ├── components/      # Component tests
│   │   ├── hooks/          # Custom hook tests
│   │   └── utils/          # Utility function tests
│   ├── test-utils/         # Test utilities and helpers
│   │   ├── index.tsx       # Custom render and exports
│   │   ├── factories.ts    # Test data factories
│   │   └── mocks.ts        # Mock utilities
│   └── mocks/              # MSW handlers
│       ├── handlers.ts     # API mock handlers
│       └── server.ts       # Mock server setup
└── testing/
    ├── unit/               # Additional unit tests
    ├── integration/        # Integration tests
    ├── e2e/               # End-to-end tests
    ├── vitest.setup.ts    # Test setup
    └── vitest.config.ts   # Test configuration
```

## Writing Tests

### Unit Tests

Unit tests focus on testing individual components and functions in isolation.

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Integration Tests

Integration tests verify how different parts of the application work together.

```typescript
import { describe, it, expect } from 'vitest';
import { server } from '@/mocks/server';
import { errorHandlers } from '@/mocks/handlers';

describe('API Integration', () => {
  it('handles API errors gracefully', async () => {
    // Override default handlers with error handlers
    server.use(...errorHandlers);
    
    const response = await fetch('/api/equipment');
    expect(response.ok).toBe(false);
  });
});
```

### E2E Tests

E2E tests simulate real user interactions in a browser.

```typescript
import { test, expect } from '@playwright/test';

test('user can navigate through the app', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Dashboard');
  await expect(page).toHaveURL('/dashboard');
});
```

## Test Utilities

### Custom Render

Use the custom render function that includes all necessary providers:

```typescript
import { render } from '@/test-utils';

// This automatically wraps components with providers
render(<MyComponent />);
```

### Test Data Factories

Use factories to generate consistent test data:

```typescript
import { 
  createMockEquipment, 
  createMockAlert,
  createMockKPI 
} from '@/test-utils/factories';

const equipment = createMockEquipment({ name: 'Custom Machine' });
const alerts = createMockAlertList(10); // Generate 10 alerts
```

### Mocking

#### API Mocking with MSW

```typescript
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

// Override handlers for specific tests
server.use(
  http.get('/api/custom', () => {
    return HttpResponse.json({ custom: 'data' });
  })
);
```

#### Component Mocking

```typescript
vi.mock('@/components/ExpensiveComponent', () => ({
  default: () => <div>Mocked Component</div>
}));
```

## Best Practices

### 1. Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow the AAA pattern: Arrange, Act, Assert

### 2. Test Isolation

- Each test should be independent
- Clean up after tests (MSW automatically resets handlers)
- Don't rely on test execution order

### 3. Async Testing

```typescript
// Wait for elements to appear
await screen.findByText('Loading complete');

// Wait for specific conditions
await waitFor(() => {
  expect(mockFunction).toHaveBeenCalled();
});
```

### 4. Accessibility Testing

Include accessibility checks in your tests:

```typescript
import { axe } from 'jest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 5. Performance Testing

```typescript
it('renders quickly', () => {
  const start = performance.now();
  render(<MyComponent />);
  const end = performance.now();
  expect(end - start).toBeLessThan(100); // 100ms threshold
});
```

## Debugging Tests

### Vitest UI

Run tests with an interactive UI:

```bash
npm run test:ui
```

### Playwright Debug Mode

Debug E2E tests interactively:

```bash
npm run test:e2e:debug
```

### Console Debugging

```typescript
import { screen, debug } from '@testing-library/react';

// Print the entire DOM
debug();

// Print a specific element
debug(screen.getByText('My Text'));
```

## Coverage Reports

Generate and view coverage reports:

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

## CI/CD Integration

Tests run automatically on:
- Every push to main/develop branches
- Every pull request
- Scheduled dependency updates

See `.github/workflows/` for CI configuration.

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout: `test('name', { timeout: 10000 }, async () => {})`
   - Check for missing `await` statements

2. **MSW not intercepting requests**
   - Ensure MSW server is started in setup file
   - Check request URLs match handler patterns

3. **React warnings in tests**
   - Wrap state updates in `act()`
   - Ensure all async operations complete

### Getting Help

- Check existing test examples in the codebase
- Review the [Testing Strategy](./TESTING_STRATEGY.md) document
- Consult framework documentation:
  - [Vitest](https://vitest.dev/)
  - [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
  - [Playwright](https://playwright.dev/)
  - [MSW](https://mswjs.io/)