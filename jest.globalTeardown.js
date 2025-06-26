// Global teardown - runs once after all test suites
module.exports = async () => {
  // Cleanup test database if needed
  if (process.env.TEST_DATABASE_URL) {
    console.log('Cleaning up test database...');
    // Add database cleanup logic here if needed
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Clear any global state
  delete global.__JEST_SETUP_COMPLETE__;
};