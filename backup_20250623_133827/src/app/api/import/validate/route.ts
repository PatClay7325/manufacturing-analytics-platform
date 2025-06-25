/**
 * Import Validation API Routes
 * POST /api/import/validate - Validate import files before processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { fileProcessingService } from '@/services/fileProcessingService';
import {
  FileValidationResult,
  FileStatistics,
  FileError,
  FileWarning,
  ValidationRule,
  FieldMapping,
  ValidationOptions,
  FileFormat,
  ImportType
} from '@/types/import-export';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const templateStr = formData.get('template') as string;
    const optionsStr = formData.get('options') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse options
    let options: ValidationOptions;
    try {
      options = optionsStr ? JSON.parse(optionsStr) : getDefaultValidationOptions();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid validation options' },
        { status: 400 }
      );
    }

    // Detect file format
    const format = detectFileFormat(file);
    if (!format) {
      return NextResponse.json(
        { error: 'Unsupported file format' },
        { status: 400 }
      );
    }

    // Parse file
    const uploadResult = await fileProcessingService.parseFile(file, format);
    
    if (uploadResult.errors.length > 0 && !options.skipErrors) {
      return NextResponse.json({
        success: false,
        validation: {
          isValid: false,
          errors: uploadResult.errors,
          warnings: uploadResult.warnings,
          statistics: createBasicStatistics(uploadResult)
        }
      });
    }

    // Perform validation based on template or import type
    let validationRules: ValidationRule[] = [];
    let suggestedMapping: FieldMapping | undefined;

    if (templateStr) {
      try {
        const template = JSON.parse(templateStr);
        validationRules = template.validationRules || [];
        suggestedMapping = generateMappingFromTemplate(uploadResult.headers, template);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid template data' },
          { status: 400 }
        );
      }
    } else {
      // Auto-detect validation rules based on headers
      validationRules = generateValidationRules(uploadResult.headers, uploadResult.rawData);
      suggestedMapping = generateAutoMapping(uploadResult.headers);
    }

    // Validate data structure
    const structureValidation = validateDataStructure(uploadResult, options);
    
    // Validate data content
    const contentValidation = validateDataContent(uploadResult, validationRules, options);
    
    // Combine validation results
    const combinedValidation = combineValidationResults(
      structureValidation,
      contentValidation,
      uploadResult.errors,
      uploadResult.warnings
    );

    return NextResponse.json({
      success: true,
      validation: combinedValidation,
      mapping: suggestedMapping
    });

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { 
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Validate data structure
 */
function validateDataStructure(
  uploadResult: any,
  options: ValidationOptions
): Partial<FileValidationResult> {
  const errors: FileError[] = [];
  const warnings: FileWarning[] = [];

  const { rawData, headers, format } = uploadResult;

  // Check minimum data requirements
  if (rawData.length < 2) {
    errors.push({
      type: 'structure',
      message: 'File must contain at least one header row and one data row'
    });
  }

  // Check header validity
  if (headers.length === 0) {
    errors.push({
      type: 'structure',
      message: 'No column headers found'
    });
  } else {
    // Check for empty headers
    const emptyHeaders = headers.filter((h: string) => !h || h.trim() === '');
    if (emptyHeaders.length > 0) {
      warnings.push({
        type: 'structure',
        message: `${emptyHeaders.length} empty column header(s) detected`,
        suggestion: 'Consider providing meaningful column names'
      });
    }

    // Check for duplicate headers
    const duplicates = findDuplicates(headers);
    if (duplicates.length > 0) {
      errors.push({
        type: 'structure',
        message: `Duplicate column headers: ${duplicates.join(', ')}`,
      });
    }

    // Check for special characters in headers
    const specialCharHeaders = headers.filter((h: string) => 
      h && /[^a-zA-Z0-9_\-\s]/.test(h)
    );
    if (specialCharHeaders.length > 0) {
      warnings.push({
        type: 'structure',
        message: `Headers contain special characters: ${specialCharHeaders.join(', ')}`,
        suggestion: 'Consider using alphanumeric characters, underscores, and hyphens only'
      });
    }
  }

  // Check data consistency
  if (rawData.length > 1) {
    const dataRows = rawData.slice(1);
    const columnCounts = dataRows.map((row: any[]) => row.length);
    const expectedColumns = headers.length;
    const inconsistentRows = columnCounts.filter(count => count !== expectedColumns);

    if (inconsistentRows.length > 0) {
      if (options.strictMode) {
        errors.push({
          type: 'structure',
          message: `${inconsistentRows.length} rows have inconsistent column counts`
        });
      } else {
        warnings.push({
          type: 'structure',
          message: `${inconsistentRows.length} rows have inconsistent column counts`,
          suggestion: 'Missing data will be treated as empty values'
        });
      }
    }
  }

  // Format-specific validations
  if (format === 'json') {
    // JSON-specific validations
    try {
      const textContent = uploadResult.file ? '' : JSON.stringify(rawData);
      if (textContent.length > 10 * 1024 * 1024) { // 10MB
        warnings.push({
          type: 'format',
          message: 'Large JSON file detected',
          suggestion: 'Consider splitting into smaller files for better performance'
        });
      }
    } catch (error) {
      // Already handled in file parsing
    }
  }

  return { errors, warnings };
}

