/**
 * COMPREHENSIVE TEST SETUP
 * 
 * Global test configuration and setup for comprehensive debugging
 */

import { expect, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Extend expect with custom matchers
expect.extend({
  toBeValidComponent(received: any) {
    const pass = received && typeof received === 'object' && received.$$typeof;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid React component`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid React component`,
        pass: false,
      };
    }
  },
  
  toHaveValidProps(received: any, expected: string[]) {
    const props = Object.keys(received.props || {});
    const missingProps = expected.filter(prop => !props.includes(prop));
    const pass = missingProps.length === 0;
    
    if (pass) {
      return {
        message: () => `expected component not to have all required props`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected component to have props: ${missingProps.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Global test environment setup
beforeAll(() => {
  // Mock window objects
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })),
  });

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })),
  });

  // Mock HTMLCanvasElement
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    writable: true,
    value: vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Array(4).fill(0),
      })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => []),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    }),
  });

  // Mock fetch globally
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: '',
      clone: vi.fn(),
      body: null,
      bodyUsed: false,
    })
  ) as any;

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
  });

  // Mock URL.createObjectURL
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'mocked-object-url'),
  });

  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn(),
  });

  // Mock WebSocket for real-time features
  global.WebSocket = vi.fn().mockImplementation(() => ({
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 1, // OPEN
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  })) as any;

  // Mock EventSource for SSE
  global.EventSource = vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    close: vi.fn(),
    readyState: 1, // OPEN
    CONNECTING: 0,
    OPEN: 1,
    CLOSED: 2,
  })) as any;

  // Mock performance API
  Object.defineProperty(global, 'performance', {
    writable: true,
    value: {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByName: vi.fn(() => []),
      getEntriesByType: vi.fn(() => []),
      clearMarks: vi.fn(),
      clearMeasures: vi.fn(),
    },
  });

  // Mock crypto for UUID generation
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: vi.fn(() => 'mocked-uuid-1234-5678-9012'),
      getRandomValues: vi.fn((arr: any) => arr.fill(0)),
    },
  });

  // Setup console methods for testing
  global.console.error = vi.fn();
  global.console.warn = vi.fn();
  global.console.log = vi.fn();
  global.console.info = vi.fn();
  global.console.debug = vi.fn();

  // Mock environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_manufacturing';
  process.env.NEXTAUTH_SECRET = 'test-secret';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.GRAFANA_URL = 'http://localhost:3000';
  process.env.GRAFANA_API_KEY = 'test-grafana-key';
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.resetModules();
});

// Global teardown
afterAll(() => {
  vi.restoreAllMocks();
});

// Custom test utilities
export const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockEquipment = (overrides = {}) => ({
  id: 1,
  name: 'Test Equipment',
  type: 'assembly_line',
  status: 'running',
  location: 'Factory A',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockAlert = (overrides = {}) => ({
  id: 1,
  title: 'Test Alert',
  description: 'Test alert description',
  severity: 'warning',
  status: 'active',
  equipmentId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockMetrics = (overrides = {}) => ({
  id: 1,
  equipmentId: 1,
  oee: 85.5,
  availability: 92.3,
  performance: 89.7,
  quality: 96.8,
  timestamp: new Date(),
  ...overrides,
});

// Test database utilities
export const setupTestDB = async () => {
  // Mock database setup for testing
  return {
    user: {
      findMany: vi.fn(() => Promise.resolve([createMockUser()])),
      findUnique: vi.fn(() => Promise.resolve(createMockUser())),
      create: vi.fn(() => Promise.resolve(createMockUser())),
      update: vi.fn(() => Promise.resolve(createMockUser())),
      delete: vi.fn(() => Promise.resolve(createMockUser())),
    },
    equipment: {
      findMany: vi.fn(() => Promise.resolve([createMockEquipment()])),
      findUnique: vi.fn(() => Promise.resolve(createMockEquipment())),
      create: vi.fn(() => Promise.resolve(createMockEquipment())),
      update: vi.fn(() => Promise.resolve(createMockEquipment())),
      delete: vi.fn(() => Promise.resolve(createMockEquipment())),
    },
    alert: {
      findMany: vi.fn(() => Promise.resolve([createMockAlert()])),
      findUnique: vi.fn(() => Promise.resolve(createMockAlert())),
      create: vi.fn(() => Promise.resolve(createMockAlert())),
      update: vi.fn(() => Promise.resolve(createMockAlert())),
      delete: vi.fn(() => Promise.resolve(createMockAlert())),
    },
    manufacturingMetrics: {
      findMany: vi.fn(() => Promise.resolve([createMockMetrics()])),
      create: vi.fn(() => Promise.resolve(createMockMetrics())),
      aggregate: vi.fn(() => Promise.resolve({ _avg: { oee: 85.5 } })),
    },
    $connect: vi.fn(() => Promise.resolve()),
    $disconnect: vi.fn(() => Promise.resolve()),
    $transaction: vi.fn((fn) => Promise.resolve(fn({}))),
  };
};

// Error simulation utilities
export const simulateNetworkError = () => {
  global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
};

export const simulateTimeoutError = () => {
  global.fetch = vi.fn(() => 
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 100)
    )
  );
};

export const simulateHTTPError = (status: number, message: string) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      statusText: message,
      json: () => Promise.resolve({ error: message }),
    })
  ) as any;
};

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<any> | any) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// Memory leak detection utilities
export const detectMemoryLeaks = () => {
  const initialMemory = process.memoryUsage();
  
  return {
    check: () => {
      const currentMemory = process.memoryUsage();
      const heapIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
      return {
        heapIncrease,
        isLeak: heapIncrease > 10 * 1024 * 1024, // 10MB threshold
        initialMemory,
        currentMemory,
      };
    },
  };
};

// Type declarations for custom matchers
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeValidComponent(): T;
      toHaveValidProps(props: string[]): T;
    }
  }
}