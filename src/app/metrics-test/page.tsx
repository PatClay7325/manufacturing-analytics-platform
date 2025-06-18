'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card } from '@/components/common/Card'
import FeatureStatus from './feature-status'

// Chart components temporarily disabled - need to implement new chart library
const TimeSeriesChart = () => (
  <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
    <p className="text-gray-500">Time Series Chart - Implementation Pending</p>
  </div>
)

const GaugeChart = () => (
  <div className="h-48 bg-gray-100 rounded flex items-center justify-center">
    <p className="text-gray-500">Gauge Chart - Implementation Pending</p>
  </div>
)

interface MetricData {
  target: string
  datapoints: [number, number][]
}

export default function MetricsTestPage() {
  // Force recompilation
  const [metrics, setMetrics] = useState<MetricData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aggregation, setAggregation] = useState('none')
  const [interval, setInterval] = useState('5m')
  const [selectedMetrics, setSelectedMetrics] = useState(['temperature', 'pressure'])
  const [timeRange, setTimeRange] = useState('1h')

  const availableMetrics = ['temperature', 'pressure', 'vibration', 'production_count']
  const aggregationTypes = ['none', 'avg', 'min', 'max', 'sum', 'count']
  const intervals = ['1m', '5m', '10m', '30m', '1h']
  const timeRanges = ['1h', '6h', '12h', '24h', '48h']

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)

    const now = new Date()
    const hours = parseInt(timeRange)
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000)

    try {
      const response = await fetch('/api/metrics/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: 'test-equipment-001',
          metrics: selectedMetrics,
          timeRange: {
            from: from.toISOString(),
            to: now.toISOString()
          },
          aggregation,
          interval: aggregation !== 'none' ? interval : undefined
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setMetrics(result.data || [])
      } else {
        setError(result.error || 'Failed to fetch metrics')
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [aggregation, interval, selectedMetrics.join(','), timeRange])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getLatestValue = (datapoints: [number, number][]) => {
    if (!datapoints || datapoints.length === 0) return 'N/A'
    return datapoints[datapoints.length - 1][0].toFixed(2)
  }

  const getMetricStats = (datapoints: [number, number][]) => {
    if (!datapoints || datapoints.length === 0) return { min: 0, max: 0, avg: 0 }
    
    const values = datapoints.map(dp => dp[0])
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    
    return { min, max, avg }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Metrics API Test Page</h1>
      
      {/* Controls */}
      <Card className="mb-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Query Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeRanges.map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>

            {/* Aggregation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aggregation
              </label>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {aggregationTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interval {aggregation === 'none' && '(disabled)'}
              </label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                disabled={aggregation === 'none'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                {intervals.map(int => (
                  <option key={int} value={int}>{int}</option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <button
                onClick={fetchMetrics}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Metric Selection */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Metrics
            </label>
            <div className="flex flex-wrap gap-2">
              {availableMetrics.map(metric => (
                <label key={metric} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMetrics([...selectedMetrics, metric])
                      } else {
                        setSelectedMetrics(selectedMetrics.filter(m => m !== metric))
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{metric}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-8">
          Error: {error}
        </div>
      )}

      {/* Metrics Display with Highcharts */}
      <div className="space-y-6">
        {/* Time Series Chart */}
        {metrics.length > 0 && (
          <Card>
            <div className="p-6">
              <TimeSeriesChart
                data={metrics}
                title="Metrics Overview"
                subtitle={`${aggregation === 'none' ? 'Raw' : aggregation.toUpperCase()} data${aggregation !== 'none' ? ` (${interval} intervals)` : ''}`}
                height={400}
                enableZoom={true}
                chartType={selectedMetrics.includes('production_count') ? 'column' : 'line'}
              />
            </div>
          </Card>
        )}

        {/* Individual Metric Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {metrics.map((metric) => {
            const stats = getMetricStats(metric.datapoints)
            const isTemperature = metric.target === 'temperature'
            const isPressure = metric.target === 'pressure'
            
            return (
              <Card key={metric.target}>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {metric.target}
                  </h3>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
                    <div>
                      <span className="text-gray-500">Latest:</span>
                      <p className="font-semibold">{getLatestValue(metric.datapoints)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Min:</span>
                      <p className="font-semibold">{stats.min.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Max:</span>
                      <p className="font-semibold">{stats.max.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Avg:</span>
                      <p className="font-semibold">{stats.avg.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Gauge Chart for Temperature and Pressure */}
                  {(isTemperature || isPressure) && metric.datapoints.length > 0 && (
                    <div className="mb-4">
                      <GaugeChart
                        value={parseFloat(getLatestValue(metric.datapoints))}
                        min={isTemperature ? 0 : 0}
                        max={isTemperature ? 100 : 10}
                        title=""
                        unit={isTemperature ? '°C' : 'bar'}
                        bands={isTemperature ? [
                          { from: 0, to: 60, color: '#55BF3B' },
                          { from: 60, to: 80, color: '#DDDF0D' },
                          { from: 80, to: 100, color: '#DF5353' }
                        ] : [
                          { from: 0, to: 3, color: '#55BF3B' },
                          { from: 3, to: 5, color: '#DDDF0D' },
                          { from: 5, to: 10, color: '#DF5353' }
                        ]}
                        height={200}
                      />
                    </div>
                  )}

                  {/* Mini Time Series */}
                  <TimeSeriesChart
                    data={[metric]}
                    title=""
                    height={200}
                    enableZoom={false}
                    chartType="area"
                  />
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* API Info */}
      <Card className="mt-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">API Information</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Endpoint:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">/api/metrics/query</code>
            </p>
            <p>
              <span className="font-semibold">Equipment ID:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">test-equipment-001</code>
            </p>
            <p>
              <span className="font-semibold">Data Source:</span>{' '}
              PostgreSQL via Prisma ORM
            </p>
            <p className="text-gray-600">
              This page demonstrates the new metrics API that will replace Grafana's backend.
              All queries go through our custom API endpoints and use PostgreSQL for storage.
            </p>
          </div>
        </div>
      </Card>

      {/* Feature Status */}
      <div className="mt-8">
        <FeatureStatus />
      </div>
    </div>
  )
}