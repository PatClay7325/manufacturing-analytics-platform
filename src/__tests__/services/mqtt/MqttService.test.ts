// Jest test - using global test functions
/**
 * MQTT Service Tests
 */

import { MqttService, ServiceStatus } from '@/services/mqtt/MqttService';
import { MqttMonitor } from '@/services/mqtt/MqttMonitor';
import { sensorDataTransformer } from '@/services/mqtt/transformers/SensorDataTransformer';
import mqtt from 'mqtt';

// Mock MQTT client
jest.mock('mqtt');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    metric: {
      createMany: jest.fn().mockResolvedValue({ count: 1 })
    },
    alert: {
      create: jest.fn().mockResolvedValue({})
    },
    $queryRaw: jest.fn().mockResolvedValue([])
  }
}));

describe('MqttService', () => {
  let mqttService: MqttService;
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock MQTT client
    mockClient = {
      on: jest.fn(),
      subscribe: jest.fn((topic, options, callback) => callback(null)),
      publish: jest.fn((topic, message, options, callback) => callback(null)),
      end: jest.fn((force, options, callback) => callback()),
      connected: true
    };

    // Mock mqtt.connect
    (mqtt.connect as any).mockReturnValue(mockClient);

    // Create service instance
    mqttService = new MqttService({
      brokerUrl: 'mqtt://localhost:1883',
      topics: {
        sensors: ['sensors/+/data']
      }
    });
  });

  afterEach(() => {
    mqttService.removeAllListeners();
  });

  describe('Connection', () => {
    it('should connect to MQTT broker', async () => {
      const connectPromise = mqttService.connect();
      
      // Simulate connection
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();

      await connectPromise;

      expect(mqtt.connect).toHaveBeenCalledWith('mqtt://localhost:1883', expect.any(Object));
      expect(mqttService.getMetrics().status).toBe(ServiceStatus.CONNECTED);
    });

    it('should handle connection errors', async () => {
      const connectPromise = mqttService.connect();
      
      // Simulate error
      const errorHandler = mockClient.on.mock.calls.find(call => call[0] === 'error')[1];
      errorHandler(new Error('Connection failed'));

      await expect(connectPromise).rejects.toThrow('Connection failed');
      expect(mqttService.getMetrics().status).toBe(ServiceStatus.ERROR);
    });

    it('should disconnect cleanly', async () => {
      // Connect first
      const connectPromise = mqttService.connect();
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();
      await connectPromise;

      // Disconnect
      await mqttService.disconnect();

      expect(mockClient.end).toHaveBeenCalled();
      expect(mqttService.getMetrics().status).toBe(ServiceStatus.DISCONNECTED);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      // Connect service
      const connectPromise = mqttService.connect();
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();
      await connectPromise;
    });

    it('should handle incoming sensor data', async () => {
      const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message')[1];
      
      const sensorData = {
        sensorId: 'temp-001',
        timestamp: new Date().toISOString(),
        value: 23.5,
        unit: '°C'
      };

      messageHandler('sensors/temp-001/data', Buffer.from(JSON.stringify(sensorData)));

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = mqttService.getMetrics();
      expect(metrics.messagesReceived).toBe(1);
    });

    it('should buffer messages for batch processing', async () => {
      const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message')[1];
      
      // Send multiple messages
      for (let i = 0; i < 5; i++) {
        const sensorData = {
          sensorId: `sensor-${i}`,
          value: i * 10,
          timestamp: new Date().toISOString()
        };
        messageHandler(`sensors/sensor-${i}/data`, Buffer.from(JSON.stringify(sensorData)));
      }

      const metrics = mqttService.getMetrics();
      expect(metrics.messagesReceived).toBe(5);
      expect(metrics.bufferSize).toBeGreaterThan(0);
    });

    it('should move failed messages to dead letter queue', async () => {
      // Mock database error
      const { prisma } = await import('@/lib/database');
      (prisma.metric.createMany as any).mockRejectedValueOnce(new Error('Database error'));

      const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message')[1];
      
      const sensorData = {
        sensorId: 'temp-001',
        value: 'invalid', // This will cause validation error
        timestamp: new Date().toISOString()
      };

      messageHandler('sensors/temp-001/data', Buffer.from(JSON.stringify(sensorData)));

      // Force buffer flush
      await (mqttService as any).flushBuffer();

      const metrics = mqttService.getMetrics();
      expect(metrics.messagesFailed).toBeGreaterThan(0);
    });
  });

  describe('Publishing', () => {
    beforeEach(async () => {
      // Connect service
      const connectPromise = mqttService.connect();
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();
      await connectPromise;
    });

    it('should publish messages to topics', async () => {
      const payload = { command: 'calibrate', offset: 0.5 };
      await mqttService.publish('commands/sensor-001', payload);

      expect(mockClient.publish).toHaveBeenCalledWith(
        'commands/sensor-001',
        JSON.stringify(payload),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should throw error when not connected', async () => {
      await mqttService.disconnect();
      
      await expect(
        mqttService.publish('test/topic', { data: 'test' })
      ).rejects.toThrow('MQTT client not connected');
    });
  });
});

