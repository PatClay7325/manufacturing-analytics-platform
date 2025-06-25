/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Table Panel - Advanced data table with sorting, filtering and manufacturing features
 * 
 * Original implementation for tabular data display
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { PanelProps } from '@/core/panels/PanelRegistry';
import { TablePanelOptions, TableSortByFieldState } from '@/types/panel';
import { DataFrame, Field } from '@/types/datasource';

interface TableRow {
  [key: string]: any;
  _index: number;
}

interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

export default function TablePanel({ 
  data, 
  options, 
  width, 
  height, 
  fieldConfig 
}: PanelProps<TablePanelOptions>) {
  
  const [sortState, setSortState] = useState<SortState | null>(
    options?.sortBy?.[0] ? {
      field: options.sortBy[0].displayName,
      direction: options.sortBy[0].desc ? 'desc' : 'asc'
    } : null
  );
  
  const [currentPage, setCurrentPage] = useState(0);
  const [filterText, setFilterText] = useState('');
  const rowsPerPage = 50;

  const tableData = useMemo(() => {
    if (!data || !data?.length) return { rows: [], fields: [] };
    
    const frame = data[options?.frameIndex] || data[0];
    if (!frame || !frame?.fields.length) return { rows: [], fields: [] };

    // Convert DataFrame to table rows
    const rows: TableRow[] = [];
    const rowCount = frame?.length;
    
    for (let i = 0; i < rowCount; i++) {
      const row: TableRow = { _index: i };
      frame?.fields.forEach(field => {
        row[field?.name] = field?.values[i];
      });
      rows?.push(row);
    }

    return { rows, fields: frame.fields };
  }, [data, options?.frameIndex]);

  const filteredRows = useMemo(() => {
    if (!filterText) return tableData?.rows;
    
    const searchText = filterText?.toLowerCase();
    return tableData?.rows.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchText)
      )
    );
  }, [tableData?.rows, filterText]);

  const sortedRows = useMemo(() => {
    if (!sortState) return filteredRows;
    
    const { field, direction  } = sortState || {};
    return [...filteredRows].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === 'asc' ? -1 : 1;
      if (bVal == null) return direction === 'asc' ? 1 : -1;
      
      // Handle different data types
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      if (aVal instanceof Date && bVal instanceof Date) {
        return direction === 'asc' 
          ? aVal?.getTime() - bVal?.getTime() 
          : bVal.getTime() - aVal?.getTime();
      }
      
      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (direction === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
  }, [filteredRows, sortState]);

  const paginatedRows = useMemo(() => {
    if (!options?.footer?.enablePagination) return sortedRows;
    
    const startIndex = currentPage * rowsPerPage;
    return sortedRows?.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRows, currentPage, options?.footer?.enablePagination]);

  const totalPages = Math.ceil(sortedRows?.length / rowsPerPage);

  const handleSort = useCallback((fieldName: string) => {
    setSortState(current => {
      if (current?.field === fieldName) {
        // Toggle direction or remove sort
        if (current?.direction === 'asc') {
          return { field: fieldName, direction: 'desc' };
        } else {
          return null; // Remove sort
        }
      } else {
        // Sort by new field
        return { field: fieldName, direction: 'asc' };
      }
    });
  }, []);

  const formatCellValue = useCallback((field: Field, value: any): string => {
    if (value == null) return '';
    
    // Apply field configuration formatting
    if (field?.config?.unit && typeof value === 'number') {
      return `${value?.toLocaleString()}${field?.config.unit}`;
    }
    
    if (field?.type === 'time' && value instanceof Date) {
      return value?.toLocaleString();
    }
    
    if (typeof value === 'number') {
      const decimals = field?.config?.decimals;
      return decimals !== undefined 
        ? value?.toFixed(decimals) 
        : value.toLocaleString();
    }
    
    return String(value);
  }, []);

  const getCellStyle = useCallback((field: Field, value: any): string => {
    let baseClass = 'px-3 py-2 text-sm border-b border-gray-200';
    
    // Apply field color configuration
    if (field?.config?.color?.fixedColor) {
      baseClass += ` text-[${field?.config.color?.fixedColor}]`;
    }
    
    // Apply threshold-based styling
    if (field?.config?.thresholds?.steps && typeof value === 'number') {
      const thresholds = field?.config.thresholds?.steps;
      for (let i = thresholds?.length - 1; i >= 0; i--) {
        const threshold = thresholds[i];
        if (threshold.value === null || value >= threshold?.value) {
          switch (threshold?.color) {
            case 'red':
              baseClass += ' bg-red-50 text-red-900';
              break;
            case 'yellow':
              baseClass += ' bg-yellow-50 text-yellow-900';
              break;
            case 'green':
              baseClass += ' bg-green-50 text-green-900';
              break;
          }
          break;
        }
      }
    }
    
    return baseClass;
  }, []);

  const getSortIcon = (fieldName: string): JSX.Element | null => {
    if (sortState?.field !== fieldName) {
      return <span className="text-gray-400 ml-1">⇅</span>;
    }
    
    return (
      <span className="text-blue-600 ml-1">
        {sortState?.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const calculateFooterValues = (): Record<string, any> => {
    if (!options?.footer?.show || !options?.footer?.reducer?.length) {
      return {};
    }
    
    const calculations: Record<string, any> = {};
    
    tableData?.fields.forEach(field => {
      if (field?.type === 'number') {
        const numericValues = tableData?.rows
          .map(row => row[field?.name])
          .filter(val => typeof val === 'number' && !isNaN(val));
        
        options?.footer.reducer?.forEach(calc => {
          const key = `${field?.name}_${calc}`;
          switch (calc) {
            case 'sum':
              calculations[key] = numericValues?.reduce((sum, val) => sum + val, 0);
              break;
            case 'avg':
              calculations[key] = numericValues?.length > 0 
                ? numericValues?.reduce((sum, val) => sum + val, 0) / numericValues?.length 
                : 0;
              break;
            case 'min':
              calculations[key] = numericValues?.length > 0 ? Math.min(...numericValues) : 0;
              break;
            case 'max':
              calculations[key] = numericValues?.length > 0 ? Math.max(...numericValues) : 0;
              break;
            case 'count':
              calculations[key] = numericValues?.length;
              break;
          }
        });
      }
    });
    
    return calculations;
  };

  const footerValues = calculateFooterValues();

  if (!tableData?.fields.length) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-lg border border-gray-200">
      {/* Filter bar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Filter data..."
            value={filterText}
            onChange={(e) => setFilterText(e?.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          {sortedRows?.length} rows {filterText && `(filtered from ${tableData?.rows.length})`}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          {options?.showHeader && (
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {(tableData?.fields || []).map((field) => (
                  <th
                    key={field?.name}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(field?.name)}
                  >
                    <div className="flex items-center">
                      {field?.config?.displayName || field?.name}
                      {getSortIcon(field?.name)}
                      {options?.showTypeIcons && (
                        <span className="ml-2 text-gray-400">
                          {getTypeIcon(field?.type)}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          )}
          
          <tbody>
            {paginatedRows?.map((row, index) => (
              <tr 
                key={row?._index}
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                {(tableData?.fields || []).map((field) => (
                  <td
                    key={field?.name}
                    className={getCellStyle(field, row[field?.name])}
                  >
                    {formatCellValue(field, row[field?.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          
          {/* Footer with calculations */}
          {options?.footer?.show && (
            <tfoot className="bg-gray-100 border-t border-gray-300">
              <tr>
                {(tableData?.fields || []).map((field) => (
                  <td
                    key={field?.name}
                    className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-200"
                  >
                    {field?.type === 'number' && options?.footer?.reducer?.length ? (
                      <div className="space-y-1">
                        {options?.footer.reducer?.map(calc => {
                          const value = footerValues[`${field?.name}_${calc}`];
                          return (
                            <div key={calc} className="text-xs">
                              {calc}: {formatCellValue(field, value)}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {options?.footer?.enablePagination && totalPages > 1 && (
        <div className="flex items-center justify-between p-3 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {currentPage * rowsPerPage + 1} to {Math.min((currentPage + 1) * rowsPerPage, sortedRows?.length)} of {sortedRows?.length} rows
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
              className="px-2 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="px-2 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-2 py-1 text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-2 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages - 1)}
              disabled={currentPage === totalPages - 1}
              className="px-2 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getTypeIcon(fieldType?: string): string {
  switch (fieldType) {
    case 'time': return '🕐';
    case 'number': return '#';
    case 'string': return 'Aa';
    case 'boolean': return '◐';
    default: return '?';
  }
}

// Default options for TablePanel
export const tablePanelDefaults: TablePanelOptions = {
  frameIndex: 0,
  showHeader: true,
  showTypeIcons: false,
  sortBy: [],
  footer: {
    show: false,
    reducer: ['sum'],
    fields: '',
    enablePagination: true,
    countRows: true
  }
};