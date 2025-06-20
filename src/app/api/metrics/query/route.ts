import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Validation schema for query requests
const MetricQuerySchema = z.object({
  workUnitId: z.string().optional(),
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
      
      // Group by metric name for Analytics-like response
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
      
      // Format response similar to Analytics
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

// GET endpoint for simple queries and dashboard panels
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  // Panel query parameters
  const metric = searchParams.get('metric')
  const entity = searchParams.get('entity')
  const aggregation = searchParams.get('aggregation') || 'none'
  const period = searchParams.get('period') || 'last-1h'
  const interval = searchParams.get('interval')
  const groupBy = searchParams.get('groupBy')
  const fields = searchParams.get('fields')?.split(',')
  const filter = searchParams.get('filter')
  const sort = searchParams.get('sort')
  
  // Equipment filter
  const equipment = searchParams.get('equipment')
  
  // Parse time range
  const parseTimeRange = (period: string) => {
    const now = new Date()
    const match = period.match(/^(now|last)-(\d+)([smhd])$/)
    
    if (!match) {
      return { from: new Date(now.getTime() - 60 * 60 * 1000), to: now }
    }
    
    const [, , value, unit] = match
    const multipliers: Record<string, number> = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    }
    
    const from = new Date(now.getTime() - parseInt(value) * (multipliers[unit] || 60000))
    return { from, to: now }
  }
  
  const timeRange = parseTimeRange(period)
  
  try {
    // Handle entity queries (for tables)
    if (entity) {
      switch (entity) {
        case 'equipment':
          const workUnitData = await prisma.workUnit.findMany({
            select: {
              id: true,
              name: true,
              status: true,
              updatedAt: true
            },
            orderBy: sort ? { [sort.split(':')[0]]: sort.split(':')[1] || 'asc' } : { updatedAt: 'desc' },
            take: 50
          })
          
          return NextResponse.json({
            success: true,
            rows: workUnitData.map(wu => ({
              name: wu.name,
              status: wu.status,
              lastUpdate: wu.updatedAt.toISOString()
            }))
          })
          
        case 'maintenanceSchedule':
          // Mock maintenance schedule data
          const maintenanceData = [
            { equipment: 'CNC-01', type: 'Preventive', scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), priority: 'High' },
            { equipment: 'INJ-02', type: 'Calibration', scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), priority: 'Medium' },
            { equipment: 'CNC-02', type: 'Inspection', scheduledDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), priority: 'Low' }
          ]
          
          return NextResponse.json({
            success: true,
            rows: maintenanceData
          })
      }
    }
    
    // Handle metric queries
    if (metric) {
      // Calculate aggregated value based on metric type
      const getMetricValue = (metricName: string) => {
        const baseValues: Record<string, number> = {
          'oee': 75.5,
          'availability': 88.2,
          'performance': 82.3,
          'quality': 94.8,
          'production_rate': 156,
          'cycle_time': 45.2,
          'defect_rate': 2.3,
          'health_score': 85.5,
          'mtbf': 168,
          'mttr': 4.2
        }
        
        const base = baseValues[metricName] || 50
        const variation = (Math.random() - 0.5) * 10
        return base + variation
      }
      
      // For single value metrics (gauge, stat)
      if (aggregation !== 'none' && !interval) {
        const value = getMetricValue(metric)
        
        // Add sparkline data for stat panels
        const sparkline = Array.from({ length: 20 }, (_, i) => ({
          time: new Date(timeRange.to.getTime() - (20 - i) * 3 * 60 * 1000).toISOString(),
          value: getMetricValue(metric)
        }))
        
        return NextResponse.json({
          success: true,
          value,
          unit: metric.includes('rate') ? '%' : metric.includes('time') ? 'min' : '',
          sparkline,
          max: metric === 'oee' || metric.includes('rate') ? 100 : undefined,
          thresholds: metric === 'oee' ? [
            { value: 85, color: '#10B981' },
            { value: 75, color: '#F59E0B' },
            { value: 0, color: '#EF4444' }
          ] : undefined
        })
      }
      
      // For time series data
      if (interval) {
        const intervalMs = parseInterval(interval)
        const pointCount = Math.floor((timeRange.to.getTime() - timeRange.from.getTime()) / intervalMs)
        
        const data = Array.from({ length: Math.min(pointCount, 100) }, (_, i) => ({
          time: new Date(timeRange.from.getTime() + i * intervalMs).toISOString(),
          value: getMetricValue(metric)
        }))
        
        return NextResponse.json({
          success: true,
          data,
          lines: ['value']
        })
      }
      
      // For pie chart data (defect types)
      if (groupBy === 'defect_type') {
        const defectTypes = [
          { name: 'Dimensional', value: 35 },
          { name: 'Surface Finish', value: 25 },
          { name: 'Material', value: 20 },
          { name: 'Assembly', value: 15 },
          { name: 'Other', value: 5 }
        ]
        
        return NextResponse.json({
          success: true,
          data: defectTypes
        })
      }
      
      // For heatmap data (health scores)
      if (groupBy === 'equipment') {
        const equipmentList = ['CNC-01', 'CNC-02', 'INJ-01', 'INJ-02', 'LATHE-01', 'MILL-01']
        const heatmapData = equipmentList.map(eq => ({
          label: eq,
          value: Math.floor(Math.random() * 30) + 70
        }))
        
        return NextResponse.json({
          success: true,
          data: heatmapData
        })
      }
    }
    
    // Default response
    return NextResponse.json({
      success: true,
      data: []
    })
    
  } catch (error) {
    console.error('Metrics query error:', error)
    return NextResponse.json({
      success: false,
      error: 'Query failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}