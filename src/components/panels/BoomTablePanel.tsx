/**
 * Boom Table Panel - Grafana-compatible advanced table with patterns
 * Supports regex patterns, value mapping, and sparklines
 * Popular for creating custom formatted tables with colors and icons
 */

import React, { useMemo } from 'react';
import { PanelProps, LoadingState } from '@/core/plugins/types';
import { Table2, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement);

export interface BoomTablePanelOptions {
  patterns: Array<{
    pattern: string;
    delimiter?: string;
    valueName?: string;
    row_col_wrapper?: string;
    thresholds?: string;
    enable_bgColor?: boolean;
    bgColors?: string;
    enable_transform?: boolean;
    transform_values?: string;
    enable_time_based_thresholds?: boolean;
    null_color?: string;
    null_value?: string;
  }>;
  defaultPattern?: {
    delimiter: string;
    valueName: string;
    row_col_wrapper?: string;
  };
  row_col_wrapper?: string;
  non_matching_cells?: {
    color: string;
    text: string;
  };
  hide_headers?: boolean;
  hide_first_column?: boolean;
  text_size_header?: string;
  text_size_data?: string;
}

interface ProcessedRow {
  values: Array<{
    raw: any;
    formatted: string;
    color?: string;
    bgColor?: string;
    trend?: number[];
    icon?: React.ReactNode;
  }>;
}

const BoomTablePanel: React.FC<PanelProps<BoomTablePanelOptions>> = ({
  data,
  options,
  width,
  height,
}) => {
  const processedData = useMemo(() => {
    if (!data.series || data.series.length === 0) return { headers: [], rows: [] };

    const frame = data.series[0];
    const headers = frame.fields.map(field => field.name);
    const rows: ProcessedRow[] = [];

    // Process each row
    for (let i = 0; i < frame.length; i++) {
      const row: ProcessedRow = { values: [] };

      frame.fields.forEach((field, fieldIndex) => {
        const rawValue = field.values.get(i);
        let formatted = String(rawValue ?? '');
        let color: string | undefined;
        let bgColor: string | undefined;
        let icon: React.ReactNode | undefined;

        // Apply patterns
        const matchingPattern = options.patterns?.find(pattern => {
          const regex = new RegExp(pattern.pattern);
          return regex.test(field.name) || regex.test(formatted);
        });

        if (matchingPattern) {
          // Apply value transformations
          if (matchingPattern.enable_transform && matchingPattern.transform_values) {
            const transforms = matchingPattern.transform_values.split('|');
            transforms.forEach(transform => {
              const [match, replace] = transform.split('->');
              if (formatted.includes(match)) {
                formatted = formatted.replace(match, replace);
              }
            });
          }

          // Apply thresholds for colors
          if (matchingPattern.thresholds && typeof rawValue === 'number') {
            const thresholds = matchingPattern.thresholds.split(',').map(Number);
            const colors = matchingPattern.bgColors?.split(',') || ['#10b981', '#f59e0b', '#ef4444'];
            
            if (rawValue >= thresholds[1]) {
              bgColor = colors[2] || '#ef4444';
            } else if (rawValue >= thresholds[0]) {
              bgColor = colors[1] || '#f59e0b';
            } else {
              bgColor = colors[0] || '#10b981';
            }

            if (matchingPattern.enable_bgColor) {
              color = '#ffffff'; // White text on colored background
            }
          }

          // Handle null values
          if (rawValue === null || rawValue === undefined) {
            formatted = matchingPattern.null_value || 'N/A';
            bgColor = matchingPattern.null_color || '#6b7280';
          }
        }

        // Add trend indicator for numeric values
        if (typeof rawValue === 'number' && i > 0) {
          const prevValue = field.values.get(i - 1);
          if (typeof prevValue === 'number') {
            if (rawValue > prevValue) {
              icon = <TrendingUp className="h-3 w-3 text-green-500 inline ml-1" />;
            } else if (rawValue < prevValue) {
              icon = <TrendingDown className="h-3 w-3 text-red-500 inline ml-1" />;
            } else {
              icon = <Minus className="h-3 w-3 text-gray-500 inline ml-1" />;
            }
          }
        }

        // Generate sparkline data for numeric series
        let trend: number[] | undefined;
        if (field.type === 'number' && frame.length > 1) {
          trend = [];
          for (let j = Math.max(0, i - 10); j <= i; j++) {
            const val = field.values.get(j);
            if (typeof val === 'number') {
              trend.push(val);
            }
          }
        }

        row.values.push({
          raw: rawValue,
          formatted,
          color,
          bgColor,
          trend,
          icon,
        });
      });

      rows.push(row);
    }

    // Apply non-matching cell formatting
    if (options.non_matching_cells) {
      rows.forEach(row => {
        row.values.forEach(cell => {
          if (!cell.bgColor && !cell.color) {
            cell.formatted = options.non_matching_cells!.text || cell.formatted;
            cell.bgColor = options.non_matching_cells!.color;
          }
        });
      });
    }

    return { headers, rows };
  }, [data.series, options]);

  const renderSparkline = (data: number[]) => {
    const chartData = {
      labels: data.map((_, i) => i),
      datasets: [
        {
          data,
          borderColor: '#3b82f6',
          borderWidth: 1,
          fill: false,
          pointRadius: 0,
          tension: 0.4,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: { display: false },
        y: { display: false },
      },
    };

    return (
      <div className="inline-block w-16 h-4 ml-2">
        <Line data={chartData} options={chartOptions} />
      </div>
    );
  };

  if (data.state === LoadingState.Loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (processedData.rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Table2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No data available</p>
        </div>
      </div>
    );
  }

  const headerTextSize = options.text_size_header || 'text-sm';
  const dataTextSize = options.text_size_data || 'text-sm';

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse">
        {!options.hide_headers && (
          <thead>
            <tr>
              {processedData.headers.map((header, index) => {
                if (options.hide_first_column && index === 0) return null;
                return (
                  <th
                    key={index}
                    className={cn(
                      "text-left p-2 border-b font-semibold",
                      headerTextSize
                    )}
                  >
                    {header}
                  </th>
                );
              })}
            </tr>
          </thead>
        )}
        <tbody>
          {processedData.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-accent/50 transition-colors">
              {row.values.map((cell, cellIndex) => {
                if (options.hide_first_column && cellIndex === 0) return null;
                
                return (
                  <td
                    key={cellIndex}
                    className={cn(
                      "p-2 border-b",
                      dataTextSize,
                      options.row_col_wrapper
                    )}
                    style={{
                      color: cell.color,
                      backgroundColor: cell.bgColor,
                    }}
                  >
                    <div className="flex items-center">
                      <span dangerouslySetInnerHTML={{ 
                        __html: cell.formatted.replace(/\n/g, '<br/>') 
                      }} />
                      {cell.icon}
                      {cell.trend && cell.trend.length > 1 && renderSparkline(cell.trend)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pattern guide */}
      {options.patterns && options.patterns.length > 0 && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-xs font-medium mb-2">Active Patterns</div>
          <div className="space-y-1">
            {options.patterns.map((pattern, index) => (
              <div key={index} className="text-xs text-muted-foreground">
                Pattern: <code className="bg-background px-1 rounded">{pattern.pattern}</code>
                {pattern.thresholds && (
                  <span className="ml-2">Thresholds: {pattern.thresholds}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoomTablePanel;