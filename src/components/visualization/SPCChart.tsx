'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Dot
} from 'recharts';

interface SPCDataPoint {
  sample: number;
  value: number;
  timestamp?: string;
  outOfControl?: boolean;
  note?: string;
}

interface SPCChartProps {
  data: SPCDataPoint[];
  title?: string;
  targetValue?: number;
  upperControlLimit?: number;
  lowerControlLimit?: number;
  upperSpecLimit?: number;
  lowerSpecLimit?: number;
  height?: number;
  showGrid?: boolean;
  unit?: string;
  className?: string;
}

export default function SPCChart({
  data,
  title = 'Statistical Process Control Chart',
  targetValue,
  upperControlLimit,
  lowerControlLimit,
  upperSpecLimit,
  lowerSpecLimit,
  height = 400,
  showGrid = true,
  unit = '',
  className = ''
}: SPCChartProps) {
  // Calculate control limits if not provided
  const calculatedLimits = useMemo(() => {
    if (upperControlLimit && lowerControlLimit) {
      return { ucl: upperControlLimit, lcl: lowerControlLimit, cl: targetValue };
    }

    // Calculate mean and standard deviation
    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      ucl: mean + 3 * stdDev,
      lcl: mean - 3 * stdDev,
      cl: targetValue || mean
    };
  }, [data, upperControlLimit, lowerControlLimit, targetValue]);

  // Identify out-of-control points
  const processedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      outOfControl: point.value > calculatedLimits.ucl || point.value < calculatedLimits.lcl,
      violatesRule: checkViolations(data, point.sample, calculatedLimits)
    }));
  }, [data, calculatedLimits]);

  // Check for Western Electric rules violations
  function checkViolations(data: SPCDataPoint[], currentIndex: number, limits: any): string | null {
    if (currentIndex < 2) return null;

    const recentPoints = data.slice(Math.max(0, currentIndex - 8), currentIndex + 1);
    const values = recentPoints.map(p => p.value);
    
    // Rule 1: One point outside 3-sigma
    if (values[values.length - 1] > limits.ucl || values[values.length - 1] < limits.lcl) {
      return 'Outside control limits';
    }

    // Rule 2: Nine points in a row on same side of center line
    if (values.length >= 9) {
      const lastNine = values.slice(-9);
      if (lastNine.every(v => v > limits.cl) || lastNine.every(v => v < limits.cl)) {
        return '9 points on same side';
      }
    }

    // Rule 3: Six points in a row increasing or decreasing
    if (values.length >= 6) {
      const lastSix = values.slice(-6);
      let increasing = true;
      let decreasing = true;
      for (let i = 1; i < lastSix.length; i++) {
        if (lastSix[i] <= lastSix[i - 1]) increasing = false;
        if (lastSix[i] >= lastSix[i - 1]) decreasing = false;
      }
      if (increasing || decreasing) {
        return '6 points trending';
      }
    }

    return null;
  }

  // Custom dot to highlight out-of-control points
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.outOfControl || payload.violatesRule) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="#ef4444"
          stroke="#fff"
          strokeWidth={2}
        />
      );
    }
    return null;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-semibold text-gray-700">Sample {data.sample}</p>
          {data.timestamp && (
            <p className="text-xs text-gray-600">{data.timestamp}</p>
          )}
          <div className="mt-2 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-sm">Value:</span>
              <span className="text-sm font-medium">
                {data.value.toFixed(3)} {unit}
              </span>
            </div>
            {data.violatesRule && (
              <div className="text-xs text-red-600 font-medium">
                {data.violatesRule}
              </div>
            )}
            {data.note && (
              <div className="text-xs text-gray-600 italic">
                {data.note}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
        <div className="flex gap-4 mt-2 text-sm">
          <span className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-green-500"></div>
            <span>Target</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-yellow-500"></div>
            <span>Control Limits</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <span>Spec Limits</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={processedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          )}
          
          <XAxis
            dataKey="sample"
            tick={{ fontSize: 12 }}
            label={{
              value: 'Sample Number',
              position: 'insideBottom',
              offset: -5,
              style: { fontSize: 14 }
            }}
          />
          
          <YAxis
            tick={{ fontSize: 12 }}
            label={{
              value: `Measurement ${unit ? `(${unit})` : ''}`,
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 14 }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Specification limits (if provided) */}
          {upperSpecLimit && (
            <ReferenceLine
              y={upperSpecLimit}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: 'USL', position: 'right' }}
            />
          )}
          {lowerSpecLimit && (
            <ReferenceLine
              y={lowerSpecLimit}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: 'LSL', position: 'right' }}
            />
          )}
          
          {/* Control limits */}
          <ReferenceLine
            y={calculatedLimits.ucl}
            stroke="#eab308"
            strokeDasharray="3 3"
            label={{ value: 'UCL', position: 'right' }}
          />
          <ReferenceLine
            y={calculatedLimits.lcl}
            stroke="#eab308"
            strokeDasharray="3 3"
            label={{ value: 'LCL', position: 'right' }}
          />
          
          {/* Center line */}
          <ReferenceLine
            y={calculatedLimits.cl}
            stroke="#10b981"
            strokeWidth={2}
            label={{ value: 'CL', position: 'right' }}
          />
          
          {/* Data line */}
          <Line
            type="linear"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={<CustomDot />}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Statistics summary */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Mean</div>
          <div className="text-lg font-semibold">
            {calculatedLimits.cl.toFixed(3)} {unit}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">UCL</div>
          <div className="text-lg font-semibold">
            {calculatedLimits.ucl.toFixed(3)} {unit}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">LCL</div>
          <div className="text-lg font-semibold">
            {calculatedLimits.lcl.toFixed(3)} {unit}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Out of Control</div>
          <div className="text-lg font-semibold text-red-600">
            {processedData.filter(p => p.outOfControl || p.violatesRule).length}
          </div>
        </div>
      </div>
    </div>
  );
}