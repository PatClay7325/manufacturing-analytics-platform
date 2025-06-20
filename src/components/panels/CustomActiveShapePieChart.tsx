/**
 * Custom Active Shape Pie Chart Panel
 * Interactive pie chart with custom active slice styling - perfect for equipment status breakdown
 */

import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

export interface PieDataPoint {
  name: string;
  value: number;
  color?: string;
  description?: string;
}

export interface CustomActiveShapePieChartOptions {
  title?: string;
  backgroundColor?: string;
  showLegend?: boolean;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  activeOuterRadius?: number;
  valueUnit?: string;
  formatValue?: (value: number) => string;
  formatPercent?: (value: number, total: number) => string;
}

export interface CustomActiveShapePieChartProps {
  data: PieDataPoint[];
  options?: CustomActiveShapePieChartOptions;
  width?: number;
  height?: number;
  loading?: boolean;
}

// Custom active shape component
const renderActiveShape = (props: any, options: CustomActiveShapePieChartOptions) => {
  const {
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;

  const {
    activeOuterRadius = outerRadius + 10,
    formatValue = (v: number) => v.toLocaleString(),
    formatPercent = (v: number, total: number) => `${((v / total) * 100).toFixed(1)}%`,
    valueUnit = ''
  } = options;

  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (activeOuterRadius + 10) * cos;
  const sy = cy + (activeOuterRadius + 10) * sin;
  const mx = cx + (activeOuterRadius + 30) * cos;
  const my = cy + (activeOuterRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      {/* Active slice with expanded radius */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={activeOuterRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
      />
      
      {/* Connector line */}
      <path 
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} 
        stroke={fill} 
        fill="none"
        strokeWidth={2}
      />
      
      {/* Label background */}
      <rect
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey - 20}
        width={120}
        height={40}
        fill="rgba(255,255,255,0.9)"
        stroke={fill}
        strokeWidth={1}
        rx={4}
      />
      
      {/* Category name */}
      <text 
        x={ex + (cos >= 0 ? 1 : -1) * 12} 
        y={ey - 8} 
        textAnchor={textAnchor} 
        fill="#333"
        fontSize="12"
        fontWeight="bold"
      >
        {payload.name}
      </text>
      
      {/* Value and percentage */}
      <text 
        x={ex + (cos >= 0 ? 1 : -1) * 12} 
        y={ey + 6} 
        textAnchor={textAnchor} 
        fill="#666"
        fontSize="11"
      >
        {`${formatValue(value)}${valueUnit} (${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

// Custom sector component for active shape
const Sector = ({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, stroke, strokeWidth }: any) => {
  const path = describeArc(cx, cy, innerRadius, outerRadius, startAngle, endAngle);
  return <path d={path} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
};

// Helper function to create SVG arc path
const describeArc = (x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, outerRadius, endAngle);
  const end = polarToCartesian(x, y, outerRadius, startAngle);
  const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
  const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);
  
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  
  const d = [
    "M", start.x, start.y, 
    "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
    "L", innerEnd.x, innerEnd.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
    "Z"
  ].join(" ");
  
  return d;
};

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

export const CustomActiveShapePieChart: React.FC<CustomActiveShapePieChartProps> = ({
  data = [],
  options = {},
  width,
  height = 400,
  loading = false
}) => {
  const {
    title = 'Interactive Pie Chart',
    backgroundColor = 'transparent',
    showLegend = true,
    colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'],
    innerRadius = 40,
    outerRadius = 80,
    activeOuterRadius = 90,
    valueUnit = '',
    formatValue = (value: number) => value.toLocaleString(),
    formatPercent = (value: number, total: number) => `${((value / total) * 100).toFixed(1)}%`
  } = options;

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Calculate total for percentage calculations
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Process data with colors
  const processedData = data.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length]
  }));

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800" style={{ color: data.color }}>
            {data.name}
          </p>
          <p className="text-gray-700">
            {`Value: ${formatValue(data.value)}${valueUnit}`}
          </p>
          <p className="text-gray-600">
            {`Percentage: ${formatPercent(data.value, total)}`}
          </p>
          {data.description && (
            <p className="text-gray-500 text-sm mt-1">{data.description}</p>
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
        <div className="text-gray-500">Loading pie chart...</div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
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
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={(props: any) => renderActiveShape(props, options)}
            data={processedData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
      
      {/* Summary stats */}
      <div className="mt-2 text-center text-sm text-gray-600">
        <span>Total: {formatValue(total)}{valueUnit}</span>
        {activeIndex !== null && (
          <span className="ml-4">
            Selected: {processedData[activeIndex].name} - {formatPercent(processedData[activeIndex].value, total)}
          </span>
        )}
      </div>
    </div>
  );
};

// Manufacturing equipment status preset
export const equipmentStatusData: PieDataPoint[] = [
  { name: 'Running', value: 45, color: '#4caf50', description: 'Equipment operating normally' },
  { name: 'Idle', value: 20, color: '#ff9800', description: 'Equipment ready but not running' },
  { name: 'Maintenance', value: 15, color: '#2196f3', description: 'Scheduled maintenance' },
  { name: 'Down', value: 12, color: '#f44336', description: 'Equipment failure' },
  { name: 'Setup', value: 8, color: '#9c27b0', description: 'Changeover in progress' }
];

// Quality distribution preset
export const qualityDistributionData: PieDataPoint[] = [
  { name: 'Good Parts', value: 850, color: '#4caf50', description: 'Parts meeting all specifications' },
  { name: 'Minor Defects', value: 120, color: '#ff9800', description: 'Parts with minor issues' },
  { name: 'Major Defects', value: 25, color: '#f44336', description: 'Parts requiring rework' },
  { name: 'Scrap', value: 5, color: '#9e9e9e', description: 'Parts beyond repair' }
];

export default CustomActiveShapePieChart;