/**
 * Pareto Chart Panel - 80/20 Analysis Visualization
 * Combines bar chart for frequency and line chart for cumulative percentage
 * Perfect for quality analysis, defect analysis, and root cause prioritization
 */

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

export interface ParetoDataPoint {
  category: string;
  value: number;
  cumulative?: number;
  percentage?: number;
}

export interface ParetoChartOptions {
  title?: string;
  barColor?: string;
  lineColor?: string;
  gridColor?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  show80Line?: boolean;
  valueUnit?: string;
  formatValue?: (value: number) => string;
  formatPercentage?: (value: number) => string;
  sortDescending?: boolean;
}

export interface ParetoChartPanelProps {
  data: ParetoDataPoint[];
  options?: ParetoChartOptions;
  width?: number;
  height?: number;
  loading?: boolean;
}

export const ParetoChartPanel: React.FC<ParetoChartPanelProps> = ({
  data = [],
  options = {},
  width,
  height = 400,
  loading = false
}) => {
  const {
    title = 'Pareto Analysis',
    barColor = '#8884d8',
    lineColor = '#ff7300',
    gridColor = '#e0e0e0',
    backgroundColor = 'transparent',
    showGrid = true,
    showLegend = true,
    show80Line = true,
    valueUnit = '',
    formatValue = (value: number) => value.toLocaleString(),
    formatPercentage = (value: number) => `${value.toFixed(1)}%`,
    sortDescending = true
  } = options;

  // Process data for Pareto analysis
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Sort data by value (descending for traditional Pareto)
    const sortedData = [...data].sort((a, b) => 
      sortDescending ? b.value - a.value : a.value - b.value
    );

    // Calculate total for percentage calculations
    const total = sortedData.reduce((sum, item) => sum + item.value, 0);

    // Calculate cumulative values and percentages
    let cumulativeValue = 0;
    return sortedData.map((item, index) => {
      cumulativeValue += item.value;
      const percentage = (item.value / total) * 100;
      const cumulativePercentage = (cumulativeValue / total) * 100;

      return {
        ...item,
        percentage,
        cumulative: cumulativePercentage,
        cumulativeValue
      };
    });
  }, [data, sortDescending]);

  // Custom tooltip for better data display
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800">{`Category: ${label}`}</p>
          <p className="text-blue-600">
            {`Value: ${formatValue(data.value)}${valueUnit}`}
          </p>
          <p className="text-orange-600">
            {`Cumulative: ${formatPercentage(data.cumulative)}`}
          </p>
          <p className="text-gray-600">
            {`Individual: ${formatPercentage(data.percentage)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width, height, backgroundColor }}
      >
        <div className="text-gray-500">Loading Pareto chart...</div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width, height, backgroundColor }}
      >
        <div className="text-gray-500">No data available for Pareto analysis</div>
      </div>
    );
  }

  return (
    <div style={{ width, height, backgroundColor }}>
      {title && (
        <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart
          data={processedData}
          margin={{
            top: 20,
            right: 30,
            bottom: 20,
            left: 20,
          }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          )}
          
          <XAxis 
            dataKey="category" 
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && (
            <Legend />
          )}
          
          {/* 80% reference line for Pareto principle */}
          {show80Line && (
            <ReferenceLine 
              yAxisId="right" 
              y={80} 
              stroke="#ff4444" 
              strokeDasharray="5 5"
              label={{ value: "80%", position: "right" }}
            />
          )}
          
          {/* Bar chart for values */}
          <Bar
            yAxisId="left"
            dataKey="value"
            fill={barColor}
            name={`Value${valueUnit ? ` (${valueUnit})` : ''}`}
            radius={[2, 2, 0, 0]}
          />
          
          {/* Line chart for cumulative percentage */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            stroke={lineColor}
            strokeWidth={3}
            dot={{ fill: lineColor, strokeWidth: 2, r: 4 }}
            name="Cumulative %"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Manufacturing-specific Pareto analysis configurations
export const manufacturingParetoConfigs = {
  defectAnalysis: {
    title: 'Defect Analysis (Pareto)',
    barColor: '#ff6b6b',
    lineColor: '#4ecdc4',
    valueUnit: ' defects',
    show80Line: true
  },
  
  downtimeAnalysis: {
    title: 'Downtime Root Causes',
    barColor: '#ffa726',
    lineColor: '#66bb6a',
    valueUnit: ' hours',
    show80Line: true
  },
  
  costAnalysis: {
    title: 'Cost Drivers Analysis',
    barColor: '#ab47bc',
    lineColor: '#26c6da',
    valueUnit: '$',
    formatValue: (value: number) => `$${value.toLocaleString()}`,
    show80Line: true
  },
  
  customerComplaints: {
    title: 'Customer Complaint Categories',
    barColor: '#ef5350',
    lineColor: '#42a5f5',
    valueUnit: ' complaints',
    show80Line: true
  }
};

// Sample data generator for testing
export const generateSampleParetoData = (type: 'defects' | 'downtime' | 'costs' = 'defects'): ParetoDataPoint[] => {
  const defectData = [
    { category: 'Scratches', value: 145 },
    { category: 'Dents', value: 87 },
    { category: 'Color Mismatch', value: 56 },
    { category: 'Dimensional', value: 34 },
    { category: 'Surface Finish', value: 23 },
    { category: 'Assembly', value: 18 },
    { category: 'Packaging', value: 12 },
    { category: 'Other', value: 8 }
  ];

  const downtimeData = [
    { category: 'Machine Breakdown', value: 24.5 },
    { category: 'Setup/Changeover', value: 18.2 },
    { category: 'Material Shortage', value: 12.8 },
    { category: 'Quality Issues', value: 9.4 },
    { category: 'Maintenance', value: 7.6 },
    { category: 'Operator Break', value: 5.3 },
    { category: 'Power Outage', value: 3.1 },
    { category: 'Other', value: 2.8 }
  ];

  const costData = [
    { category: 'Raw Materials', value: 156000 },
    { category: 'Labor', value: 89000 },
    { category: 'Energy', value: 34000 },
    { category: 'Maintenance', value: 23000 },
    { category: 'Quality Costs', value: 18000 },
    { category: 'Packaging', value: 12000 },
    { category: 'Transportation', value: 8000 },
    { category: 'Other', value: 5000 }
  ];

  switch (type) {
    case 'downtime': return downtimeData;
    case 'costs': return costData;
    default: return defectData;
  }
};

export default ParetoChartPanel;