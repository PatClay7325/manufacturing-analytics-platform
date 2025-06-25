/**
 * Line Chart with Reference Lines Panel
 * Perfect for manufacturing process control with control limits and target lines
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from 'recharts';

export interface LineDataPoint {
  timestamp: string;
  value: number;
  category?: string;
  [key: string]: any;
}

export interface ReferenceLineConfig {
  value: number;
  label: string;
  color: string;
  strokeDasharray?: string;
  strokeWidth?: number;
}

export interface ReferenceAreaConfig {
  y1: number;
  y2: number;
  label?: string;
  fill: string;
  fillOpacity?: number;
}

export interface LineChartWithReferenceLinesOptions {
  title?: string;
  lineColor?: string;
  gridColor?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  referenceLines?: ReferenceLineConfig[];
  referenceAreas?: ReferenceAreaConfig[];
  valueUnit?: string;
  formatValue?: (value: number) => string;
  strokeWidth?: number;
  dot?: boolean;
}

export interface LineChartWithReferenceLinesProps {
  data: LineDataPoint[];
  options?: LineChartWithReferenceLinesOptions;
  width?: number;
  height?: number;
  loading?: boolean;
}

export const LineChartWithReferenceLines: React.FC<LineChartWithReferenceLinesProps> = ({
  data = [],
  options = {},
  width,
  height = 400,
  loading = false
}) => {
  const {
    title = 'Process Control Chart',
    lineColor = '#8884d8',
    gridColor = '#e0e0e0',
    backgroundColor = 'transparent',
    showGrid = true,
    showLegend = true,
    referenceLines = [],
    referenceAreas = [],
    valueUnit = '',
    formatValue = (value: number) => value.toFixed(2),
    strokeWidth = 2,
    dot = false
  } = options;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800">{`Time: ${label}`}</p>
          <p className="text-blue-600">
            {`Value: ${formatValue(data.value)}${valueUnit}`}
          </p>
          {data.category && (
            <p className="text-gray-600">{`Category: ${data.category}`}</p>
          )}
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
        <div className="text-gray-500">Loading chart...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width, height, backgroundColor }}
      >
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div style={{ width, height, backgroundColor }}>
      {title && (
        <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          )}
          
          <XAxis dataKey="timestamp" />
          <YAxis tickFormatter={formatValue} />
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && <Legend />}
          
          {/* Reference Areas (behind everything) */}
          {referenceAreas.map((area, index) => (
            <ReferenceArea
              key={`area-${index}`}
              y1={area.y1}
              y2={area.y2}
              fill={area.fill}
              fillOpacity={area.fillOpacity || 0.1}
              label={area.label}
            />
          ))}
          
          {/* Reference Lines */}
          {referenceLines.map((line, index) => (
            <ReferenceLine
              key={`line-${index}`}
              y={line.value}
              stroke={line.color}
              strokeDasharray={line.strokeDasharray || "5 5"}
              strokeWidth={line.strokeWidth || 2}
              label={{
                value: line.label,
                position: "right"
              }}
            />
          ))}
          
          {/* Main data line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            dot={dot}
            name={`Value${valueUnit ? ` (${valueUnit})` : ''}`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Manufacturing control limits presets
export const manufacturingControlLimits = {
  temperature: {
    referenceLines: [
      { value: 90, label: 'UCL', color: '#ff4444', strokeDasharray: "5 5" },
      { value: 85, label: 'Target', color: '#00aa00', strokeDasharray: "10 5" },
      { value: 80, label: 'LCL', color: '#ff4444', strokeDasharray: "5 5" }
    ],
    referenceAreas: [
      { y1: 82, y2: 88, fill: '#00aa00', fillOpacity: 0.1, label: 'Normal Range' }
    ]
  },
  
  pressure: {
    referenceLines: [
      { value: 2.8, label: 'Max', color: '#ff0000' },
      { value: 2.5, label: 'Target', color: '#00aa00' },
      { value: 2.2, label: 'Min', color: '#ff0000' }
    ],
    referenceAreas: [
      { y1: 2.3, y2: 2.7, fill: '#00aa00', fillOpacity: 0.1 }
    ]
  }
};

export default LineChartWithReferenceLines;