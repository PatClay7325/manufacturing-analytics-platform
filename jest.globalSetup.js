// Global setup - runs once before all test suites
module.exports = async () => {
  // Set environment variables
  process.env.TZ = 'UTC';
  process.env.NODE_ENV = 'test';
  
  // Setup global test database if needed
  if (process.env.TEST_DATABASE_URL) {
    console.log('Setting up test database...');
    // Add database setup logic here if needed
  }
  
  // Increase Node.js performance
  if (!process.env.CI) {
    // Increase memory limit for local development
    require('v8').setFlagsFromString('--max-old-space-size=4096');
  }
  
  // Setup global mocks that are expensive to create
  global.__JEST_SETUP_COMPLETE__ = true;
};