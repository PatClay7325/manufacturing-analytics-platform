import { metricsService, MetricQuery, MetricDataPoint } from './metricsService'

export interface ChartConfig {
  type: 'timeseries' | 'gauge' | 'heatmap' | 'pareto' | 'gantt'
  title?: string
  subtitle?: string
  height?: number
  width?: number
}

export interface TimeSeriesConfig extends ChartConfig {
  type: 'timeseries'
  query: MetricQuery
  chartType?: 'line' | 'area' | 'bar' | 'scatter'
  showGrid?: boolean
  showTooltip?: boolean
  showLegend?: boolean
}

export interface GaugeConfig extends ChartConfig {
  type: 'gauge'
  value: number
  min?: number
  max?: number
  unit?: string
  segments?: Array<{ value: number; color: string; label?: string }>
}

export interface RechartsData {
  data: any[]
  config: any
  chartType: string
}

class RechartsService {
  private updateCallbacks: Map<string, (data: any) => void> = new Map()
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map()

  async createTimeSeriesChart(config: TimeSeriesConfig): Promise<RechartsData> {
    try {
      // Fetch data using metrics service
      const response = await metricsService.query(config.query)
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch metrics')
      }

      // Convert to Recharts data format
      const dataMap = new Map<number, any>()

      // Process each metric series
      response.data.forEach(metric => {
        metric.datapoints.forEach(([value, timestamp]) => {
          if (!dataMap.has(timestamp)) {
            dataMap.set(timestamp, { timestamp })
          }
          dataMap.get(timestamp)[metric.target] = value
        })
      })

      // Convert map to array and sort by timestamp
      const data = Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp)

      // Get unique series names from the data
      const seriesKeys = response.data.map(metric => metric.target)

      // Build chart configuration
      const chartConfig = {
        width: config.width || 800,
        height: config.height || 400,
        data,
        margin: { top: 20, right: 30, left: 20, bottom: 20 },
        grid: config.showGrid !== false,
        tooltip: config.showTooltip !== false,
        legend: config.showLegend !== false,
        xAxis: {
          dataKey: 'timestamp',
          type: 'number',
          domain: ['dataMin', 'dataMax'],
          tickFormatter: (value: number) => new Date(value).toLocaleTimeString()
        },
        yAxis: {
          type: 'number',
          domain: ['auto', 'auto']
        },
        series: seriesKeys.map((key, index) => ({
          dataKey: key,
          name: key,
          type: config.chartType || 'line',
          stroke: this.getColor(index),
          fill: this.getColor(index),
          strokeWidth: 2,
          dot: false,
          activeDot: { r: 4 }
        }))
      }

      return {
        data,
        config: chartConfig,
        chartType: config.chartType || 'line'
      }
    } catch (error) {
      console.error('Chart creation error:', error)
      throw error
    }
  }

  async createGaugeChart(config: GaugeConfig): Promise<RechartsData> {
    const { value, min = 0, max = 100, segments = [] } = config

    // Default segments if not provided
    const defaultSegments = [
      { value: 60, color: '#52c41a', label: 'Normal' },
      { value: 80, color: '#faad14', label: 'Warning' },
      { value: 100, color: '#f5222d', label: 'Critical' }
    ]

    const actualSegments = segments.length > 0 ? segments : defaultSegments

    // Calculate angle for the value
    const range = max - min
    const normalizedValue = Math.max(min, Math.min(max, value))
    const percentage = ((normalizedValue - min) / range) * 100

    // Prepare data for Recharts RadialBarChart
    const data = [{
      name: config.title || 'Value',
      value: percentage,
      fill: this.getGaugeColor(normalizedValue, actualSegments, min, max)
    }]

    const chartConfig = {
      width: config.width || 300,
      height: config.height || 300,
      data,
      innerRadius: '60%',
      outerRadius: '90%',
      startAngle: 180,
      endAngle: 0,
      tooltip: {
        formatter: (entry: any) => {
          if (entry && entry.payload) {
            return `${config.title || 'Value'}: ${value}${config.unit ? ` ${config.unit}` : ''}`
          }
          return null
        }
      }
    }

    return {
      data,
      config: chartConfig,
      chartType: 'gauge'
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

  // Export functionality for Recharts
  async exportChart(chartElement: HTMLElement, format: 'png' | 'svg' = 'png'): Promise<void> {
    // For Recharts, we'll need to use a library like html2canvas or similar
    // This is a placeholder for the export functionality
    console.log('Export functionality to be implemented with html2canvas')
  }

  // CSV export
  async exportCSV(data: any[], filename: string = 'chart-data'): Promise<void> {
    if (!data || data.length === 0) {
      throw new Error('No data to export')
    }

    // Get headers from the first data item
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          // Handle timestamps
          if (header === 'timestamp' && typeof value === 'number') {
            return new Date(value).toISOString()
          }
          // Handle other values
          return value !== null && value !== undefined ? value : ''
        }).join(',')
      )
    ].join('\n')

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Helper methods
  private getColor(index: number): string {
    // Manufacturing-friendly color palette
    const colors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c', '#0891b2', '#be123c']
    return colors[index % colors.length]
  }

  private getGaugeColor(value: number, segments: Array<{ value: number; color: string }>, min: number, max: number): string {
    const range = max - min
    const normalizedValue = ((value - min) / range) * 100
    
    for (let i = segments.length - 1; i >= 0; i--) {
      const segmentValue = ((segments[i].value - min) / range) * 100
      if (normalizedValue >= (i === 0 ? 0 : ((segments[i - 1].value - min) / range) * 100)) {
        return segments[i].color
      }
    }
    
    return segments[0].color
  }

  // Create dashboard configuration for Recharts
  createDashboardConfig(components: any[]): any {
    return {
      layout: {
        rows: components.map(component => ({
          cells: [{ id: component.id, span: component.span || 12 }]
        }))
      },
      components: components.reduce((acc, component) => {
        acc[component.id] = {
          type: component.type,
          config: component.config,
          data: component.data
        }
        return acc
      }, {})
    }
  }
}

// Export singleton instance
export const rechartsService = new RechartsService()

// Export for testing
export { RechartsService }