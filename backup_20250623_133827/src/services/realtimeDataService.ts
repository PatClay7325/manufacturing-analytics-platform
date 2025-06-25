/**
 * Real-time Data Service with WebSocket streaming and persistence
 * Implements Phase 1.1: Data Connectivity & Persistence
 */

import { websocketService, WebSocketMessage } from './websocketService';
import { EventEmitter } from 'events';

export interface MetricDataPoint {
  timestamp: string;
  equipmentId: string;
  metric: string;
  value: number;
  quality?: 'good' | 'bad' | 'uncertain';
  metadata?: Record<string, any>;
}

export interface HistoricalDataRequest {
  metrics: string[];
  equipmentIds?: string[];
  startTime: string;
  endTime: string;
  interval?: '1s' | '5s' | '1m' | '5m' | '1h';
  aggregation?: 'avg' | 'max' | 'min' | 'sum' | 'last';
}

export interface DataStreamConfig {
  metrics: string[];
  equipmentIds?: string[];
  bufferSize?: number;
  persistLocal?: boolean;
  backfillOnConnect?: boolean;
}

interface StreamBuffer {
  [key: string]: MetricDataPoint[];
}

class RealTimeDataService extends EventEmitter {
  private static instance: RealTimeDataService;
  private streamBuffers: StreamBuffer = {};
  private subscriptions = new Map<string, DataStreamConfig>();
  private localStorageKey = 'manufacturing_realtime_buffer';
  private maxBufferSize = 1000;
  private isConnected = false;
  private fallbackPollInterval: NodeJS.Timeout | null = null;
  private connectionRetries = 0;
  private maxRetries = 10;

  private constructor() {
    super();
    this.initializeService();
  }

  public static getInstance(): RealTimeDataService {
    if (!RealTimeDataService.instance) {
      RealTimeDataService.instance = new RealTimeDataService();
    }
    return RealTimeDataService.instance;
  }

  private initializeService(): void {
    // Load persisted data from localStorage
    this.loadPersistedData();

    // Set up WebSocket handlers
    if (websocketService) {
      websocketService.onConnect(() => {
        this.isConnected = true;
        this.connectionRetries = 0;
        this.stopFallbackPolling();
        this.emit('connected');
        
        // Backfill data for all active subscriptions
        this.backfillAllSubscriptions();
      });

      websocketService.onError(() => {
        this.isConnected = false;
        this.emit('disconnected');
        this.handleConnectionFailure();
      });
    }
  }

