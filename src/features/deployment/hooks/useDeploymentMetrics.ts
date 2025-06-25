/**
 * Custom hook for real-time deployment metrics
 * Implements proper data fetching patterns with SWR
 */

import useSWR from 'swr'
import { useCallback, useEffect, useState } from 'react'
import type { DeploymentMetrics } from '../types'

interface UseDeploymentMetricsOptions {
  refreshInterval?: number
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
}

const METRICS_ENDPOINT = '/api/deployment/metrics'

// Fetcher with proper error handling
const metricsFetcher = async (url: string): Promise<DeploymentMetrics> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    // Use cache for performance
    next: { revalidate: 30 } // 30 seconds cache
  })

  if (!response.ok) {
    const error = new Error('Failed to fetch metrics')
    // Attach response info to error
    ;(error as any).info = await response.json()
    ;(error as any).status = response.status
    throw error
  }

  return response.json()
}

export function useDeploymentMetrics(options: UseDeploymentMetricsOptions = {}) {
  const {
    refreshInterval = 30000, // 30 seconds default
    revalidateOnFocus = true,
    revalidateOnReconnect = true
  } = options

  const [isSubscribed, setIsSubscribed] = useState(false)

  const {
    data: metrics,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR<DeploymentMetrics>(
    METRICS_ENDPOINT,
    metricsFetcher,
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect,
      // Optimistic UI updates
      revalidateIfStale: false,
      revalidateOnMount: true,
      // Error retry with exponential backoff
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Dedupe requests
      dedupingInterval: 2000,
    }
  )

  // Subscribe to real-time updates via WebSocket
  useEffect(() => {
    if (!isSubscribed) return

    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001')
    
    ws.onopen = () => {
      console.log('WebSocket connected for metrics')
      ws.send(JSON.stringify({ 
        type: 'subscribe', 
        channel: 'deployment.metrics' 
      }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'metrics.update') {
          // Optimistically update the data
          mutate(data.metrics, false)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }

    return () => {
      ws.close()
    }
  }, [isSubscribed, mutate])

  // Manual refresh function
  const refresh = useCallback(() => {
    return mutate()
  }, [mutate])

  // Subscribe/unsubscribe to real-time updates
  const subscribe = useCallback(() => {
    setIsSubscribed(true)
  }, [])

  const unsubscribe = useCallback(() => {
    setIsSubscribed(false)
  }, [])

  // Calculate derived metrics
  const derivedMetrics = metrics ? {
    averageDeploymentTime: calculateAverage(metrics.avgDeploymentTime),
    currentSuccessRate: getCurrentValue(metrics.successRate),
    deploymentTrend: calculateTrend(metrics.deploymentRate),
    errorTrend: calculateTrend(metrics.errorRate),
    isHealthy: getCurrentValue(metrics.successRate) > 95
  } : null

  return {
    metrics,
    derivedMetrics,
    error,
    isLoading,
    isValidating,
    refresh,
    subscribe,
    unsubscribe,
    isSubscribed
  }
}

// Helper functions for metric calculations
function calculateAverage(dataPoints: { value: number }[]): number {
  if (!dataPoints || dataPoints.length === 0) return 0
  const sum = dataPoints.reduce((acc, point) => acc + point.value, 0)
  return sum / dataPoints.length
}

function getCurrentValue(dataPoints: { value: number }[]): number {
  if (!dataPoints || dataPoints.length === 0) return 0
  return dataPoints[dataPoints.length - 1].value
}

function calculateTrend(dataPoints: { value: number }[]): 'up' | 'down' | 'stable' {
  if (!dataPoints || dataPoints.length < 2) return 'stable'
  
  const recent = dataPoints.slice(-5) // Last 5 data points
  const firstValue = recent[0].value
  const lastValue = recent[recent.length - 1].value
  
  const percentChange = ((lastValue - firstValue) / firstValue) * 100
  
  if (percentChange > 5) return 'up'
  if (percentChange < -5) return 'down'
  return 'stable'
}

// Export helper hook for specific metrics
export function useDeploymentSuccessRate() {
  const { metrics, isLoading, error } = useDeploymentMetrics({
    refreshInterval: 60000 // 1 minute for success rate
  })

  return {
    successRate: metrics ? getCurrentValue(metrics.successRate) : null,
    trend: metrics ? calculateTrend(metrics.successRate) : null,
    isLoading,
    error
  }
}