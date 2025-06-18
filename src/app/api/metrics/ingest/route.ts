import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Validation schema for incoming metrics
const MetricIngestionSchema = z.object({
  equipmentId: z.string(),
  metrics: z.array(z.object({
    name: z.string(),
    value: z.number(),
    unit: z.string().optional(),
    tags: z.record(z.string(), z.any()).optional(),
    timestamp: z.string().datetime().optional()
  }))
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedData = MetricIngestionSchema.parse(body)
    
    // Prepare metrics for insertion
    const metricsToInsert = validatedData.metrics.map(metric => ({
      equipmentId: validatedData.equipmentId,
      name: metric.name,
      value: metric.value,
      unit: metric.unit,
      tags: metric.tags || {},
      timestamp: metric.timestamp ? new Date(metric.timestamp) : new Date(),
      source: 'api'
    }))
    
    // Insert metrics in batch
    const result = await prisma.metric.createMany({
      data: metricsToInsert
    })
    
    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${result.count} metrics`,
      count: result.count
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    
    console.error('Metrics ingestion error:', error)
    
    // More detailed error response for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: errorMessage,
      // Include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      status: 'healthy',
      service: 'metrics-ingestion',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      service: 'metrics-ingestion',
      error: 'Database connection failed'
    }, { status: 503 })
  }
}