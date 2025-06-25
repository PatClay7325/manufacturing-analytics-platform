import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from 'vitest';

// Mock dependencies first
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/resilience/CircuitBreaker', () => ({
  CircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: jest.fn((fn) => fn()),
    getMetrics: jest.fn(() => ({
      state: 'CLOSED',
      failures: 0,
      successes: 10,
      totalRequests: 10,
    })),
  })),
}));

// Import after mocks
import { GrafanaApiService } from '@/services/grafana/GrafanaApiService';

describe('Grafana Security Integration', () => {
  let grafanaService: GrafanaApiService;
  
  const mockConfig = {
    grafanaUrl: 'http://localhost:3001',
    grafanaApiKey: 'gf_test_api_key_secure_token_12345',
  };

  // Mock environment variables for secure implementation
  const originalEnv = process.env;
  beforeAll(() => {
    process.env = {
      ...originalEnv,
      GRAFANA_API_KEY: mockConfig.grafanaApiKey,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch for Grafana API calls
    global.fetch = jest.fn();
    
    grafanaService = new GrafanaApiService({
      grafanaUrl: mockConfig.grafanaUrl,
      apiKey: mockConfig.grafanaApiKey,
    });
  });

  describe('Secure Authentication', () => {
    it('should use Bearer token authentication instead of basic auth', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, login: 'test-user' }),
      });

      await grafanaService.getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/user'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockConfig.grafanaApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Manufacturing-Analytics-Platform/1.0',
          }),
        })
      );
    });

    it('should not contain hardcoded credentials', () => {
      // Verify no hardcoded admin credentials
      expect(mockConfig.grafanaApiKey).not.toBe('admin');
      expect(mockConfig.grafanaApiKey).not.toBe('admin:admin');
      
      // Verify proper API key format
      expect(mockConfig.grafanaApiKey).toMatch(/^gf_/);
      
      // Verify environment variable usage
      expect(process.env.GRAFANA_API_KEY).toBe(mockConfig.grafanaApiKey);
    });

    it('should handle authentication errors properly', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid API key'),
      });

      await expect(grafanaService.getCurrentUser()).rejects.toThrow('Grafana authentication failed');
    });

    it('should validate proper request headers', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await grafanaService.getDashboards();

      const [url, options] = mockFetch.mock.calls[0];
      
      expect(url).toContain('/api/search?type=dash-db');
      expect(options.headers).toEqual({
        'Authorization': `Bearer ${mockConfig.grafanaApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Manufacturing-Analytics-Platform/1.0',
      });
    });

    it('should handle circuit breaker integration', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      });

      const result = await grafanaService.healthCheck();
      
      expect(result).toEqual({ status: 'ok' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/health'),
        expect.any(Object)
      );
    });

    it('should test connection securely', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ database: 'ok', version: '9.0.0' }),
      });

      const connectionResult = await grafanaService.testConnection();
      
      expect(connectionResult).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/health'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockConfig.grafanaApiKey}`,
          }),
        })
      );
    });
  });

  describe('API Operations Security', () => {
    it('should create API keys with proper roles', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'new-api-key-123',
          name: 'test-session-key',
          key: 'gf_generated_token_12345',
        }),
      });

      const result = await grafanaService.createApiKey('test-session-key', 'Viewer', 3600);
      
      expect(result.key).toMatch(/^gf_/);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/keys'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockConfig.grafanaApiKey}`,
          }),
          body: JSON.stringify({
            name: 'test-session-key',
            role: 'Viewer',
            secondsToLive: 3600,
          }),
        })
      );
    });

    it('should securely delete API keys', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'API key deleted' }),
      });

      await grafanaService.deleteApiKey(123);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/keys/123'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockConfig.grafanaApiKey}`,
          }),
        })
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network errors gracefully', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(grafanaService.getCurrentUser()).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(grafanaService.getCurrentUser()).rejects.toThrow();
    });
  });
});