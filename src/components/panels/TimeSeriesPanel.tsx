/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Time Series Panel - Advanced time-based data visualization
 * 
 * Original implementation using Highcharts for manufacturing time series
 */

'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { PanelProps } from '@/core/panels/PanelRegistry';
import { TimeSeriesPanelOptions } from '@/types/panel';

// Manufacturing-specific chart configurations
const MANUFACTURING_THEME = {
  colors: ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c', '#0891b2', '#be123c'],
  chart: {
    backgroundColor: 'transparent',
    style: {
      fontFamily: 'Inter, sans-serif'
    }
  },
  title: {
    style: {
      color: '#374151',
      fontSize: '16px',
      fontWeight: '600'
    }
  },
  xAxis: {
    gridLineColor: '#e5e7eb',
    lineColor: '#d1d5db',
    tickColor: '#d1d5db',
    labels: {
      style: {
        color: '#6b7280',
        fontSize: '12px'
      }
    }
  },
  yAxis: {
    gridLineColor: '#e5e7eb',
    lineColor: '#d1d5db',
    tickColor: '#d1d5db',
    labels: {
      style: {
        color: '#6b7280',
        fontSize: '12px'
      }
    },
    title: {
      style: {
        color: '#374151',
        fontSize: '12px'
      }
    }
  },
  legend: {
    itemStyle: {
      color: '#374151',
      fontSize: '12px'
    }
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#d1d5db',
    style: {
      color: '#374151',
      fontSize: '12px'
    }
  }
};

