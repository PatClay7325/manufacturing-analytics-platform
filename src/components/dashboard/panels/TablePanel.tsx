'use client';

import React, { useMemo } from 'react';
import { Panel } from '@/types/dashboard';

interface TablePanelProps {
  panel?: Panel;
  data?: any[];
  width?: number;
  height?: number;
}

interface TableColumn {
  key: string;
  title: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
}

export default function TablePanel({ panel, data = [], width, height }: TablePanelProps) {
  const options = panel?.options || {};
  const fieldConfig = panel?.fieldConfig || {};

  // Process data into table format
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        columns: [] as TableColumn[],
        rows: [] as any[]
      };
    }

    // Auto-detect columns from data
    const firstRow = data[0];
    if (!firstRow) {
      return {
        columns: [],
        rows: []
      };
    }
    
    const columns: TableColumn[] = Object.keys(firstRow).map(key => ({
      key,
      title: key.charAt(0).toUpperCase() + key?.slice(1).replace(/_/g, ' '),
      type: typeof firstRow[key] === 'number' ? 'number' : 
            firstRow[key] instanceof Date ? 'date' : 
            typeof firstRow[key] === 'boolean' ? 'boolean' : 'string',
      sortable: true,
      filterable: true
    }));

    return {
      columns,
      rows: data
    };
  }, [data]);

  const formatCellValue = (value: any, column: TableColumn) => {
    if (value === null || value === undefined) {
      return '-';
    }

    switch (column?.type) {
      case 'number':
        if (typeof value === 'number') {
          return fieldConfig?.unit === 'percent' 
            ? `${(value * 100).toFixed(fieldConfig?.decimals || 1)}%`
            : value.toLocaleString(undefined, {
                minimumFractionDigits: fieldConfig.decimals || 0,
                maximumFractionDigits: fieldConfig.decimals || 2
              });
        }
        return value;
      
      case 'date':
        return value instanceof Date 
          ? value?.toLocaleDateString() 
          : new Date(value).toLocaleDateString();
      
      case 'boolean':
        return value ? '✓' : '✗';
      
      default:
        return String(value);
    }
  };

  const getCellClassName = (value: any, column: TableColumn) => {
    let className = 'px-4 py-2 text-sm';
    
    // Align numbers to the right
    if (column?.type === 'number') {
      className += ' text-right';
    }

    // Color coding for numbers based on thresholds
    if (column?.type === 'number' && typeof value === 'number' && fieldConfig?.thresholds) {
      const thresholds = fieldConfig?.thresholds;
      if (thresholds?.length >= 2) {
        if (value <= thresholds[0]) {
          className += ' text-red-600 bg-red-50';
        } else if (value >= thresholds[thresholds?.length - 1]) {
          className += ' text-green-600 bg-green-50';
        } else {
          className += ' text-yellow-600 bg-yellow-50';
        }
      }
    }

    return className;
  };

  const tableHeight = height ? Math.max(height - 60, 200) : 400;
  const pageSize = options?.pageSize || 50;
  const showHeader = options?.showHeader !== false;
  const showRowNumbers = options?.showRowNumbers || false;

  if (processedData?.rows.length === 0) {
    return (
      <div 
        className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded"
        style={{ height: tableHeight }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-2xl text-gray-400">📊</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data</h3>
          <p className="text-gray-600">There is no data available for this table.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white border border-gray-200 rounded overflow-hidden">
      {/* Table Header */}
      {showHeader && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
          <h3 className="text-sm font-medium text-gray-900">{panel?.title}</h3>
        </div>
      )}

      {/* Table Container */}
      <div 
        className="overflow-auto"
        style={{ height: showHeader ? tableHeight - 40 : tableHeight }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {showRowNumbers && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
              )}
              {processedData?.(columns || []).map((column) => (
                <th
                  key={column?.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-1">
                    {column?.title}
                    {column?.sortable && (
                      <span className="text-gray-400">↕</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedData?.rows.slice(0, pageSize).map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                {showRowNumbers && (
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {rowIndex + 1}
                  </td>
                )}
                {processedData?.(columns || []).map((column) => (
                  <td
                    key={column?.key}
                    className={getCellClassName(row[column?.key], column)}
                  >
                    {formatCellValue(row[column?.key], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {processedData?.rows.length > pageSize && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
          Showing {Math.min(pageSize, processedData?.rows.length)} of {processedData?.rows.length} rows
        </div>
      )}
    </div>
  );
}