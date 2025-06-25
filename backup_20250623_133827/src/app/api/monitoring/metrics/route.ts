import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface MetricPoint {
  timestamp: string
  value: number
}

interface MetricData {
  name: string
  current: number
  previous: number
  unit: string
  data: MetricPoint[]
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const range = searchParams.get('range') || '1h'
    
    // Calculate time range
    const now = new Date()
    let startTime = new Date()
    
    switch (range) {
      case '5m':
        startTime = new Date(now.getTime() - 5 * 60 * 1000)
        break
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
    }

    // Fetch performance metrics
    const performanceMetrics = await prisma.performanceMetrics.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lte: now,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
      include: {
        workUnit: true,
      },
    })

    // Fetch production metrics
    const productionMetrics = await prisma.productionMetrics.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lte: now,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    })

    // Process metrics data
    const metricsMap: Record<string, MetricData> = {
      oee: {
        name: 'Overall Equipment Effectiveness',
        current: 0,
        previous: 0,
        unit: '%',
        data: [],
      },
      availability: {
        name: 'Availability',
        current: 0,
        previous: 0,
        unit: '%',
        data: [],
      },
      performance: {
        name: 'Performance',
        current: 0,
        previous: 0,
        unit: '%',
        data: [],
      },
      quality: {
        name: 'Quality',
        current: 0,
        previous: 0,
        unit: '%',
        data: [],
      },
      production: {
        name: 'Production Rate',
        current: 0,
        previous: 0,
        unit: 'units/hr',
        data: [],
      },
    }

    // Aggregate performance metrics
    if (performanceMetrics.length > 0) {
      // Group by time intervals
      const interval = range === '5m' ? 60000 : // 1 minute
                      range === '1h' ? 300000 : // 5 minutes
                      range === '6h' ? 1800000 : // 30 minutes
                      range === '24h' ? 3600000 : // 1 hour
                      86400000 // 1 day

      const groupedMetrics = new Map<number, typeof performanceMetrics>()
      
      performanceMetrics.forEach(metric => {
        const timeSlot = Math.floor(metric.timestamp.getTime() / interval) * interval
        if (!groupedMetrics.has(timeSlot)) {
          groupedMetrics.set(timeSlot, [])
        }
        groupedMetrics.get(timeSlot)!.push(metric)
      })

      // Calculate averages for each time slot
      groupedMetrics.forEach((metrics, timeSlot) => {
        const avgOee = metrics.reduce((sum, m) => sum + (m.oee || 0), 0) / metrics.length
        const avgAvailability = metrics.reduce((sum, m) => sum + (m.availability || 0), 0) / metrics.length
        const avgPerformance = metrics.reduce((sum, m) => sum + (m.performance || 0), 0) / metrics.length
        const avgQuality = metrics.reduce((sum, m) => sum + (m.quality || 0), 0) / metrics.length

        const timestamp = new Date(timeSlot).toISOString()

        metricsMap.oee.data.push({ timestamp, value: Number(avgOee.toFixed(1)) })
        metricsMap.availability.data.push({ timestamp, value: Number(avgAvailability.toFixed(1)) })
        metricsMap.performance.data.push({ timestamp, value: Number(avgPerformance.toFixed(1)) })
        metricsMap.quality.data.push({ timestamp, value: Number(avgQuality.toFixed(1)) })
      })

      // Set current values (last data point)
      const lastMetric = performanceMetrics[performanceMetrics.length - 1]
      metricsMap.oee.current = Number((lastMetric.oee || 0).toFixed(1))
      metricsMap.availability.current = Number((lastMetric.availability || 0).toFixed(1))
      metricsMap.performance.current = Number((lastMetric.performance || 0).toFixed(1))
      metricsMap.quality.current = Number((lastMetric.quality || 0).toFixed(1))

      // Set previous values (compare with previous period)
      const midPoint = Math.floor(performanceMetrics.length / 2)
      if (midPoint > 0) {
        const midMetrics = performanceMetrics.slice(0, midPoint)
        metricsMap.oee.previous = midMetrics.reduce((sum, m) => sum + (m.oee || 0), 0) / midMetrics.length
        metricsMap.availability.previous = midMetrics.reduce((sum, m) => sum + (m.availability || 0), 0) / midMetrics.length
        metricsMap.performance.previous = midMetrics.reduce((sum, m) => sum + (m.performance || 0), 0) / midMetrics.length
        metricsMap.quality.previous = midMetrics.reduce((sum, m) => sum + (m.quality || 0), 0) / midMetrics.length
      }
    }

    // Process production metrics
    if (productionMetrics.length > 0) {
      const interval = range === '5m' ? 300000 : // 5 minutes
                      range === '1h' ? 900000 : // 15 minutes
                      3600000 // 1 hour

      const groupedProduction = new Map<number, typeof productionMetrics>()
      
      productionMetrics.forEach(metric => {
        const timeSlot = Math.floor(metric.timestamp.getTime() / interval) * interval
        if (!groupedProduction.has(timeSlot)) {
          groupedProduction.set(timeSlot, [])
        }
        groupedProduction.get(timeSlot)!.push(metric)
      })

      // Calculate production rate for each time slot
      groupedProduction.forEach((metrics, timeSlot) => {
        const totalUnits = metrics.reduce((sum, m) => sum + (m.unitsProduced || 0), 0)
        const hourlyRate = (totalUnits / metrics.length) * (3600000 / interval)
        
        metricsMap.production.data.push({
          timestamp: new Date(timeSlot).toISOString(),
          value: Math.round(hourlyRate),
        })
      })

      // Set current production rate
      if (metricsMap.production.data.length > 0) {
        metricsMap.production.current = metricsMap.production.data[metricsMap.production.data.length - 1].value
        
        // Set previous rate
        const midPoint = Math.floor(metricsMap.production.data.length / 2)
        if (midPoint > 0) {
          const previousData = metricsMap.production.data.slice(0, midPoint)
          metricsMap.production.previous = previousData.reduce((sum, d) => sum + d.value, 0) / previousData.length
        }
      }
    }

    return NextResponse.json(metricsMap)
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}