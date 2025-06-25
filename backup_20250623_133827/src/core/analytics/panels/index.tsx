/**
 * Analytics Panel System - Complete Panel Implementation
 * Custom panel plugins for Next.js manufacturing analyticsPlatform
 */

import { ReactNode, useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Import additional panel components
import NodeGraphPanel from '@/components/panels/NodeGraphPanel';
import GeomapPanel from '@/components/panels/GeomapPanel';
import StatusHistoryPanel from '@/components/panels/StatusHistoryPanel';
import FlameGraphPanel from '@/components/panels/FlameGraphPanel';
import StateTimelinePanel from '@/components/panels/StateTimelinePanel';

// Core Panel Types
export interface PanelData {
  series: DataFrame[];
  timeRange?: {
    from: string;
    to: string;
  };
  annotations?: any[];
  error?: Error;
  state?: 'Loading' | 'Streaming' | 'Done' | 'Error';
}

export interface DataFrame {
  name?: string;
  fields: Field[];
  length: number;
  meta?: {
    type?: string;
    executedQueryString?: string;
  };
}

export interface Field {
  name: string;
  type: FieldType;
  values: any[];
  config?: FieldConfig;
  state?: {
    displayName?: string;
    range?: {
      min: number;
      max: number;
    };
  };
}

export enum FieldType {
  time = 'time',
  number = 'number',
  string = 'string',
  boolean = 'boolean',
  other = 'other'
}

export interface FieldConfig {
  displayName?: string;
  unit?: string;
  decimals?: number;
  min?: number;
  max?: number;
  color?: {
    mode?: string;
    value?: string;
  };
  thresholds?: {
    mode?: string;
    steps?: Array<{
      color: string;
      value: number;
    }>;
  };
  custom?: any;
  links?: any[];
}

export interface PanelProps<TOptions = any> {
  id: number | string;
  data: PanelData;
  timeRange?: {
    from: string;
    to: string;
  };
  timeZone?: string;
  width: number;
  height: number;
  options: TOptions;
  fieldConfig: {
    defaults: FieldConfig;
    overrides: any[];
  };
  title?: string;
  transparent?: boolean;
  pluginVersion?: string;
  replaceVariables?: (value: string) => string;
  onChangeTimeRange?: (timeRange: { from: string; to: string }) => void;
  onOptionsChange?: (options: TOptions) => void;
  onFieldConfigChange?: (config: any) => void;
}

// Time Series Panel
export interface TimeSeriesOptions {
  tooltip?: {
    mode: 'Single' | 'Multi' | 'None';
    sort?: 'None' | 'Ascending' | 'Descending';
    hideZeros?: boolean;
    maxHeight?: number;
    maxWidth?: number;
  };
  legend?: {
    displayMode: 'Table' | 'List' | 'Hidden';
    placement: 'bottom' | 'right' | 'top';
    showLegend?: boolean;
    calcs?: string[];
  };
  timezone?: string[];
  orientation?: 'Horizontal' | 'Vertical';
}

export function TimeSeriesPanel({ data, width, height, options, title }: PanelProps<TimeSeriesOptions>) {
  const chartData = useMemo(() => {
    if (!data?.series?.length) return [];
    
    const timeField = data.series[0]?.fields?.find(f => f.type === FieldType.time);
    const valueFields = data.series[0]?.fields?.filter(f => f.type === FieldType.number) || [];
    
    if (!timeField || !valueFields.length) return [];
    
    return timeField.values.map((time, index) => {
      const entry: any = { time: new Date(time).toLocaleTimeString() };
      valueFields.forEach(field => {
        entry[field.name] = field.values[index];
      });
      return entry;
    });
  }, [data]);

  const valueFields = data?.series?.[0]?.fields?.filter(f => f.type === FieldType.number) || [];

  return (
    <div className="w-full h-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            fontSize={12}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            fontSize={12}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            labelFormatter={(value) => `Time: ${value}`}
            formatter={(value: any, name: string) => [value, name]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
          {valueFields.map((field, index) => (
            <Line
              key={field.name}
              type="monotone"
              dataKey={field.name}
              stroke={getFieldColor(field, index)}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Stat Panel  
export interface StatOptions {
  reduceOptions?: {
    calcs: string[];
    fields?: string;
  };
  orientation?: 'auto' | 'horizontal' | 'vertical';
  textMode?: 'auto' | 'value' | 'value_and_name' | 'name';
  colorMode?: 'value' | 'background' | 'none';
  graphMode?: 'none' | 'area' | 'line';
  justifyMode?: 'auto' | 'center';
  showPercentChange?: boolean;
  text?: {
    titleSize?: number;
    valueSize?: number;
  };
  wideLayout?: boolean;
}

export function StatPanel({ data, width, height, options, title }: PanelProps<StatOptions>) {
  const values = useMemo(() => {
    if (!data?.series?.length) return [];
    
    return data.series.flatMap(series => 
      series.fields
        .filter(field => field.type === FieldType.number)
        .map(field => {
          const lastValue = field.values[field.values.length - 1];
          return {
            title: field.state?.displayName || field.name,
            value: lastValue,
            unit: field.config?.unit || '',
            color: field.config?.color?.value || '#1f77b4'
          };
        })
    );
  }, [data]);

  const gridCols = values.length === 1 ? 1 : values.length === 2 ? 2 : Math.min(3, values.length);

  return (
    <div className={clsx(
      "w-full h-full p-4 grid gap-4",
      `grid-cols-${gridCols}`
    )}>
      {values.map((stat, index) => (
        <div
          key={index}
          className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-4 min-h-[80px]"
        >
          <div className="text-2xl font-bold text-gray-900 truncate">
            {formatValue(stat.value)} {stat.unit}
          </div>
          <div className="text-sm text-gray-600 text-center truncate mt-1">
            {stat.title}
          </div>
        </div>
      ))}
    </div>
  );
}

// Table Panel
export interface TableOptions {
  showHeader?: boolean;
  showTypeIcons?: boolean;
  sortBy?: Array<{
    displayName: string;
    desc?: boolean;
  }>;
  footer?: {
    show?: boolean;
    reducer?: string[];
    enablePagination?: boolean;
    countRows?: boolean;
  };
  frameIndex?: number;
  cellHeight?: 'sm' | 'md' | 'lg';
}

export function TablePanel({ data, width, height, options, onOptionsChange }: PanelProps<TableOptions>) {
  const [sortBy, setSortBy] = useState<{ field: string; desc: boolean } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const tableData = useMemo(() => {
    if (!data?.series?.length) return { headers: [], rows: [] };
    
    const series = data.series[options?.frameIndex || 0] || data.series[0];
    const headers = series.fields.map(field => ({
      name: field.state?.displayName || field.name,
      type: field.type,
      fieldName: field.name
    }));
    
    let rows = [];
    for (let i = 0; i < series.length; i++) {
      const row: any = {};
      series.fields.forEach(field => {
        row[field.name] = field.values[i];
      });
      rows.push(row);
    }
    
    // Apply sorting
    if (sortBy) {
      rows.sort((a, b) => {
        const aVal = a[sortBy.field];
        const bVal = b[sortBy.field];
        const compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortBy.desc ? -compare : compare;
      });
    }
    
    return { headers, rows };
  }, [data, options?.frameIndex, sortBy]);

  const paginatedRows = useMemo(() => {
    if (!options?.footer?.enablePagination) return tableData.rows;
    const start = currentPage * pageSize;
    return tableData.rows.slice(start, start + pageSize);
  }, [tableData.rows, currentPage, options?.footer?.enablePagination]);

  const handleSort = useCallback((fieldName: string) => {
    setSortBy(prev => ({
      field: fieldName,
      desc: prev?.field === fieldName ? !prev.desc : false
    }));
  }, []);

  const totalPages = Math.ceil(tableData.rows.length / pageSize);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          {options?.showHeader !== false && (
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {tableData.headers.map((header) => (
                  <th
                    key={header.fieldName}
                    className="px-3 py-2 text-left font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(header.fieldName)}
                  >
                    <div className="flex items-center gap-1">
                      {options?.showTypeIcons && (
                        <span className="text-xs text-gray-500">
                          {getTypeIcon(header.type)}
                        </span>
                      )}
                      <span className="truncate">{header.name}</span>
                      {sortBy?.field === header.fieldName && (
                        <span className="text-xs">
                          {sortBy.desc ? '↓' : '↑'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {paginatedRows.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 border-b border-gray-100">
                {tableData.headers.map((header) => (
                  <td key={header.fieldName} className="px-3 py-2 text-gray-900">
                    {formatCellValue(row[header.fieldName], header.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {options?.footer?.enablePagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, tableData.rows.length)} of {tableData.rows.length} rows
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Previous
            </button>
            <span className="text-xs text-gray-600">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Bar Chart Panel
export interface BarChartOptions {
  orientation?: 'horizontal' | 'vertical';
  xField?: string;
  tooltip?: {
    mode: 'Single' | 'Multi' | 'None';
  };
  legend?: {
    displayMode: 'Table' | 'List' | 'Hidden';
    placement: 'bottom' | 'right' | 'top';
  };
}

export function BarChartPanel({ data, width, height, options }: PanelProps<BarChartOptions>) {
  const chartData = useMemo(() => {
    if (!data?.series?.length) return [];
    
    const series = data.series[0];
    const categoryField = series.fields.find(f => f.type === FieldType.string) || series.fields[0];
    const valueFields = series.fields.filter(f => f.type === FieldType.number);
    
    if (!categoryField || !valueFields.length) return [];
    
    return categoryField.values.map((category, index) => {
      const entry: any = { category };
      valueFields.forEach(field => {
        entry[field.name] = field.values[index];
      });
      return entry;
    });
  }, [data]);

  const valueFields = data?.series?.[0]?.fields?.filter(f => f.type === FieldType.number) || [];

  return (
    <div className="w-full h-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="category" 
            fontSize={12}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            fontSize={12}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
          {valueFields.map((field, index) => (
            <Bar
              key={field.name}
              dataKey={field.name}
              fill={getFieldColor(field, index)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Pie Chart Panel
export interface PieChartOptions {
  reduceOptions?: {
    calcs: string[];
  };
  pieType?: 'pie' | 'donut';
  tooltip?: {
    mode: 'Single' | 'Multi' | 'None';
  };
  legend?: {
    displayMode: 'Table' | 'List' | 'Hidden';
    placement: 'bottom' | 'right' | 'top';
  };
  displayLabels?: string[];
}

export function PieChartPanel({ data, width, height, options }: PanelProps<PieChartOptions>) {
  const chartData = useMemo(() => {
    if (!data?.series?.length) return [];
    
    const series = data.series[0];
    const labelField = series.fields.find(f => f.type === FieldType.string);
    const valueField = series.fields.find(f => f.type === FieldType.number);
    
    if (!labelField || !valueField) return [];
    
    return labelField.values.map((label, index) => ({
      name: label,
      value: valueField.values[index],
      fill: getColorByIndex(index)
    }));
  }, [data]);

  return (
    <div className="w-full h-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={options?.pieType === 'donut' ? 60 : 0}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any, name: string) => [value, name]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Gauge Panel
export interface GaugeOptions {
  reduceOptions?: {
    calcs: string[];
  };
  orientation?: 'auto' | 'horizontal' | 'vertical';
  showThresholdLabels?: boolean;
  showThresholdMarkers?: boolean;
}

export function GaugePanel({ data, width, height, options, fieldConfig }: PanelProps<GaugeOptions>) {
  const gaugeValue = useMemo(() => {
    if (!data?.series?.length) return null;
    
    const valueField = data.series[0].fields.find(f => f.type === FieldType.number);
    if (!valueField || !valueField.values.length) return null;
    
    const value = valueField.values[valueField.values.length - 1];
    const min = fieldConfig?.defaults?.min || valueField.config?.min || 0;
    const max = fieldConfig?.defaults?.max || valueField.config?.max || 100;
    
    return {
      value,
      min,
      max,
      title: valueField.state?.displayName || valueField.name,
      unit: valueField.config?.unit || ''
    };
  }, [data, fieldConfig]);

  if (!gaugeValue) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const percentage = ((gaugeValue.value - gaugeValue.min) / (gaugeValue.max - gaugeValue.min)) * 100;
  const angle = (percentage / 100) * 180;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="relative w-32 h-16 mb-4">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 40 A 30 30 0 0 1 90 40"
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          {/* Value arc */}
          <path
            d="M 10 40 A 30 30 0 0 1 90 40"
            stroke="#3b82f6"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${(angle / 180) * 94.2} 94.2`}
            className="transition-all duration-500"
          />
          {/* Needle */}
          <g transform={`rotate(${angle - 90} 50 40)`}>
            <line
              x1="50"
              y1="40"
              x2="50"
              y2="15"
              stroke="#374151"
              strokeWidth="2"
            />
            <circle cx="50" cy="40" r="3" fill="#374151" />
          </g>
        </svg>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">
          {formatValue(gaugeValue.value)} {gaugeValue.unit}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {gaugeValue.title}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {gaugeValue.min} - {gaugeValue.max}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getFieldColor(field: Field, index: number): string {
  return field.config?.color?.value || getColorByIndex(index);
}

function getColorByIndex(index: number): string {
  const colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
  ];
  return colors[index % colors.length];
}

function formatValue(value: any): string {
  if (typeof value === 'number') {
    return value % 1 === 0 ? value.toString() : value.toFixed(2);
  }
  return String(value);
}

function formatCellValue(value: any, type: FieldType): string {
  if (value == null) return '-';
  
  switch (type) {
    case FieldType.time:
      return new Date(value).toLocaleString();
    case FieldType.number:
      return formatValue(value);
    case FieldType.boolean:
      return value ? 'true' : 'false';
    default:
      return String(value);
  }
}

function getTypeIcon(type: FieldType): string {
  switch (type) {
    case FieldType.time: return '🕐';
    case FieldType.number: return '#';
    case FieldType.string: return 'T';
    case FieldType.boolean: return '✓';
    default: return '?';
  }
}

// Panel Registry
export const PANEL_TYPES = {
  timeseries: {
    id: 'timeseries',
    name: 'Time series',
    component: TimeSeriesPanel,
    description: 'Time series visualization'
  },
  stat: {
    id: 'stat',
    name: 'Stat',
    component: StatPanel,
    description: 'Single stat visualization'
  },
  table: {
    id: 'table',
    name: 'Table',
    component: TablePanel,
    description: 'Data table'
  },
  barchart: {
    id: 'barchart',
    name: 'Bar chart',
    component: BarChartPanel,
    description: 'Bar chart visualization'
  },
  piechart: {
    id: 'piechart', 
    name: 'Pie chart',
    component: PieChartPanel,
    description: 'Pie chart visualization'
  },
  gauge: {
    id: 'gauge',
    name: 'Gauge',
    component: GaugePanel,
    description: 'Gauge visualization'
  },
  nodegraph: {
    id: 'nodegraph',
    name: 'Node Graph',
    component: NodeGraphPanel,
    description: 'Network and process flow visualization'
  },
  geomap: {
    id: 'geomap',
    name: 'Geomap',
    component: GeomapPanel,
    description: 'Geographic map visualization'
  },
  statushistory: {
    id: 'statushistory',
    name: 'Status History',
    component: StatusHistoryPanel,
    description: 'Status timeline showing state changes over time'
  },
  flamegraph: {
    id: 'flamegraph',
    name: 'Flame Graph',
    component: FlameGraphPanel,
    description: 'Hierarchical performance visualization'
  },
  statetimeline: {
    id: 'statetimeline',
    name: 'State Timeline',
    component: StateTimelinePanel,
    description: 'State changes over time with smooth transitions'
  }
} as const;

export type PanelType = keyof typeof PANEL_TYPES;