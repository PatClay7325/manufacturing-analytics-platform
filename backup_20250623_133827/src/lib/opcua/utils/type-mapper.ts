/**
 * OPC UA to TypeScript Type Mapper
 * Handles conversion between OPC UA data types and TypeScript/JavaScript types
 */

import { DataType, DataValue, Variant } from 'node-opcua';
import { ManufacturingDataValue, DataQuality, TypeMappingConfig } from '../types';
import { logger } from '../../logger';

export class TypeMapper {
  private customMappings: Map<string, (value: any) => any>;
  private enumMappings: Map<string, Record<number, string>>;

  constructor(private config: TypeMappingConfig = {}) {
    this.customMappings = new Map(Object.entries(config.customMappings || {}));
    this.enumMappings = new Map(Object.entries(config.enumMappings || {}));
  }

  /**
   * Convert OPC UA DataValue to ManufacturingDataValue
   */
  mapDataValue(
    nodeId: string,
    dataValue: DataValue,
    context?: {
      equipmentId?: string;
      equipmentName?: string;
      parameterName?: string;
      unit?: string;
    }
  ): ManufacturingDataValue {
    const quality = this.extractQuality(dataValue);
    const value = this.extractValue(dataValue.value);
    const dataType = this.getDataTypeName(dataValue.value?.dataType);

    return {
      nodeId,
      value,
      timestamp: dataValue.sourceTimestamp || dataValue.serverTimestamp || new Date(),
      quality,
      dataType,
      ...context,
      metadata: {
        serverTimestamp: dataValue.serverTimestamp,
        sourceTimestamp: dataValue.sourceTimestamp,
        statusCode: dataValue.statusCode?.value
      }
    };
  }

  /**
   * Extract typed value from Variant
   */
  extractValue(variant?: Variant): any {
    if (!variant) return null;

    try {
      const value = variant.value;
      const dataType = variant.dataType;

      // Check for custom mapping first
      const customMapper = this.customMappings.get(DataType[dataType]);
      if (customMapper) {
        return customMapper(value);
      }

      // Handle standard OPC UA types
      switch (dataType) {
        case DataType.Boolean:
          return Boolean(value);

        case DataType.SByte:
        case DataType.Byte:
        case DataType.Int16:
        case DataType.UInt16:
        case DataType.Int32:
        case DataType.UInt32:
        case DataType.Int64:
        case DataType.UInt64:
          return this.mapNumericValue(value, dataType);

        case DataType.Float:
        case DataType.Double:
          return this.mapFloatingPoint(value);

        case DataType.String:
          return String(value);

        case DataType.DateTime:
          return this.mapDateTime(value);

        case DataType.Guid:
          return this.mapGuid(value);

        case DataType.ByteString:
          return this.mapByteString(value);

        case DataType.XmlElement:
          return this.mapXmlElement(value);

        case DataType.NodeId:
          return this.mapNodeId(value);

        case DataType.LocalizedText:
          return this.mapLocalizedText(value);

        case DataType.QualifiedName:
          return this.mapQualifiedName(value);

        case DataType.StatusCode:
          return this.mapStatusCode(value);

        case DataType.Variant:
          // Recursive mapping for nested variants
          return this.extractValue(value);

        case DataType.ExtensionObject:
          return this.mapExtensionObject(value);

        default:
          // Use default mapping if provided
          if (this.config.defaultMapping) {
            return this.config.defaultMapping(value, dataType);
          }
          return value;
      }
    } catch (error) {
      logger.error('Error mapping OPC UA value', { error, variant });
      return null;
    }
  }

  /**
   * Extract quality information from DataValue
   */
  private extractQuality(dataValue: DataValue): DataQuality {
    const statusCode = dataValue.statusCode;
    const isGood = statusCode ? statusCode.isGood() : false;

    return {
      isGood,
      statusCode: statusCode.value || 0,
      statusText: statusCode.name || 'Unknown'
    };
  }

  /**
   * Map numeric values with proper type handling
   */
  private mapNumericValue(value: any, dataType: DataType): number {
    const num = Number(value);
    
    // Check for special manufacturing values
    if (Number.isNaN(num)) {
      logger.warn('NaN value detected', { value, dataType: DataType[dataType] });
      return 0;
    }

    // Handle unsigned types
    if (dataType === DataType.Byte || dataType === DataType.UInt16 || 
        dataType === DataType.UInt32 || dataType === DataType.UInt64) {
      return Math.abs(num);
    }

    return num;
  }

  /**
   * Map floating point with precision handling
   */
  private mapFloatingPoint(value: any): number {
    const num = Number(value);
    
    if (Number.isNaN(num)) {
      return 0;
    }

    // Round to 6 decimal places for manufacturing precision
    return Math.round(num * 1000000) / 1000000;
  }

  /**
   * Map DateTime values
   */
  private mapDateTime(value: any): Date {
    if (value instanceof Date) {
      return value;
    }
    
    try {
      return new Date(value);
    } catch (error) {
      logger.error('Invalid DateTime value', { value });
      return new Date();
    }
  }

  /**
   * Map GUID values
   */
  private mapGuid(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    
    if (value && value.toString) {
      return value.toString();
    }

    return '';
  }

  /**
   * Map ByteString values
   */
  private mapByteString(value: any): string {
    if (Buffer.isBuffer(value)) {
      return value.toString('base64');
    }
    
    if (typeof value === 'string') {
      return value;
    }

    return '';
  }

  /**
   * Map XML Element values
   */
  private mapXmlElement(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    
    if (value && value.toString) {
      return value.toString();
    }

    return '<empty/>';
  }

  /**
   * Map NodeId values
   */
  private mapNodeId(value: any): string {
    if (value && value.toString) {
      return value.toString();
    }
    
    return '';
  }

  /**
   * Map LocalizedText values
   */
  private mapLocalizedText(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    
    if (value && value.text) {
      return value.text;
    }

    return '';
  }

  /**
   * Map QualifiedName values
   */
  private mapQualifiedName(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    
    if (value && value.name) {
      return value.name;
    }

    return '';
  }

  /**
   * Map StatusCode values
   */
  private mapStatusCode(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    
    if (value && value.value) {
      return value.value;
    }

    return 0;
  }

  /**
   * Map ExtensionObject values
   */
  private mapExtensionObject(value: any): any {
    try {
      // Attempt to extract meaningful data from extension object
      if (value && typeof value === 'object') {
        const result: Record<string, any> = {};
        
        for (const [key, val] of Object.entries(value)) {
          if (key !== '_schema' && key !== '__proto__') {
            result[key] = val;
          }
        }
        
        return result;
      }
    } catch (error) {
      logger.error('Error mapping ExtensionObject', { error });
    }

    return value;
  }

  /**
   * Get human-readable data type name
   */
  private getDataTypeName(dataType?: DataType): string {
    if (dataType === undefined) return 'Unknown';
    return DataType[dataType] || 'Unknown';
  }

  /**
   * Add custom type mapping
   */
  addCustomMapping(typeName: string, mapper: (value: any) => any): void {
    this.customMappings.set(typeName, mapper);
  }

  /**
   * Add enum mapping
   */
  addEnumMapping(nodeId: string, mapping: Record<number, string>): void {
    this.enumMappings.set(nodeId, mapping);
  }

  /**
   * Map enum value
   */
  mapEnumValue(nodeId: string, value: number): string {
    const mapping = this.enumMappings.get(nodeId);
    if (mapping && mapping[value] !== undefined) {
      return mapping[value];
    }
    return value.toString();
  }
}