/**
 * Validate data content
 */
function validateDataContent(
  uploadResult: any,
  rules: ValidationRule[],
  options: ValidationOptions
): Partial<FileValidationResult> {
  const errors: FileError[] = [];
  const warnings: FileWarning[] = [];

  if (!options.validateData || rules.length === 0) {
    return { errors, warnings };
  }

  const { rawData, headers } = uploadResult;
  const dataRows = rawData.slice(1);

  // Sample validation (first 100 rows to avoid performance issues)
  const sampleSize = Math.min(dataRows.length, 100);
  const sampleRows = dataRows.slice(0, sampleSize);

  for (let rowIndex = 0; rowIndex < sampleRows.length; rowIndex++) {
    const row = sampleRows[rowIndex];
    
    for (const rule of rules) {
      const columnIndex = headers.indexOf(rule.field);
      if (columnIndex === -1) continue;

      const value = row[columnIndex];
      const isValid = validateRule(value, rule);

      if (!isValid) {
        if (rule.type === 'required') {
          errors.push({
            type: 'validation',
            message: rule.message,
            row: rowIndex + 2, // +2 because we skip header and array is 0-indexed
            column: rule.field,
            value
          });
        } else {
          warnings.push({
            type: 'data',
            message: rule.message,
            row: rowIndex + 2,
            column: rule.field,
            suggestion: 'Value may need correction'
          });
        }
      }
    }
  }

  // If we sampled, note that in warnings
  if (sampleRows.length < dataRows.length) {
    warnings.push({
      type: 'data',
      message: `Validation performed on sample of ${sampleSize} rows out of ${dataRows.length}`,
      suggestion: 'Full validation will be performed during import'
    });
  }

  return { errors, warnings };
}

/**
 * Generate validation rules based on data analysis
 */
function generateValidationRules(headers: string[], rawData: any[][]): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  if (rawData.length < 2) return rules;

  const dataRows = rawData.slice(1);
  
  headers.forEach((header, columnIndex) => {
    if (!header) return;

    const columnData = dataRows.map(row => row[columnIndex]).filter(val => val !== undefined && val !== '');
    
    if (columnData.length === 0) return;

    // Detect data type
    const dataType = detectColumnDataType(columnData);
    
    // Add type-specific validation rules
    switch (dataType) {
      case 'number':
        rules.push({
          field: header,
          type: 'format',
          rule: /^-?\d*\.?\d+$/,
          message: `${header} must be a valid number`
        });
        break;
        
      case 'date':
        rules.push({
          field: header,
          type: 'custom',
          rule: (value: any) => !isNaN(new Date(value).getTime()),
          message: `${header} must be a valid date`
        });
        break;
        
      case 'email':
        rules.push({
          field: header,
          type: 'format',
          rule: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: `${header} must be a valid email address`
        });
        break;
        
      case 'url':
        rules.push({
          field: header,
          type: 'format',
          rule: /^https?:\/\/.+/,
          message: `${header} must be a valid URL`
        });
        break;
    }

    // Add required field validation for columns with high fill rate
    const fillRate = columnData.length / dataRows.length;
    if (fillRate > 0.9) { // 90% fill rate
      rules.push({
        field: header,
        type: 'required',
        rule: '',
        message: `${header} is required`
      });
    }
  });

  return rules;
}

/**
 * Detect column data type
 */
function detectColumnDataType(values: any[]): string {
  if (values.length === 0) return 'string';

  const sample = values.slice(0, Math.min(10, values.length));
  
  // Check for numbers
  const numberCount = sample.filter(val => !isNaN(parseFloat(val)) && isFinite(val)).length;
  if (numberCount / sample.length > 0.8) return 'number';
  
  // Check for dates
  const dateCount = sample.filter(val => !isNaN(new Date(val).getTime())).length;
  if (dateCount / sample.length > 0.8) return 'date';
  
  // Check for emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailCount = sample.filter(val => emailRegex.test(val)).length;
  if (emailCount / sample.length > 0.8) return 'email';
  
  // Check for URLs
  const urlRegex = /^https?:\/\/.+/;
  const urlCount = sample.filter(val => urlRegex.test(val)).length;
  if (urlCount / sample.length > 0.8) return 'url';
  
  return 'string';
}

/**
 * Generate automatic field mapping
 */
function generateAutoMapping(headers: string[]): FieldMapping {
  const mappings: any[] = [];
  
  // Common field mappings
  const fieldMappings: Record<string, { target: string; type: string }> = {
    'id': { target: 'uid', type: 'string' },
    'uid': { target: 'uid', type: 'string' },
    'title': { target: 'title', type: 'string' },
    'name': { target: 'title', type: 'string' },
    'description': { target: 'description', type: 'string' },
    'desc': { target: 'description', type: 'string' },
    'tags': { target: 'tags', type: 'array' },
    'folder': { target: 'folderId', type: 'string' },
    'folderId': { target: 'folderId', type: 'string' },
    'version': { target: 'version', type: 'number' },
    'created': { target: 'created', type: 'date' },
    'updated': { target: 'updated', type: 'date' },
  };

  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    const mapping = fieldMappings[lowerHeader];
    
    if (mapping) {
      mappings.push({
        sourceColumn: header,
        targetField: mapping.target,
        fieldType: mapping.type,
        required: mapping.target === 'uid' || mapping.target === 'title'
      });
    }
  });

  return {
    mappings,
    transforms: [],
    defaults: {}
  };
}

/**
 * Generate mapping from template
 */
function generateMappingFromTemplate(headers: string[], template: any): FieldMapping {
  const mappings: any[] = [];
  
  if (template.fieldMappings) {
    template.fieldMappings.forEach((templateMapping: any) => {
      const matchingHeader = headers.find(h => 
        h.toLowerCase() === templateMapping.templateField.toLowerCase() ||
        h.toLowerCase().includes(templateMapping.templateField.toLowerCase())
      );
      
      if (matchingHeader) {
        mappings.push({
          sourceColumn: matchingHeader,
          targetField: templateMapping.targetField,
          fieldType: templateMapping.fieldType,
          required: templateMapping.required
        });
      }
    });
  }

  return {
    mappings,
    transforms: template.transforms || [],
    defaults: template.defaults || {}
  };
}

/**
 * Utility functions
 */
function detectFileFormat(file: File): FileFormat | null {
  const extension = file.name.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'csv': return 'csv';
    case 'xlsx':
    case 'xls': return 'excel';
    case 'json': return 'json';
    default: return null;
  }
}

function getDefaultValidationOptions(): ValidationOptions {
  return {
    validateSchema: true,
    validateData: true,
    validateReferences: false,
    strictMode: false,
    customRules: []
  };
}

function validateRule(value: any, rule: ValidationRule): boolean {
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
    case 'custom':
      if (typeof rule.rule === 'function') {
        return rule.rule(value);
      }
      return true;
    default:
      return true;
  }
}

function findDuplicates(arr: string[]): string[] {
  const seen = new Set();
  const duplicates = new Set();
  
  arr.forEach(item => {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  });
  
  return Array.from(duplicates) as string[];
}

function createBasicStatistics(uploadResult: any): FileStatistics {
  const totalRows = Math.max(0, uploadResult.rawData.length - 1);
  
  return {
    totalRows,
    validRows: totalRows - uploadResult.errors.length,
    invalidRows: uploadResult.errors.length,
    totalColumns: uploadResult.headers.length,
    mappedColumns: 0,
    unmappedColumns: uploadResult.headers.length,
    duplicateRows: 0
  };
}

function combineValidationResults(
  structureValidation: Partial<FileValidationResult>,
  contentValidation: Partial<FileValidationResult>,
  parseErrors: FileError[],
  parseWarnings: FileWarning[]
): FileValidationResult {
  const allErrors = [
    ...parseErrors,
    ...(structureValidation.errors || []),
    ...(contentValidation.errors || [])
  ];
  
  const allWarnings = [
    ...parseWarnings,
    ...(structureValidation.warnings || []),
    ...(contentValidation.warnings || [])
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    statistics: {
      totalRows: 0,
      validRows: 0,
      invalidRows: allErrors.length,
      totalColumns: 0,
      mappedColumns: 0,
      unmappedColumns: 0,
      duplicateRows: 0
    }
  };
}