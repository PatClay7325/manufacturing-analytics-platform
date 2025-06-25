'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Download, RefreshCw, Pause, Play, Filter } from 'lucide-react'
import { format } from 'date-fns'

interface LogEntry {
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error'
  source: string
  message: string
  metadata?: Record<string, any>
}

const LOG_SOURCES = [
  { value: 'all', label: 'All Sources' },
  { value: 'manufacturing-api', label: 'Manufacturing API' },
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'prometheus', label: 'Prometheus' },
  { value: 'analyticsPlatform', label: 'AnalyticsPlatform' },
  { value: 'alertmanager', label: 'AlertManager' },
]

const LOG_LEVELS = [
  { value: 'all', label: 'All Levels' },
  { value: 'debug', label: 'Debug', color: 'text-gray-500' },
  { value: 'info', label: 'Info', color: 'text-blue-500' },
  { value: 'warn', label: 'Warning', color: 'text-yellow-500' },
  { value: 'error', label: 'Error', color: 'text-red-500' },
]

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')
  const [level, setLevel] = useState('all')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Fetch initial logs
  useEffect(() => {
    fetchLogs()
  }, [source, level])

  // Start/stop log streaming
  useEffect(() => {
    if (!isStreaming) return

    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/logs')
    
    ws.onmessage = (event) => {
      try {
        const logEntry = JSON.parse(event.data)
        
        // Apply filters
        if (source !== 'all' && logEntry.source !== source) return
        if (level !== 'all' && logEntry.level !== level) return
        
        setLogs(prev => [...prev, logEntry].slice(-1000)) // Keep last 1000 logs
        
        // Auto-scroll to bottom
        if (autoScroll && scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
        }
      } catch (error) {
        console.error('Failed to parse log entry:', error)
      }
    }

    return () => {
      ws.close()
    }
  }, [isStreaming, source, level, autoScroll])

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        ...(source !== 'all' && { source }),
        ...(level !== 'all' && { level }),
        limit: '100',
      })
      
      const response = await fetch(`/api/monitoring/logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => 
    search === '' || 
    log.message.toLowerCase().includes(search.toLowerCase()) ||
    log.source.toLowerCase().includes(search.toLowerCase())
  )

  const getLevelBadge = (level: string) => {
    const config = LOG_LEVELS.find(l => l.value === level)
    return (
      <Badge 
        variant={level === 'error' ? 'destructive' : level === 'warn' ? 'warning' : 'secondary'}
        className="font-mono text-xs"
      >
        {level.toUpperCase()}
      </Badge>
    )
  }

  const downloadLogs = () => {
    const content = filteredLogs.map(log => 
      `[${format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
    ).join('\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${format(new Date(), 'yyyyMMdd-HHmmss')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOG_SOURCES.map(src => (
              <SelectItem key={src.value} value={src.value}>
                {src.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOG_LEVELS.map(lvl => (
              <SelectItem key={lvl.value} value={lvl.value}>
                <span className={lvl.color}>{lvl.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex gap-2">
          <Button
            variant={isStreaming ? 'default' : 'outline'}
            size="icon"
            onClick={() => setIsStreaming(!isStreaming)}
            title={isStreaming ? 'Stop streaming' : 'Start streaming'}
          >
            {isStreaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLogs}
            disabled={isLoading}
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={downloadLogs}
            title="Download logs"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Total: {filteredLogs.length} logs</span>
        <span>•</span>
        <span>Errors: {filteredLogs.filter(l => l.level === 'error').length}</span>
        <span>•</span>
        <span>Warnings: {filteredLogs.filter(l => l.level === 'warn').length}</span>
        {isStreaming && (
          <>
            <span>•</span>
            <span className="text-green-600 flex items-center gap-1">
              <span className="h-2 w-2 bg-green-600 rounded-full animate-pulse" />
              Live
            </span>
          </>
        )}
      </div>

      {/* Log entries */}
      <Card className="p-0">
        <ScrollArea 
          className="h-[500px] font-mono text-sm" 
          ref={scrollAreaRef}
        >
          <div className="p-4 space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isLoading ? 'Loading logs...' : 'No logs found'}
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={`py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    log.level === 'error' ? 'bg-red-50 dark:bg-red-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                    </span>
                    {getLevelBadge(log.level)}
                    <Badge variant="outline" className="text-xs">
                      {log.source}
                    </Badge>
                    <span className="flex-1 break-all">
                      {log.message}
                    </span>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-1 ml-32 text-xs text-muted-foreground">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Auto-scroll toggle */}
      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          Auto-scroll to bottom
        </label>
      </div>
    </div>
  )
}