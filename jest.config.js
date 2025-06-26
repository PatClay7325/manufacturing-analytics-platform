/** @type {import('jest').Config} */
module.exports = {
  // Use Node environment for better performance (unless testing browser-specific code)
  testEnvironment: 'node',
  
  // Use jsdom only for component tests
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/**/*.test.{ts,tsx,js,jsx}',
        '!<rootDir>/src/**/*.browser.test.{ts,tsx,js,jsx}',
        '!<rootDir>/src/components/**/*.test.{ts,tsx,js,jsx}',
        '!<rootDir>/src/app/**/*.test.{ts,tsx,js,jsx}',
      ],
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/*.browser.test.{ts,tsx,js,jsx}',
        '<rootDir>/src/components/**/*.test.{ts,tsx,js,jsx}',
        '<rootDir>/src/app/**/*.test.{ts,tsx,js,jsx}',
      ],
    }
  ],
  
  // Use SWC for lightning-fast transpilation (10x faster than ts-jest)
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
        target: 'es2022',
      },
      module: {
        type: 'commonjs',
      },
    }],
  },
  
  // Performance optimizations
  maxWorkers: '50%', // Use half of available CPU cores
  maxConcurrency: 10, // Limit concurrent tests
  
  // Caching for maximum performance
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Use V8 coverage provider (faster than babel)
  coverageProvider: 'v8',
  
  // Faster resolver
  resolver: undefined, // Use default resolver (faster than custom)
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // CSS modules mock (faster than processing)
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__mocks__/styleMock.js',
    // File mocks
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  
  // Optimized module paths
  modulePaths: ['<rootDir>/src'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Ignore patterns for performance
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/backup_20250623_133827/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
  ],
  
  // Module paths to ignore for haste map
  modulePathIgnorePatterns: [
    '<rootDir>/backup_20250623_133827/',
  ],
  
  // Transform ignore patterns (don't transform node_modules except specific packages)
  transformIgnorePatterns: [
    'node_modules/(?!(unified|remark|rehype|micromark|mdast|hast|unist|vfile|@mdx-js)/)',
  ],
  
  // Watch plugins for better DX
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Performance: Clear mocks automatically between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Fail fast in CI
  bail: process.env.CI ? 1 : 0,
  
  // Experimental features for performance
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Global setup/teardown (run once for all tests)
  globalSetup: '<rootDir>/jest.globalSetup.js',
  globalTeardown: '<rootDir>/jest.globalTeardown.js',
  
  // Faster snapshot serialization
  snapshotFormat: {
    escapeString: false,
    printBasicPrototype: false,
  },
  
  // Test timeout
  testTimeout: 10000, // Reduced from 30000 for faster feedback
  
  // Reporter optimizations
  reporters: process.env.CI 
    ? [['default', { summaryThreshold: 10 }]]
    : [['default', { summaryThreshold: 20 }]],
  
  // Disable verbose in CI for cleaner output
  verbose: !process.env.CI,
  
  
  // Force exit after test run
  forceExit: true,
  
  // Detect open handles (disable for performance in CI)
  detectOpenHandles: !process.env.CI,
  
  // Notification for local development (disabled to avoid peer dependency issues)
  // notify: !process.env.CI,
  // notifyMode: 'failure-change',
};