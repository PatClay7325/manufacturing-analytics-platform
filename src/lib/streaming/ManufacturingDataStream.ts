/**
 * Manufacturing Data Stream Service
 * Provides real-time streaming of manufacturing data using Server-Sent Events (SSE)
 * and WebSocket connections for bi-directional communication
 */

import { EventEmitter } from 'events';
import { prisma } from '@/lib/database/prisma';
import { logger } from '@/lib/logger';
import { performanceMonitor } from '@/lib/monitoring/PerformanceMonitor';

export interface StreamEvent {
  id: string;
  type: 'metric' | 'alert' | 'equipment' | 'quality' | 'maintenance' | 'production';
  timestamp: Date;
  data: any;
  source?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface StreamSubscription {
  id: string;
  userId?: string;
  filters: {
    types?: string[];
    equipment?: string[];
    severity?: string[];
    timeRange?: { start: Date; end: Date };
  };
  callback: (event: StreamEvent) => void;
  lastEventId?: string;
}

export interface StreamMetrics {
  activeSubscriptions: number;
  eventsPerMinute: number;
  averageLatency: number;
  queueSize: number;
}

export class ManufacturingDataStream extends EventEmitter {
  private subscriptions: Map<string, StreamSubscription> = new Map();
  private eventQueue: StreamEvent[] = [];
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastEventTimes: Map<string, Date> = new Map();
  private maxQueueSize = 1000;
  private eventCounter = 0;
  private initialized = false;

  constructor() {
    super();
    // Don't initialize immediately - wait for first subscription
  }

  /**
   * Initialize the streaming service
   */
  private initialize(): void {
    // Start polling for different data types
    this.startPolling('performance', 5000); // Every 5 seconds
    this.startPolling('alerts', 3000); // Every 3 seconds
    this.startPolling('quality', 10000); // Every 10 seconds
    this.startPolling('equipment', 15000); // Every 15 seconds
    
    // Clean up old events periodically
    setInterval(() => this.cleanupOldEvents(), 60000); // Every minute
    
    logger.info('Manufacturing data stream service initialized');
  }

