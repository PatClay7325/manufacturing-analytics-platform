/**
 * Status History Panel - Analytics-compatible status history visualization
 * Shows state changes and durations over time in a timeline format
 * Useful for tracking equipment states, system status, and operational modes
 */

import React, { useMemo } from 'react';
import { PanelProps, LoadingState } from '@/core/plugins/types';
import { Activity, Clock, AlertCircle } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { scaleTime, scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

export interface StatusHistoryPanelOptions {
  rowHeight: number;
  showValue: boolean;
  colWidth?: number;
  alignValue?: 'center' | 'left' | 'right';
  mergeValues?: boolean;
  legend: {
    displayMode: 'list' | 'table' | 'hidden';
    placement: 'bottom' | 'right';
    showLegend: boolean;
  };
  tooltip: {
    mode: 'single' | 'multi' | 'none';
  };
  statusFieldName?: string;
  timeFieldName?: string;
  colorMode?: 'value' | 'threshold' | 'palette';
  thresholds?: Array<{
    value: number | string;
    color: string;
  }>;
}

interface StatusPeriod {
  status: string | number;
  startTime: number;
  endTime: number;
  duration: number;
  color: string;
}

interface StatusSeries {
  name: string;
  periods: StatusPeriod[];
}

const StatusHistoryPanel: React.FC<PanelProps<StatusHistoryPanelOptions>> = ({
  data,
  options,
  width,
  height,
  timeRange,
}) => {
  const processedData = useMemo(() => {
    if (!data.series || data.series.length === 0) return [];

    const seriesData: StatusSeries[] = [];
    const colorScale = scaleOrdinal(schemeCategory10);

    data.series.forEach((frame, frameIndex) => {
      // Find time and status fields
      const timeField = frame.fields.find(f => 
        f.name === options.timeFieldName || 
        f.type === 'time' ||
        f.name.toLowerCase().includes('time')
      );
      
      const statusField = frame.fields.find(f => 
        f.name === options.statusFieldName ||
        f.name.toLowerCase().includes('status') ||
        f.name.toLowerCase().includes('state')
      );

      if (!timeField || !statusField) return;

      // Get series name from frame or field
      const seriesName = frame.name || statusField.labels?.['equipment'] || `Series ${frameIndex + 1}`;
      const periods: StatusPeriod[] = [];

      // Group consecutive same statuses
      let currentStatus: string | number | null = null;
      let currentStartTime: number | null = null;

      for (let i = 0; i < frame.length; i++) {
        const time = timeField.values.get(i);
        const status = statusField.values.get(i);

        if (status !== currentStatus) {
          // Save previous period if exists
          if (currentStatus !== null && currentStartTime !== null) {
            const endTime = time;
            periods.push({
              status: currentStatus,
              startTime: currentStartTime,
              endTime,
              duration: endTime - currentStartTime,
              color: getColorForStatus(currentStatus, options, colorScale),
            });
          }

          // Start new period
          currentStatus = status;
          currentStartTime = time;
        }
      }

      // Add final period
      if (currentStatus !== null && currentStartTime !== null) {
        const endTime = timeField.values.get(frame.length - 1);
        periods.push({
          status: currentStatus,
          startTime: currentStartTime,
          endTime,
          duration: endTime - currentStartTime,
          color: getColorForStatus(currentStatus, options, colorScale),
        });
      }

      if (periods.length > 0) {
        seriesData.push({ name: seriesName, periods });
      }
    });

    return seriesData;
  }, [data.series, options]);

  const timeScale = useMemo(() => {
    if (processedData.length === 0) return null;

    const allPeriods = processedData.flatMap(s => s.periods);
    const minTime = Math.min(...allPeriods.map(p => p.startTime));
    const maxTime = Math.max(...allPeriods.map(p => p.endTime));

    return scaleTime()
      .domain([minTime, maxTime])
      .range([0, width - 200]); // Leave space for labels and legend
  }, [processedData, width]);

  // Get unique statuses for legend
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    processedData.forEach(series => {
      series.periods.forEach(period => {
        statuses.add(String(period.status));
      });
    });
    return Array.from(statuses);
  }, [processedData]);

  if (data.state === LoadingState.Loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (processedData.length === 0 || !timeScale) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No status history data available</p>
        </div>
      </div>
    );
  }

  const rowHeight = options.rowHeight || 50;
  const marginTop = 40;
  const marginBottom = 60;

  return (
    <div className="h-full p-4 overflow-auto">
      {/* Time axis */}
      <svg width={width - 32} height={marginTop} className="mb-2">
        <g transform={`translate(150, 30)`}>
          {timeScale.ticks(5).map((tick, i) => (
            <g key={i} transform={`translate(${timeScale(tick)}, 0)`}>
              <line y2={6} stroke="currentColor" />
              <text
                y={20}
                textAnchor="middle"
                fill="currentColor"
                fontSize="12"
              >
                {format(tick, 'HH:mm')}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* Status rows */}
      <div className="relative">
        {processedData.map((series, seriesIndex) => (
          <div key={seriesIndex} className="flex items-center mb-1">
            {/* Series label */}
            <div className="w-36 pr-2 text-sm font-medium truncate">
              {series.name}
            </div>

            {/* Status timeline */}
            <div className="relative flex-1" style={{ height: rowHeight }}>
              <svg width={width - 200} height={rowHeight}>
                {series.periods.map((period, periodIndex) => {
                  const x = timeScale(period.startTime);
                  const width = timeScale(period.endTime) - x;

                  return (
                    <g key={periodIndex}>
                      <rect
                        x={x}
                        y={2}
                        width={width}
                        height={rowHeight - 4}
                        fill={period.color}
                        stroke="currentColor"
                        strokeOpacity={0.1}
                        rx={2}
                      />
                      {options.showValue && width > 30 && (
                        <text
                          x={x + width / 2}
                          y={rowHeight / 2 + 4}
                          textAnchor="middle"
                          fill="white"
                          fontSize="12"
                          fontWeight="500"
                        >
                          {period.status}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Hover tooltip */}
              <div className="absolute inset-0">
                {series.periods.map((period, periodIndex) => {
                  const x = timeScale(period.startTime);
                  const width = timeScale(period.endTime) - x;

                  return (
                    <div
                      key={periodIndex}
                      className="absolute h-full group"
                      style={{ left: x, width }}
                    >
                      <div className="hidden group-hover:block absolute z-10 -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full">
                        <div className="bg-background border rounded shadow-lg p-2 text-sm whitespace-nowrap">
                          <div className="font-medium">{period.status}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(period.startTime, 'HH:mm:ss')} - {format(period.endTime, 'HH:mm:ss')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Duration: {formatDuration(period.duration)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      {options.legend.showLegend && options.legend.displayMode !== 'hidden' && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm font-medium mb-2">Status Legend</div>
          <div className="flex flex-wrap gap-2">
            {uniqueStatuses.map(status => {
              const colorScale = scaleOrdinal(schemeCategory10);
              const color = getColorForStatus(status, options, colorScale);
              return (
                <div key={status} className="flex items-center gap-1">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm">{status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
function getColorForStatus(
  status: string | number,
  options: StatusHistoryPanelOptions,
  colorScale: any
): string {
  if (options.colorMode === 'threshold' && options.thresholds) {
    const threshold = options.thresholds.find(t => t.value === status);
    if (threshold) return threshold.color;
  }

  // Map common statuses to appropriate colors
  const statusStr = String(status).toLowerCase();
  if (statusStr.includes('run') || statusStr.includes('active') || statusStr.includes('on')) {
    return '#10b981'; // green
  }
  if (statusStr.includes('stop') || statusStr.includes('off') || statusStr.includes('idle')) {
    return '#6b7280'; // gray
  }
  if (statusStr.includes('error') || statusStr.includes('fault') || statusStr.includes('alarm')) {
    return '#ef4444'; // red
  }
  if (statusStr.includes('warn') || statusStr.includes('maintenance')) {
    return '#f59e0b'; // yellow
  }

  // Use color scale for other values
  return colorScale(status);
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

export default StatusHistoryPanel;