# Testing Guide

This project uses Vitest for unit and integration tests, and Playwright for end-to-end tests.

## Setup

1. Run the installation script to set up testing dependencies:
   ```
   ./install-test-deps.cmd
   ```

2. Install Playwright browsers:
   ```
   npx playwright install
   ```

## Unit and Integration Tests

Unit tests are located in the `tests/unit` directory. These tests use Vitest with React Testing Library.

Commands:
- Run tests: `npm test`
- Run tests with UI: `npm run test:ui`
- Run tests with coverage: `npm run test:coverage`

## End-to-End Tests

E2E tests are located in the `tests/e2e` directory. These tests use Playwright to simulate real user interactions in a browser.

Commands:
- Run E2E tests: `npm run test:e2e`
- Run E2E tests in UI mode: `npx playwright test --ui`
- Run E2E tests in a specific browser: `npx playwright test --project=chromium`

## Test Structure

- `tests/unit/`: Component and unit tests
- `tests/e2e/`: End-to-end tests
- `vitest.setup.ts`: Setup file for Vitest
- `vitest.config.ts`: Configuration for Vitest
- `playwright.config.ts`: Configuration for Playwright

## Best Practices

1. **Component Testing**: Test each component in isolation
2. **Coverage**: Aim for high test coverage on critical components
3. **E2E Focus**: Focus E2E tests on critical user journeys
4. **Mocking**: Use mocks for external dependencies
5. **CI Integration**: Tests should run in CI pipeline before deployment