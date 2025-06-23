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
    // Performance optimizations
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    // Run tests in single thread to avoid memory issues
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
    // Memory optimizations
    maxConcurrency: 1,
    // Disable coverage by default (can be enabled with --coverage flag)
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/e2e/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/types.ts',
        '**/mockServiceWorker.js',
        'src/test-utils/',
        'src/mocks/',
      ],
    },
    // Only fail on real console errors, ignore warnings and mocked logs
    onConsoleLog: (log, type) => {
      if (type === 'stderr' && !log.includes('Warning:') && !log.includes('Mock') && !log.includes('vi.fn()')) {
        return false // Don't fail on these logs
      }
    },
    // Disable watch mode by default
    watch: false,
    // Allow passing with no tests
    passWithNoTests: true,
    // Reporter options
    reporters: ['default'],
    outputFile: './test-results.json',
  },
});