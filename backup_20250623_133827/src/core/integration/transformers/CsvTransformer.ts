/**
 * CSV Transformer
 * 
 * Implements the DataTransformer interface for handling CSV data format.
 * Provides functionality for parsing CSV data, serializing to CSV, and
 * applying transformation rules to convert between external CSV formats
 * and internal data structures.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  DataTransformer, 
  TransformationResult, 
  TransformationRule 
} from './interfaces/DataTransformer';
import { 
  IntegrationDataPacket, 
  IntegrationErrorType 
} from './types';

/**
 * CSV parsing options
 */
export interface CsvParseOptions {
  /**
   * Delimiter character (default: ',')
   */
  delimiter?: string;
  
  /**
   * Quote character (default: '"')
   */
  quote?: string;
  
  /**
   * Whether the CSV has a header row (default: true)
   */
  header?: boolean;
  
  /**
   * Skip empty lines (default: true)
   */
  skipEmptyLines?: boolean;
  
  /**
   * Character encoding (default: 'utf-8')
   */
  encoding?: string;

  /**
   * Comment character (default: '#')
   */
  comment?: string;
}

/**
 * CSV serialization options
 */
export interface CsvSerializeOptions {
  /**
   * Delimiter character (default: ',')
   */
  delimiter?: string;
  
  /**
   * Quote character (default: '"')
   */
  quote?: string;
  
  /**
   * Whether to include a header row (default: true)
   */
  header?: boolean;
  
  /**
   * Line terminator (default: '\n')
   */
  lineTerminator?: string;
}

/**
 * CSV Transformer class for handling CSV data transformations
 */
export class CsvTransformer implements DataTransformer {
  private rules: Map<string, TransformationRule> = new Map();
  private defaultParseOptions: CsvParseOptions = {
    delimiter: ',',
    quote: '"',
    header: true,
    skipEmptyLines: true,
    encoding: 'utf-8',
    comment: '#'
  };
  
  private defaultSerializeOptions: CsvSerializeOptions = {
    delimiter: ',',
    quote: '"',
    header: true,
    lineTerminator: '\n'
  };

