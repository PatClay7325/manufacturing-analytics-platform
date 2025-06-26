const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'] }],
  },
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/backup_20250623_133827/',
    '<rootDir>/.next/',
    '<rootDir>/dist/'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/backup_20250623_133827/'
  ],
  collectCoverage: false,
  verbose: true,
  maxWorkers: 1,
};

module.exports = config;