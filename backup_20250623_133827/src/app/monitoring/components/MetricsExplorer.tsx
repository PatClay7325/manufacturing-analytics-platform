'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Search, Play, Save, History, HelpCircle } from 'lucide-react'

interface QueryResult {
  metric: string
  data: Array<{
    timestamp: number
    value: number
  }>
}

const COMMON_QUERIES = [
  { label: 'Average OEE', query: 'avg(manufacturing_oee_score)' },
  { label: 'Equipment Availability', query: 'manufacturing_availability' },
  { label: 'Production Rate', query: 'rate(manufacturing_units_produced_total[5m])' },
  { label: 'Error Rate', query: 'rate(http_requests_total{status=~"5.."}[5m])' },
  { label: 'Response Time P95', query: 'histogram_quantile(0.95, http_request_duration_seconds_bucket)' },
  { label: 'Active Alerts', query: 'ALERTS{alertstate="firing"}' },
]

export function MetricsExplorer() {
  const [query, setQuery] = useState('')
  const [timeRange, setTimeRange] = useState('1h')
  const [results, setResults] = useState<QueryResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedQueries, setSavedQueries] = useState<Array<{ name: string; query: string }>>([])

  const executeQuery = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/monitoring/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, timeRange }),
      })

      if (!response.ok) {
        throw new Error('Query failed')
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed')
      // Use mock data for demo
      setResults(generateMockResults(query))
    } finally {
      setIsLoading(false)
    }
  }

  const saveQuery = () => {
    const name = prompt('Enter a name for this query:')
    if (name && query) {
      setSavedQueries(prev => [...prev, { name, query }])
    }
  }

  const loadQuery = (savedQuery: string) => {
    setQuery(savedQuery)
  }

  // Generate mock results for demo
  const generateMockResults = (query: string): QueryResult[] => {
    const now = Date.now()
    const points = 60
    const interval = timeRange === '5m' ? 5000 : 
                    timeRange === '1h' ? 60000 :
                    timeRange === '24h' ? 1440000 : 60000

    const data = Array.from({ length: points }, (_, i) => ({
      timestamp: now - (points - i) * interval,
      value: Math.random() * 100,
    }))

    return [{
      metric: query,
      data,
    }]
  }

  return (
    <div className="space-y-4">
      {/* Query Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Textarea
            placeholder="Enter PromQL query (e.g., manufacturing_oee_score{equipment_id='equip-001'})"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                executeQuery()
              }
            }}
            className="font-mono text-sm"
            rows={3}
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">Last 5 minutes</SelectItem>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={executeQuery} disabled={isLoading} className="gap-2">
            <Play className="h-4 w-4" />
            Execute
          </Button>
          
          <Button variant="outline" onClick={saveQuery} disabled={!query}>
            <Save className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon" title="PromQL help">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Common Queries */}
      <Card className="p-4">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <History className="h-4 w-4" />
          Common Queries
        </h4>
        <div className="flex flex-wrap gap-2">
          {COMMON_QUERIES.map((cq) => (
            <Button
              key={cq.label}
              variant="outline"
              size="sm"
              onClick={() => loadQuery(cq.query)}
            >
              {cq.label}
            </Button>
          ))}
        </div>
        
        {savedQueries.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium mb-2">Saved Queries</h5>
            <div className="flex flex-wrap gap-2">
              {savedQueries.map((sq, idx) => (
                <Button
                  key={idx}
                  variant="secondary"
                  size="sm"
                  onClick={() => loadQuery(sq.query)}
                >
                  {sq.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            Error: {error}
          </p>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-4">Query Results</h4>
          <div className="space-y-4">
            {results.map((result, idx) => (
              <div key={idx}>
                <h5 className="text-sm font-medium mb-2">{result.metric}</h5>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(ts) => new Date(ts).toLocaleString()}
                        formatter={(value: number) => value.toFixed(2)}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}