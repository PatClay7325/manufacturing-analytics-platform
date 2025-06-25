// Integration test setup
// Additional setup for integration tests

// Extended timeout for integration tests
jest.setTimeout(60000);

// Additional global utilities for integration tests
global.integrationUtils = {
  // Wait for async operations with longer timeout
  waitForIntegration: async (condition, timeout = 30000) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) return result;
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          throw error;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error('Integration test timeout');
  },

  // Mock external service responses
  mockExternalServices: () => {
    // Mock SAP responses
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('sap')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      }
      
      // Mock Ignition responses
      if (url.includes('ignition')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ tags: [], values: [] }),
        });
      }
      
      // Default mock response
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });
  },
};

beforeAll(async () => {
  console.log('Setting up integration test environment...');
  
  // Setup mocks for external services
  global.integrationUtils.mockExternalServices();
});

afterAll(async () => {
  console.log('Cleaning up integration test environment...');
  
  // Restore fetch if it was mocked
  if (global.fetch && global.fetch.mockRestore) {
    global.fetch.mockRestore();
  }
});