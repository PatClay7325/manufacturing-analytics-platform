// Jest setup - optimized for performance
require('@testing-library/jest-dom');

// Load test environment variables once
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Performance: Disable animations
if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function() {
    return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
    };
  };
  
  // Disable CSS animations
  const style = document.createElement('style');
  style.innerHTML = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `;
  document.head.appendChild(style);
}

// Mock console methods for cleaner output
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  const message = args[0]?.toString() || '';
  const suppressedErrors = [
    'Warning: ReactDOM.render is no longer supported',
    'Warning: findDOMNode is deprecated',
    'Warning: An update to',
    'Warning: unmountComponentAtNode is deprecated',
    'act() is not supported in production builds',
  ];
  
  if (!suppressedErrors.some(msg => message.includes(msg))) {
    originalError.apply(console, args);
  }
};

console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  const suppressedWarnings = [
    'componentWillReceiveProps has been renamed',
    'componentWillMount has been renamed',
  ];
  
  if (!suppressedWarnings.some(msg => message.includes(msg))) {
    originalWarn.apply(console, args);
  }
};

// Performance: Mock expensive modules
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />;
  },
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Performance: Set shorter timeout for tests
jest.setTimeout(10000);

// Cleanup after each test
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
  
  // Clear all timers
  jest.clearAllTimers();
});