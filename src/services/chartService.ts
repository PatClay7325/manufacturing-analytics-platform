/**
 * Manufacturing Analytics Platform
 * Copyright (c) 2025 Adaptive Factory AI Solutions, Inc.
 * Licensed under the MIT License
 */

import { metricsService, MetricQuery, MetricDataPoint } from './metricsService'
import { isFeatureEnabled } from '@/config/features'

export interface ChartConfig {
  type: 'timeseries' | 'gauge' | 'heatmap' | 'pareto' | 'gantt'
  title?: string
  subtitle?: string
  height?: number
  options?: Record<string, any>
}

export interface TimeSeriesConfig extends ChartConfig {
  type: 'timeseries'
  query: MetricQuery
  chartType?: 'line' | 'area' | 'column' | 'spline'
  showNavigator?: boolean
  showRangeSelector?: boolean
}

export interface GaugeConfig extends ChartConfig {
  type: 'gauge'
  value: number
  min?: number
  max?: number
  unit?: string
  bands?: Array<{ from: number; to: number; color: string; label?: string }>
}

export interface ChartOptions {
  title?: { text?: string }
  subtitle?: { text?: string }
  height?: number
  series?: Array<{
    name: string
    data: Array<[number, number]>
    type?: string
    color?: string
  }>
  xAxis?: {
    type?: string
    min?: number
    max?: number
  }
  yAxis?: {
    min?: number
    max?: number
    title?: { text?: string }
  }
}

class ChartService {
  private updateCallbacks: Map<string, (data: any) => void> = new Map()
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map()

  async createTimeSeriesChart(config: TimeSeriesConfig): Promise<ChartOptions> {
    try {
      // Fetch data using metrics service
      const response = await metricsService.query(config.query)
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch metrics')
      }

      // Convert to chart series format
      const series = response.data.map(metric => ({
        name: metric.target,
        data: metric.datapoints,
        type: config.chartType || 'line',
        color: this.getSeriesColor(metric.target)
      }))

      // Build chart options
      const options: ChartOptions = {
        title: { text: config.title },
        subtitle: { text: config.subtitle },
        height: config.height || 400,
        series: series,
        xAxis: {
          type: 'datetime'
        },
        yAxis: {
          title: { text: 'Value' }
        },
        ...config.options
      }

      return options
    } catch (error) {
      console.error('Chart creation error:', error)
      throw error
    }
  }

  async createGaugeChart(config: GaugeConfig): Promise<ChartOptions> {
    const defaultBands = [
      { from: 0, to: 60, color: '#55BF3B', label: 'Normal' },
      { from: 60, to: 80, color: '#DDDF0D', label: 'Warning' },
      { from: 80, to: 100, color: '#DF5353', label: 'Critical' }
    ]

    return {
      height: config.height || 300,
      title: { text: config.title },
      yAxis: {
        min: config.min || 0,
        max: config.max || 100,
        title: { text: config.unit || '' }
      },
      series: [{
        name: config.title || 'Value',
        data: [[Date.now(), config.value]],
        type: 'gauge',
        color: this.getGaugeColor(config.value, config.bands || defaultBands)
      }],
      ...config.options
    }
  }

  private getSeriesColor(seriesName: string): string {
    const colors = [
      '#2563eb', '#dc2626', '#16a34a', '#ca8a04',
      '#9333ea', '#c2410c', '#0891b2', '#be123c'
    ]
    const hash = seriesName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  private getGaugeColor(value: number, bands: Array<{ from: number; to: number; color: string }>): string {
    for (const band of bands) {
      if (value >= band.from && value <= band.to) {
        return band.color
      }
    }
    return '#808080' // Default gray
  }

  // Real-time update functionality
  startRealtimeUpdates(
    chartId: string,
    query: MetricQuery,
    interval: number = 5000,
    callback: (data: MetricDataPoint[]) => void
  ): void {
    // Clear any existing interval
    this.stopRealtimeUpdates(chartId)

    // Store callback
    this.updateCallbacks.set(chartId, callback)

    // Set up polling interval
    const intervalId = setInterval(async () => {
      try {
        const response = await metricsService.query({
          ...query,
          timeRange: {
            from: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Last hour
            to: new Date().toISOString()
          }
        })

        if (response.success && response.data) {
          callback(response.data)
        }
      } catch (error) {
        console.error('Realtime update error:', error)
      }
    }, interval)

    this.updateIntervals.set(chartId, intervalId)
  }

  stopRealtimeUpdates(chartId: string): void {
    const intervalId = this.updateIntervals.get(chartId)
    if (intervalId) {
      clearInterval(intervalId)
      this.updateIntervals.delete(chartId)
    }
    this.updateCallbacks.delete(chartId)
  }

  stopAllRealtimeUpdates(): void {
    this.updateIntervals.forEach((intervalId, chartId) => {
      clearInterval(intervalId)
    })
    this.updateIntervals.clear()
    this.updateCallbacks.clear()
  }

  // Export functionality
  async exportChartData(chartData: any[], format: 'csv' | 'json' = 'csv'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(chartData, null, 2)
    }

    // CSV export
    if (!chartData || chartData.length === 0) {
      return ''
    }

    const headers = Object.keys(chartData[0])
    const csvContent = [
      headers.join(','),
      ...chartData.map(row => 
        headers.map(header => {
          const value = row[header]
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        }).join(',')
      )
    ].join('\n')

    return csvContent
  }

  // Create dashboard configuration
  createDashboardConfig(components: any[]): any {
    return {
      gui: {
        layouts: [{
          rows: components.map(component => ({
            cells: [{ id: component.id }]
          }))
        }]
      },
      components: components.reduce((acc, component) => {
        acc[component.id] = component.config
        return acc
      }, {})
    }
  }
}

// Export singleton instance
export const chartService = new ChartService()

// Export for testing
export { ChartService }