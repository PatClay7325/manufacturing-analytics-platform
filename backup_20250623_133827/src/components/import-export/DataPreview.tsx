'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { FileUploadResult, FileValidationResult, FileStatistics } from '@/types/import-export';

interface DataPreviewProps {
  uploadResult: FileUploadResult;
  validation?: FileValidationResult;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
}

const ROWS_PER_PAGE = 10;

export default function DataPreview({
  uploadResult,
  validation,
  onValidationChange,
  className = ''
}: DataPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showAllColumns, setShowAllColumns] = useState(false);

  const { file, format, rawData, headers, preview, errors, warnings } = uploadResult;

  // Calculate pagination
  const totalDataRows = rawData.length - 1; // Exclude header
  const totalPages = Math.ceil(totalDataRows / ROWS_PER_PAGE);
  const startRow = currentPage * ROWS_PER_PAGE + 1; // +1 to skip header
  const endRow = Math.min(startRow + ROWS_PER_PAGE - 1, rawData.length - 1);
  const currentPageData = rawData.slice(startRow, endRow + 1);

  // Determine visible columns
  const visibleColumns = useMemo(() => {
    if (showAllColumns || headers.length <= 8) {
      return headers;
    }
    return headers.slice(0, 8);
  }, [headers, showAllColumns]);

  // Calculate statistics
  const statistics: FileStatistics = validation?.statistics || {
    totalRows: totalDataRows,
    validRows: totalDataRows - errors.length,
    invalidRows: errors.length,
    totalColumns: headers.length,
    mappedColumns: 0,
    unmappedColumns: headers.length,
    duplicateRows: 0
  };

  const isValid = errors.length === 0 && (validation?.isValid !== false);

  // Notify parent of validation status
  React.useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  const handleRowSelect = (rowIndex: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === currentPageData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(Array.from({ length: currentPageData.length }, (_, i) => i)));
    }
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getCellClassName = (rowIndex: number, columnIndex: number): string => {
    const baseClass = 'px-3 py-2 text-sm border-r border-gray-200 last:border-r-0';
    const actualRowIndex = startRow + rowIndex - 1;
    
    // Check for validation errors in this cell
    const hasError = validation?.errors.some(error => 
      error.row === actualRowIndex && 
      error.column === headers[columnIndex]
    );

    if (hasError) {
      return `${baseClass} bg-red-50 text-red-900`;
    }

    return `${baseClass} text-gray-900`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* File Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Data Preview</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>{file.name}</span>
            <span>•</span>
            <span>{format.toUpperCase()}</span>
            <span>•</span>
            <span>{(file.size / 1024).toFixed(1)} KB</span>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Total Rows</div>
            <div className="text-2xl font-semibold text-gray-900">{statistics.totalRows.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Columns</div>
            <div className="text-2xl font-semibold text-gray-900">{statistics.totalColumns}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-sm text-green-600">Valid Rows</div>
            <div className="text-2xl font-semibold text-green-900">{statistics.validRows.toLocaleString()}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-sm text-red-600">Invalid Rows</div>
            <div className="text-2xl font-semibold text-red-900">{statistics.invalidRows.toLocaleString()}</div>
          </div>
        </div>

        {/* Validation Status */}
        <div className="flex items-center space-x-2 mb-4">
          {isValid ? (
            <>
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-700 font-medium">Data validation passed</span>
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-700 font-medium">
                Data validation failed ({errors.length} error{errors.length > 1 ? 's' : ''})
              </span>
            </>
          )}
        </div>
      </div>

      {/* Errors and Warnings */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-3">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <h4 className="text-sm font-medium text-red-900">
                  Errors ({errors.length})
                </h4>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {errors.slice(0, 5).map((error, index) => (
                  <div key={index} className="text-sm text-red-800">
                    {error.row && <span className="font-medium">Row {error.row}: </span>}
                    {error.column && <span className="font-medium">{error.column}: </span>}
                    {error.message}
                  </div>
                ))}
                {errors.length > 5 && (
                  <div className="text-sm text-red-700">
                    ... and {errors.length - 5} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <InformationCircleIcon className="h-5 w-5 text-yellow-500" />
                <h4 className="text-sm font-medium text-yellow-900">
                  Warnings ({warnings.length})
                </h4>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {warnings.slice(0, 3).map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-800">
                    {warning.row && <span className="font-medium">Row {warning.row}: </span>}
                    {warning.column && <span className="font-medium">{warning.column}: </span>}
                    {warning.message}
                    {warning.suggestion && (
                      <div className="text-xs text-yellow-700 mt-1 pl-4">
                        💡 {warning.suggestion}
                      </div>
                    )}
                  </div>
                ))}
                {warnings.length > 3 && (
                  <div className="text-sm text-yellow-700">
                    ... and {warnings.length - 3} more warnings
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h4 className="text-sm font-medium text-gray-900">Data Sample</h4>
              {headers.length > 8 && (
                <button
                  onClick={() => setShowAllColumns(!showAllColumns)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showAllColumns ? 'Show Less' : `Show All ${headers.length} Columns`}
                </button>
              )}
            </div>
            
            {/* Pagination Info */}
            <div className="text-sm text-gray-600">
              Showing rows {startRow} - {endRow} of {totalDataRows}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {/* Header */}
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === currentPageData.length && currentPageData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Row
                </th>
                {visibleColumns.map((header, index) => (
                  <th
                    key={index}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="truncate max-w-32" title={header}>
                      {header || `Column ${index + 1}`}
                    </div>
                  </th>
                ))}
                {headers.length > visibleColumns.length && (
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    +{headers.length - visibleColumns.length} more
                  </th>
                )}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPageData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`hover:bg-gray-50 ${selectedRows.has(rowIndex) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(rowIndex)}
                      onChange={() => handleRowSelect(rowIndex)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {startRow + rowIndex}
                  </td>
                  {visibleColumns.map((_, columnIndex) => (
                    <td
                      key={columnIndex}
                      className={getCellClassName(rowIndex, columnIndex)}
                    >
                      <div className="truncate max-w-32" title={formatCellValue(row[columnIndex])}>
                        {formatCellValue(row[columnIndex])}
                      </div>
                    </td>
                  ))}
                  {headers.length > visibleColumns.length && (
                    <td className="px-3 py-2 text-sm text-gray-400">
                      ...
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage + 1} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (currentPage < 3) {
                      pageNum = i;
                    } else if (currentPage > totalPages - 4) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Insights */}
      {totalDataRows > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Data Insights</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div>• Data contains {statistics.totalRows.toLocaleString()} rows and {statistics.totalColumns} columns</div>
            <div>• {((statistics.validRows / statistics.totalRows) * 100).toFixed(1)}% of rows passed validation</div>
            {statistics.duplicateRows > 0 && (
              <div>• {statistics.duplicateRows} duplicate rows detected</div>
            )}
            <div>• File format: {format.toUpperCase()}</div>
            {selectedRows.size > 0 && (
              <div>• {selectedRows.size} rows selected for preview</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}