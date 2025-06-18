// Setup file for Jest/Vitest

// Vitest globals
import { vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
global.vi = vi;
global.beforeAll = beforeAll;
global.afterAll = afterAll;
global.afterEach = afterEach;
global.beforeEach = beforeEach;

// Mock fetch
global.fetch = vi.fn();

// Mock server
import { server } from './mocks/server';

// Establish API mocking before tests
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

// Reset any request handlers that we may add during the tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    // Initialize with a callback that does nothing
    this.callback = callback;
  }
  
  observe() {
    // Do nothing
    return;
  }
  
  unobserve() {
    // Do nothing
    return;
  }
  
  disconnect() {
    // Do nothing
    return;
  }
  
  private callback: IntersectionObserverCallback;
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Define scrollTo function type
type ScrollToFunction = {
  (options?: ScrollToOptions): void;
  (x: number, y: number): void;
};

// Mock window.scrollTo with proper typing
window.scrollTo = vi.fn() as unknown as ScrollToFunction;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});