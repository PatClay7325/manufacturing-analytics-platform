import { NextRequest, NextResponse } from 'next/server'
import { queryPrometheus } from '@/app/monitoring/actions'

export async function POST(req: NextRequest) {
  try {
    const { query, timeRange } = await req.json()
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Calculate time range
    const now = new Date()
    let start = new Date()
    
    switch (timeRange) {
      case '5m':
        start = new Date(now.getTime() - 5 * 60 * 1000)
        break
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '6h':
        start = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default:
        start = new Date(now.getTime() - 60 * 60 * 1000)
    }

    try {
      // Query Prometheus
      const result = await queryPrometheus(query, start, now)
      
      // Transform Prometheus response
      const results = result.data.result.map((series: any) => ({
        metric: Object.entries(series.metric)
          .map(([k, v]) => `${k}="${v}"`)
          .join(', '),
        data: series.values.map(([timestamp, value]: [number, string]) => ({
          timestamp: timestamp * 1000, // Convert to milliseconds
          value: parseFloat(value),
        })),
      }))

      return NextResponse.json({ results })
    } catch (prometheusError) {
      console.warn('Prometheus query failed:', prometheusError)
      
      // Return mock data for demo
      const mockResults = [{
        metric: query,
        data: generateMockData(timeRange),
      }]
      
      return NextResponse.json({ results: mockResults })
    }
  } catch (error) {
    console.error('Error executing query:', error)
    return NextResponse.json(
      { error: 'Failed to execute query' },
      { status: 500 }
    )
  }
}

function generateMockData(timeRange: string) {
  const now = Date.now()
  const points = 60
  const interval = timeRange === '5m' ? 5000 : 
                  timeRange === '1h' ? 60000 :
                  timeRange === '6h' ? 360000 :
                  timeRange === '24h' ? 1440000 : 
                  60000

  return Array.from({ length: points }, (_, i) => ({
    timestamp: now - (points - i) * interval,
    value: 50 + Math.random() * 50 + Math.sin(i / 10) * 20,
  }))
}