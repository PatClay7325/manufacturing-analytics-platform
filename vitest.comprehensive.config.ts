import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'Comprehensive Grafana Debug Suite',
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    css: true,
    threads: false, // Disable for consistent debugging
    maxConcurrency: 1, // Run tests sequentially for debugging
    testTimeout: 30000, // Increased timeout for comprehensive testing
    hookTimeout: 10000,
    teardownTimeout: 5000,
    
    // Comprehensive coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/comprehensive',
      include: [
        'src/**/*.{ts,tsx}',
        'src/app/**/*.{ts,tsx}',
        'src/components/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/services/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/mocks/**',
        'src/__tests__/**',
        'node_modules/**',
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/components/**': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'src/app/api/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },

    // Reporter configuration for detailed debugging
    reporter: [
      'verbose',
      'json',
      'html',
      ['junit', { outputFile: './test-results/comprehensive-junit.xml' }],
    ],

    // Test file patterns
    include: [
      'tests/comprehensive/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}',
      'tests/components/**/*.test.{ts,tsx}',
      'tests/api/**/*.test.{ts,tsx}',
      'tests/error-handling/**/*.test.{ts,tsx}',
    ],

    // Watch mode exclusions
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
    ],

    // Debugging and error handling
    retry: 3, // Retry failed tests
    bail: 0, // Don't stop on first failure - run all tests
    passWithNoTests: false, // Fail if no tests found
    allowOnly: false, // Don't allow .only in production tests
    
    // Pool options for debugging
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork for debugging
      },
    },

    // Environment variables for testing
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test_manufacturing',
      NEXTAUTH_SECRET: 'test-secret',
      JWT_SECRET: 'test-jwt-secret',
      GRAFANA_URL: 'http://localhost:3000',
      GRAFANA_API_KEY: 'test-grafana-key',
      REDIS_URL: 'redis://localhost:6379',
      OLLAMA_URL: 'http://localhost:11434',
    },

    // Browser-like globals
    globals: true,

    // Debugging options
    inspect: false, // Set to true for debugging with inspector
    inspectBrk: false, // Set to true to break on start
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/services': resolve(__dirname, './src/services'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/types': resolve(__dirname, './src/types'),
      '@/config': resolve(__dirname, './src/config'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/contexts': resolve(__dirname, './src/contexts'),
    },
  },

  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.DATABASE_URL': '"postgresql://test:test@localhost:5432/test_manufacturing"',
    global: 'globalThis',
  },

  // Optimizations for testing
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@grafana/data',
      '@grafana/runtime',
      '@grafana/ui',
    ],
  },

  // Build options for testing
  build: {
    target: 'node14',
    sourcemap: true,
    minify: false,
  },

  // Server options for testing
  server: {
    fs: {
      strict: false,
    },
  },

  // ESBuild options
  esbuild: {
    target: 'node14',
    format: 'esm',
  },
});