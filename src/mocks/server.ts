import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// This configures a request mocking server with the given request handlers.
export const server = setupServer(...handlers);

// NOTE: The test setup for beforeAll, afterEach, and afterAll has been moved to setupTests.ts
// to avoid TypeScript errors. Please see setupTests.ts for the setup code.