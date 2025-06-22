import { isFeatureEnabled } from '@/config/features'

export interface WebSocketMessage {
  type: 'metric' | 'alert' | 'status' | 'error'
  channel?: string
  data: any
  timestamp: string
}

export interface WebSocketConfig {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

type MessageHandler = (message: WebSocketMessage) => void
type ConnectionHandler = (event: Event) => void
type ErrorHandler = (error: Event) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private config: Required<WebSocketConfig>
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map()
  private connectionHandlers: Set<ConnectionHandler> = new Set()
  private errorHandlers: Set<ErrorHandler> = new Set()
  private reconnectAttempts = 0
  private reconnectTimeout: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isIntentionallyClosed = false

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      url: config.url || (typeof window !== 'undefined' ? this.getWebSocketUrl() : ''),
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000
    }
  }

  private getWebSocketUrl(): string {
    // Only access window on client side
    if (typeof window === 'undefined') {
      return ''
    }
    // Construct WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/ws`
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isFeatureEnabled('enableWebSocket')) {
        reject(new Error('WebSocket feature is disabled'))
        return
      }

      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      try {
        this.isIntentionallyClosed = false
        this.ws = new WebSocket(this.config.url)

        this.ws.onopen = (event) => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.notifyConnectionHandlers(event)
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onerror = (event) => {
          console.error('WebSocket error:', event)
          this.notifyErrorHandlers(event)
          reject(event)
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason)
          this.stopHeartbeat()
          
          if (!this.isIntentionallyClosed && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.isIntentionallyClosed = true
    this.stopHeartbeat()
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`)
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnect failed:', error)
      })
    }, this.config.reconnectInterval)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping', { timestamp: new Date().toISOString() })
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    // Handle global messages
    const globalHandlers = this.messageHandlers.get('*')
    if (globalHandlers) {
      globalHandlers.forEach(handler => handler(message))
    }

    // Handle channel-specific messages
    if (message.channel) {
      const channelHandlers = this.messageHandlers.get(message.channel)
      if (channelHandlers) {
        channelHandlers.forEach(handler => handler(message))
      }
    }

    // Handle type-specific messages
    const typeHandlers = this.messageHandlers.get(`type:${message.type}`)
    if (typeHandlers) {
      typeHandlers.forEach(handler => handler(message))
    }
  }

  // Subscribe to messages
  subscribe(channel: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, new Set())
    }
    
    this.messageHandlers.get(channel)!.add(handler)

    // Send subscription message if connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send('subscribe', { channel })
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(channel)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.messageHandlers.delete(channel)
          // Send unsubscribe message if connected
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.send('unsubscribe', { channel })
          }
        }
      }
    }
  }

  // Subscribe to specific metric updates
  subscribeToMetric(equipmentId: string, metricName: string, handler: MessageHandler): () => void {
    const channel = `metric:${equipmentId}:${metricName}`
    return this.subscribe(channel, handler)
  }

  // Subscribe to equipment alerts
  subscribeToAlerts(equipmentId: string, handler: MessageHandler): () => void {
    const channel = `alerts:${equipmentId}`
    return this.subscribe(channel, handler)
  }

  // Connection event handlers
  onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler)
    return () => this.connectionHandlers.delete(handler)
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }

  private notifyConnectionHandlers(event: Event): void {
    this.connectionHandlers.forEach(handler => handler(event))
  }

  private notifyErrorHandlers(event: Event): void {
    this.errorHandlers.forEach(handler => handler(event))
  }

  // Send message
  send(type: string, data: any): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected')
      return
    }

    const message: WebSocketMessage = {
      type: type as any,
      data,
      timestamp: new Date().toISOString()
    }

    this.ws.send(JSON.stringify(message))
  }

  // Get connection state
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get readyState(): number {
    return this.ws?.readyState || WebSocket.CLOSED
  }
}

// Create singleton instance
// Create singleton only on client side
export const websocketService = typeof window !== 'undefined' ? new WebSocketService() : null!

// React hook for WebSocket
export function useWebSocket(channel: string, handler: MessageHandler) {
  const [isConnected, setIsConnected] = useState(false)
  
  useEffect(() => {
    // Connect if not already connected
    if (!websocketService.isConnected) {
      websocketService.connect().catch(console.error)
    }

    // Subscribe to channel
    const unsubscribe = websocketService.subscribe(channel, handler)

    // Monitor connection state
    const unsubscribeConnect = websocketService.onConnect(() => setIsConnected(true))
    const unsubscribeError = websocketService.onError(() => setIsConnected(false))

    // Initial state
    setIsConnected(websocketService.isConnected)

    return () => {
      unsubscribe()
      unsubscribeConnect()
      unsubscribeError()
    }
  }, [channel, handler])

  return { isConnected, send: websocketService.send.bind(websocketService) }
}

// Export for testing
export { WebSocketService }

// Type exports
export type { MessageHandler, ConnectionHandler, ErrorHandler }

// React hooks moved to separate hook file