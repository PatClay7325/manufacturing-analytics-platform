import { MqttIngestionService } from '@/services/data-pipeline/MqttIngestionService';

// Mock dependencies
jest.mock('mqtt');
jest.mock('pg');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/resilience', () => ({
  circuitBreakers: {
    database: {
      execute: jest.fn((fn) => fn()),
      getMetrics: jest.fn(() => ({ state: 'CLOSED' })),
    },
  },
  RetryManager: class MockRetryManager {
    constructor(options: any) {}
    execute(fn: () => any) {
      return fn();
    }
  },
  RetryStrategy: {
    EXPONENTIAL: 'EXPONENTIAL',
  },
}));

jest.mock('@/lib/enhanced-error/EnhancedError', () => ({
  EnhancedError: {
    system: jest.fn((message, severity, context, originalError) => originalError || new Error(message)),
    database: jest.fn((message, context, originalError) => originalError || new Error(message)),
  },
  ErrorSeverity: {
    CRITICAL: 'CRITICAL',
  },
}));

describe('MqttIngestionService', () => {
  let service: MqttIngestionService;
  let mockMqttClient: any;
  let mockPgPool: any;

  const mockConfig = {
    mqttUrl: 'mqtt://localhost:1883',
    mqttUsername: 'testuser',
    mqttPassword: 'testpass',
    postgresUrl: 'postgresql://postgres:password@localhost:5433/test',
    topics: {
      sensors: 'manufacturing/+/sensors/+',
      metrics: 'manufacturing/+/metrics',
      status: 'manufacturing/+/status',
      downtime: 'manufacturing/+/downtime',
    },
    batchSize: 10,
    flushInterval: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MQTT client
    mockMqttClient = {
      on: jest.fn(),
      subscribe: jest.fn((topics, options, callback) => {
        if (callback) callback(null);
      }),
      publish: jest.fn(),
      end: jest.fn(),
      connected: true,
    };

    // Mock MQTT connect function
    const mqtt = require('mqtt');
    mqtt.connect = jest.fn().mockReturnValue(mockMqttClient);

    // Mock PostgreSQL pool
    mockPgPool = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      end: jest.fn().mockResolvedValue(undefined),
    };

    const { Pool } = require('pg');
    Pool.mockImplementation(() => mockPgPool);

    service = new MqttIngestionService(mockConfig);
  });

  afterEach(async () => {
    if (service) {
      await service.stop();
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(service).toBeInstanceOf(MqttIngestionService);
    });

    it('should create PostgreSQL pool with correct configuration', () => {
      const { Pool } = require('pg');
      expect(Pool).toHaveBeenCalledWith({
        connectionString: mockConfig.postgresUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    });
  });

  describe('Service lifecycle', () => {
    it('should start successfully', async () => {
      const mqtt = require('mqtt');
      
      // Simulate successful connection
      setTimeout(() => {
        const connectCallback = mockMqttClient.on.mock.calls.find(
          call => call[0] === 'connect'
        )[1];
        connectCallback();
      }, 0);

      await service.start();

      expect(mockPgPool.query).toHaveBeenCalledWith('SELECT 1');
      expect(mqtt.connect).toHaveBeenCalledWith(
        mockConfig.mqttUrl,
        expect.objectContaining({
          username: mockConfig.mqttUsername,
          password: mockConfig.mqttPassword,
        })
      );
    });

    it('should handle database connection failure during start', async () => {
      mockPgPool.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.start()).rejects.toThrow();
    });

    it('should handle MQTT connection failure during start', async () => {
      const mqtt = require('mqtt');
      
      // Simulate connection failure
      setTimeout(() => {
        const reconnectCallback = mockMqttClient.on.mock.calls.find(
          call => call[0] === 'reconnect'
        )[1];
        // Simulate max reconnect attempts exceeded
        for (let i = 0; i <= 10; i++) {
          reconnectCallback();
        }
      }, 0);

      await expect(service.start()).rejects.toThrow();
    });

    it('should stop gracefully', async () => {
      // Start the service first
      setTimeout(() => {
        const connectCallback = mockMqttClient.on.mock.calls.find(
          call => call[0] === 'connect'
        )[1];
        connectCallback();
      }, 0);

      await service.start();
      await service.stop();

      expect(mockMqttClient.end).toHaveBeenCalled();
      expect(mockPgPool.end).toHaveBeenCalled();
    });

    it('should not start if already running', async () => {
      const { logger } = require('@/lib/logger');

      setTimeout(() => {
        const connectCallback = mockMqttClient.on.mock.calls.find(
          call => call[0] === 'connect'
        )[1];
        connectCallback();
      }, 0);

      await service.start();
      await service.start(); // Try to start again

      expect(logger.warn).toHaveBeenCalledWith('MQTT ingestion service is already running');
    });
  });

  describe('Message handling', () => {
    beforeEach(async () => {
      // Start the service for message handling tests
      setTimeout(() => {
        const connectCallback = mockMqttClient.on.mock.calls.find(
          call => call[0] === 'connect'
        )[1];
        connectCallback();
      }, 0);

      await service.start();
    });

    it('should handle sensor data messages', async () => {
      const messageHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const sensorData = {
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        sensorName: 'temperature',
        value: 25.5,
        unit: 'celsius',
        quality: 'good',
      };

      const topic = 'manufacturing/equipment1/sensors/temperature';
      const message = Buffer.from(JSON.stringify(sensorData));

      await messageHandler(topic, message);

      // Should have added to buffer
      const metrics = service.getMetrics();
      expect(metrics.messagesReceived).toBe(1);
      expect(metrics.messagesProcessed).toBe(1);
    });

    it('should handle metric data messages', async () => {
      const messageHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const metricData = {
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        metrics: {
          oee: 85.5,
          availability: 90.0,
          performance: 95.0,
          quality: 99.0,
        },
        tags: { shift: 'morning', line: 'A' },
      };

      const topic = 'manufacturing/equipment1/metrics';
      const message = Buffer.from(JSON.stringify(metricData));

      await messageHandler(topic, message);

      const metrics = service.getMetrics();
      expect(metrics.messagesReceived).toBe(1);
      expect(metrics.messagesProcessed).toBe(1);
    });

    it('should handle status update messages', async () => {
      const messageHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const statusData = {
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'running',
        reason: 'normal operation',
      };

      const topic = 'manufacturing/equipment1/status';
      const message = Buffer.from(JSON.stringify(statusData));

      await messageHandler(topic, message);

      const metrics = service.getMetrics();
      expect(metrics.messagesReceived).toBe(1);
      expect(metrics.messagesProcessed).toBe(1);
    });

    it('should handle downtime event messages', async () => {
      const messageHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const downtimeData = {
        equipmentId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'start',
        reason: 'maintenance',
        category: 'planned',
      };

      const topic = 'manufacturing/equipment1/downtime';
      const message = Buffer.from(JSON.stringify(downtimeData));

      await messageHandler(topic, message);

      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO downtime_events'),
        expect.arrayContaining([downtimeData.equipmentId])
      );
    });

    it('should handle invalid JSON messages gracefully', async () => {
      const { logger } = require('@/lib/logger');
      const messageHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const topic = 'manufacturing/equipment1/sensors/temperature';
      const message = Buffer.from('invalid json');

      await messageHandler(topic, message);

      const metrics = service.getMetrics();
      expect(metrics.messagesReceived).toBe(1);
      expect(metrics.messagesFailed).toBe(1);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle unknown topic messages', async () => {
      const { logger } = require('@/lib/logger');
      const messageHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const topic = 'unknown/topic';
      const message = Buffer.from('{}');

      await messageHandler(topic, message);

      expect(logger.warn).toHaveBeenCalledWith('Unknown topic: unknown/topic');
    });

    it('should handle validation errors gracefully', async () => {
      const { logger } = require('@/lib/logger');
      const messageHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const invalidSensorData = {
        equipmentId: 'invalid-uuid',
        sensorName: 'temperature',
        value: 'not-a-number',
      };

      const topic = 'manufacturing/equipment1/sensors/temperature';
      const message = Buffer.from(JSON.stringify(invalidSensorData));

      await messageHandler(topic, message);

      expect(logger.error).toHaveBeenCalledWith('Invalid sensor data:', expect.any(Object));
    });
  });

  describe('Buffer management', () => {
    beforeEach(async () => {
      setTimeout(() => {
        const connectCallback = mockMqttClient.on.mock.calls.find(
          call => call[0] === 'connect'
        )[1];
        connectCallback();
      }, 0);

      await service.start();
    });

    it('should flush buffer when batch size is reached', async () => {
      const messageHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      // Send messages up to batch size
      for (let i = 0; i < mockConfig.batchSize; i++) {
        const sensorData = {
          equipmentId: '123e4567-e89b-12d3-a456-426614174000',
          sensorName: 'temperature',
          value: 25.5 + i,
        };

        const topic = 'manufacturing/equipment1/sensors/temperature';
        const message = Buffer.from(JSON.stringify(sensorData));

        await messageHandler(topic, message);
      }

      // Should have triggered a flush
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sensor_readings'),
        expect.any(Array)
      );
    });

    it('should handle database errors during flush', async () => {
      const { circuitBreakers } = require('@/lib/resilience');
      circuitBreakers.database.execute.mockRejectedValue(new Error('Database error'));

      const messageHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      // Fill buffer to trigger flush
      for (let i = 0; i < mockConfig.batchSize; i++) {
        const sensorData = {
          equipmentId: '123e4567-e89b-12d3-a456-426614174000',
          sensorName: 'temperature',
          value: 25.5 + i,
        };

        const topic = 'manufacturing/equipment1/sensors/temperature';
        const message = Buffer.from(JSON.stringify(sensorData));

        await messageHandler(topic, message);
      }

      const metrics = service.getMetrics();
      expect(metrics.totalErrors).toBeGreaterThan(0);
    });

    it('should prevent buffer overflow', async () => {
      const { circuitBreakers } = require('@/lib/resilience');
      circuitBreakers.database.execute.mockRejectedValue(new Error('Database error'));

      const messageHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      // Send many more messages than max buffer size to test overflow protection
      for (let i = 0; i < mockConfig.batchSize * 15; i++) {
        const sensorData = {
          equipmentId: '123e4567-e89b-12d3-a456-426614174000',
          sensorName: 'temperature',
          value: 25.5 + i,
        };

        const topic = 'manufacturing/equipment1/sensors/temperature';
        const message = Buffer.from(JSON.stringify(sensorData));

        await messageHandler(topic, message);
      }

      // Should have logged buffer overflow
      const { logger } = require('@/lib/logger');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Buffer overflow detected'),
        expect.any(Object)
      );
    });
  });

  describe('Metrics', () => {
    it('should track service metrics', async () => {
      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty('messagesReceived');
      expect(metrics).toHaveProperty('messagesProcessed');
      expect(metrics).toHaveProperty('messagesFailed');
      expect(metrics).toHaveProperty('batchesInserted');
      expect(metrics).toHaveProperty('lastFlush');
      expect(metrics).toHaveProperty('bufferSizes');
      expect(metrics).toHaveProperty('isRunning');
      expect(metrics).toHaveProperty('mqttConnected');
      expect(metrics).toHaveProperty('circuitBreakerTrips');
      expect(metrics).toHaveProperty('retriesAttempted');
      expect(metrics).toHaveProperty('totalErrors');
    });

    it('should track buffer sizes', () => {
      const metrics = service.getMetrics();

      expect(metrics.bufferSizes).toHaveProperty('sensors');
      expect(metrics.bufferSizes).toHaveProperty('metrics');
      expect(metrics.bufferSizes).toHaveProperty('status');
      expect(metrics.bufferSizes).toHaveProperty('downtime');
    });

    it('should indicate running state correctly', async () => {
      let metrics = service.getMetrics();
      expect(metrics.isRunning).toBe(false);

      setTimeout(() => {
        const connectCallback = mockMqttClient.on.mock.calls.find(
          call => call[0] === 'connect'
        )[1];
        connectCallback();
      }, 0);

      await service.start();

      metrics = service.getMetrics();
      expect(metrics.isRunning).toBe(true);

      await service.stop();

      metrics = service.getMetrics();
      expect(metrics.isRunning).toBe(false);
    });
  });

  describe('Error handling and resilience', () => {
    it('should use circuit breaker for database operations', async () => {
      const { circuitBreakers } = require('@/lib/resilience');

      setTimeout(() => {
        const connectCallback = mockMqttClient.on.mock.calls.find(
          call => call[0] === 'connect'
        )[1];
        connectCallback();
      }, 0);

      await service.start();

      expect(circuitBreakers.database.execute).toHaveBeenCalled();
    });

    it('should track circuit breaker trips', async () => {
      const { circuitBreakers } = require('@/lib/resilience');
      circuitBreakers.database.execute.mockRejectedValue(new Error('Database error'));
      circuitBreakers.database.getMetrics.mockReturnValue({ state: 'OPEN' });

      setTimeout(() => {
        const connectCallback = mockMqttClient.on.mock.calls.find(
          call => call[0] === 'connect'
        )[1];
        connectCallback();
      }, 0);

      await service.start();

      const messageHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      // Trigger a flush that will fail
      for (let i = 0; i < mockConfig.batchSize; i++) {
        const sensorData = {
          equipmentId: '123e4567-e89b-12d3-a456-426614174000',
          sensorName: 'temperature',
          value: 25.5 + i,
        };

        const topic = 'manufacturing/equipment1/sensors/temperature';
        const message = Buffer.from(JSON.stringify(sensorData));

        await messageHandler(topic, message);
      }

      const metrics = service.getMetrics();
      expect(metrics.circuitBreakerTrips).toBeGreaterThan(0);
    });
  });
});