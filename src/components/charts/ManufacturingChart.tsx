'use client';

import React from 'react';
import { TimeSeriesChart, GaugeChart, BarGaugePanel, PieChart } from './ManufacturingCharts';

interface ManufacturingChartProps {
  visualization: {
    chartType: string;
    title: string;
    description?: string;
    data: any[];
    config?: {
      xAxisKey?: string;
      yAxisKey?: string;
      height?: number;
      [key: string]: any;
    };
  };
}

export default function ManufacturingChart({ visualization }: ManufacturingChartProps) {
  const { chartType, title, description, data, config = {} } = visualization;
  const { height = 300 } = config;

  const renderChart = () => {
    switch (chartType) {
      case 'line_chart':
      case 'timeseries':
        return <TimeSeriesChart data={data} height={height} />;
      
      case 'gauge_chart':
      case 'gauge':
        const gaugeValue = data[0]?.value || 0;
        return <GaugeChart value={gaugeValue} title={title} height={height} />;
      
      case 'bar_gauge':
        return <BarGaugePanel data={data} title={title} height={height} />;
      
      case 'pie_chart':
      case 'pareto_chart':
        return <PieChart data={data} height={height} />;
      
      default:
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-gray-500 dark:text-gray-400">
              Unsupported chart type: {chartType}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {renderChart()}
    </div>
  );
}