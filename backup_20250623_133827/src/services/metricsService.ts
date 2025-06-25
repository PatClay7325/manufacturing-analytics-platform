export interface MetricQuery {
  equipmentId?: string
  metrics?: string[]
  timeRange: {
    from: string
    to: string
  }
  aggregation?: 'none' | 'avg' | 'sum' | 'min' | 'max' | 'count'
  interval?: string
  tags?: Record<string, any>
}

export interface MetricDataPoint {
  target: string
  datapoints: [number, number][]
}

export interface MetricResponse {
  success: boolean
  data: MetricDataPoint[]
  error?: string
}

class MetricsService {
  private baseUrl: string
  
  constructor() {
    // Always use custom metrics API
    this.baseUrl = '/api/metrics'
  }
  
  async query(query: MetricQuery): Promise<MetricResponse> {
    try {
      const endpoint = `${this.baseUrl}/query`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Query failed')
      }
      
      const result = await response.json()
      return result
    } catch (error) {
      console.error('Metrics query error:', error)
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
  
  async ingest(equipmentId: string, metrics: any[]): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ equipmentId, metrics }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Ingestion failed')
    }
    
    return response.json()
  }
  
  // Get simple metrics (for backward compatibility)
  async getMetrics(equipmentId?: string, hours: number = 24): Promise<any> {
    const params = new URLSearchParams()
    if (equipmentId) params.set('equipmentId', equipmentId)
    params.set('hours', hours.toString())
    
    const response = await fetch(`${this.baseUrl}/query?${params}`)
    return response.json()
  }
}

// Export singleton instance
export const metricsService = new MetricsService()

// Export for testing
export { MetricsService }