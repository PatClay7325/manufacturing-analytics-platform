// Jest setup file for Manufacturing Analytics Platform
// Global test configuration and utilities

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Mock Next.js navigation (App Router)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return React.createElement('img', props);
  },
}));

// Mock React components that cause issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => children,
  LineChart: () => React.createElement('div', { 'data-testid': 'line-chart' }),
  Line: () => React.createElement('div', { 'data-testid': 'line' }),
  XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
  YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
  CartesianGrid: () => React.createElement('div', { 'data-testid': 'cartesian-grid' }),
  Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
  Legend: () => React.createElement('div', { 'data-testid': 'legend' }),
  BarChart: () => React.createElement('div', { 'data-testid': 'bar-chart' }),
  Bar: () => React.createElement('div', { 'data-testid': 'bar' }),
  PieChart: () => React.createElement('div', { 'data-testid': 'pie-chart' }),
  Pie: () => React.createElement('div', { 'data-testid': 'pie' }),
  Cell: () => React.createElement('div', { 'data-testid': 'cell' }),
}));

// Mock external services only if they exist
try {
  jest.mock('@/lib/redis', () => ({
    redis: {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      flushdb: jest.fn(),
    },
  }), { virtual: true });
} catch (error) {
  // Module doesn't exist, skip mocking
}

try {
  jest.mock('@/services/ai/ollama-query-service', () => ({
    OllamaQueryService: jest.fn().mockImplementation(() => ({
      processQuery: jest.fn().mockResolvedValue({
        prismaQuery: {},
        explanation: 'Mocked query explanation',
        results: []
      }),
      testConnection: jest.fn().mockResolvedValue(true),
    })),
  }), { virtual: true });
} catch (error) {
  // Module doesn't exist, skip mocking
}

try {
  jest.mock('@/lib/email', () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
    sendTemplateEmail: jest.fn().mockResolvedValue(true),
  }), { virtual: true });
} catch (error) {
  // Module doesn't exist, skip mocking
}

try {
  jest.mock('@/lib/upload', () => ({
    uploadFile: jest.fn().mockResolvedValue({
      url: 'https://example.com/uploaded-file.jpg',
      key: 'test-file-key'
    }),
    deleteFile: jest.fn().mockResolvedValue(true),
  }), { virtual: true });
} catch (error) {
  // Module doesn't exist, skip mocking
}

// Global test utilities
global.testUtils = {
  // Create mock user
  createMockUser: (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  // Create mock equipment
  createMockEquipment: (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174001',
    equipmentCode: 'EQ_TEST_001',
    equipmentName: 'Test Equipment',
    equipmentType: 'TEST_TYPE',
    isActive: true,
    theoreticalCycleTime: 45.0,
    idealRunRate: 80.0,
    criticalityLevel: 'Standard',
    ...overrides,
  }),

  // Create mock OEE data
  createMockOeeData: (overrides = {}) => ({
    timestamp: new Date(),
    equipmentId: '123e4567-e89b-12d3-a456-426614174001',
    recordId: '123e4567-e89b-12d3-a456-426614174002',
    availability: 0.85,
    performance: 0.90,
    quality: 0.95,
    oee: 0.726, // 0.85 * 0.90 * 0.95
    plannedProductionTime: 480.0,
    actualProductionTime: 408.0,
    downtimeMinutes: 72.0,
    plannedQuantity: 100.0,
    producedQuantity: 90.0,
    goodQuantity: 85.5,
    scrapQuantity: 4.5,
    ...overrides,
  }),

  // Wait for async operations
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },

  // Mock API response
  mockApiResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }),
};

// Console error suppression for expected errors in tests
const originalError = console.error;
console.error = (...args) => {
  // Suppress specific expected errors
  const suppressedErrors = [
    'Warning: ReactDOM.render is no longer supported',
    'Warning: findDOMNode is deprecated',
    'Error: Not implemented: HTMLCanvasElement.prototype.getContext',
  ];
  
  const errorMessage = args[0]?.toString() || '';
  const shouldSuppress = suppressedErrors.some(msg => errorMessage.includes(msg));
  
  if (!shouldSuppress) {
    originalError.apply(console, args);
  }
};

// Set test timeout
jest.setTimeout(30000);

// Global test environment setup
beforeAll(async () => {
  // Any global setup needed for tests
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
});

afterAll(async () => {
  // Cleanup after all tests
  // Close any open connections, clear caches, etc.
});

// Reset state between tests
beforeEach(() => {
  // Clear all mocks between tests
  jest.clearAllMocks();
});

afterEach(() => {
  // Additional cleanup after each test
  jest.restoreAllMocks();
});