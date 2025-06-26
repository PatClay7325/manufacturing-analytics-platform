/**
 * DATA POLICY CONFIGURATION
 * CRITICAL: This file enforces the use of REAL DATA ONLY
 * NO MOCK DATA, NO SIMULATED DATA, NO SAMPLE DATA
 * 
 * This is a core requirement for the POC to demonstrate real-world capabilities
 */

export const DATA_POLICY = {
  // NEVER change this to false - it would break the POC intent
  USE_REAL_DATA_ONLY: true,
  
  // Throw errors if mock data is detected
  FAIL_ON_MOCK_DATA: true,
  
  // List of forbidden patterns that indicate mock data
  FORBIDDEN_PATTERNS: [
    'mock',
    'fake',
    'sample',
    'dummy',
    'test',
    'simulated',
    'generated'
  ],
  
  // Validate data source
  validateDataSource: (source: string): void => {
    const sourceLower = source.toLowerCase();
    for (const pattern of DATA_POLICY.FORBIDDEN_PATTERNS) {
      if (sourceLower.includes(pattern)) {
        throw new Error(
          `CRITICAL ERROR: Attempted to use mock/sample data from source: ${source}. ` +
          `This POC requires REAL DATA ONLY. Mock data destroys the intent of the POC.`
        );
      }
    }
  },
  
  // Validate API responses
  validateApiResponse: (endpoint: string, data: any): void => {
    // Check if response contains mock indicators
    const dataStr = JSON.stringify(data);
    if (dataStr.includes('mock') || dataStr.includes('sample') || dataStr.includes('generated')) {
      console.error('WARNING: API response may contain mock data:', endpoint);
    }
  }
} as const;

// Export type for TypeScript
export type DataPolicy = typeof DATA_POLICY;