/**
 * API configuration settings
 * 
 * This file contains configuration for API endpoints and settings.
 * Different environments (development, test, production) can have different settings.
 */

interface ApiConfig {
  baseUrl: string;
  timeout: number;
  endpoints: {
    equipment: string;
    alerts: string;
    metrics: string;
    maintenance: string;
    users: string;
    auth: string;
    chat: string;
  };
  headers: Record<string, string>;
  defaultOptions: RequestInit;
}

// Get base URL from environment or use default
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  }
  // Server-side
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
};

// Development environment configuration
const devConfig: ApiConfig = {
  baseUrl: getBaseUrl(),
  timeout: 10000,
  endpoints: {
    equipment: '/equipment',
    alerts: '/alerts',
    metrics: '/metrics',
    maintenance: '/maintenance',
    users: '/users',
    auth: '/auth',
    chat: '/chat',
  },
  headers: {
    'Content-Type': 'application/json',
  },
  defaultOptions: {
    mode: 'cors',
    cache: 'default',
  },
};

// Test environment configuration
const testConfig: ApiConfig = {
  ...devConfig,
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
};

// Production environment configuration
const prodConfig: ApiConfig = {
  ...devConfig,
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com/api',
  timeout: 15000,
};

// Determine which configuration to use based on environment
const getApiConfig = (): ApiConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return prodConfig;
    case 'test':
      return testConfig;
    default:
      return devConfig;
  }
};

// Export the configuration
export const apiConfig = getApiConfig();

/**
 * Function to construct a full API URL from an endpoint
 * 
 * @param endpoint - The API endpoint path
 * @returns The full API URL
 */
export const getApiUrl = (endpoint: string): string => {
  return `${apiConfig.baseUrl}${endpoint}`;
};

/**
 * Function to construct a full API URL for a specific resource
 * 
 * @param resource - The API resource (equipment, alerts, etc.)
 * @param path - Additional path segments
 * @returns The full API URL
 */
export const getResourceUrl = (
  resource: keyof typeof apiConfig.endpoints, 
  path: string = ''
): string => {
  return `${apiConfig.baseUrl}${apiConfig.endpoints[resource]}${path}`;
};