  private loadPersistedData(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.streamBuffers = data.buffers || {};
        
        // Clean old data (older than 24 hours)
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        Object.keys(this.streamBuffers).forEach(key => {
          this.streamBuffers[key] = this.streamBuffers[key].filter(
            point => point.timestamp > cutoffTime
          );
        });
      }
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  }

  private persistData(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const dataToStore = {
        buffers: this.streamBuffers,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(this.localStorageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Failed to persist data:', error);
      // If localStorage is full, clear old data
      this.pruneOldData();
    }
  }

  private pruneOldData(): void {
    const cutoffTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // Keep only last hour
    Object.keys(this.streamBuffers).forEach(key => {
      this.streamBuffers[key] = this.streamBuffers[key]
        .filter(point => point.timestamp > cutoffTime)
        .slice(-100); // Keep max 100 points per metric
    });
    this.persistData();
  }

  private handleConnectionFailure(): void {
    this.connectionRetries++;
    
    if (this.connectionRetries >= this.maxRetries) {
      console.warn('Max WebSocket retries reached, falling back to polling');
      this.startFallbackPolling();
    }
  }

  private startFallbackPolling(): void {
    if (this.fallbackPollInterval) return;

    const pollInterval = 5000; // 5 seconds
    this.fallbackPollInterval = setInterval(async () => {
      try {
        await this.pollLatestData();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, pollInterval);

    // Initial poll
    this.pollLatestData();
  }

  private stopFallbackPolling(): void {
    if (this.fallbackPollInterval) {
      clearInterval(this.fallbackPollInterval);
      this.fallbackPollInterval = null;
    }
  }

  private async pollLatestData(): Promise<void> {
    const activeMetrics = new Set<string>();
    const activeEquipment = new Set<string>();

    // Collect all active metrics and equipment
    this.subscriptions.forEach(config => {
      config.metrics.forEach(metric => activeMetrics.add(metric));
      config.equipmentIds?.forEach(id => activeEquipment.add(id));
    });

    if (activeMetrics.size === 0) return;

    try {
      const response = await fetch('/api/metrics/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: Array.from(activeMetrics),
          equipmentIds: Array.from(activeEquipment),
          limit: 10 // Get last 10 data points per metric
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          data.forEach(point => this.handleDataPoint(point));
        }
      }
    } catch (error) {
      console.error('Failed to poll data:', error);
    }
  }

  private async backfillAllSubscriptions(): Promise<void> {
    const promises = Array.from(this.subscriptions.entries()).map(
      ([id, config]) => this.backfillSubscription(id, config)
    );
    await Promise.all(promises);
  }

  private async backfillSubscription(id: string, config: DataStreamConfig): Promise<void> {
    if (!config.backfillOnConnect) return;

    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // Last hour

    try {
      const history = await this.fetchHistory({
        metrics: config.metrics,
        equipmentIds: config.equipmentIds,
        startTime,
        endTime,
        interval: '1m'
      });

      // Process historical data
      history.forEach(point => {
        this.addToBuffer(point);
        this.emit('backfillData', { subscriptionId: id, data: point });
      });
    } catch (error) {
      console.error('Failed to backfill data:', error);
    }
  }

  private handleDataPoint(data: MetricDataPoint): void {
    this.addToBuffer(data);
    
    // Notify subscribers
    this.subscriptions.forEach((config, id) => {
      const shouldNotify = 
        config.metrics.includes(data.metric) &&
        (!config.equipmentIds || config.equipmentIds.includes(data.equipmentId));
      
      if (shouldNotify) {
        this.emit('data', { subscriptionId: id, data });
      }
    });

    // Persist periodically
    if (Math.random() < 0.1) { // 10% chance to persist
      this.persistData();
    }
  }

  private addToBuffer(data: MetricDataPoint): void {
    const key = `${data.equipmentId}:${data.metric}`;
    
    if (!this.streamBuffers[key]) {
      this.streamBuffers[key] = [];
    }

    this.streamBuffers[key].push(data);

    // Maintain buffer size
    if (this.streamBuffers[key].length > this.maxBufferSize) {
      this.streamBuffers[key] = this.streamBuffers[key].slice(-this.maxBufferSize);
    }
  }

  // Public API

  public async subscribe(config: DataStreamConfig): Promise<string> {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.subscriptions.set(id, {
      bufferSize: this.maxBufferSize,
      persistLocal: true,
      backfillOnConnect: true,
      ...config
    });

    // Subscribe to WebSocket channels
    if (websocketService && this.isConnected) {
      config.metrics.forEach(metric => {
        if (config.equipmentIds) {
          config.equipmentIds.forEach(equipmentId => {
            websocketService.subscribeToMetric(equipmentId, metric, (message: WebSocketMessage) => {
              if (message.type === 'metric' && message.data) {
                this.handleDataPoint({
                  timestamp: message.timestamp,
                  equipmentId,
                  metric,
                  value: message.data.value,
                  quality: message.data.quality,
                  metadata: message.data.metadata
                });
              }
            });
          });
        }
      });
    }

    // Backfill if requested
    if (config.backfillOnConnect && this.isConnected) {
      await this.backfillSubscription(id, config);
    }

    return id;
  }

  public unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  public async fetchHistory(request: HistoricalDataRequest): Promise<MetricDataPoint[]> {
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      
      // Return cached data as fallback
      return this.getCachedHistory(request);
    }
  }

  private getCachedHistory(request: HistoricalDataRequest): MetricDataPoint[] {
    const results: MetricDataPoint[] = [];
    
    request.metrics.forEach(metric => {
      const equipmentIds = request.equipmentIds || this.getAllEquipmentIds();
      
      equipmentIds.forEach(equipmentId => {
        const key = `${equipmentId}:${metric}`;
        const buffer = this.streamBuffers[key] || [];
        
        const filtered = buffer.filter(point => 
          point.timestamp >= request.startTime &&
          point.timestamp <= request.endTime
        );
        
        results.push(...filtered);
      });
    });

    return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  private getAllEquipmentIds(): string[] {
    const ids = new Set<string>();
    Object.keys(this.streamBuffers).forEach(key => {
      const [equipmentId] = key.split(':');
      ids.add(equipmentId);
    });
    return Array.from(ids);
  }

  public getLatestValue(equipmentId: string, metric: string): MetricDataPoint | null {
    const key = `${equipmentId}:${metric}`;
    const buffer = this.streamBuffers[key];
    
    if (!buffer || buffer.length === 0) {
      return null;
    }

    return buffer[buffer.length - 1];
  }

  public getBufferedData(equipmentId: string, metric: string, limit = 100): MetricDataPoint[] {
    const key = `${equipmentId}:${metric}`;
    const buffer = this.streamBuffers[key] || [];
    return buffer.slice(-limit);
  }

  public getConnectionStatus(): {
    isConnected: boolean;
    mode: 'websocket' | 'polling' | 'disconnected';
    retries: number;
    bufferedDataPoints: number;
  } {
    let totalPoints = 0;
    Object.values(this.streamBuffers).forEach(buffer => {
      totalPoints += buffer.length;
    });

    return {
      isConnected: this.isConnected,
      mode: this.isConnected ? 'websocket' : this.fallbackPollInterval ? 'polling' : 'disconnected',
      retries: this.connectionRetries,
      bufferedDataPoints: totalPoints
    };
  }

  public clearBuffer(): void {
    this.streamBuffers = {};
    this.persistData();
  }
}

// Export singleton instance
export const realtimeDataService = RealTimeDataService.getInstance();

// React hook for real-time data
export function useRealTimeData(
  metrics: string[],
  equipmentIds?: string[],
  options?: { backfill?: boolean; bufferSize?: number }
) {
  const [data, setData] = useState<Record<string, MetricDataPoint[]>>({});
  const [status, setStatus] = useState(realtimeDataService.getConnectionStatus());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscriptionId: string;

    const setup = async () => {
      // Subscribe to real-time updates
      subscriptionId = await realtimeDataService.subscribe({
        metrics,
        equipmentIds,
        backfillOnConnect: options?.backfill ?? true,
        bufferSize: options?.bufferSize
      });

      // Handle incoming data
      const handleData = ({ subscriptionId: subId, data: point }: any) => {
        if (subId === subscriptionId) {
          setData(prev => {
            const key = `${point.equipmentId}:${point.metric}`;
            const existing = prev[key] || [];
            return {
              ...prev,
              [key]: [...existing, point].slice(-(options?.bufferSize || 100))
            };
          });
        }
      };

      // Handle backfill data
      const handleBackfill = ({ subscriptionId: subId, data: point }: any) => {
        if (subId === subscriptionId) {
          handleData({ subscriptionId: subId, data: point });
        }
      };

      // Handle connection status
      const handleConnection = () => {
        setStatus(realtimeDataService.getConnectionStatus());
      };

      realtimeDataService.on('data', handleData);
      realtimeDataService.on('backfillData', handleBackfill);
      realtimeDataService.on('connected', handleConnection);
      realtimeDataService.on('disconnected', handleConnection);

      // Load initial buffered data
      const initialData: Record<string, MetricDataPoint[]> = {};
      metrics.forEach(metric => {
        (equipmentIds || []).forEach(equipmentId => {
          const key = `${equipmentId}:${metric}`;
          initialData[key] = realtimeDataService.getBufferedData(equipmentId, metric);
        });
      });
      setData(initialData);
      setLoading(false);

      return () => {
        realtimeDataService.off('data', handleData);
        realtimeDataService.off('backfillData', handleBackfill);
        realtimeDataService.off('connected', handleConnection);
        realtimeDataService.off('disconnected', handleConnection);
      };
    };

    setup();

    return () => {
      if (subscriptionId) {
        realtimeDataService.unsubscribe(subscriptionId);
      }
    };
  }, [metrics.join(','), equipmentIds?.join(',')]);

  return { data, status, loading };
}