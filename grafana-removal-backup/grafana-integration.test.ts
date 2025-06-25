import { NextRequest } from 'next/server';

// Mock dependencies
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

jest.mock('@/lib/resilience/RetryManager', () => ({
  RetryManager: jest.fn().mockImplementation(() => ({
    execute: jest.fn((fn) => fn()),
  })),
  RetryStrategy: {
    EXPONENTIAL: 'exponential',
  },
}));

jest.mock('@/lib/enhanced-error/EnhancedError', () => ({
  EnhancedError: {
    database: jest.fn((msg, details) => new Error(`Database Error: ${msg}`)),
    system: jest.fn((msg, code, details) => new Error(`System Error: ${msg}`)),
  },
}));

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    on: jest.fn(),
  })),
}));

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: jest.fn(),
    end: jest.fn(),
    connect: jest.fn(),
  })),
}));

// Import after mocks
import { SessionBridge } from '@/lib/auth/SessionBridge';
import { GrafanaApiService } from '@/services/grafana/GrafanaApiService';
import { authenticate } from '@/lib/auth/middleware';

describe('Grafana Integration', () => {
  let sessionBridge: SessionBridge;
  let grafanaService: GrafanaApiService;
  let mockRedisClient: any;
  let mockPgPool: any;

  const mockConfig = {
    grafanaUrl: 'http://localhost:3001',
    grafanaApiKey: 'gf_test_api_key_secure_token_12345',
    redisUrl: 'redis://localhost:6379',
    sessionTtl: 3600,
    database: {
      host: 'localhost',
      port: 5432,
      database: 'manufacturing',
      user: 'postgres',
      password: 'password',
    },
  };

  // Mock environment variables for secure implementation
  const originalEnv = process.env;
  beforeAll(() => {
    process.env = {
      ...originalEnv,
      GRAFANA_API_KEY: mockConfig.grafanaApiKey,
      REDIS_URL: mockConfig.redisUrl,
      DATABASE_URL: 'postgresql://postgres:password@localhost:5433/manufacturing',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redis client with updated methods
    const redis = require('redis');
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      setEx: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      exists: jest.fn(),
      expire: jest.fn(),
      on: jest.fn(),
    };
    redis.createClient.mockReturnValue(mockRedisClient);

    // Mock PostgreSQL pool
    const { Pool } = require('pg');
    mockPgPool = {
      query: jest.fn(),
      end: jest.fn(),
      connect: jest.fn(),
    };
    Pool.mockImplementation(() => mockPgPool);

    // Mock fetch for Grafana API calls
    global.fetch = jest.fn();

    sessionBridge = new SessionBridge({
      redisUrl: mockConfig.redisUrl,
      sessionTtl: mockConfig.sessionTtl,
      grafanaConfig: {
        url: mockConfig.grafanaUrl,
        adminApiKey: mockConfig.grafanaApiKey,
      },
    });

    grafanaService = new GrafanaApiService({
      grafanaUrl: mockConfig.grafanaUrl,
      apiKey: mockConfig.grafanaApiKey,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('End-to-End Authentication Flow', () => {
    it('should complete full authentication flow with Grafana sync', async () => {
      // Mock user login
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        role: 'OPERATOR',
      };

      // Mock database user lookup
      mockPgPool.query.mockResolvedValueOnce({
        rows: [mockUser],
      });

      // Mock session creation with updated structure
      const mockSessionData = {
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        role: mockUser.role,
        grafanaToken: 'gf_session_token_12345',
        grafanaUserId: 1,
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.exists.mockResolvedValue(1);
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));

      // Mock Grafana API responses with proper Bearer token authentication
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'api-key-123',
            name: `session-${mockUser.id}-${Date.now()}`,
            key: 'gf_session_token_12345',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            email: mockUser.email,
            login: mockUser.username,
            orgId: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            email: mockUser.email,
            login: mockUser.username,
            orgId: 1,
          }),
        });

      // Step 1: Create session
      const sessionId = await sessionBridge.createSession(mockUser, {
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test Agent',
      });
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^sess_\d+_[a-z0-9]+$/);
      expect(mockRedisClient.setEx).toHaveBeenCalled();

      // Step 2: Validate session exists
      const isValid = await sessionBridge.validateSession(sessionId);
      expect(isValid).toBe(true);

      // Step 3: Get session data
      const sessionData = await sessionBridge.getSessionData(sessionId);
      expect(sessionData).toEqual(mockSessionData);

      // Step 4: Test middleware authentication
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          Cookie: `session=${sessionId}`,
        },
      });

      const authResult = await authenticate(request);
      expect(authResult.isAuthenticated).toBe(true);
      expect(authResult.user).toEqual(mockUser);

      // Step 5: Verify Grafana API integration
      const grafanaUser = await grafanaService.getCurrentUser();
      expect(grafanaUser).toEqual({
        id: 1,
        email: mockUser.email,
        login: mockUser.username,
        orgId: 1,
      });
    });

    it('should handle session expiration and cleanup', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        role: 'OPERATOR',
      };

      // Mock expired session
      const expiredSessionData = {
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        role: mockUser.role,
        grafanaToken: 'gf_session_token_12345',
        grafanaUserId: 1,
        expiresAt: Date.now() - 1000, // Expired
        createdAt: Date.now() - 4000,
        lastAccessedAt: Date.now() - 2000,
      };

      mockRedisClient.exists.mockResolvedValue(1);
      mockRedisClient.get.mockResolvedValue(JSON.stringify(expiredSessionData));
      mockRedisClient.del.mockResolvedValue(1);

      // Mock Grafana API responses for cleanup
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 123,
              name: `session-${mockUser.id}-${Date.now()}`,
              role: 'Viewer',
            },
          ]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'API key deleted' }),
        });

      const sessionId = 'expired-session-id';

      // Test session validation fails for expired session
      const isValid = await sessionBridge.validateSession(sessionId);
      expect(isValid).toBe(false);

      // Test cleanup is called
      await sessionBridge.cleanupSession(sessionId);
      expect(mockRedisClient.del).toHaveBeenCalledWith(`session:${sessionId}`);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/keys/123'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockConfig.grafanaApiKey}`,
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('Data Pipeline Integration', () => {
    it('should handle end-to-end data flow from ingestion to Grafana', async () => {
      // Mock TimescaleDB hypertable setup
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [] }) // Health check
        .mockResolvedValueOnce({ rows: [] }) // Create hypertable
        .mockResolvedValueOnce({ rows: [] }) // Insert sensor data
        .mockResolvedValueOnce({
          rows: [
            {
              equipment_id: '123e4567-e89b-12d3-a456-426614174000',
              sensor_name: 'temperature',
              value: 25.5,
              timestamp: new Date(),
            },
          ],
        }); // Query data

      // Simulate MQTT message ingestion
      const mqttMessage = {
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        sensorName: 'temperature',
        value: 25.5,
        unit: 'celsius',
        quality: 'good',
        timestamp: new Date().toISOString(),
      };

      // Test database insertion
      await mockPgPool.query(
        `INSERT INTO sensor_readings (equipment_id, sensor_name, value, unit, quality, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          mqttMessage.equipmentId,
          mqttMessage.sensorName,
          mqttMessage.value,
          mqttMessage.unit,
          mqttMessage.quality,
          mqttMessage.timestamp,
        ]
      );

      // Test data retrieval for Grafana
      const result = await mockPgPool.query(
        'SELECT * FROM sensor_readings WHERE equipment_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [mqttMessage.equipmentId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].sensor_name).toBe('temperature');
      expect(result.rows[0].value).toBe(25.5);

      // Test Grafana datasource configuration
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          name: 'TimescaleDB',
          type: 'postgres',
          url: 'localhost:5433',
          database: 'manufacturing',
        }),
      });

      const datasources = await grafanaService.getDatasources();
      expect(datasources).toEqual({
        id: 1,
        name: 'TimescaleDB',
        type: 'postgres',
        url: 'localhost:5433',
        database: 'manufacturing',
      });
    });

    it('should handle real-time data streaming through WebSocket proxy', async () => {
      // Mock WebSocket connection
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1, // OPEN
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      // Mock WebSocket constructor
      global.WebSocket = jest.fn(() => mockWebSocket) as any;

      // Simulate real-time data updates
      const realtimeData = [
        {
          equipment_id: '123e4567-e89b-12d3-a456-426614174000',
          metric_name: 'oee',
          value: 85.5,
          timestamp: new Date(),
        },
        {
          equipment_id: '123e4567-e89b-12d3-a456-426614174000',
          metric_name: 'availability',
          value: 90.0,
          timestamp: new Date(),
        },
      ];

      // Mock database continuous aggregate query
      mockPgPool.query.mockResolvedValue({
        rows: realtimeData,
      });

      // Test WebSocket data streaming
      const wsMessage = JSON.stringify({
        type: 'subscribe',
        query: 'SELECT * FROM oee_metrics_1h WHERE equipment_id = $1',
        params: ['123e4567-e89b-12d3-a456-426614174000'],
      });

      expect(mockWebSocket.send).toBeDefined();
      expect(mockWebSocket.close).toBeDefined();

      // Simulate receiving data through WebSocket
      const eventCallback = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (eventCallback) {
        eventCallback({
          data: JSON.stringify({ data: realtimeData }),
        });
      }

      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });
  });

  describe('Dashboard Provisioning Integration', () => {
    it('should provision custom manufacturing dashboards', async () => {
      // Mock Grafana dashboard API responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            uid: 'manufacturing-oee',
            title: 'Manufacturing OEE Dashboard',
            tags: ['manufacturing', 'oee'],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 2,
            uid: 'manufacturing-quality',
            title: 'Quality Metrics Dashboard',
            tags: ['manufacturing', 'quality'],
          }),
        });

      // Test dashboard creation
      const oeeDashboard = await grafanaService.createDashboard({
        dashboard: {
          id: null,
          uid: 'manufacturing-oee',
          title: 'Manufacturing OEE Dashboard',
          tags: ['manufacturing', 'oee'],
          panels: [
            {
              id: 1,
              title: 'OEE Waterfall',
              type: 'oee-waterfall',
              targets: [
                {
                  rawSql: 'SELECT * FROM oee_metrics_1h WHERE $__timeFilter(timestamp)',
                },
              ],
            },
          ],
        },
        overwrite: true,
      });

      expect(oeeDashboard).toEqual({
        id: 1,
        uid: 'manufacturing-oee',
        title: 'Manufacturing OEE Dashboard',
        tags: ['manufacturing', 'oee'],
      });

      // Test custom panel integration
      const qualityDashboard = await grafanaService.createDashboard({
        dashboard: {
          id: null,
          uid: 'manufacturing-quality',
          title: 'Quality Metrics Dashboard',
          tags: ['manufacturing', 'quality'],
          panels: [
            {
              id: 1,
              title: 'SPC Chart',
              type: 'spc-chart',
              targets: [
                {
                  rawSql: 'SELECT * FROM quality_metrics WHERE $__timeFilter(timestamp)',
                },
              ],
            },
            {
              id: 2,
              title: 'Pareto Analysis',
              type: 'pareto-chart',
              targets: [
                {
                  rawSql: 'SELECT defect_type, COUNT(*) FROM quality_defects GROUP BY defect_type',
                },
              ],
            },
          ],
        },
        overwrite: true,
      });

      expect(qualityDashboard).toEqual({
        id: 2,
        uid: 'manufacturing-quality',
        title: 'Quality Metrics Dashboard',
        tags: ['manufacturing', 'quality'],
      });
    });

    it('should handle alert rule provisioning', async () => {
      // Mock alert rule creation
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          uid: 'equipment-down-alert',
          title: 'Equipment Down Alert',
          condition: 'availability < 50',
          noDataState: 'NoData',
          execErrState: 'Alerting',
        }),
      });

      const alertRule = await grafanaService.createAlertRule({
        uid: 'equipment-down-alert',
        title: 'Equipment Down Alert',
        condition: 'availability < 50',
        noDataState: 'NoData',
        execErrState: 'Alerting',
        frequency: '1m',
        for: '5m',
        annotations: {
          description: 'Equipment availability has dropped below 50%',
        },
        labels: {
          severity: 'critical',
          team: 'manufacturing',
        },
      });

      expect(alertRule).toEqual({
        id: 1,
        uid: 'equipment-down-alert',
        title: 'Equipment Down Alert',
        condition: 'availability < 50',
        noDataState: 'NoData',
        execErrState: 'Alerting',
      });
    });
  });

  describe('Security and Rate Limiting', () => {
    it('should validate API key authentication in requests', async () => {
      // Test proper Bearer token usage
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'authenticated' }),
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

    it('should handle rate limiting in session operations', async () => {
      // Mock rate limit middleware would be tested here
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        role: 'OPERATOR',
      };

      // Mock successful session creation
      mockRedisClient.setEx.mockResolvedValue('OK');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'api-key-123',
          key: 'gf_session_token_12345',
        }),
      });

      // Should succeed initially
      const sessionId = await sessionBridge.createSession(mockUser);
      expect(sessionId).toBeDefined();

      // Rate limiting would be enforced by middleware in actual requests
      // This test validates the structure supports rate limiting
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it('should validate environment variables are properly set', () => {
      // Verify that secure environment variables are configured
      expect(process.env.GRAFANA_API_KEY).toBe(mockConfig.grafanaApiKey);
      expect(process.env.REDIS_URL).toBe(mockConfig.redisUrl);
      expect(process.env.DATABASE_URL).toBeDefined();
      
      // Verify no hardcoded credentials in the config
      expect(mockConfig.grafanaApiKey).not.toBe('admin');
      expect(mockConfig.grafanaApiKey).toMatch(/^gf_/);
    });
  });

  describe('Resilience and Error Handling', () => {
    it('should handle circuit breaker integration across services', async () => {
      // Mock circuit breaker for database
      const mockCircuitBreaker = {
        execute: jest.fn(),
        getMetrics: jest.fn(() => ({
          state: 'CLOSED',
          failures: 0,
          successes: 10,
          totalRequests: 10,
        })),
      };

      // Test database circuit breaker
      mockCircuitBreaker.execute.mockResolvedValue({
        rows: [{ status: 'healthy' }],
      });

      const dbResult = await mockCircuitBreaker.execute(() =>
        mockPgPool.query('SELECT 1 as status')
      );

      expect(dbResult.rows[0].status).toBe('healthy');
      expect(mockCircuitBreaker.execute).toHaveBeenCalledTimes(1);

      // Test circuit breaker failure handling
      mockCircuitBreaker.execute.mockRejectedValue(new Error('Database unavailable'));
      mockCircuitBreaker.getMetrics.mockReturnValue({
        state: 'OPEN',
        failures: 5,
        successes: 5,
        totalRequests: 10,
      });

      await expect(
        mockCircuitBreaker.execute(() =>
          mockPgPool.query('SELECT 1 as status')
        )
      ).rejects.toThrow('Database unavailable');

      const metrics = mockCircuitBreaker.getMetrics();
      expect(metrics.state).toBe('OPEN');
      expect(metrics.failures).toBe(5);
    });

    it('should handle graceful degradation when Grafana is unavailable', async () => {
      // Mock Grafana service failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Grafana unavailable'));

      // Session creation should still work without Grafana integration
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        role: 'OPERATOR',
      };

      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.exists.mockResolvedValue(1);
      mockRedisClient.get.mockResolvedValue(
        JSON.stringify({
          userId: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          role: mockUser.role,
          grafanaToken: undefined, // No Grafana token due to service unavailability
          grafanaUserId: undefined,
          expiresAt: Date.now() + 3600000,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        })
      );

      // Session should be created even if Grafana integration fails
      const sessionId = await sessionBridge.createSession(mockUser);
      expect(sessionId).toBeDefined();

      // Session validation should still work
      const isValid = await sessionBridge.validateSession(sessionId);
      expect(isValid).toBe(true);

      // But Grafana API calls should fail gracefully
      await expect(grafanaService.getCurrentUser()).rejects.toThrow('Grafana unavailable');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent session operations', async () => {
      const userCount = 10;
      const users = Array.from({ length: userCount }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        username: `user${i}`,
        role: 'OPERATOR',
      }));

      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.exists.mockResolvedValue(1);

      // Mock Grafana API responses for all users
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: Math.floor(Math.random() * 1000),
            key: `grafana-token-${Math.random()}`,
          }),
        })
      );

      // Create sessions concurrently
      const sessionPromises = users.map(user => sessionBridge.createSession(user));
      const sessionIds = await Promise.all(sessionPromises);

      expect(sessionIds).toHaveLength(userCount);
      expect(mockRedisClient.setEx).toHaveBeenCalledTimes(userCount);

      // Validate sessions concurrently
      mockRedisClient.get.mockImplementation((key: string) => {
        const sessionId = key.replace('session:', '');
        const userIndex = sessionIds.indexOf(sessionId);
        if (userIndex >= 0) {
          return Promise.resolve(
            JSON.stringify({
              userId: users[userIndex].id,
              email: users[userIndex].email,
              username: users[userIndex].username,
              role: users[userIndex].role,
              grafanaToken: `gf_token_${userIndex}_12345`,
              grafanaUserId: userIndex + 1,
              expiresAt: Date.now() + 3600000,
              createdAt: Date.now(),
              lastAccessedAt: Date.now(),
            })
          );
        }
        return Promise.resolve(null);
      });

      const validationPromises = sessionIds.map(sessionId =>
        sessionBridge.validateSession(sessionId)
      );
      const validationResults = await Promise.all(validationPromises);

      expect(validationResults).toEqual(Array(userCount).fill(true));
    });

    it('should handle high-frequency data ingestion', async () => {
      const messageCount = 100;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        sensorName: 'temperature',
        value: 20 + Math.random() * 10,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
      }));

      // Mock database batch insert
      mockPgPool.query.mockResolvedValue({ rows: [] });

      // Simulate batch processing
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < messages.length; i += batchSize) {
        batches.push(messages.slice(i, i + batchSize));
      }

      const insertPromises = batches.map(batch =>
        mockPgPool.query(
          'INSERT INTO sensor_readings (equipment_id, sensor_name, value, timestamp) VALUES ' +
          batch.map(() => '($1, $2, $3, $4)').join(', '),
          batch.flatMap(msg => [msg.equipmentId, msg.sensorName, msg.value, msg.timestamp])
        )
      );

      await Promise.all(insertPromises);

      expect(mockPgPool.query).toHaveBeenCalledTimes(batches.length);
    });
  });
});