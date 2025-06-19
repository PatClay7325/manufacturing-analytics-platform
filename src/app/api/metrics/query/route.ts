import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Validation schema for query requests
const MetricQuerySchema = z.object({
  equipmentId: z.string().optional(),
  metrics: z.array(z.string()).optional(),
  timeRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime()
  }),
  aggregation: z.enum(['none', 'avg', 'sum', 'min', 'max', 'count']).optional().default('none'),
  interval: z.string().optional(), // e.g., '1m', '5m', '1h'
  tags: z.record(z.string(), z.any()).optional(),
  useLiveData: z.boolean().optional().default(true) // Force live data by default
})

// Helper to parse interval string (e.g., '5m' -> 300000 ms)
function parseInterval(interval: string): number {
  const match = interval.match(/^(\d+)([smhd])$/)
  if (!match) return 60000 // Default 1 minute
  
  const [, value, unit] = match
  const multipliers: Record<string, number> = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  }
  
  return parseInt(value) * (multipliers[unit] || 60000)
}

// Helper function to generate mock data
const generateMockData = (query: any) => {
  const { metrics = ['temperature', 'pressure'], timeRange, aggregation = 'none' } = query
  
  // Generate mock time series data
  const generateDatapoints = (metricName: string) => {
    const now = new Date(timeRange?.to || new Date())
    const from = new Date(timeRange?.from || new Date(now.getTime() - 60 * 60 * 1000))
    const pointCount = aggregation === 'none' ? 60 : 12
    const interval = (now.getTime() - from.getTime()) / pointCount
    
    const datapoints: [number, number][] = []
    
    for (let i = 0; i < pointCount; i++) {
      const timestamp = from.getTime() + (i * interval)
      let value = 0
      
      switch (metricName) {
        case 'temperature':
          value = 65 + Math.sin(i / 10) * 5 + (Math.random() - 0.5) * 2
          break
        case 'pressure':
          value = 4.5 + Math.cos(i / 8) * 0.5 + (Math.random() - 0.5) * 0.2
          break
        case 'vibration':
          value = 0.5 + Math.abs(Math.sin(i / 5)) * 0.3 + (Math.random() - 0.5) * 0.1
          break
        case 'production_count':
          value = Math.floor(50 + i * 2 + (Math.random() - 0.5) * 10)
          break
        default:
          value = 50 + (Math.random() - 0.5) * 20
      }
      
      datapoints.push([value, timestamp])
    }
    
    return datapoints
  }
  
  const response = (metrics || ['temperature', 'pressure']).map((metricName: string) => ({
    target: metricName,
    datapoints: generateDatapoints(metricName)
  }))
  
  return {
    success: true,
    data: response
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = MetricQuerySchema.parse(body)
    
    // Build where clause
    const where: any = {
      timestamp: {
        gte: new Date(query.timeRange.from),
        lte: new Date(query.timeRange.to)
      }
    }
    
    if (query.equipmentId) {
      where.equipmentId = query.equipmentId
    }
    
    if (query.metrics && query.metrics.length > 0) {
      where.name = { in: query.metrics }
    }
    
    // Handle tag filtering - use equals for JSON fields
    if (query.tags && Object.keys(query.tags).length > 0) {
      // For JSON fields in PostgreSQL with Prisma, we use equals
      where.tags = {
        equals: query.tags
      }
    }
    
    // Try to fetch from database, fallback to mock data if it fails
    try {
      // If no aggregation, return raw data
      if (query.aggregation === 'none') {
        const metrics = await prisma.metric.findMany({
        where,
        orderBy: { timestamp: 'asc' },
        select: {
          id: true,
          timestamp: true,
          name: true,
          value: true,
          unit: true,
          tags: true,
          equipmentId: true
        }
      })
      
      // Group by metric name for Grafana-like response
      const groupedMetrics = metrics.reduce((acc, metric) => {
        if (!acc[metric.name]) {
          acc[metric.name] = []
        }
        acc[metric.name].push({
          timestamp: metric.timestamp.toISOString(),
          value: metric.value,
          tags: metric.tags
        })
        return acc
      }, {} as Record<string, any[]>)
      
      // Format response similar to Grafana
      const response = Object.entries(groupedMetrics).map(([name, data]) => ({
        target: name,
        datapoints: data.map(d => [d.value, new Date(d.timestamp).getTime()])
      }))
      
      return NextResponse.json({
        success: true,
        data: response
      })
    }
    
    // Handle aggregated queries
    const interval = query.interval ? parseInterval(query.interval) : 60000
    
    // Use raw SQL for time bucketing (using date_trunc instead of time_bucket)
    const intervalSeconds = interval / 1000
    const aggregationFn = 
      query.aggregation === 'avg' ? 'AVG(value)' :
      query.aggregation === 'sum' ? 'SUM(value)' :
      query.aggregation === 'min' ? 'MIN(value)' :
      query.aggregation === 'max' ? 'MAX(value)' :
      'COUNT(value)'
    
    // Build dynamic WHERE conditions
    const whereConditions = ['timestamp >= $1', 'timestamp <= $2']
    const queryParams: any[] = [new Date(query.timeRange.from), new Date(query.timeRange.to)]
    
    if (query.equipmentId) {
      whereConditions.push('"equipmentId" = $3')
      queryParams.push(query.equipmentId)
    }
    
    if (query.metrics && query.metrics.length > 0) {
      const paramOffset = queryParams.length + 1
      whereConditions.push(`name IN (${query.metrics.map((_, i) => `$${paramOffset + i}`).join(',')})`)
      queryParams.push(...query.metrics)
    }
    
    const sql = `
      SELECT 
        name,
        date_trunc('minute', timestamp + interval '${Math.floor(intervalSeconds / 60)} minutes') AS time_bucket,
        ${aggregationFn} AS value
      FROM metrics
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY name, time_bucket
      ORDER BY name, time_bucket
    `
    
    const aggregatedData = await prisma.$queryRawUnsafe(sql, ...queryParams) as Array<{name: string, time_bucket: Date, value: number}>
    
    // Group by metric name
    const groupedData = aggregatedData.reduce((acc, row) => {
      if (!acc[row.name]) {
        acc[row.name] = []
      }
      acc[row.name].push([parseFloat(row.value.toString()), row.time_bucket.getTime()])
      return acc
    }, {} as Record<string, [number, number][]>)
    
    // Format response
    const response = Object.entries(groupedData).map(([name, datapoints]) => ({
      target: name,
      datapoints
    }))
    
    return NextResponse.json({
      success: true,
      data: response
    })
    
    } catch (dbError) {
      // In production mode with useLiveData, throw error instead of returning mock data
      if (query.useLiveData) {
        console.error('Database query failed:', dbError)
        return NextResponse.json({
          success: false,
          error: 'Database connection failed',
          message: 'Unable to fetch live metrics data. Please check database connection.',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        }, { status: 503 })
      }
      
      // Only return mock data if explicitly requested (for development/testing)
      console.log('Database connection failed, returning mock data (development mode)')
      return NextResponse.json(generateMockData(query))
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    
    console.error('Metrics query error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      error: 'Query failed',
      message: errorMessage
    }, { status: 500 })
  }
}

// GET endpoint for simple queries
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const equipmentId = searchParams.get('equipmentId')
  const metric = searchParams.get('metric')
  const hours = parseInt(searchParams.get('hours') || '24')
  
  const to = new Date()
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000)
  
  const where: any = {
    timestamp: { gte: from, lte: to }
  }
  
  if (equipmentId) where.equipmentId = equipmentId
  if (metric) where.name = metric
  
  const metrics = await prisma.metric.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: 1000 // Limit to prevent huge responses
  })
  
  return NextResponse.json({
    success: true,
    count: metrics.length,
    data: metrics
  })
}