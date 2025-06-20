/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
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
    setupFiles: ['./vitest.setup.ts', './scripts/error-detection-setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.auto.test.{ts,tsx}', // Auto-generated tests
      'tests/unit/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    // Aggressive error detection
    bail: 0, // Don't stop on first failure
    passWithNoTests: false,
    allowOnly: false,
    isolate: true, // Run each test in isolation
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'tests/e2e/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/types.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50
        }
      }
    },
    // Enhanced error reporting
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results/error-detection.json'
    }
  },
});