/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node', // Use Node environment for E2E tests
    include: [
      'tests/e2e/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    // E2E specific timeouts
    testTimeout: 60000, // 60 seconds for E2E tests
    hookTimeout: 30000,
    teardownTimeout: 10000,
    
    // Run E2E tests sequentially
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: true,
        minForks: 1,
        maxForks: 1
      }
    },
    
    // Sequential execution for E2E
    maxConcurrency: 1,
    fileParallelism: false,
    
    // Enhanced reporting for E2E
    reporters: ['verbose'],
    
    // Setup files
    setupFiles: ['./tests/e2e/setup.ts'],
    
    // Coverage disabled for E2E
    coverage: {
      enabled: false,
    },
    
    // Don't watch files in E2E mode
    watch: false,
    
    // Allow tests to take longer
    bail: 1, // Stop on first failure
    
    // Environment variables for testing
    env: {
      NODE_ENV: 'test',
      TEST_MODE: 'e2e',
      NEXT_PUBLIC_DEV_AUTO_LOGIN: 'true',
    },
  },
});