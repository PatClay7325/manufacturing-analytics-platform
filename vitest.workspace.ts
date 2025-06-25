import { defineWorkspace } from 'vitest/config';
import { resolve } from 'path';

export default defineWorkspace([
  {
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    test: {
      include: ['src/__tests__/lib/**/*.test.ts'],
      name: 'unit',
      environment: 'node',
    },
  },
  {
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    test: {
      include: ['src/__tests__/components/**/*.test.tsx'],
      name: 'components',
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
    },
  },
  {
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    test: {
      include: ['src/__tests__/integration/**/*.test.ts'],
      name: 'integration',
      environment: 'node',
      testTimeout: 20000,
    },
  },
]);