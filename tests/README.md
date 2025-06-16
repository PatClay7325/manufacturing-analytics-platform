# Manufacturing Analytics Platform Testing

This directory contains tests for the Manufacturing Analytics Platform.

## Test Structure

- `unit/`: Unit tests for components, hooks, and utilities
- `e2e/`: End-to-end tests for user flows
- `integration/`: Integration tests for API endpoints and services

## Running Tests

### Unit Tests

```bash
npm run test:unit
```

### E2E Tests

```bash
npm run test:e2e
```

### All Tests

```bash
npm run test:all
```

## Known Issues

### WSL Environment

When running in a WSL environment, you may encounter issues with browser dependencies for E2E tests. This is because WSL may not have all the required libraries installed for running Chrome or Firefox.

#### Workaround for WSL

1. Use the `start-claude-code-wsl.cmd` script to launch Claude Code in WSL with proper dependencies.
2. For CI/CD pipelines, use the `CI=true` environment variable to skip browser tests.

```bash
CI=true npm run test:e2e
```

## Writing Tests

See `README-TESTING.md` in the project root for guidelines on writing tests.