  /**
   * Transform raw CSV data to internal data packet format
   * @param sourceData Raw CSV data from external system
   * @param context Additional context information
   * @returns Transformation result containing the standardized data packet
   */
  async transformInbound<SourceType, TargetType = unknown>(
    sourceData: SourceType,
    context?: Record<string, unknown>
  ): Promise<TransformationResult<IntegrationDataPacket<TargetType>>> {
    try {
      // Validate input is a string or array
      if (typeof sourceData !== 'string' && !Array.isArray(sourceData)) {
        return this.createErrorResult(
          IntegrationErrorType.TRANSFORMATION,
          'Invalid CSV data: expected string or array'
        );
      }

      // Parse CSV if input is a string
      let parsedData: any[];
      if (typeof sourceData === 'string') {
        const parseOptions: CsvParseOptions = {
          ...this.defaultParseOptions,
          ...(context?.parseOptions as CsvParseOptions || {})
        };
        
        try {
          parsedData = this.parseCsv(sourceData, parseOptions);
        } catch (error) {
          return this.createErrorResult(
            IntegrationErrorType.TRANSFORMATION,
            `Failed to parse CSV: ${(error as Error).message}`
          );
        }
      } else {
        // Already an array (rows of data)
        parsedData = sourceData as any[];
      }

      // Apply transformation rules
      let transformedData = parsedData;
      const applicableRules = Array.from(this.rules.values()).filter(rule => 
        !rule.condition || rule.condition(parsedData, context)
      );

      for (const rule of applicableRules) {
        transformedData = rule.transform(transformedData, context);
      }

      // Create standardized data packet
      const dataPacket: IntegrationDataPacket<TargetType> = {
        id: uuidv4(),
        source: context.source as string || 'csv-source',
        timestamp: new Date(),
        payload: transformedData as unknown as TargetType,
        schemaVersion: context.schemaVersion as string,
        metadata: {
          originalFormat: 'csv',
          ...context?.metadata as Record<string, unknown>
        }
      };

      return {
        success: true,
        data: dataPacket
      };
    } catch (error) {
      return this.createErrorResult(
        IntegrationErrorType.TRANSFORMATION,
        `CSV transformation error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Transform internal data packet to CSV format
   * @param dataPacket Internal standardized data packet
   * @param context Additional context information
   * @returns Transformation result containing the CSV data
   */
  async transformOutbound<TargetType, SourceType = unknown>(
    dataPacket: IntegrationDataPacket<SourceType>,
    context?: Record<string, unknown>
  ): Promise<TransformationResult<TargetType>> {
    try {
      // Validate data packet
      if (!dataPacket || !dataPacket.payload) {
        return this.createErrorResult(
          IntegrationErrorType.TRANSFORMATION,
          'Invalid data packet: missing payload'
        );
      }

      // Apply transformation rules
      let transformedData = dataPacket.payload;
      const applicableRules = Array.from(this.rules.values()).filter(rule => 
        !rule.condition || rule.condition(dataPacket, context)
      );

      for (const rule of applicableRules) {
        transformedData = rule.transform(transformedData, context);
      }

      // Ensure data is in an array format
      if (!Array.isArray(transformedData)) {
        return this.createErrorResult(
          IntegrationErrorType.TRANSFORMATION,
          'Invalid data format for CSV: expected array'
        );
      }

      // Convert to CSV string
      const serializeOptions: CsvSerializeOptions = {
        ...this.defaultSerializeOptions,
        ...(context?.serializeOptions as CsvSerializeOptions || {})
      };
      
      const csvString = this.serializeToCsv(transformedData, serializeOptions);

      return {
        success: true,
        data: csvString as unknown as TargetType
      };
    } catch (error) {
      return this.createErrorResult(
        IntegrationErrorType.TRANSFORMATION,
        `CSV transformation error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Register a new transformation rule
   * @param rule Transformation rule to register
   */
  registerRule<S, T>(rule: TransformationRule<S, T>): void {
    this.rules.set(rule.id, rule as unknown as TransformationRule);
  }

  /**
   * Deregister a transformation rule
   * @param ruleId ID of the rule to deregister
   */
  deregisterRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all registered transformation rules
   * @returns Array of registered rules
   */
  getRules(): TransformationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Clear all transformation rules
   */
  clearRules(): void {
    this.rules.clear();
  }

  /**
   * Parse CSV string into array of objects or arrays
   * @param csvString CSV string to parse
   * @param options Parsing options
   * @returns Parsed data as array of objects (with header) or arrays (without header)
   */
  parseCsv(csvString: string, options: CsvParseOptions = this.defaultParseOptions): any[] {
    try {
      const delimiter = options.delimiter || ',';
      const quote = options.quote || '"';
      const hasHeader = options.header !== false;
      const skipEmptyLines = options.skipEmptyLines !== false;
      
      // Split into lines
      const lines = csvString.split(/\r?\n/);
      const result: any[] = [];
      let headers: string[] = [];
      
      // Process lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines if configured
        if (skipEmptyLines && line === '') continue;
        
        // Skip comment lines
        if (options.comment && line.startsWith(options.comment)) continue;
        
        // Parse this line into fields
        const fields = this.parseCSVLine(line, delimiter, quote);
        
        // If this is the header row
        if (i === 0 && hasHeader) {
          headers = fields;
          continue;
        }
        
        // Add data row
        if (hasHeader) {
          // As object with header keys
          const row: Record<string, unknown> = {};
          fields.forEach((field, index) => {
            if (index < headers.length) {
              row[headers[index]] = field;
            }
          });
          result.push(row);
        } else {
          // As array
          result.push(fields);
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`CSV parsing error: ${(error as Error).message}`);
    }
  }

  /**
   * Parse a single CSV line respecting quotes and delimiters
   * @param line CSV line to parse
   * @param delimiter Field delimiter
   * @param quote Quote character
   * @returns Array of fields from the line
   */
  private parseCSVLine(line: string, delimiter: string, quote: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = i < line.length - 1 ? line[i + 1] : '';
      
      // Handle quotes
      if (char === quote) {
        if (inQuotes && nextChar === quote) {
          // Escaped quote inside quotes
          currentField += quote;
          i++; // Skip the next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
        continue;
      }
      
      // Field delimiter outside quotes
      if (char === delimiter && !inQuotes) {
        fields.push(currentField);
        currentField = '';
        continue;
      }
      
      // Add character to current field
      currentField += char;
    }
    
    // Add the last field
    fields.push(currentField);
    
    return fields;
  }

  /**
   * Serialize array of objects or arrays to CSV string
   * @param data Array of objects or arrays to serialize
   * @param options Serialization options
   * @returns CSV string
   */
  serializeToCsv(data: any[], options: CsvSerializeOptions = this.defaultSerializeOptions): string {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        return '';
      }
      
      const delimiter = options.delimiter || ',';
      const quote = options.quote || '"';
      const lineTerminator = options.lineTerminator || '\n';
      const includeHeader = options.header !== false;
      
      // Determine if data is array of objects or array of arrays
      const isArrayOfObjects = typeof data[0] === 'object' && !Array.isArray(data[0]);
      
      // Get headers for array of objects
      let headers: string[] = [];
      if (isArrayOfObjects) {
        // Collect all unique keys across all objects
        headers = data.reduce((allKeys, row) => {
          Object.keys(row).forEach(key => {
            if (!allKeys.includes(key)) {
              allKeys.push(key);
            }
          });
          return allKeys;
        }, [] as string[]);
      }
      
      // Generate CSV lines
      const lines: string[] = [];
      
      // Add header line if using objects and headers are included
      if (isArrayOfObjects && includeHeader) {
        lines.push(
          headers.map(header => this.escapeCSVField(header, delimiter, quote)).join(delimiter)
        );
      }
      
      // Add data lines
      data.forEach(row => {
        if (isArrayOfObjects) {
          // Row is an object
          const fields = headers.map(header => {
            const value = (row as Record<string, unknown>)[header];
            return this.escapeCSVField(value, delimiter, quote);
          });
          lines.push(fields.join(delimiter));
        } else if (Array.isArray(row)) {
          // Row is an array
          const fields = row.map(value => this.escapeCSVField(value, delimiter, quote));
          lines.push(fields.join(delimiter));
        }
      });
      
      return lines.join(lineTerminator);
    } catch (error) {
      throw new Error(`CSV serialization error: ${(error as Error).message}`);
    }
  }

  /**
   * Escape a field value for CSV serialization
   * @param value Field value to escape
   * @param delimiter Field delimiter
   * @param quote Quote character
   * @returns Escaped field value
   */
  private escapeCSVField(value: unknown, delimiter: string, quote: string): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    
    // Check if the field needs to be quoted
    const needsQuotes = (
      stringValue.includes(delimiter) || 
      stringValue.includes(quote) || 
      stringValue.includes('\n') || 
      stringValue.includes('\r')
    );
    
    if (!needsQuotes) {
      return stringValue;
    }
    
    // Double any quotes in the field and wrap in quotes
    return quote + stringValue.replace(new RegExp(quote, 'g'), quote + quote) + quote;
  }

  /**
   * Create error transformation result
   * @param type Error type
   * @param message Error message
   * @param details Additional error details
   * @returns Error transformation result
   */
  private createErrorResult<T>(
    type: IntegrationErrorType,
    message: string,
    details?: Record<string, unknown>
  ): TransformationResult<T> {
    return {
      success: false,
      error: {
        type,
        message,
        details
      }
    };
  }
}