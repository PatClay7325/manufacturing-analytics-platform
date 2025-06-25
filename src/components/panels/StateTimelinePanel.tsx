/**
 * State Timeline Panel - Analytics-compatible state timeline visualization
 * Shows state changes over time with smooth transitions and interpolation
 * Ideal for equipment states, system modes, and operational phases
 */

import React, { useMemo } from 'react';
import { PanelProps, LoadingState } from '@/core/plugins/types';
import { Timeline, Clock, Layers } from 'lucide-react';
import { scaleTime, scaleOrdinal, scaleLinear } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { line, curveStepAfter, curveLinear, curveMonotoneX } from 'd3-shape';
import { format } from 'date-fns';

export interface StateTimelinePanelOptions {
  lineWidth: number;
  fillOpacity: number;
  gradientMode: 'none' | 'opacity' | 'hue' | 'scheme';
  showPoints: boolean;
  pointSize: number;
  lineInterpolation: 'linear' | 'smooth' | 'stepBefore' | 'stepAfter';
  lineStyle: 'solid' | 'dash' | 'dot';
  spanNulls: boolean;
  showValue: 'auto' | 'never' | 'always';
  mergeValues: boolean;
  rowHeight: number;
  legend: {
    displayMode: 'list' | 'table' | 'hidden';
    placement: 'bottom' | 'right';
    showLegend: boolean;
  };
  tooltip: {
    mode: 'single' | 'multi' | 'none';
  };
  thresholds?: Array<{
    value: number | string;
    color: string;
  }>;
  colorMapping?: Record<string, string>;
}

interface StateTimelineData {
  name: string;
  points: Array<{
    time: number;
    value: string | number;
    color: string;
  }>;
}

