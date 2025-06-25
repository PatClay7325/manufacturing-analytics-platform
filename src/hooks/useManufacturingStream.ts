/**
 * React Hook for Manufacturing Data Streaming
 * Provides real-time data updates via SSE or WebSocket
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { StreamEvent } from '@/lib/streaming/ManufacturingDataStream';
import { logger } from '@/lib/logger';

export interface UseManufacturingStreamOptions {
  types?: string[];
  equipment?: string[];
  severity?: string[];
  since?: Date;
  until?: Date;
  useWebSocket?: boolean;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

export interface UseManufacturingStreamResult {
  events: StreamEvent[];
  isConnected: boolean;
  error: Error | null;
  metrics: {
    eventsReceived: number;
    connectionUptime: number;
    lastEventTime: Date | null;
  };
  clearEvents: () => void;
  reconnect: () => void;
}

export function useManufacturingStream(
  options: UseManufacturingStreamOptions = {}
): UseManufacturingStreamResult {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [eventsReceived, setEventsReceived] = useState(0);
  const [connectionStartTime, setConnectionStartTime] = useState<Date | null>(null);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxEvents = 100; // Keep last 100 events in memory

  const {
    types,
    equipment,
    severity,
    since,
    until,
    useWebSocket = false,
    autoReconnect = true,
    reconnectDelay = 5000
  } = options;

  /**
   * Connect via Server-Sent Events
   */
  const connectSSE = useCallback(() => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (types?.length) params.append('types', types.join(','));
      if (equipment?.length) params.append('equipment', equipment.join(','));
      if (severity?.length) params.append('severity', severity.join(','));
      if (since) params.append('since', since.toISOString());
      if (until) params.append('until', until.toISOString());
      
      const url = `/api/stream/manufacturing?${params.toString()}`;
      const eventSource = new EventSource(url);
      
      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        setConnectionStartTime(new Date());
        logger.info('SSE connection established');
      };
      
      eventSource.onmessage = (event) => {
        try {
          const streamEvent: StreamEvent = JSON.parse(event.data);
          setEvents(prev => {
            const newEvents = [streamEvent, ...prev].slice(0, maxEvents);
            return newEvents;
          });
          setEventsReceived(prev => prev + 1);
          setLastEventTime(new Date());
        } catch (err) {
          logger.error('Failed to parse SSE event:', err);
        }
      };
      
      eventSource.onerror = (err) => {
        logger.error('SSE connection error:', err);
        setError(new Error('Connection lost'));
        setIsConnected(false);
        eventSource.close();
        
        if (autoReconnect) {
          scheduleReconnect();
        }
      };
      
      eventSourceRef.current = eventSource;
      
    } catch (err) {
      logger.error('Failed to establish SSE connection:', err);
      setError(err as Error);
    }
  }, [types, equipment, severity, since, until, autoReconnect, reconnectDelay]);

  /**
   * Connect via WebSocket
   */
  const connectWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        setConnectionStartTime(new Date());
        logger.info('WebSocket connection established');
        
        // Send subscription message
        ws.send(JSON.stringify({
          type: 'subscribe',
          data: {
            filters: {
              types,
              equipment,
              severity,
              timeRange: since || until ? { start: since, end: until } : undefined
            }
          }
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'event' && message.data) {
            const streamEvent = message.data as StreamEvent;
            setEvents(prev => {
              const newEvents = [streamEvent, ...prev].slice(0, maxEvents);
              return newEvents;
            });
            setEventsReceived(prev => prev + 1);
            setLastEventTime(new Date());
          }
        } catch (err) {
          logger.error('Failed to parse WebSocket message:', err);
        }
      };
      
      ws.onerror = (err) => {
        logger.error('WebSocket error:', err);
        setError(new Error('WebSocket error'));
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        logger.info('WebSocket connection closed');
        
        if (autoReconnect) {
          scheduleReconnect();
        }
      };
      
      webSocketRef.current = ws;
      
    } catch (err) {
      logger.error('Failed to establish WebSocket connection:', err);
      setError(err as Error);
    }
  }, [types, equipment, severity, since, until, autoReconnect, reconnectDelay]);

  /**
   * Schedule reconnection attempt
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      logger.info('Attempting to reconnect...');
      if (useWebSocket) {
        connectWebSocket();
      } else {
        connectSSE();
      }
    }, reconnectDelay);
  }, [connectSSE, connectWebSocket, reconnectDelay, useWebSocket]);

  /**
   * Disconnect current connection
   */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  /**
   * Clear events
   */
  const clearEvents = useCallback(() => {
    setEvents([]);
    setEventsReceived(0);
    setLastEventTime(null);
  }, []);

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    disconnect();
    if (useWebSocket) {
      connectWebSocket();
    } else {
      connectSSE();
    }
  }, [disconnect, connectSSE, connectWebSocket, useWebSocket]);

  // Set up connection on mount
  useEffect(() => {
    if (useWebSocket) {
      connectWebSocket();
    } else {
      connectSSE();
    }
    
    return () => {
      disconnect();
    };
  }, [connectSSE, connectWebSocket, disconnect, useWebSocket]);

  // Calculate connection uptime
  const connectionUptime = connectionStartTime 
    ? Math.floor((Date.now() - connectionStartTime.getTime()) / 1000)
    : 0;

  return {
    events,
    isConnected,
    error,
    metrics: {
      eventsReceived,
      connectionUptime,
      lastEventTime
    },
    clearEvents,
    reconnect
  };
}