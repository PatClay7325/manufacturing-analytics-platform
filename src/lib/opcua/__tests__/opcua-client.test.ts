// Jest test - using global test functions
/**
 * OPC UA Client Tests
 * Unit tests for the OPC UA client implementation
 */

import { OPCUAClient } from '../client/opcua-client';
import { ConnectionPool } from '../client/connection-pool';
import { TypeMapper } from '../utils/type-mapper';
import { CircuitBreaker } from '../utils/circuit-breaker';
import { DataType, DataValue } from 'node-opcua';

// Mock dependencies
jest.mock('../client/connection-pool');
jest.mock('node-opcua');

describe('OPCUAClient', () => {
  let client: OPCUAClient;

  beforeEach(() => {
    client = new OPCUAClient({
      metrics: { enabled: false }
    });
  });

  afterEach(async () => {
    await client.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully with connections', async () => {
      const connections = [
        {
          endpointUrl: 'opc.tcp://localhost:4840',
          applicationName: 'TestApp'
        }
      ];

      await client.initialize(connections);
      
      expect(ConnectionPool.prototype.initialize).toHaveBeenCalledWith(connections);
    });

    it('should throw error if used before initialization', async () => {
      await expect(
        client.readValues('opc.tcp://localhost:4840', ['ns=2;s=Test'])
      ).rejects.toThrow('Client not initialized');
    });
  });

  describe('equipment configuration', () => {
    it('should configure equipment mappings', () => {
      const equipment = [
        {
          equipmentId: 'TEST-001',
          equipmentName: 'Test Equipment',
          nodes: {
            status: 'ns=2;s=Status',
            temperature: 'ns=2;s=Temperature'
          }
        }
      ];

      client.configureEquipment(equipment);
      
      // Equipment should be stored internally
      expect(() => client.configureEquipment(equipment)).not.toThrow();
    });
  });
});

describe('TypeMapper', () => {
  let mapper: TypeMapper;

  beforeEach(() => {
    mapper = new TypeMapper();
  });

  describe('value extraction', () => {
    it('should map boolean values', () => {
      const variant = {
        dataType: DataType.Boolean,
        value: true
      };

      const result = mapper.extractValue(variant as any);
      expect(result).toBe(true);
    });

    it('should map numeric values', () => {
      const variant = {
        dataType: DataType.Double,
        value: 42.5
      };

      const result = mapper.extractValue(variant as any);
      expect(result).toBe(42.5);
    });

    it('should map string values', () => {
      const variant = {
        dataType: DataType.String,
        value: 'Hello OPC UA'
      };

      const result = mapper.extractValue(variant as any);
      expect(result).toBe('Hello OPC UA');
    });

    it('should map DateTime values', () => {
      const date = new Date();
      const variant = {
        dataType: DataType.DateTime,
        value: date
      };

      const result = mapper.extractValue(variant as any);
      expect(result).toEqual(date);
    });

    it('should handle null variants', () => {
      const result = mapper.extractValue(undefined);
      expect(result).toBeNull();
    });
  });

  describe('data value mapping', () => {
    it('should map DataValue to ManufacturingDataValue', () => {
      const dataValue: DataValue = {
        value: {
          dataType: DataType.Double,
          value: 75.5
        },
        statusCode: {
          value: 0,
          isGood: () => true,
          name: 'Good'
        },
        sourceTimestamp: new Date(),
        serverTimestamp: new Date()
      } as any;

      const result = mapper.mapDataValue('ns=2;s=Temperature', dataValue, {
        equipmentId: 'CNC-001',
        equipmentName: 'CNC Machine',
        parameterName: 'temperature',
        unit: '°C'
      });

      expect(result).toMatchObject({
        nodeId: 'ns=2;s=Temperature',
        value: 75.5,
        dataType: 'Double',
        equipmentId: 'CNC-001',
        equipmentName: 'CNC Machine',
        parameterName: 'temperature',
        unit: '°C',
        quality: {
          isGood: true,
          statusCode: 0,
          statusText: 'Good'
        }
      });
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      monitoringPeriod: 5000,
      halfOpenMaxAttempts: 2
    });
  });

  it('should allow successful operations', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await circuitBreaker.execute(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalled();
  });

  it('should open after failure threshold', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Failed'));

    // Fail 3 times to open circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch (e) {
        // Expected
      }
    }

    // Circuit should be open
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should transition to half-open after reset timeout', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockRejectedValueOnce(new Error('Failed'))
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce('success');

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch (e) {
        // Expected
      }
    }

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should attempt operation in half-open state
    const result = await circuitBreaker.execute(operation);
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('HALF_OPEN');
  });
});