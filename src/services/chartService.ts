import { metricsService, MetricQuery, MetricDataPoint } from './metricsService'
import { isFeatureEnabled } from '@/config/features'
import type * as Highcharts from 'highcharts'

export interface ChartConfig {
  type: 'timeseries' | 'gauge' | 'heatmap' | 'pareto' | 'gantt'
  title?: string
  subtitle?: string
  height?: number
  options?: Partial<Highcharts.Options>
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

class ChartService {
  private updateCallbacks: Map<string, (data: any) => void> = new Map()
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map()

  async createTimeSeriesChart(config: TimeSeriesConfig): Promise<Highcharts.Options> {
    try {
      // Fetch data using metrics service
      const response = await metricsService.query(config.query)
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch metrics')
      }

      // Convert to Highcharts series format
      const series = response.data.map(metric => ({
        name: metric.target,
        data: metric.datapoints,
        type: config.chartType || 'line',
        marker: {
          enabled: metric.datapoints.length < 50
        }
      }))

      // Build chart options
      const options: Highcharts.Options = {
        title: { text: config.title },
        subtitle: { text: config.subtitle },
        chart: {
          height: config.height || 400,
          zoomType: 'x'
        },
        xAxis: {
          type: 'datetime'
        },
        yAxis: {
          title: { text: 'Value' }
        },
        tooltip: {
          shared: true,
          crosshairs: true
        },
        series: series as any,
        ...config.options
      }

      // Add stock features if requested
      if (config.showNavigator || config.showRangeSelector) {
        Object.assign(options, {
          navigator: config.showNavigator ? { enabled: true } : undefined,
          rangeSelector: config.showRangeSelector ? {
            enabled: true,
            buttons: [{
              type: 'hour',
              count: 1,
              text: '1h'
            }, {
              type: 'day',
              count: 1,
              text: '1d'
            }, {
              type: 'week',
              count: 1,
              text: '1w'
            }, {
              type: 'all',
              text: 'All'
            }]
          } : undefined
        })
      }

      return options
    } catch (error) {
      console.error('Chart creation error:', error)
      throw error
    }
  }

  async createGaugeChart(config: GaugeConfig): Promise<Highcharts.Options> {
    const defaultBands = [
      { from: 0, to: 60, color: '#55BF3B', label: 'Normal' },
      { from: 60, to: 80, color: '#DDDF0D', label: 'Warning' },
      { from: 80, to: 100, color: '#DF5353', label: 'Critical' }
    ]

    return {
      chart: {
        type: 'gauge' as any,
        height: config.height || 300
      },
      title: {
        text: config.title
      },
      pane: {
        startAngle: -150,
        endAngle: 150
      },
      yAxis: {
        min: config.min || 0,
        max: config.max || 100,
        title: {
          text: config.unit || ''
        },
        plotBands: (config.bands || defaultBands).map(band => ({
          from: band.from,
          to: band.to,
          color: band.color,
          label: band.label ? {
            text: band.label,
            style: { color: '#606060' }
          } : undefined
        }))
      },
      series: [{
        type: 'gauge' as any,
        name: config.title || 'Value',
        data: [config.value],
        tooltip: {
          valueSuffix: ' ' + (config.unit || '')
        }
      }] as any,
      ...config.options
    }
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
  async exportChart(chart: Highcharts.Chart, options?: Highcharts.ExportingOptions): Promise<void> {
    if (!chart.exportChart) {
      throw new Error('Export module not loaded')
    }

    chart.exportChart(options || {
      type: 'image/png',
      filename: `chart-${Date.now()}`
    })
  }

  // CSV export
  async exportCSV(chart: Highcharts.Chart): Promise<string> {
    if (!chart.getCSV) {
      throw new Error('Export-data module not loaded')
    }

    return chart.getCSV()
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