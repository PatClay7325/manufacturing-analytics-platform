/**
 * File Processing Service
 * Handles CSV/Excel parsing, validation, and transformation
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  FileFormat,
  FileUploadResult,
  FileError,
  FileWarning,
  FieldMapping,
  ColumnMapping,
  DataTransform,
  TransformFunction,
  FieldType,
  ImportProgress,
  ValidationRule,
  FileValidationResult,
  FileStatistics
} from '@/types/import-export';
import { Dashboard, Panel } from '@/types/dashboard';

export class FileProcessingService {
  private static instance: FileProcessingService;
  
  static getInstance(): FileProcessingService {
    if (!FileProcessingService.instance) {
      FileProcessingService.instance = new FileProcessingService();
    }
    return FileProcessingService.instance;
  }

  /**
   * Parse file based on format
   */
  async parseFile(file: File, format: FileFormat): Promise<FileUploadResult> {
    const errors: FileError[] = [];
    const warnings: FileWarning[] = [];

    try {
      switch (format) {
        case 'csv':
          return await this.parseCsvFile(file, errors, warnings);
        case 'excel':
          return await this.parseExcelFile(file, errors, warnings);
        case 'json':
          return await this.parseJsonFile(file, errors, warnings);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      errors.push({
        type: 'parse',
        message: error instanceof Error ? error.message : 'Unknown parsing error'
      });

      return {
        file,
        format,
        size: file.size,
        rawData: [],
        headers: [],
        preview: [],
        errors,
        warnings
      };
    }
  }

  /**
   * Parse CSV file using Papa Parse
   */
  private async parseCsvFile(
    file: File, 
    errors: FileError[], 
    warnings: FileWarning[]
  ): Promise<FileUploadResult> {
    const text = await file.text();
    
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: false,
        skipEmptyLines: 'greedy',
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim(),
        error: (error: any) => {
          errors.push({
            type: 'parse',
            message: error.message,
            row: error.row
          });
        },
        complete: (results) => {
          const rawData = results.data as string[][];
          const headers = rawData[0] || [];
          const dataRows = rawData.slice(1);
          const preview = dataRows.slice(0, 5);

          // Validate CSV structure
          this.validateCsvStructure(rawData, headers, warnings);

          resolve({
            file,
            format: 'csv',
            size: file.size,
            rawData,
            headers,
            preview,
            errors,
            warnings
          });
        }
      });
    });
  }

  /**
   * Parse Excel file using SheetJS
   */
  private async parseExcelFile(
    file: File,
    errors: FileError[],
    warnings: FileWarning[]
  ): Promise<FileUploadResult> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (workbook.SheetNames.length === 0) {
      errors.push({
        type: 'format',
        message: 'No worksheets found in Excel file'
      });
      return this.createEmptyResult(file, 'excel', errors, warnings);
    }

    // Use first worksheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: false
    }) as string[][];

    const headers = rawData[0] || [];
    const dataRows = rawData.slice(1);
    const preview = dataRows.slice(0, 5);

    // Add warning for multiple sheets
    if (workbook.SheetNames.length > 1) {
      warnings.push({
        type: 'data',
        message: `Excel file contains ${workbook.SheetNames.length} sheets. Only "${firstSheetName}" will be imported.`,
        suggestion: 'Consider splitting data into separate files if needed'
      });
    }

    return {
      file,
      format: 'excel',
      size: file.size,
      rawData,
      headers,
      preview,
      errors,
      warnings
    };
  }

  /**
   * Parse JSON file
   */
  private async parseJsonFile(
    file: File,
    errors: FileError[],
    warnings: FileWarning[]
  ): Promise<FileUploadResult> {
    const text = await file.text();
    let jsonData: any;

    try {
      jsonData = JSON.parse(text);
    } catch (parseError) {
      errors.push({
        type: 'parse',
        message: 'Invalid JSON format'
      });
      return this.createEmptyResult(file, 'json', errors, warnings);
    }

    let rawData: string[][] = [];
    let headers: string[] = [];

    if (Array.isArray(jsonData)) {
      if (jsonData.length > 0 && typeof jsonData[0] === 'object') {
        // Array of objects - convert to tabular format
        headers = Object.keys(jsonData[0]);
        rawData = [
          headers,
          ...jsonData.map(obj => headers.map(key => this.stringifyValue(obj[key])))
        ];
      } else {
        warnings.push({
          type: 'structure',
          message: 'JSON array does not contain objects',
          suggestion: 'Expected array of objects for tabular import'
        });
      }
    } else if (typeof jsonData === 'object' && jsonData !== null) {
      // Handle dashboard JSON format
      if (this.isDashboardJson(jsonData)) {
        return this.parseDashboardJson(jsonData, file, warnings);
      }
      
      // Single object - flatten to table
      headers = Object.keys(jsonData);
      rawData = [headers, headers.map(key => this.stringifyValue(jsonData[key]))];
      
      warnings.push({
        type: 'structure',
        message: 'Single object detected',
        suggestion: 'Consider using array format for multiple records'
      });
    }

    const preview = rawData.slice(1, 6);

    return {
      file,
      format: 'json',
      size: file.size,
      rawData,
      headers,
      preview,
      errors,
      warnings
    };
  }

  /**
   * Validate CSV structure and add warnings
   */
  private validateCsvStructure(
    rawData: string[][],
    headers: string[],
    warnings: FileWarning[]
  ): void {
    if (rawData.length < 2) {
      warnings.push({
        type: 'structure',
        message: 'CSV file appears to have no data rows',
        suggestion: 'Ensure the file has header and data rows'
      });
      return;
    }

    // Check for empty headers
    const emptyHeaders = headers.filter(h => !h || h.trim() === '');
    if (emptyHeaders.length > 0) {
      warnings.push({
        type: 'structure',
        message: `${emptyHeaders.length} empty column header(s) detected`,
        suggestion: 'Consider providing meaningful column names'
      });
    }

    // Check for duplicate headers
    const duplicateHeaders = headers.filter((header, index) => 
      headers.indexOf(header) !== index
    );
    if (duplicateHeaders.length > 0) {
      warnings.push({
        type: 'structure',
        message: 'Duplicate column headers detected',
        suggestion: 'Ensure all column headers are unique'
      });
    }

    // Check for inconsistent column counts
    const dataRows = rawData.slice(1);
    const columnCounts = dataRows.map(row => row.length);
    const expectedColumns = headers.length;
    const inconsistentRows = columnCounts.filter(count => count !== expectedColumns);
    
    if (inconsistentRows.length > 0) {
      warnings.push({
        type: 'structure',
        message: `${inconsistentRows.length} rows have inconsistent column counts`,
        suggestion: 'Some rows may have missing or extra data'
      });
    }
  }

  /**
   * Check if JSON is dashboard format
   */
  private isDashboardJson(data: any): boolean {
    return data && 
           typeof data === 'object' &&
           (data.uid || data.id) &&
           data.title &&
           Array.isArray(data.panels);
  }

  /**
   * Parse dashboard JSON format
   */
  private parseDashboardJson(
    data: any,
    file: File,
    warnings: FileWarning[]
  ): FileUploadResult {
    // Extract dashboard properties as tabular data
    const dashboardProps = {
      uid: data.uid || '',
      title: data.title || '',
      description: data.description || '',
      tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
      panelCount: Array.isArray(data.panels) ? data.panels.length : 0,
      version: data.version || 1,
      created: data.meta?.created || '',
      updated: data.meta?.updated || ''
    };

    const headers = Object.keys(dashboardProps);
    const rawData = [headers, Object.values(dashboardProps).map(v => String(v))];
    const preview = rawData.slice(1, 6);

    warnings.push({
      type: 'format',
      message: 'Dashboard JSON detected',
      suggestion: 'This appears to be a dashboard configuration file'
    });

    return {
      file,
      format: 'json',
      size: file.size,
      rawData,
      headers,
      preview,
      errors: [],
      warnings
    };
  }

  /**
   * Apply field mapping and transformations
   */
  async transformData(
    rawData: string[][],
    mapping: FieldMapping,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<any[]> {
    const [headers, ...dataRows] = rawData;
    const results: any[] = [];
    const totalRows = dataRows.length;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const transformedRow: any = {};

      // Apply defaults first
      Object.assign(transformedRow, mapping.defaults);

      // Apply column mappings
      for (const columnMapping of mapping.mappings) {
        const sourceIndex = headers.indexOf(columnMapping.sourceColumn);
        if (sourceIndex === -1) continue;

        let value = row[sourceIndex];

        // Apply field transformation
        if (columnMapping.transform) {
          value = this.applyTransform(value, columnMapping.transform, columnMapping.fieldType);
        }

        // Type conversion
        value = this.convertType(value, columnMapping.fieldType);

        transformedRow[columnMapping.targetField] = value;
      }

      // Apply global transforms
      for (const transform of mapping.transforms) {
        this.applyGlobalTransform(transformedRow, transform);
      }

      results.push(transformedRow);

      // Report progress
      if (onProgress && i % 100 === 0) {
        onProgress({
          step: 'import',
          percentage: (i / totalRows) * 100,
          processedRows: i,
          totalRows,
          currentOperation: `Processing row ${i + 1}`,
          errors: [],
          warnings: []
        });
      }
    }

    return results;
  }

  /**
   * Apply single field transformation
   */
  private applyTransform(
    value: string,
    transform: TransformFunction,
    fieldType: FieldType
  ): any {
    if (!value || value.trim() === '') return value;

    switch (transform) {
      case 'lowercase':
        return value.toLowerCase();
      case 'uppercase':
        return value.toUpperCase();
      case 'trim':
        return value.trim();
      case 'parseNumber':
        const num = parseFloat(value.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? 0 : num;
      case 'parseDate':
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
      case 'parseBoolean':
        const lower = value.toLowerCase().trim();
        return ['true', '1', 'yes', 'on', 'enabled'].includes(lower);
      case 'splitArray':
        return value.split(',').map(s => s.trim()).filter(s => s);
      case 'parseJSON':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Convert value to target type
   */
  private convertType(value: any, fieldType: FieldType): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    switch (fieldType) {
      case 'string':
        return String(value);
      case 'number':
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        return isNaN(num) ? null : num;
      case 'boolean':
        if (typeof value === 'boolean') return value;
        const str = String(value).toLowerCase().trim();
        return ['true', '1', 'yes', 'on', 'enabled'].includes(str);
      case 'date':
        if (value instanceof Date) return value;
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
      case 'array':
        if (Array.isArray(value)) return value;
        return String(value).split(',').map(s => s.trim()).filter(s => s);
      case 'object':
      case 'json':
        if (typeof value === 'object') return value;
        try {
          return JSON.parse(String(value));
        } catch {
          return null;
        }
      default:
        return value;
    }
  }

  /**
   * Apply global transformation
   */
  private applyGlobalTransform(row: any, transform: DataTransform): void {
    if (transform.customFunction) {
      transform.customFunction(row);
    }
    // Add more global transform logic as needed
  }

  /**
   * Validate imported data against rules
   */
  validateData(
    data: any[],
    rules: ValidationRule[]
  ): FileValidationResult {
    const errors: FileError[] = [];
    const warnings: FileWarning[] = [];
    let validRows = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      let rowValid = true;

      for (const rule of rules) {
        const value = row[rule.field];
        
        if (!this.validateRule(value, rule)) {
          errors.push({
            type: 'validation',
            message: rule.message,
            row: i + 1,
            column: rule.field,
            value
          });
          rowValid = false;
        }
      }

      if (rowValid) validRows++;
    }

    const statistics: FileStatistics = {
      totalRows: data.length,
      validRows,
      invalidRows: data.length - validRows,
      totalColumns: data.length > 0 ? Object.keys(data[0]).length : 0,
      mappedColumns: 0, // Will be set by mapping component
      unmappedColumns: 0,
      duplicateRows: this.countDuplicateRows(data)
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      statistics
    };
  }

  /**
   * Validate single rule
   */
  private validateRule(value: any, rule: ValidationRule): boolean {
    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== '';
      case 'format':
        if (typeof rule.rule === 'string') {
          return new RegExp(rule.rule).test(String(value));
        } else if (rule.rule instanceof RegExp) {
          return rule.rule.test(String(value));
        }
        return true;
      case 'range':
        const num = parseFloat(String(value));
        if (isNaN(num)) return false;
        // Assuming rule.rule is in format "min,max"
        const [min, max] = String(rule.rule).split(',').map(parseFloat);
        return num >= min && num <= max;
      case 'custom':
        if (typeof rule.rule === 'function') {
          return rule.rule(value);
        }
        return true;
      default:
        return true;
    }
  }

  /**
   * Count duplicate rows in data
   */
  private countDuplicateRows(data: any[]): number {
    const seen = new Set();
    let duplicates = 0;

    for (const row of data) {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }

  /**
   * Export data to specified format
   */
  async exportData(
    data: any[],
    format: FileFormat,
    filename: string,
    options: any = {}
  ): Promise<Blob> {
    switch (format) {
      case 'csv':
        return this.exportToCsv(data, options);
      case 'excel':
        return this.exportToExcel(data, filename, options);
      case 'json':
        return this.exportToJson(data, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to CSV format
   */
  private exportToCsv(data: any[], options: any): Blob {
    const csv = Papa.unparse(data, {
      header: true,
      delimiter: options.delimiter || ',',
      quotes: options.quotes !== false,
      quoteChar: options.quoteChar || '"',
      escapeChar: options.escapeChar || '"',
      newline: options.newline || '\r\n'
    });

    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Export to Excel format
   */
  private exportToExcel(data: any[], filename: string, options: any): Blob {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Data');

    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array',
      compression: options.compression !== false
    });

    return new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  /**
   * Export to JSON format
   */
  private exportToJson(data: any[], options: any): Blob {
    const jsonString = JSON.stringify(data, null, options.indent || 2);
    return new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  }

  /**
   * Utility methods
   */
  private createEmptyResult(
    file: File,
    format: FileFormat,
    errors: FileError[],
    warnings: FileWarning[]
  ): FileUploadResult {
    return {
      file,
      format,
      size: file.size,
      rawData: [],
      headers: [],
      preview: [],
      errors,
      warnings
    };
  }

  private stringifyValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}

// Export singleton instance
export const fileProcessingService = FileProcessingService.getInstance();