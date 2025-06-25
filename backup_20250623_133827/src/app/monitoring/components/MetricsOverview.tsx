'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'

interface MetricData {
  timestamp: string
  value: number
  label?: string
}

interface Metric {
  name: string
  current: number
  previous: number
  unit: string
  data: MetricData[]
}

export function MetricsOverview() {
  const [selectedMetric, setSelectedMetric] = useState('oee')
  const [timeRange, setTimeRange] = useState('1h')
  const [metrics, setMetrics] = useState<Record<string, Metric>>({
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
  })
  const [isLoading, setIsLoading] = useState(true)

  // Fetch metrics data
  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/monitoring/metrics?range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [timeRange])

  const currentMetric = metrics[selectedMetric]
  const trend = currentMetric.current - currentMetric.previous
  const trendPercent = currentMetric.previous > 0 
    ? ((trend / currentMetric.previous) * 100).toFixed(1)
    : '0'

  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const chartConfig = {
    margin: { top: 10, right: 10, left: 10, bottom: 30 },
    strokeWidth: 2,
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Manufacturing Metrics</h2>
        <div className="flex items-center gap-2">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oee">OEE</SelectItem>
              <SelectItem value="availability">Availability</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
              <SelectItem value="production">Production Rate</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">Last 5 min</SelectItem>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={fetchMetrics}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            aria-label="Refresh metrics"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Current Value Display */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">
            {currentMetric.current.toFixed(1)}
          </span>
          <span className="text-lg text-muted-foreground">
            {currentMetric.unit}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {getTrendIcon()}
          <span className={`text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trendPercent}%
          </span>
          <span className="text-sm text-muted-foreground">
            vs previous period
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {selectedMetric === 'production' ? (
              <BarChart data={currentMetric.data} {...chartConfig}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return timeRange === '5m' || timeRange === '1h' 
                      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: number) => [`${value} ${currentMetric.unit}`, currentMetric.name]}
                />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            ) : (
              <AreaChart data={currentMetric.data} {...chartConfig}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return timeRange === '5m' || timeRange === '1h' 
                      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: number) => [`${value}${currentMetric.unit}`, currentMetric.name]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}