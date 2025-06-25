/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      all: true,
      include: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.spec.{ts,tsx}',
        '!src/test-utils/**',
        '!src/mocks/**',
        '!src/**/*.config.ts',
        '!src/**/types.ts',
        '!src/app/**/page.tsx', // Exclude Next.js pages temporarily
        '!src/app/**/layout.tsx', // Exclude Next.js layouts temporarily
      ],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/mockServiceWorker.js',
        'src/test-utils/',
        'src/mocks/',
        'src/instrumentation.ts.disabled'
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      },
      watermarks: {
        statements: [95, 100],
        functions: [95, 100],
        branches: [95, 100],
        lines: [95, 100]
      }
    },
    // Performance optimizations
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        isolate: false,
        useAtomics: true,
        minThreads: 1,
        maxThreads: 1
      }
    },
    maxConcurrency: 1,
    // Disable watch mode by default
    watch: false,
    // Allow passing with no tests
    passWithNoTests: true,
    // Reporter options
    reporters: ['default', 'json'],
    outputFile: {
      json: './test-results.json'
    },
    // Mock handling
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },
});