export default function TimeSeriesPanel({ 
  data, 
  options, 
  width, 
  height, 
  timeRange,
  fieldConfig 
}: PanelProps<TimeSeriesPanelOptions>) {
  
  const chartRef = useRef<HighchartsReactRefObject>(null);

  const chartOptions = useMemo((): Highcharts.Options => {
    if (!data || !data?.length) {
      return {
        ...MANUFACTURING_THEME,
        title: { text: 'No data available' },
        chart: { ...MANUFACTURING_THEME.chart, height: height - 20 }
      };
    }

    const series: Highcharts.SeriesOptionsType[] = [];
    
    data?.forEach((frame, frameIndex) => {
      const timeField = frame?.fields.find(field => field?.type === 'time');
      const valueFields = frame?.fields.filter(field => field?.type === 'number');
      
      if (!timeField || !valueFields?.length) return;
      
      valueFields?.forEach((valueField, fieldIndex) => {
        const seriesData: [number, number][] = [];
        
        for (let i = 0; i < Math.min(timeField?.values.length, valueField?.values.length); i++) {
          const timestamp = new Date(timeField?.values[i]).getTime();
          const value = valueField?.values[i];
          
          if (!isNaN(timestamp) && value !== null && value !== undefined) {
            seriesData?.push([timestamp, value]);
          }
        }
        
        if (seriesData?.length > 0) {
          series?.push({
            type: getSeriesType(valueField?.config?.custom?.drawStyle),
            name: valueField.config?.displayName || valueField?.name || `Series ${frameIndex + 1}-${fieldIndex + 1}`,
            data: seriesData,
            color: getFieldColor(valueField, fieldIndex),
            lineWidth: getLineWidth(valueField?.config?.custom?.lineWidth),
            fillOpacity: getAreaFillOpacity(valueField?.config?.custom?.fillOpacity),
            marker: {
              enabled: shouldShowPoints(valueField?.config?.custom?.pointSize),
              radius: getPointSize(valueField?.config?.custom?.pointSize)
            },
            tooltip: {
              valueSuffix: valueField.config?.unit ? ` ${valueField?.config.unit}` : ''
            },
            yAxis: getYAxisIndex(valueField?.config?.custom?.axisPlacement),
            threshold: valueField.config?.custom?.thresholdsStyle?.mode === 'absolute' ? 0 : null
          } as Highcharts.SeriesOptionsType);
        }
      });
    });

    const yAxes = createYAxes();
    
    return {
      ...MANUFACTURING_THEME,
      chart: {
        ...MANUFACTURING_THEME.chart,
        type: 'line',
        height: height - 20,
        animation: false,
        zoomType: 'x'
      },
      title: {
        text: null
      },
      xAxis: {
        ...MANUFACTURING_THEME.xAxis,
        type: 'datetime',
        min: new Date(timeRange?.from).getTime(),
        max: new Date(timeRange?.to).getTime(),
        crosshair: true
      },
      yAxis: yAxes,
      series,
      legend: {
        ...MANUFACTURING_THEME.legend,
        enabled: options.legend.showLegend,
        align: getLegendAlign(),
        verticalAlign: getLegendVerticalAlign(),
        layout: options.legend.displayMode === 'table' ? 'vertical' : 'horizontal',
        maxHeight: options.legend.displayMode === 'table' ? 100 : undefined
      },
      tooltip: {
        ...MANUFACTURING_THEME.tooltip,
        shared: options.tooltip.mode === 'multi',
        crosshairs: true,
        formatter: function() {
          return formatTooltip(this, options?.tooltip.sort);
        }
      },
      plotOptions: {
        series: {
          animation: false,
          turboThreshold: 10000,
          cropThreshold: 1000,
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: true,
                radius: 4
              }
            }
          }
        },
        line: {
          connectNulls: false
        },
        area: {
          connectNulls: false,
          fillOpacity: 0.3
        }
      },
      exporting: {
        enabled: false
      },
      credits: {
        enabled: false
      }
    };
  }, [data, options, width, height, timeRange, fieldConfig]);

  // Helper functions
  const getSeriesType = (drawStyle?: string): string => {
    switch (drawStyle) {
      case 'bars': return 'column';
      case 'points': return 'scatter';
      case 'area': return 'area';
      case 'line':
      default: return 'line';
    }
  };

  const getFieldColor = (field: any, index: number): string => {
    if (field?.config?.color?.fixedColor) {
      return field?.config.color?.fixedColor;
    }
    return MANUFACTURING_THEME.colors[index % MANUFACTURING_THEME.colors.length];
  };

  const getLineWidth = (customLineWidth?: number): number => {
    return customLineWidth || 2;
  };

  const getAreaFillOpacity = (customFillOpacity?: number): number => {
    return customFillOpacity || 0.3;
  };

  const shouldShowPoints = (pointSize?: number): boolean => {
    return pointSize !== undefined && pointSize > 0;
  };

  const getPointSize = (pointSize?: number): number => {
    return pointSize || 3;
  };

  const getYAxisIndex = (axisPlacement?: string): number => {
    return axisPlacement === 'right' ? 1 : 0;
  };

  const createYAxes = (): Highcharts.YAxisOptions[] => {
    const leftAxis: Highcharts.YAxisOptions = {
      ...MANUFACTURING_THEME.yAxis,
      opposite: false,
      title: {
        text: getLeftAxisTitle(),
        style: MANUFACTURING_THEME.yAxis.title?.style
      }
    };

    const rightAxis: Highcharts.YAxisOptions = {
      ...MANUFACTURING_THEME.yAxis,
      opposite: true,
      title: {
        text: getRightAxisTitle(),
        style: MANUFACTURING_THEME.yAxis.title?.style
      }
    };

    return [leftAxis, rightAxis];
  };

  const getLeftAxisTitle = (): string => {
    if (!data || !data?.length) return '';
    
    const leftFields = data[0].fields?.filter(field => 
      field?.type === 'number' && 
      (!field?.config?.custom?.axisPlacement || field?.config.custom?.axisPlacement === 'left')
    );
    
    if (leftFields.length === 1 && leftFields[0].config?.unit) {
      return leftFields[0].config?.unit;
    }
    
    return '';
  };

  const getRightAxisTitle = (): string => {
    if (!data || !data?.length) return '';
    
    const rightFields = data[0].fields?.filter(field => 
      field?.type === 'number' && 
      field?.config?.custom?.axisPlacement === 'right'
    );
    
    if (rightFields.length === 1 && rightFields[0].config?.unit) {
      return rightFields[0].config?.unit;
    }
    
    return '';
  };

  const getLegendAlign = (): 'left' | 'center' | 'right' => {
    switch (options?.legend.placement) {
      case 'right': return 'right';
      case 'top': return 'center';
      case 'bottom': return 'center';
      default: return 'center';
    }
  };

  const getLegendVerticalAlign = (): 'top' | 'middle' | 'bottom' => {
    switch (options?.legend.placement) {
      case 'top': return 'top';
      case 'bottom': return 'bottom';
      case 'right': return 'middle';
      default: return 'bottom';
    }
  };

  const formatTooltip = function(this: any, sortOrder: string): string {
    const points = Array.isArray(this?.points) ? this?.points : [this];
    
    if (sortOrder === 'asc') {
      points?.sort((a: any, b: any) => a?.y - b?.y);
    } else if (sortOrder === 'desc') {
      points?.sort((a: any, b: any) => b?.y - a?.y);
    }
    
    let tooltip = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this?.x)}</b><br/>`;
    
    points?.forEach((point: any) => {
      tooltip += `<span style="color:${point?.color}">●</span> ${point?.series.name}: <b>${point?.y}</b>${point?.series.tooltipOptions?.valueSuffix || ''}<br/>`;
    });
    
    return tooltip;
  };

  // Auto-resize chart when container dimensions change
  useEffect(() => {
    if (chartRef?.current?.chart) {
      chartRef?.current.chart?.setSize(width, height - 20, false);
    }
  }, [width, height]);

  return (
    <div className="h-full w-full">
      <HighchartsReact
        ref={chartRef}
        highcharts={Highcharts}
        options={chartOptions}
        containerProps={{
          style: { height: '100%', width: '100%' }
        }}
      />
    </div>
  );
}

// Default options for TimeSeriesPanel
export const timeSeriesPanelDefaults: TimeSeriesPanelOptions = {
  tooltip: {
    mode: 'multi',
    sort: 'none'
  },
  legend: {
    displayMode: 'list',
    placement: 'bottom',
    showLegend: true,
    asTable: false,
    isVisible: true,
    calcs: []
  }
};