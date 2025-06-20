'use client';

import React, { useState } from 'react';
import { LineChart, BarChart3, Table, AreaChart, PieChart, Activity } from 'lucide-react';
import { DataFrame } from '@/types/datasource';
import { TimeRange } from '@/types/dashboard';
import dynamic from 'next/dynamic';

// Dynamic imports for chart components
const TimeSeriesChart = dynamic(() => import('@/components/charts/ManufacturingCharts').then(mod => mod.TimeSeriesChart), { ssr: false });
const TablePanel = dynamic(() => import('@/components/charts/ManufacturingCharts').then(mod => mod.TablePanel), { ssr: false });

interface ExploreVisualizationProps {
  data?: DataFrame[];
  loading?: boolean;
  error?: string | null;
  visualizationType?: 'table' | 'timeseries' | 'logs' | 'raw';
  timeRange?: TimeRange;
  onRunQuery?: () => void;
  className?: string;
}

const ExploreVisualization: React.FC<ExploreVisualizationProps> = ({
  data,
  loading,
  error,
  visualizationType,
  timeRange,
  onRunQuery,
  className = ''
}) => {

  // Convert DataFrame to format expected by charts
  const convertDataFrameToChartData = (frames: DataFrame[]) => {
    if (!frames || frames.length === 0) return [];
    
    const frame = frames[0];
    const data = [];
    
    for (let i = 0; i < frame.length; i++) {
      const row: any = {};
      frame.fields.forEach(field => {
        row[field.name] = field.values[i];
      });
      data.push(row);
    }
    
    return data;
  };

  // Convert DataFrame to table format
  const convertDataFrameToTableData = (frames: DataFrame[]) => {
    if (!frames || frames.length === 0) return [];
    
    const frame = frames[0];
    const tableData = [];
    
    for (let i = 0; i < frame.length; i++) {
      const row: any = {};
      frame.fields.forEach(field => {
        row[field.name] = field.values[i];
      });
      tableData.push(row);
    }
    
    return tableData;
  };

  // Sample data for demonstration
  const sampleTimeSeriesData = [
    { time: '00:00', value: 42, metric: 'Temperature' },
    { time: '01:00', value: 45, metric: 'Temperature' },
    { time: '02:00', value: 43, metric: 'Temperature' },
    { time: '03:00', value: 48, metric: 'Temperature' },
    { time: '04:00', value: 52, metric: 'Temperature' },
    { time: '05:00', value: 49, metric: 'Temperature' },
    { time: '06:00', value: 51, metric: 'Temperature' },
    { time: '07:00', value: 55, metric: 'Temperature' },
    { time: '08:00', value: 58, metric: 'Temperature' },
    { time: '09:00', value: 62, metric: 'Temperature' },
    { time: '10:00', value: 65, metric: 'Temperature' },
    { time: '11:00', value: 63, metric: 'Temperature' }
  ];

  const sampleTableData = [
    { timestamp: '2024-01-20 10:00', equipment: 'CNC-01', temperature: 65, pressure: 120, status: 'Normal' },
    { timestamp: '2024-01-20 10:05', equipment: 'CNC-01', temperature: 66, pressure: 122, status: 'Normal' },
    { timestamp: '2024-01-20 10:10', equipment: 'CNC-01', temperature: 68, pressure: 125, status: 'Warning' },
    { timestamp: '2024-01-20 10:15', equipment: 'CNC-01', temperature: 70, pressure: 128, status: 'Warning' },
    { timestamp: '2024-01-20 10:20', equipment: 'CNC-01', temperature: 67, pressure: 123, status: 'Normal' }
  ];

  const renderVisualization = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading data...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-700 font-medium">Query Error</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
            <button
              onClick={onRunQuery}
              className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
            >
              Retry Query
            </button>
          </div>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center">
            <p className="text-gray-500">No data to display</p>
            <button
              onClick={onRunQuery}
              className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
            >
              Run Query
            </button>
          </div>
        </div>
      );
    }

    switch (visualizationType) {
      case 'timeseries':
        const chartData = convertDataFrameToChartData(data);
        return (
          <div className="h-full p-4">
            <TimeSeriesChart data={chartData.length > 0 ? chartData : sampleTimeSeriesData} lines={['value']} />
          </div>
        );
      
      case 'table':
        const tableData = convertDataFrameToTableData(data);
        return (
          <div className="p-4 overflow-auto h-full">
            <TablePanel data={tableData.length > 0 ? tableData : sampleTableData} />
          </div>
        );
      
      case 'logs':
        return (
          <div className="p-4 h-full overflow-auto">
            <div className="font-mono text-xs space-y-1">
              {data[0] && data[0].fields[0] && data[0].fields[0].values.map((log: any, idx: number) => (
                <div key={idx} className="p-2 bg-gray-50 rounded hover:bg-gray-100">
                  {typeof log === 'object' ? JSON.stringify(log) : log}
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'raw':
        return (
          <div className="p-4 h-full overflow-auto">
            <pre className="text-xs bg-gray-50 p-4 rounded">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        );
      
      default:
        return (
          <div className="p-4 text-center text-gray-500">
            Visualization type not supported: {visualizationType}
          </div>
        );
    }
  };

  return (
    <div className={`h-full flex flex-col bg-white ${className}`}>
      {/* Visualization Content */}
      <div className="flex-1 overflow-hidden">
        {renderVisualization()}
      </div>

      {/* Data Info */}
      {!loading && !error && data && data.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {data[0] && `${data[0].length} rows`}
            </span>
            <span>
              Time range: {timeRange.from} to {timeRange.to}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExploreVisualization;