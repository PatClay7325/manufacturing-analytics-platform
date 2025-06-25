'use client';

import React, { useState, useCallback, useRef } from 'react';
import { DocumentArrowUpIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { FileFormat, FileUploadResult, FileError, FileWarning } from '@/types/import-export';

interface FileUploaderProps {
  onFileUpload: (result: FileUploadResult) => void;
  onError: (error: string) => void;
  acceptedFormats: FileFormat[];
  maxFileSize?: number; // in MB
  multiple?: boolean;
  className?: string;
}

const FILE_EXTENSIONS: Record<FileFormat, string[]> = {
  csv: ['.csv'],
  excel: ['.xlsx', '.xls'],
  json: ['.json']
};

const MIME_TYPES: Record<FileFormat, string[]> = {
  csv: ['text/csv', 'application/csv'],
  excel: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ],
  json: ['application/json', 'text/json']
};

export default function FileUploader({
  onFileUpload,
  onError,
  acceptedFormats,
  maxFileSize = 50, // 50MB default
  multiple = false,
  className = ''
}: FileUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptedExtensions = () => {
    return acceptedFormats.flatMap(format => FILE_EXTENSIONS[format]).join(',');
  };

  const getAcceptedMimeTypes = () => {
    return acceptedFormats.flatMap(format => MIME_TYPES[format]).join(',');
  };

  const detectFileFormat = (file: File): FileFormat | null => {
    const extension = file.name.toLowerCase().split('.').pop();
    
    for (const [format, extensions] of Object.entries(FILE_EXTENSIONS)) {
      if (extensions.some(ext => ext === `.${extension}`)) {
        return format as FileFormat;
      }
    }

    // Check MIME type as fallback
    for (const [format, mimeTypes] of Object.entries(MIME_TYPES)) {
      if (mimeTypes.includes(file.type)) {
        return format as FileFormat;
      }
    }

    return null;
  };

  const validateFile = (file: File): FileError[] => {
    const errors: FileError[] = [];

    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      errors.push({
        type: 'size',
        message: `File size exceeds ${maxFileSize}MB limit`
      });
    }

    // Check file format
    const format = detectFileFormat(file);
    if (!format) {
      errors.push({
        type: 'format',
        message: 'Unsupported file format'
      });
    } else if (!acceptedFormats.includes(format)) {
      errors.push({
        type: 'format',
        message: `${format.toUpperCase()} format is not accepted`
      });
    }

    return errors;
  };

  const processFile = async (file: File): Promise<FileUploadResult> => {
    const format = detectFileFormat(file);
    const errors = validateFile(file);
    const warnings: FileWarning[] = [];

    if (!format || errors.length > 0) {
      return {
        file,
        format: format || 'csv',
        size: file.size,
        rawData: [],
        headers: [],
        preview: [],
        errors,
        warnings
      };
    }

    try {
      let rawData: any[][] = [];
      let headers: string[] = [];
      let preview: any[] = [];

      if (format === 'csv') {
        const Papa = await import('papaparse');
        const text = await file.text();
        
        const result = Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          error: (error: any) => {
            errors.push({
              type: 'parse',
              message: error.message
            });
          }
        });

        rawData = result.data as any[][];
        headers = rawData[0] || [];
        preview = rawData.slice(1, 6); // First 5 data rows

        // Validate CSV structure
        if (rawData.length < 2) {
          warnings.push({
            type: 'structure',
            message: 'CSV file appears to have no data rows',
            suggestion: 'Ensure the file has header and data rows'
          });
        }

        // Check for inconsistent column counts
        const columnCounts = rawData.map(row => row.length);
        const maxColumns = Math.max(...columnCounts);
        const minColumns = Math.min(...columnCounts);
        
        if (maxColumns !== minColumns) {
          warnings.push({
            type: 'structure',
            message: 'Inconsistent number of columns detected',
            suggestion: 'Some rows may have missing or extra data'
          });
        }

      } else if (format === 'excel') {
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Use first worksheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          errors.push({
            type: 'format',
            message: 'No worksheets found in Excel file'
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

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          raw: false
        }) as any[][];

        rawData = jsonData;
        headers = rawData[0] || [];
        preview = rawData.slice(1, 6);

        // Check for multiple sheets
        if (workbook.SheetNames.length > 1) {
          warnings.push({
            type: 'data',
            message: `Excel file contains ${workbook.SheetNames.length} sheets. Only "${firstSheetName}" will be imported.`,
            suggestion: 'Consider splitting data into separate files if needed'
          });
        }

      } else if (format === 'json') {
        const text = await file.text();
        let jsonData;
        
        try {
          jsonData = JSON.parse(text);
        } catch (parseError) {
          errors.push({
            type: 'parse',
            message: 'Invalid JSON format'
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

        // Handle different JSON structures
        if (Array.isArray(jsonData)) {
          if (jsonData.length > 0 && typeof jsonData[0] === 'object') {
            // Array of objects - convert to tabular format
            headers = Object.keys(jsonData[0]);
            rawData = [headers, ...jsonData.map(obj => headers.map(key => obj[key] || ''))];
            preview = rawData.slice(1, 6);
          } else {
            warnings.push({
              type: 'structure',
              message: 'JSON array does not contain objects',
              suggestion: 'Expected array of objects for tabular import'
            });
          }
        } else if (typeof jsonData === 'object') {
          // Single object or complex structure
          warnings.push({
            type: 'structure',
            message: 'Complex JSON structure detected',
            suggestion: 'Consider flattening the structure or converting to array format'
          });
          
          // Try to flatten simple object
          headers = Object.keys(jsonData);
          rawData = [headers, headers.map(key => jsonData[key] || '')];
          preview = rawData.slice(1, 6);
        }
      }

      return {
        file,
        format,
        size: file.size,
        rawData,
        headers,
        preview,
        errors,
        warnings
      };

    } catch (error) {
      errors.push({
        type: 'parse',
        message: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`
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
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setIsProcessing(true);
    const fileArray = Array.from(files);

    try {
      for (const file of fileArray) {
        const result = await processFile(file);
        
        if (result.errors.length > 0) {
          onError(`Failed to process ${file.name}: ${result.errors[0].message}`);
        } else {
          onFileUpload(result);
          setUploadedFiles(prev => [...prev, result]);
        }

        if (!multiple) break; // Only process first file if not multiple
      }
    } catch (error) {
      onError(`Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [onFileUpload, onError, multiple]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 border-solid' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isProcessing ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={`${getAcceptedExtensions()},${getAcceptedMimeTypes()}`}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />

        <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            {isDragActive ? 'Drop files here' : 'Upload files'}
          </p>
          <p className="text-sm text-gray-600">
            Click to browse or drag and drop files
          </p>
          <p className="text-xs text-gray-500">
            Supported formats: {acceptedFormats.map(f => f.toUpperCase()).join(', ')}
          </p>
          <p className="text-xs text-gray-500">
            Maximum file size: {maxFileSize}MB
          </p>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Processing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
          <div className="space-y-2">
            {uploadedFiles.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <DocumentArrowUpIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {result.file.name}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatFileSize(result.size)}</span>
                      <span>{result.format.toUpperCase()}</span>
                      <span>{result.rawData.length} rows</span>
                      <span>{result.headers.length} columns</span>
                    </div>
                    
                    {/* Warnings */}
                    {result.warnings.length > 0 && (
                      <div className="mt-1 flex items-center space-x-1">
                        <ExclamationTriangleIcon className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs text-yellow-700">
                          {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Format Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Format Guidelines</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          {acceptedFormats.includes('csv') && (
            <li>• <strong>CSV:</strong> First row should contain column headers</li>
          )}
          {acceptedFormats.includes('excel') && (
            <li>• <strong>Excel:</strong> Data should be in the first worksheet</li>
          )}
          {acceptedFormats.includes('json') && (
            <li>• <strong>JSON:</strong> Should be an array of objects for tabular data</li>
          )}
          <li>• Avoid special characters in column names</li>
          <li>• Ensure consistent data types within columns</li>
          <li>• Large files may take longer to process</li>
        </ul>
      </div>
    </div>
  );
}