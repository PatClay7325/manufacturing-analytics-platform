/**
 * Enhanced error detection setup for Vitest
 * Catches common React errors that cause hydration issues
 */

import { vi } from 'vitest';

// Track all console errors and warnings
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const errors: string[] = [];
const warnings: string[] = [];

console.error = (...args: any[]) => {
  const message = args.join(' ');
  errors.push(message);
  
  // Fail tests on specific React errors
  if (
    message.includes('Warning: Cannot update a component') ||
    message.includes('Warning: React.jsx: type is invalid') ||
    message.includes('Cannot read properties of undefined') ||
    message.includes('Text content does not match server-rendered HTML') ||
    message.includes('Hydration failed') ||
    message.includes('element type is invalid')
  ) {
    throw new Error(`Critical React Error: ${message}`);
  }
  
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  const message = args.join(' ');
  warnings.push(message);
  
  // Fail tests on hydration warnings
  if (
    message.includes('react-hydration-error') ||
    message.includes('Hydration failed') ||
    message.includes('server-rendered HTML')
  ) {
    throw new Error(`Critical React Warning: ${message}`);
  }
  
  originalConsoleWarn(...args);
};

// Enhanced error boundary for tests
export class TestErrorBoundary extends Error {
  constructor(message: string, public componentStack?: string) {
    super(message);
    this.name = 'TestErrorBoundary';
  }
}

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  throw new Error(`Unhandled Promise Rejection: ${reason}`);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  throw new Error(`Uncaught Exception: ${error.message}`);
});

// Mock window methods that might cause issues in tests
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Export error tracking for test assertions
export const getErrors = () => [...errors];
export const getWarnings = () => [...warnings];
export const clearErrors = () => {
  errors.length = 0;
  warnings.length = 0;
};