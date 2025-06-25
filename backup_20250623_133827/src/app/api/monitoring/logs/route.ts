import { NextRequest, NextResponse } from 'next/server'
import { queryLoki } from '@/app/monitoring/actions'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const source = searchParams.get('source') || 'all'
    const level = searchParams.get('level') || 'all'
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // Build Loki query
    let query = '{job="containerlogs"}'
    
    if (source !== 'all') {
      query = `{job="containerlogs",container="${source}"}`
    }
    
    if (level !== 'all') {
      query += ` |= "${level.toUpperCase()}"`
    }

    // Query Loki
    try {
      const lokiResponse = await queryLoki(query, limit)
      
      // Transform Loki response to our log format
      const logs = lokiResponse.data.result.flatMap((stream: any) => 
        stream.values.map(([timestamp, line]: [string, string]) => {
          // Parse log line (assuming structured logs)
          const match = line.match(/\[(.*?)\] \[(.*?)\] (.*)/)
          const level = match?.[2]?.toLowerCase() || 'info'
          const message = match?.[3] || line
          
          return {
            timestamp: new Date(parseInt(timestamp) / 1000000), // nanoseconds to ms
            level: level as 'debug' | 'info' | 'warn' | 'error',
            source: stream.stream.container || 'unknown',
            message,
          }
        })
      ).sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime())

      return NextResponse.json({ logs })
    } catch (lokiError) {
      console.warn('Loki query failed, returning mock data:', lokiError)
      
      // Return mock data if Loki is not available
      const mockLogs = generateMockLogs(source, level, limit)
      return NextResponse.json({ logs: mockLogs })
    }
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}

// Generate mock logs for development/demo
function generateMockLogs(source: string, level: string, limit: number) {
  const sources = source === 'all' 
    ? ['manufacturing-api', 'postgres', 'prometheus', 'analyticsPlatform', 'alertmanager']
    : [source]
    
  const levels = level === 'all'
    ? ['debug', 'info', 'warn', 'error']
    : [level]
    
  const messages = {
    'manufacturing-api': [
      'Processing equipment metrics batch',
      'OEE calculation completed for equipment-001',
      'API request: GET /api/equipment',
      'Database connection pool size: 10/20',
      'WebSocket client connected',
    ],
    'postgres': [
      'Executing query: SELECT * FROM performance_metrics',
      'Connection from 172.18.0.3',
      'Autovacuum: table "production_metrics"',
      'Checkpoint complete',
    ],
    'prometheus': [
      'Scrape target up: manufacturing-api:3000',
      'Rule evaluation completed',
      'Alert ManufacturingOEELow is firing',
      'Compaction completed',
    ],
    'analyticsPlatform': [
      'Dashboard query executed',
      'User admin logged in',
      'Panel refresh: Manufacturing Overview',
      'Alert notification sent',
    ],
    'alertmanager': [
      'Alert received: ManufacturingOEELow',
      'Notification sent to slack',
      'Alert resolved: HighMemoryUsage',
      'Silence created by user admin',
    ],
  }
  
  const logs = []
  const now = Date.now()
  
  for (let i = 0; i < limit; i++) {
    const randomSource = sources[Math.floor(Math.random() * sources.length)]
    const randomLevel = levels[Math.floor(Math.random() * levels.length)]
    const sourceMessages = messages[randomSource as keyof typeof messages] || ['Generic log message']
    const randomMessage = sourceMessages[Math.floor(Math.random() * sourceMessages.length)]
    
    logs.push({
      timestamp: new Date(now - (limit - i) * 1000), // Chronological order
      level: randomLevel as 'debug' | 'info' | 'warn' | 'error',
      source: randomSource,
      message: randomMessage,
      metadata: Math.random() > 0.7 ? {
        equipmentId: `equipment-${Math.floor(Math.random() * 10).toString().padStart(3, '0')}`,
        duration: Math.floor(Math.random() * 1000),
      } : undefined,
    })
  }
  
  return logs
}