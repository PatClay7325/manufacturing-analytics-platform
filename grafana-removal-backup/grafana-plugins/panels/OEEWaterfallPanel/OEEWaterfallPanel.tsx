// OEE Waterfall Panel Component - Apache 2.0 License
// React component for OEE waterfall visualization

import React, { useMemo } from 'react';
import { PanelProps } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { OEEWaterfallOptions, OEEData, WaterfallDataPoint, DEFAULT_OPTIONS } from './types';

interface Props extends PanelProps<OEEWaterfallOptions> {}

export const OEEWaterfallPanel: React.FC<Props> = ({ options, data, width, height }) => {
  const theme = useTheme2();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Process the data to calculate OEE components
  const oeeData = useMemo(() => {
    if (!data.series.length) {
      return null;
    }

    const series = data.series[0];
    if (!series.fields.length) {
      return null;
    }

    // Extract OEE components from the data
    // Assuming the data has fields: availability, performance, quality
    const availabilityField = series.fields.find(f => f.name.toLowerCase().includes('availability'));
    const performanceField = series.fields.find(f => f.name.toLowerCase().includes('performance'));
    const qualityField = series.fields.find(f => f.name.toLowerCase().includes('quality'));

    if (!availabilityField || !performanceField || !qualityField) {
      return null;
    }

    // Get the latest values
    const availability = availabilityField.values.get(availabilityField.values.length - 1) || 0;
    const performance = performanceField.values.get(performanceField.values.length - 1) || 0;
    const quality = qualityField.values.get(qualityField.values.length - 1) || 0;

    // Calculate OEE
    const oee = (availability * performance * quality) / 10000; // Convert from percentages

    return {
      availability,
      performance,
      quality,
      oee,
      timestamp: new Date().toISOString(),
      equipmentId: mergedOptions.equipmentId,
    } as OEEData;
  }, [data, mergedOptions.equipmentId]);

  // Create waterfall data points
  const waterfallData = useMemo((): WaterfallDataPoint[] => {
    if (!oeeData) {
      return [];
    }

    const lossAvailability = mergedOptions.targetAvailability - oeeData.availability;
    const lossPerformance = mergedOptions.targetPerformance - oeeData.performance;
    const lossQuality = mergedOptions.targetQuality - oeeData.quality;

    return [
      {
        category: 'Target OEE',
        value: mergedOptions.targetOEE,
        cumulative: mergedOptions.targetOEE,
        color: theme.colors.text.secondary,
        target: mergedOptions.targetOEE,
      },
      {
        category: 'Availability Loss',
        value: -lossAvailability,
        cumulative: mergedOptions.targetOEE - lossAvailability,
        color: mergedOptions.colors.availability,
      },
      {
        category: 'Performance Loss',
        value: -lossPerformance,
        cumulative: mergedOptions.targetOEE - lossAvailability - lossPerformance,
        color: mergedOptions.colors.performance,
      },
      {
        category: 'Quality Loss',
        value: -lossQuality,
        cumulative: mergedOptions.targetOEE - lossAvailability - lossPerformance - lossQuality,
        color: mergedOptions.colors.quality,
      },
      {
        category: 'Actual OEE',
        value: oeeData.oee,
        cumulative: oeeData.oee,
        color: mergedOptions.colors.oee,
        target: mergedOptions.targetOEE,
      },
    ];
  }, [oeeData, mergedOptions, theme]);

  // Calculate chart dimensions
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate scales
  const maxValue = Math.max(mergedOptions.targetOEE, ...waterfallData.map(d => Math.abs(d.cumulative)));
  const yScale = (value: number) => chartHeight - (value / maxValue) * chartHeight;
  const xScale = (index: number) => (index * chartWidth) / waterfallData.length;
  const barWidth = chartWidth / waterfallData.length * 0.8;

  if (!oeeData) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: theme.colors.text.secondary,
        }}
      >
        No OEE data available. Please check your data source configuration.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', padding: '10px' }}>
      <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
        OEE Waterfall Analysis - {mergedOptions.equipmentId || 'All Equipment'}
      </div>
      
      <svg width={width} height={height - 30}>
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(value => (
            <g key={value}>
              <line
                x1={0}
                y1={yScale(value)}
                x2={chartWidth}
                y2={yScale(value)}
                stroke={theme.colors.border.weak}
                strokeDasharray="2,2"
              />
              <text
                x={-10}
                y={yScale(value) + 4}
                textAnchor="end"
                fontSize="10"
                fill={theme.colors.text.secondary}
              >
                {value}%
              </text>
            </g>
          ))}

          {/* Target line */}
          {mergedOptions.showTargetLine && (
            <line
              x1={0}
              y1={yScale(mergedOptions.targetOEE)}
              x2={chartWidth}
              y2={yScale(mergedOptions.targetOEE)}
              stroke={theme.colors.warning.main}
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          )}

          {/* Waterfall bars */}
          {waterfallData.map((point, index) => {
            const x = xScale(index) + barWidth * 0.1;
            const barHeight = Math.abs(point.value / maxValue) * chartHeight;
            const y = point.value >= 0 
              ? yScale(point.cumulative) 
              : yScale(point.cumulative - point.value);

            return (
              <g key={point.category}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={point.color}
                  stroke={theme.colors.border.strong}
                  strokeWidth={1}
                  opacity={0.8}
                />

                {/* Value label */}
                {mergedOptions.showValues && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fontSize="10"
                    fill={theme.colors.text.primary}
                    fontWeight="bold"
                  >
                    {Math.abs(point.value).toFixed(1)}%
                  </text>
                )}

                {/* Category label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 15}
                  textAnchor="middle"
                  fontSize="9"
                  fill={theme.colors.text.secondary}
                  transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight + 15})`}
                >
                  {point.category}
                </text>

                {/* Connector lines for waterfall effect */}
                {index < waterfallData.length - 1 && (
                  <line
                    x1={x + barWidth}
                    y1={yScale(point.cumulative)}
                    x2={xScale(index + 1) + barWidth * 0.1}
                    y2={yScale(point.cumulative)}
                    stroke={theme.colors.text.secondary}
                    strokeDasharray="3,3"
                    opacity={0.5}
                  />
                )}
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            x={-40}
            y={chartHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill={theme.colors.text.secondary}
            transform={`rotate(-90, -40, ${chartHeight / 2})`}
          >
            OEE Percentage (%)
          </text>
        </g>
      </svg>

      {/* Summary statistics */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        marginTop: '10px',
        fontSize: '12px',
        color: theme.colors.text.secondary 
      }}>
        <div>Availability: {oeeData.availability.toFixed(1)}%</div>
        <div>Performance: {oeeData.performance.toFixed(1)}%</div>
        <div>Quality: {oeeData.quality.toFixed(1)}%</div>
        <div style={{ fontWeight: 'bold', color: theme.colors.text.primary }}>
          OEE: {oeeData.oee.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};