  /**
   * Subscribe to data stream
   */
  subscribe(
    filters: StreamSubscription['filters'],
    callback: (event: StreamEvent) => void,
    userId?: string
  ): string {
    // Initialize on first subscription
    if (!this.initialized) {
      this.initialize();
      this.initialized = true;
    }

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: StreamSubscription = {
      id: subscriptionId,
      userId,
      filters,
      callback
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Send recent events if requested
    if (filters.timeRange) {
      this.sendHistoricalEvents(subscription);
    }
    
    logger.info('New stream subscription', { subscriptionId, userId, filters });
    performanceMonitor.incrementCounter('stream.subscriptions.active');
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from data stream
   */
  unsubscribe(subscriptionId: string): void {
    if (this.subscriptions.delete(subscriptionId)) {
      logger.info('Stream subscription removed', { subscriptionId });
      performanceMonitor.incrementCounter('stream.subscriptions.removed');
    }
  }

  /**
   * Start polling for specific data type
   */
  private startPolling(dataType: string, intervalMs: number): void {
    const poll = async () => {
      try {
        // Check if database is available
        if (!prisma) {
          logger.warn(`Database not available for ${dataType} polling, skipping...`);
          return;
        }

        const lastTime = this.lastEventTimes.get(dataType) || new Date(Date.now() - intervalMs);
        const events = await this.fetchNewData(dataType, lastTime);
        
        if (events.length > 0) {
          events.forEach(event => this.publishEvent(event));
          this.lastEventTimes.set(dataType, new Date());
        }
      } catch (error) {
        logger.error(`Error polling ${dataType} data:`, error);
        performanceMonitor.recordError(`stream.poll.${dataType}`);
        
        // If it's a database connection error, retry after a longer delay
        if (error.message?.includes('database') || error.message?.includes('connection')) {
          logger.info(`Database connection issue for ${dataType}, will retry on next interval`);
        }
      }
    };
    
    // Initial poll after a small delay to allow database to initialize
    setTimeout(poll, 2000);
    
    // Set up interval
    const interval = setInterval(poll, intervalMs);
    this.pollingIntervals.set(dataType, interval);
  }

  /**
   * Fetch new data from database
   */
  private async fetchNewData(dataType: string, since: Date): Promise<StreamEvent[]> {
    const events: StreamEvent[] = [];
    
    // Early return if prisma is not available
    if (!prisma) {
      logger.warn('Database connection not available');
      return events;
    }

    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      logger.warn('Database connection test failed:', error);
      return events;
    }
    
    switch (dataType) {
      case 'performance':
        const metrics = await prisma.factOeeMetric.findMany({
          where: { timestamp: { gt: since } },
          include: {
            equipment: {
              select: { id: true, equipmentName: true, equipmentType: true }
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 10
        });
        
        metrics.forEach(metric => {
          events.push({
            id: `perf_${metric.recordId}`,
            type: 'metric',
            timestamp: metric.timestamp,
            data: {
              equipmentId: metric.equipmentId,
              equipmentName: metric.equipment?.equipmentName,
              oee: metric.oee,
              availability: metric.availability,
              performance: metric.performance,
              quality: metric.quality,
              goodCount: metric.goodQuantity,
              totalCount: metric.producedQuantity,
              plannedQuantity: metric.plannedQuantity
            },
            source: metric.equipment?.equipmentName
          });
        });
        break;
        
      case 'alerts':
        // For now, generate simulated alerts since we don't have an alert table in the current schema
        // This will be replaced with actual alert queries when the alert system is implemented
        const alertData = {
          id: `alert_${Date.now()}`,
          type: 'alert',
          timestamp: new Date(),
          data: {
            alertId: `sim_${Date.now()}`,
            message: 'Simulated alert for demonstration',
            type: 'performance',
            equipmentId: 'sim_equipment'
          },
          source: 'Simulation',
          severity: 'info' as any
        };
        
        // Only add alert occasionally (10% chance)
        if (Math.random() < 0.1) {
          events.push(alertData);
        }
        break;
        
      case 'quality':
        const qualityMetrics = await prisma.factQualityMetric.findMany({
          where: { timestamp: { gt: since } },
          include: {
            equipment: {
              select: { id: true, equipmentName: true }
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 10
        });
        
        qualityMetrics.forEach(metric => {
          const isWithinSpec = metric.actualValue && metric.targetValue && metric.toleranceValue
            ? Math.abs(Number(metric.actualValue) - Number(metric.targetValue)) <= Number(metric.toleranceValue)
            : true;
            
          events.push({
            id: `qual_${metric.recordId}`,
            type: 'quality',
            timestamp: metric.timestamp,
            data: {
              equipmentId: metric.equipmentId,
              equipmentName: metric.equipment?.equipmentName,
              metricType: metric.metricName || 'quality_check',
              value: metric.actualValue,
              targetValue: metric.targetValue,
              tolerance: metric.toleranceValue,
              isWithinSpec
            },
            source: metric.equipment?.equipmentName,
            severity: isWithinSpec ? 'info' : 'warning'
          });
        });
        break;
        
      case 'equipment':
        const equipment = await prisma.equipment.findMany({
          where: {
            updatedAt: { gt: since }
          },
          include: {
            workCenter: {
              select: { workCenterName: true }
            }
          },
          take: 5
        });
        
        equipment.forEach(unit => {
          events.push({
            id: `equip_${unit.id}_${Date.now()}`,
            type: 'equipment',
            timestamp: unit.updatedAt,
            data: {
              equipmentId: unit.id,
              equipmentCode: unit.equipmentCode,
              equipmentName: unit.equipmentName,
              status: unit.status || 'operational',
              equipmentType: unit.equipmentType,
              workCenter: unit.workCenter?.workCenterName
            },
            source: unit.equipmentName,
            severity: unit.status === 'fault' ? 'error' : 'info'
          });
        });
        break;
    }
    
    return events;
  }

  /**
   * Publish event to subscribers
   */
  private publishEvent(event: StreamEvent): void {
    // Add to queue
    this.eventQueue.push(event);
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.shift();
    }
    
    // Update metrics
    this.eventCounter++;
    performanceMonitor.incrementCounter('stream.events.published');
    
    // Send to matching subscribers
    this.subscriptions.forEach(subscription => {
      if (this.matchesFilters(event, subscription.filters)) {
        try {
          subscription.callback(event);
          subscription.lastEventId = event.id;
        } catch (error) {
          logger.error('Error sending event to subscriber:', error);
          performanceMonitor.recordError('stream.send');
        }
      }
    });
    
    // Emit event for other listeners
    this.emit('event', event);
  }

  /**
   * Check if event matches subscription filters
   */
  private matchesFilters(event: StreamEvent, filters: StreamSubscription['filters']): boolean {
    if (filters.types && !filters.types.includes(event.type)) {
      return false;
    }
    
    if (filters.equipment && event.data.workUnitId && 
        !filters.equipment.includes(event.data.workUnitId)) {
      return false;
    }
    
    if (filters.severity && event.severity && 
        !filters.severity.includes(event.severity)) {
      return false;
    }
    
    if (filters.timeRange) {
      const eventTime = event.timestamp.getTime();
      if (eventTime < filters.timeRange.start.getTime() || 
          eventTime > filters.timeRange.end.getTime()) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Send historical events to new subscriber
   */
  private async sendHistoricalEvents(subscription: StreamSubscription): Promise<void> {
    const relevantEvents = this.eventQueue.filter(event => 
      this.matchesFilters(event, subscription.filters)
    );
    
    relevantEvents.forEach(event => {
      try {
        subscription.callback(event);
      } catch (error) {
        logger.error('Error sending historical event:', error);
      }
    });
  }

  /**
   * Clean up old events from queue
   */
  private cleanupOldEvents(): void {
    const cutoffTime = Date.now() - (5 * 60 * 1000); // 5 minutes
    const originalSize = this.eventQueue.length;
    
    this.eventQueue = this.eventQueue.filter(event => 
      event.timestamp.getTime() > cutoffTime
    );
    
    const removed = originalSize - this.eventQueue.length;
    if (removed > 0) {
      logger.debug(`Cleaned up ${removed} old events from queue`);
    }
  }

  /**
   * Get stream metrics
   */
  getMetrics(): StreamMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Count events in last minute
    const recentEvents = this.eventQueue.filter(event => 
      event.timestamp.getTime() > oneMinuteAgo
    ).length;
    
    return {
      activeSubscriptions: this.subscriptions.size,
      eventsPerMinute: recentEvents,
      averageLatency: performanceMonitor.getAverageMetric('stream.latency', 60000),
      queueSize: this.eventQueue.length
    };
  }

  /**
   * Create SSE response for HTTP streaming
   */
  createSSEResponse(subscriptionId: string): ReadableStream {
    const encoder = new TextEncoder();
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      throw new Error('Invalid subscription ID');
    }
    
    return new ReadableStream({
      start(controller) {
        // Send initial connection event
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ subscriptionId })}\n\n`)
        );
        
        // Update callback to use SSE format
        subscription.callback = (event: StreamEvent) => {
          const sseData = `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        };
      },
      
      cancel() {
        // Clean up subscription when client disconnects
        manufacturingDataStream.unsubscribe(subscriptionId);
      }
    });
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    // Clear all polling intervals
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
    
    // Clear subscriptions
    this.subscriptions.clear();
    
    // Clear event queue
    this.eventQueue = [];
    
    logger.info('Manufacturing data stream service shut down');
  }
}

// Singleton instance - lazy initialization to avoid prisma initialization issues
let _manufacturingDataStream: ManufacturingDataStream | null = null;

export function getManufacturingDataStream(): ManufacturingDataStream {
  if (!_manufacturingDataStream) {
    _manufacturingDataStream = new ManufacturingDataStream();
  }
  return _manufacturingDataStream;
}

// For backward compatibility
export const manufacturingDataStream = {
  subscribe: (...args: Parameters<ManufacturingDataStream['subscribe']>) => {
    return getManufacturingDataStream().subscribe(...args);
  },
  unsubscribe: (...args: Parameters<ManufacturingDataStream['unsubscribe']>) => {
    return getManufacturingDataStream().unsubscribe(...args);
  },
  createSSEResponse: (...args: Parameters<ManufacturingDataStream['createSSEResponse']>) => {
    return getManufacturingDataStream().createSSEResponse(...args);
  },
  getMetrics: () => {
    return getManufacturingDataStream().getMetrics();
  }
};