describe('MqttMonitor', () => {
  let mqttService: MqttService;
  let mqttMonitor: MqttMonitor;
  let mockClient: any;

  beforeEach(() => {
    // Create mock MQTT client
    mockClient = {
      on: jest.fn(),
      subscribe: jest.fn((topic, options, callback) => callback(null)),
      connected: true
    };

    (mqtt.connect as any).mockReturnValue(mockClient);

    mqttService = new MqttService({
      brokerUrl: 'mqtt://localhost:1883'
    });

    mqttMonitor = new MqttMonitor(mqttService, {
      checkInterval: 100, // Fast checks for testing
      thresholds: {
        messageRate: 10,
        errorRate: 5,
        bufferSize: 100,
        deadLetterSize: 10
      }
    });
  });

  afterEach(() => {
    mqttMonitor.stop();
  });

  it('should monitor service health', async () => {
    // Connect service
    const connectPromise = mqttService.connect();
    const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
    connectHandler();
    await connectPromise;

    const healthPromise = new Promise(resolve => {
      mqttMonitor.on('health', resolve);
    });

    mqttMonitor.start();

    const health = await healthPromise;
    expect(health).toMatchObject({
      status: expect.any(String),
      timestamp: expect.any(Date),
      metrics: expect.any(Object)
    });
  });

  it('should emit alerts on threshold violations', async () => {
    const alertPromise = new Promise(resolve => {
      mqttMonitor.on('alert', resolve);
    });

    // Force unhealthy status
    (mqttService.getMetrics as any) = () => ({
      status: ServiceStatus.ERROR,
      messagesReceived: 1000,
      messagesProcessed: 900,
      messagesFailed: 100,
      bufferSize: 200,
      deadLetterQueueSize: 20
    });

    mqttMonitor.start();

    const alert = await alertPromise;
    expect(alert).toMatchObject({
      service: 'mqtt',
      severity: expect.any(String),
      message: expect.any(String)
    });
  });
});

describe('SensorDataTransformer', () => {
  it('should transform JSON sensor data', () => {
    const data = {
      sensorId: 'temp-001',
      timestamp: '2024-01-20T10:00:00Z',
      value: 23.5,
      unit: '°C'
    };

    const result = sensorDataTransformer.transform(data, 'json');
    
    expect(result).toMatchObject({
      sensorId: 'temp-001',
      timestamp: expect.any(Date),
      value: 23.5,
      unit: '°C',
      quality: expect.any(Number)
    });
  });

  it('should transform CSV sensor data', () => {
    const csvData = `sensorId,timestamp,value,unit
temp-001,2024-01-20T10:00:00Z,23.5,°C
temp-002,2024-01-20T10:00:00Z,24.1,°C`;

    const result = sensorDataTransformer.transform(csvData, 'csv');
    
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      sensorId: 'temp-001',
      value: 23.5,
      unit: '°C'
    });
  });

  it('should handle various timestamp formats', () => {
    const testCases = [
      { timestamp: '2024-01-20T10:00:00Z', expected: new Date('2024-01-20T10:00:00Z') },
      { timestamp: 1705747200000, expected: new Date(1705747200000) },
      { timestamp: 1705747200, expected: new Date(1705747200000) }, // seconds to ms
    ];

    testCases.forEach(({ timestamp, expected }) => {
      const result = sensorDataTransformer.transform({
        sensorId: 'test',
        timestamp,
        value: 1
      }, 'json');
      
      expect(result.timestamp.getTime()).toBe(expected.getTime());
    });
  });

  it('should register and use custom transformers', () => {
    const customTransformer = jest.fn().mockReturnValue({
      sensorId: 'custom-001',
      timestamp: new Date(),
      value: 42,
      quality: 100
    });

    sensorDataTransformer.registerTransformer('custom', customTransformer);
    
    const data = { raw: 'custom data' };
    const result = sensorDataTransformer.transform(data, 'custom');
    
    expect(customTransformer).toHaveBeenCalledWith(data);
    expect(result.sensorId).toBe('custom-001');
  });
});