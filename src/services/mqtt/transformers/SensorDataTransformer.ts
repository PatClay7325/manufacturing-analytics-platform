/**
 * Sensor Data Transformer
 * 
 * Transforms various sensor data formats into a unified schema
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';

// Common sensor data formats
export const CommonSensorFormats = {
  // Standard JSON format
  json: z.object({
    id: z.string().optional(),
    sensorId: z.string().optional(),
    sensor_id: z.string().optional(),
    deviceId: z.string().optional(),
    device_id: z.string().optional(),
    timestamp: z.union([z.string(), z.number()]).optional(),
    ts: z.union([z.string(), z.number()]).optional(),
    time: z.union([z.string(), z.number()]).optional(),
    value: z.union([z.number(), z.string()]).optional(),
    val: z.union([z.number(), z.string()]).optional(),
    v: z.union([z.number(), z.string()]).optional(),
    data: z.union([z.number(), z.string(), z.record(z.any())]).optional(),
    unit: z.string().optional(),
    units: z.string().optional(),
    u: z.string().optional(),
    quality: z.number().optional(),
    q: z.number().optional(),
    status: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    meta: z.record(z.any()).optional(),
    tags: z.record(z.any()).optional(),
    attributes: z.record(z.any()).optional()
  }).passthrough(),

  // CSV-like format
  csv: z.string(),

  // Binary packed format
  binary: z.instanceof(Buffer),

  // ModBus-style register data
  modbus: z.object({
    address: z.number(),
    registers: z.array(z.number()),
    functionCode: z.number().optional()
  }),

  // OPC UA format
  opcua: z.object({
    nodeId: z.string(),
    value: z.object({
      value: z.any(),
      sourceTimestamp: z.string().optional(),
      serverTimestamp: z.string().optional(),
      statusCode: z.number().optional()
    })
  }),

  // Industrial protocols
  industrial: z.object({
    protocol: z.string(),
    payload: z.any()
  })
};

// Unified sensor data format
export const UnifiedSensorSchema = z.object({
  sensorId: z.string(),
  timestamp: z.date(),
  value: z.number(),
  unit: z.string().optional(),
  quality: z.number().min(0).max(100).default(100),
  metadata: z.record(z.any()).optional()
});

export type UnifiedSensorData = z.infer<typeof UnifiedSensorSchema>;

export class SensorDataTransformer {
  private customTransformers: Map<string, (data: any) => UnifiedSensorData> = new Map();

  /**
   * Register a custom transformer for a specific data format
   */
  registerTransformer(format: string, transformer: (data: any) => UnifiedSensorData): void {
    this.customTransformers.set(format, transformer);
    logger.info(`Registered custom transformer for format: ${format}`);
  }

  /**
   * Transform sensor data to unified format
   */
  transform(data: any, format?: string, context?: any): UnifiedSensorData | UnifiedSensorData[] {
    try {
      // Check for custom transformer
      if (format && this.customTransformers.has(format)) {
        const transformer = this.customTransformers.get(format)!;
        return transformer(data);
      }

      // Auto-detect format if not specified
      if (!format) {
        format = this.detectFormat(data);
      }

      // Transform based on format
      switch (format) {
        case 'json':
          return this.transformJson(data, context);
        case 'csv':
          return this.transformCsv(data, context);
        case 'binary':
          return this.transformBinary(data, context);
        case 'modbus':
          return this.transformModbus(data, context);
        case 'opcua':
          return this.transformOpcUa(data, context);
        case 'batch':
          return this.transformBatch(data, context);
        default:
          // Try generic JSON transformation
          return this.transformJson(data, context);
      }
    } catch (error) {
      logger.error('Failed to transform sensor data:', error);
      throw new Error(`Failed to transform sensor data: ${error.message}`);
    }
  }

  /**
   * Detect data format
   */
  private detectFormat(data: any): string {
    if (Array.isArray(data)) {
      return 'batch';
    }
    
    if (Buffer.isBuffer(data)) {
      return 'binary';
    }
    
    if (typeof data === 'string') {
      // Check if it's CSV
      if (data.includes(',') && data.split('\n').length > 1) {
        return 'csv';
      }
      // Try to parse as JSON
      try {
        JSON.parse(data);
        return 'json';
      } catch {
        return 'csv';
      }
    }
    
    if (typeof data === 'object') {
      if (data.registers && data.address !== undefined) {
        return 'modbus';
      }
      if (data.nodeId && data.value) {
        return 'opcua';
      }
      if (data.protocol && data.payload) {
        return 'industrial';
      }
      return 'json';
    }
    
    return 'unknown';
  }

  /**
   * Transform JSON format
   */
  private transformJson(data: any, context?: any): UnifiedSensorData {
    const parsed = CommonSensorFormats.json.parse(data);
    
    // Extract sensor ID
    const sensorId = parsed.sensorId || 
                    parsed.sensor_id || 
                    parsed.deviceId || 
                    parsed.device_id || 
                    parsed.id ||
                    context?.sensorId ||
                    'unknown';
    
    // Extract timestamp
    const timestampValue = parsed.timestamp || parsed.ts || parsed.time || new Date();
    const timestamp = this.parseTimestamp(timestampValue);
    
    // Extract value
    let value: number;
    const rawValue = parsed.value || parsed.val || parsed.v || parsed.data;
    
    if (typeof rawValue === 'number') {
      value = rawValue;
    } else if (typeof rawValue === 'string') {
      value = parseFloat(rawValue);
      if (isNaN(value)) {
        throw new Error(`Invalid numeric value: ${rawValue}`);
      }
    } else if (typeof rawValue === 'object' && rawValue.value !== undefined) {
      value = parseFloat(rawValue.value);
    } else {
      throw new Error('No valid value field found');
    }
    
    // Extract unit
    const unit = parsed.unit || parsed.units || parsed.u || undefined;
    
    // Extract quality
    const quality = parsed.quality || parsed.q || parsed.status === 'good' ? 100 : 80;
    
    // Combine metadata
    const metadata = {
      ...parsed.metadata,
      ...parsed.meta,
      ...parsed.tags,
      ...parsed.attributes,
      originalFormat: 'json'
    };
    
    // Remove standard fields from metadata
    delete metadata.sensorId;
    delete metadata.timestamp;
    delete metadata.value;
    delete metadata.unit;
    delete metadata.quality;
    
    return {
      sensorId,
      timestamp,
      value,
      unit,
      quality,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    };
  }

  /**
   * Transform CSV format
   */
  private transformCsv(data: string, context?: any): UnifiedSensorData[] {
    const lines = data.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Invalid CSV format: no data rows');
    }
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const results: UnifiedSensorData[] = [];
    
    // Find column indices
    const sensorIdIndex = headers.findIndex(h => 
      h === 'sensorid' || h === 'sensor_id' || h === 'deviceid' || h === 'device_id' || h === 'id'
    );
    const timestampIndex = headers.findIndex(h => 
      h === 'timestamp' || h === 'ts' || h === 'time' || h === 'datetime'
    );
    const valueIndex = headers.findIndex(h => 
      h === 'value' || h === 'val' || h === 'v' || h === 'data'
    );
    const unitIndex = headers.findIndex(h => 
      h === 'unit' || h === 'units' || h === 'u'
    );
    const qualityIndex = headers.findIndex(h => 
      h === 'quality' || h === 'q' || h === 'status'
    );
    
    if (valueIndex === -1) {
      throw new Error('CSV format missing value column');
    }
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length < headers.length) {
        logger.warn(`Skipping malformed CSV row ${i}: ${lines[i]}`);
        continue;
      }
      
      try {
        const sensorId = sensorIdIndex !== -1 ? values[sensorIdIndex] : context?.sensorId || `sensor-${i}`;
        const timestamp = timestampIndex !== -1 ? this.parseTimestamp(values[timestampIndex]) : new Date();
        const value = parseFloat(values[valueIndex]);
        const unit = unitIndex !== -1 ? values[unitIndex] : undefined;
        const quality = qualityIndex !== -1 ? parseFloat(values[qualityIndex]) : 100;
        
        if (isNaN(value)) {
          logger.warn(`Skipping row ${i} with invalid value: ${values[valueIndex]}`);
          continue;
        }
        
        results.push({
          sensorId,
          timestamp,
          value,
          unit,
          quality: isNaN(quality) ? 100 : Math.min(100, Math.max(0, quality)),
          metadata: { 
            originalFormat: 'csv',
            rowIndex: i 
          }
        });
      } catch (error) {
        logger.warn(`Error parsing CSV row ${i}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Transform binary format
   */
  private transformBinary(data: Buffer, context?: any): UnifiedSensorData {
    // Example binary format: [sensorId:4bytes][timestamp:8bytes][value:4bytes][quality:1byte]
    if (data.length < 17) {
      throw new Error('Invalid binary format: insufficient data');
    }
    
    const sensorId = data.readUInt32LE(0).toString();
    const timestamp = new Date(Number(data.readBigUInt64LE(4)));
    const value = data.readFloatLE(12);
    const quality = data.readUInt8(16);
    
    return {
      sensorId: context.sensorId || sensorId,
      timestamp,
      value,
      quality,
      metadata: { 
        originalFormat: 'binary',
        dataLength: data.length 
      }
    };
  }

  /**
   * Transform ModBus format
   */
  private transformModbus(data: any, context?: any): UnifiedSensorData {
    const parsed = CommonSensorFormats.modbus.parse(data);
    
    // Convert register values to float (assuming 2 registers = 1 float)
    let value: number;
    if (parsed.registers.length >= 2) {
      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt16LE(parsed.registers[0], 0);
      buffer.writeUInt16LE(parsed.registers[1], 2);
      value = buffer.readFloatLE(0);
    } else {
      value = parsed.registers[0] || 0;
    }
    
    return {
      sensorId: context.sensorId || `modbus-${parsed.address}`,
      timestamp: new Date(),
      value,
      quality: 100,
      metadata: {
        originalFormat: 'modbus',
        address: parsed.address,
        functionCode: parsed.functionCode,
        registerCount: parsed.registers.length
      }
    };
  }

  /**
   * Transform OPC UA format
   */
  private transformOpcUa(data: any, context?: any): UnifiedSensorData {
    const parsed = CommonSensorFormats.opcua.parse(data);
    
    const value = typeof parsed.value.value === 'number' 
      ? parsed.value.value 
      : parseFloat(parsed.value.value);
    
    if (isNaN(value)) {
      throw new Error(`Invalid OPC UA value: ${parsed.value.value}`);
    }
    
    const timestamp = parsed.value.sourceTimestamp 
      ? new Date(parsed.value.sourceTimestamp) 
      : new Date();
    
    // Map OPC UA status codes to quality
    let quality = 100;
    if (parsed.value.statusCode !== undefined) {
      if (parsed.value.statusCode === 0) {
        quality = 100; // Good
      } else if ((parsed.value.statusCode & 0x40000000) !== 0) {
        quality = 50; // Uncertain
      } else {
        quality = 0; // Bad
      }
    }
    
    return {
      sensorId: context.sensorId || parsed.nodeId,
      timestamp,
      value,
      quality,
      metadata: {
        originalFormat: 'opcua',
        nodeId: parsed.nodeId,
        serverTimestamp: parsed.value.serverTimestamp,
        statusCode: parsed.value.statusCode
      }
    };
  }

  /**
   * Transform batch data
   */
  private transformBatch(data: any[], context?: any): UnifiedSensorData[] {
    return data.map((item, index) => {
      try {
        return this.transform(item, undefined, context);
      } catch (error) {
        logger.warn(`Failed to transform batch item ${index}:`, error);
        return null;
      }
    }).filter(item => item !== null) as UnifiedSensorData[];
  }

  /**
   * Parse various timestamp formats
   */
  private parseTimestamp(value: any): Date {
    if (value instanceof Date) {
      return value;
    }
    
    if (typeof value === 'number') {
      // Check if it's seconds or milliseconds
      if (value < 10000000000) {
        return new Date(value * 1000); // Convert seconds to milliseconds
      }
      return new Date(value);
    }
    
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Try parsing ISO 8601 without timezone
      const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
      if (isoMatch) {
        return new Date(value + 'Z'); // Assume UTC
      }
    }
    
    throw new Error(`Invalid timestamp format: ${value}`);
  }
}

// Export singleton instance
export const sensorDataTransformer = new SensorDataTransformer();