const StateTimelinePanel: React.FC<PanelProps<StateTimelinePanelOptions>> = ({
  data,
  options,
  width,
  height,
  timeRange,
}) => {
  // Process data into timeline format
  const timelineData = useMemo(() => {
    if (!data.series || data.series.length === 0) return [];

    const series: StateTimelineData[] = [];
    const colorScale = scaleOrdinal(schemeCategory10);

    data.series.forEach((frame, frameIndex) => {
      // Find time and value fields
      const timeField = frame.fields.find(f => 
        f.type === 'time' || f.name.toLowerCase().includes('time')
      );
      
      const valueFields = frame.fields.filter(f => 
        f.type !== 'time' && f.name !== 'time'
      );

      if (!timeField || valueFields.length === 0) return;

      valueFields.forEach((valueField, fieldIndex) => {
        const seriesName = valueField.labels?.['series'] || 
                          valueField.displayName || 
                          valueField.name || 
                          `Series ${frameIndex + 1}`;

        const points: StateTimelineData['points'] = [];

        for (let i = 0; i < frame.length; i++) {
          const time = timeField.values.get(i);
          const value = valueField.values.get(i);

          if (time != null && value != null) {
            points.push({
              time,
              value,
              color: getColorForValue(value, options, colorScale)
            });
          }
        }

        if (points.length > 0) {
          series.push({ name: seriesName, points });
        }
      });
    });

    return series;
  }, [data.series, options]);

  // Create scales
  const scales = useMemo(() => {
    if (timelineData.length === 0) return null;

    const allPoints = timelineData.flatMap(s => s.points);
    const timeExtent = [
      Math.min(...allPoints.map(p => p.time)),
      Math.max(...allPoints.map(p => p.time))
    ];

    const xScale = scaleTime()
      .domain(timeExtent)
      .range([60, width - 40]);

    const yScale = scaleLinear()
      .domain([0, timelineData.length])
      .range([20, height - 60]);

    return { xScale, yScale };
  }, [timelineData, width, height]);

  // Generate SVG path for each series
  const seriesPaths = useMemo(() => {
    if (!scales || timelineData.length === 0) return [];

    return timelineData.map((series, seriesIndex) => {
      const y = scales.yScale(seriesIndex + 0.5);
      const rowHeight = options.rowHeight || 40;

      // Create line generator based on interpolation mode
      let lineGenerator;
      switch (options.lineInterpolation) {
        case 'smooth':
          lineGenerator = line<any>()
            .x(d => scales.xScale(d.time))
            .y(() => y)
            .curve(curveMonotoneX);
          break;
        case 'stepBefore':
          lineGenerator = line<any>()
            .x(d => scales.xScale(d.time))
            .y(() => y)
            .curve(curveStepAfter);
          break;
        case 'stepAfter':
          lineGenerator = line<any>()
            .x(d => scales.xScale(d.time))
            .y(() => y)
            .curve(curveStepAfter);
          break;
        default:
          lineGenerator = line<any>()
            .x(d => scales.xScale(d.time))
            .y(() => y)
            .curve(curveLinear);
      }

      // Group consecutive same values for state regions
      const regions: Array<{
        startTime: number;
        endTime: number;
        value: string | number;
        color: string;
      }> = [];

      let currentValue: string | number | null = null;
      let currentStart: number | null = null;
      let currentColor: string | null = null;

      series.points.forEach((point, i) => {
        if (point.value !== currentValue) {
          // End previous region
          if (currentValue !== null && currentStart !== null && currentColor) {
            regions.push({
              startTime: currentStart,
              endTime: point.time,
              value: currentValue,
              color: currentColor
            });
          }

          // Start new region
          currentValue = point.value;
          currentStart = point.time;
          currentColor = point.color;
        }

        // Handle last point
        if (i === series.points.length - 1 && currentValue !== null && currentStart !== null && currentColor) {
          regions.push({
            startTime: currentStart,
            endTime: point.time,
            value: currentValue,
            color: currentColor
          });
        }
      });

      return {
        series,
        seriesIndex,
        y,
        rowHeight,
        path: lineGenerator(series.points),
        regions,
        points: series.points
      };
    });
  }, [timelineData, scales, options]);

  // Get stroke dash array for line style
  const getStrokeDashArray = (style: string, width: number) => {
    switch (style) {
      case 'dash': return `${width * 3},${width * 2}`;
      case 'dot': return `${width},${width}`;
      default: return 'none';
    }
  };

  if (data.state === LoadingState.Loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (timelineData.length === 0 || !scales) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Timeline className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No state timeline data available</p>
        </div>
      </div>
    );
  }

  const lineWidth = options.lineWidth || 2;
  const fillOpacity = options.fillOpacity || 0.2;

  return (
    <div className="h-full p-2 overflow-auto">
      <svg width={width - 16} height={height - 16} className="w-full">
        {/* Time axis */}
        <g className="axis">
          {scales.xScale.ticks(6).map((tick, i) => (
            <g key={i} transform={`translate(${scales.xScale(tick)}, ${height - 40})`}>
              <line y2={6} stroke="currentColor" opacity={0.5} />
              <text
                y={18}
                textAnchor="middle"
                fill="currentColor"
                fontSize="12"
                opacity={0.7}
              >
                {format(tick, 'HH:mm')}
              </text>
            </g>
          ))}
        </g>

        {/* Series */}
        {seriesPaths.map((seriesPath, index) => {
          const y = seriesPath.y;
          const rowHeight = seriesPath.rowHeight;

          return (
            <g key={index}>
              {/* Series label */}
              <text
                x={10}
                y={y + 4}
                fill="currentColor"
                fontSize="12"
                fontWeight="500"
              >
                {seriesPath.series.name}
              </text>

              {/* State regions */}
              {seriesPath.regions.map((region, regionIndex) => {
                const x = scales.xScale(region.startTime);
                const width = scales.xScale(region.endTime) - x;

                return (
                  <g key={regionIndex}>
                    {/* Background region */}
                    <rect
                      x={x}
                      y={y - rowHeight / 2}
                      width={width}
                      height={rowHeight}
                      fill={region.color}
                      fillOpacity={fillOpacity}
                      stroke={region.color}
                      strokeWidth={0.5}
                      rx={2}
                    />

                    {/* Value label */}
                    {options.showValue !== 'never' && width > 50 && (
                      <text
                        x={x + width / 2}
                        y={y + 4}
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize="11"
                        fontWeight="500"
                        opacity={0.9}
                      >
                        {String(region.value)}
                      </text>
                    )}

                    {/* Hover region for tooltip */}
                    <rect
                      x={x}
                      y={y - rowHeight / 2}
                      width={width}
                      height={rowHeight}
                      fill="transparent"
                      className="hover:stroke-current hover:stroke-2"
                    >
                      <title>
                        {`${seriesPath.series.name}: ${region.value}\n` +
                         `From: ${format(region.startTime, 'HH:mm:ss')}\n` +
                         `To: ${format(region.endTime, 'HH:mm:ss')}\n` +
                         `Duration: ${Math.round((region.endTime - region.startTime) / 60000)}m`}
                      </title>
                    </rect>
                  </g>
                );
              })}

              {/* Timeline line */}
              {seriesPath.path && (
                <path
                  d={seriesPath.path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={lineWidth}
                  strokeDasharray={getStrokeDashArray(options.lineStyle || 'solid', lineWidth)}
                  opacity={0.8}
                />
              )}

              {/* Data points */}
              {options.showPoints && seriesPath.points.map((point, pointIndex) => (
                <circle
                  key={pointIndex}
                  cx={scales.xScale(point.time)}
                  cy={y}
                  r={options.pointSize || 3}
                  fill={point.color}
                  stroke="white"
                  strokeWidth={1}
                >
                  <title>
                    {`${seriesPath.series.name}: ${point.value}\n` +
                     `Time: ${format(point.time, 'HH:mm:ss')}`}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}

        {/* Grid lines */}
        <g className="grid" opacity={0.1}>
          {scales.xScale.ticks(6).map((tick, i) => (
            <line
              key={i}
              x1={scales.xScale(tick)}
              y1={20}
              x2={scales.xScale(tick)}
              y2={height - 40}
              stroke="currentColor"
            />
          ))}
        </g>
      </svg>

      {/* Legend */}
      {options.legend.showLegend && options.legend.displayMode !== 'hidden' && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm font-medium mb-2">Series</div>
          <div className="grid grid-cols-2 gap-2">
            {timelineData.map((series, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-4 h-2 rounded"
                  style={{ backgroundColor: series.points[0]?.color || '#6b7280' }}
                />
                <span>{series.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get color for value
function getColorForValue(
  value: string | number,
  options: StateTimelinePanelOptions,
  colorScale: any
): string {
  // Check custom color mapping first
  if (options.colorMapping && typeof value === 'string') {
    const customColor = options.colorMapping[value];
    if (customColor) return customColor;
  }

  // Check thresholds
  if (options.thresholds) {
    const threshold = options.thresholds.find(t => t.value === value);
    if (threshold) return threshold.color;
  }

  // Map common manufacturing states to colors
  const valueStr = String(value).toLowerCase();
  if (valueStr.includes('running') || valueStr.includes('active') || valueStr.includes('on')) {
    return '#10b981'; // green
  }
  if (valueStr.includes('stopped') || valueStr.includes('off') || valueStr.includes('idle')) {
    return '#6b7280'; // gray
  }
  if (valueStr.includes('error') || valueStr.includes('fault') || valueStr.includes('alarm')) {
    return '#ef4444'; // red
  }
  if (valueStr.includes('warning') || valueStr.includes('maintenance') || valueStr.includes('setup')) {
    return '#f59e0b'; // yellow
  }
  if (valueStr.includes('startup') || valueStr.includes('warming')) {
    return '#3b82f6'; // blue
  }

  // Use color scale for other values
  return colorScale(value);
}

export default StateTimelinePanel;