/**
 * Virtualized Table Component - High-performance table for large datasets
 * Uses virtual scrolling to handle thousands of rows efficiently
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useOptimizedState, useDebounce } from '@/hooks/useOptimizedData';

export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex: keyof T;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
}

export interface VirtualizedTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  height?: number;
  rowHeight?: number;
  overscan?: number;
  loading?: boolean;
  onRowClick?: (record: T, index: number) => void;
  onRowDoubleClick?: (record: T, index: number) => void;
  className?: string;
  rowClassName?: (record: T, index: number) => string;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  selectedRows?: Set<number>;
  onSelectionChange?: (selectedRows: Set<number>) => void;
  emptyText?: string;
  stickyHeader?: boolean;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  [key: string]: string;
}

export const VirtualizedTable = <T extends Record<string, any>>({
  data,
  columns,
  height = 400,
  rowHeight = 40,
  overscan = 5,
  loading = false,
  onRowClick,
  onRowDoubleClick,
  className = '',
  rowClassName,
  sortable = true,
  filterable = true,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  emptyText = 'No data available',
  stickyHeader = true
}: VirtualizedTableProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(height);
  
  // Sorting and filtering state
  const { state: sortConfig, setState: setSortConfig } = useOptimizedState<SortConfig | null>(null);
  const { state: filters, setState: setFilters } = useOptimizedState<FilterConfig>({});
  const [filterInputs, setFilterInputs] = useState<FilterConfig>({});
  
  // Debounced filter inputs to reduce re-renders
  const debouncedFilters = useDebounce(filterInputs, 300);

  // Update filters when debounced inputs change
  useEffect(() => {
    setFilters(debouncedFilters);
  }, [debouncedFilters, setFilters]);

  // Calculate visible data with sorting and filtering
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(item => {
          const itemValue = String(item[key] || '').toLowerCase();
          return itemValue.includes(value.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === bValue) return 0;
        
        let comparison = 0;
        if (aValue > bValue) comparison = 1;
        if (aValue < bValue) comparison = -1;
        
        return sortConfig.direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, filters, sortConfig]);

  // Calculate virtual scrolling parameters
  const totalHeight = processedData.length * rowHeight;
  const visibleRowCount = Math.ceil(containerHeight / rowHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    processedData.length - 1,
    startIndex + visibleRowCount + overscan * 2
  );

  const visibleData = useMemo(() => 
    processedData.slice(startIndex, endIndex + 1),
    [processedData, startIndex, endIndex]
  );

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sorting handlers
  const handleSort = useCallback((column: TableColumn<T>) => {
    if (!column.sortable || !sortable) return;

    setSortConfig(prev => {
      if (prev?.key === column.key) {
        if (prev.direction === 'asc') {
          return { key: column.key, direction: 'desc' };
        } else {
          return null; // Clear sort
        }
      } else {
        return { key: column.key, direction: 'asc' };
      }
    });
  }, [sortable, setSortConfig]);

  // Filter handlers
  const handleFilterChange = useCallback((columnKey: string, value: string) => {
    setFilterInputs(prev => ({
      ...prev,
      [columnKey]: value
    }));
  }, []);

  // Selection handlers
  const handleRowSelect = useCallback((index: number) => {
    if (!selectable || !onSelectionChange) return;

    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(index)) {
      newSelectedRows.delete(index);
    } else {
      newSelectedRows.add(index);
    }
    onSelectionChange(newSelectedRows);
  }, [selectable, selectedRows, onSelectionChange]);

  const handleSelectAll = useCallback(() => {
    if (!selectable || !onSelectionChange) return;

    const allSelected = selectedRows.size === processedData.length;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(processedData.map((_, index) => index)));
    }
  }, [selectable, selectedRows.size, processedData.length, onSelectionChange]);

  // Render cell content
  const renderCell = useCallback((column: TableColumn<T>, record: T, rowIndex: number) => {
    const value = record[column.dataIndex];
    
    if (column.render) {
      return column.render(value, record, rowIndex);
    }
    
    return value;
  }, []);

  // Calculate column widths
  const columnWidths = useMemo(() => {
    const containerWidth = containerRef.current?.clientWidth || 800;
    const totalMinWidth = columns.reduce((sum, col) => sum + (col.minWidth || 100), 0);
    const availableWidth = containerWidth - (selectable ? 40 : 0);
    
    return columns.map(column => {
      if (column.width) return column.width;
      if (column.minWidth && totalMinWidth <= availableWidth) {
        return Math.max(column.minWidth, availableWidth / columns.length);
      }
      return Math.max(100, availableWidth / columns.length);
    });
  }, [columns, selectable]);

  if (loading) {
    return (
      <div 
        className={`border border-gray-200 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}
      style={{ height }}
    >
      {/* Header */}
      <div className={`bg-gray-50 border-b border-gray-200 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
        <div className="flex">
          {/* Selection column */}
          {selectable && (
            <div className="w-10 px-2 py-3 border-r border-gray-200 flex items-center justify-center">
              <input
                type="checkbox"
                checked={selectedRows.size === processedData.length && processedData.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
            </div>
          )}
          
          {/* Data columns */}
          {columns.map((column, index) => (
            <div
              key={column.key}
              className="px-4 py-3 border-r border-gray-200 last:border-r-0"
              style={{ 
                width: columnWidths[index],
                minWidth: column.minWidth || 100,
                maxWidth: column.maxWidth
              }}
            >
              {/* Column header */}
              <div 
                className={`flex items-center space-x-2 ${
                  column.sortable && sortable ? 'cursor-pointer hover:text-blue-600' : ''
                }`}
                onClick={() => handleSort(column)}
              >
                <span className="font-medium text-gray-900">{column.title}</span>
                {column.sortable && sortable && (
                  <div className="flex flex-col">
                    <div className={`w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent ${
                      sortConfig?.key === column.key && sortConfig.direction === 'asc' 
                        ? 'border-b-blue-600' 
                        : 'border-b-gray-400'
                    }`} />
                    <div className={`w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent ${
                      sortConfig?.key === column.key && sortConfig.direction === 'desc' 
                        ? 'border-t-blue-600' 
                        : 'border-t-gray-400'
                    }`} />
                  </div>
                )}
              </div>
              
              {/* Filter input */}
              {column.filterable && filterable && (
                <input
                  type="text"
                  placeholder={`Filter ${column.title.toLowerCase()}...`}
                  value={filterInputs[column.key] || ''}
                  onChange={(e) => handleFilterChange(column.key, e.target.value)}
                  className="mt-2 w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div 
        className="overflow-auto"
        style={{ height: height - (stickyHeader ? 0 : 0) }}
        onScroll={handleScroll}
      >
        {processedData.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">{emptyText}</p>
          </div>
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${startIndex * rowHeight}px)` }}>
              {visibleData.map((record, visibleIndex) => {
                const actualIndex = startIndex + visibleIndex;
                const isSelected = selectedRows.has(actualIndex);
                
                return (
                  <div
                    key={actualIndex}
                    className={`flex border-b border-gray-100 hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50' : ''
                    } ${rowClassName ? rowClassName(record, actualIndex) : ''}`}
                    style={{ height: rowHeight }}
                    onClick={() => onRowClick?.(record, actualIndex)}
                    onDoubleClick={() => onRowDoubleClick?.(record, actualIndex)}
                  >
                    {/* Selection column */}
                    {selectable && (
                      <div className="w-10 px-2 border-r border-gray-200 flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRowSelect(actualIndex)}
                          className="rounded border-gray-300"
                        />
                      </div>
                    )}
                    
                    {/* Data columns */}
                    {columns.map((column, colIndex) => (
                      <div
                        key={column.key}
                        className={`px-4 py-2 border-r border-gray-200 last:border-r-0 flex items-center ${
                          column.align === 'center' ? 'justify-center' :
                          column.align === 'right' ? 'justify-end' : 'justify-start'
                        }`}
                        style={{ 
                          width: columnWidths[colIndex],
                          minWidth: column.minWidth || 100,
                          maxWidth: column.maxWidth
                        }}
                      >
                        <div className="truncate">
                          {renderCell(column, record, actualIndex)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualizedTable;