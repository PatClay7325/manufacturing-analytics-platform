import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Pool } from 'pg';
import { logger } from '@/lib/logger';
import { sessionBridge } from '@/lib/auth/SessionBridge';
import { z } from 'zod';

// Query schemas
const LiveQuerySchema = z.object({
  queryId: z.string(),
  equipmentId: z.string().uuid().optional(),
  metrics: z.array(z.string()),
  interval: z.number().min(1000).max(60000).default(5000), // 1s to 60s
  aggregation: z.enum(['none', 'avg', 'sum', 'min', 'max']).default('none'),
  timeWindow: z.string().default('5m'),
});

const HistoricalQuerySchema = z.object({
  equipmentId: z.string().uuid().optional(),
  metrics: z.array(z.string()),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  aggregation: z.enum(['1m', '5m', '15m', '1h', '1d']).default('5m'),
});

export interface WebSocketProxyConfig {
  postgresUrl: string;
  corsOrigin: string[];
  maxConnectionsPerUser: number;
  heartbeatInterval: number;
  queryTimeout: number;
}

interface ActiveQuery {
  queryId: string;
  interval: NodeJS.Timeout;
  lastValue: any;
  errorCount: number;
}

interface ClientConnection {
  socket: Socket;
  userId: string;
  queries: Map<string, ActiveQuery>;
  lastActivity: Date;
}

export class WebSocketProxy {
  private io: SocketIOServer | null = null;
  private pgPool: Pool;
  private config: WebSocketProxyConfig;
  private connections: Map<string, ClientConnection> = new Map();
  private queryCache: Map<string, any> = new Map();
  private cacheTimeout = 1000; // 1 second cache
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalQueries: 0,
    activeQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(config: WebSocketProxyConfig) {
    this.config = config;
    
    // Initialize PostgreSQL connection pool
    this.pgPool = new Pool({
      connectionString: config.postgresUrl,
      max: 50, // Higher pool size for concurrent queries
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: this.config.corsOrigin,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 30000,
      pingInterval: 10000,
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const session = await sessionBridge.validateToken(token);
        if (!session) {
          return next(new Error('Invalid or expired token'));
        }

        // Attach user info to socket
        (socket as any).userId = session.userId;
        (socket as any).userRole = session.user.role;
        
        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handling
    this.io.on('connection', this.handleConnection.bind(this));

    // Start heartbeat checker
    setInterval(() => this.checkHeartbeats(), this.config.heartbeatInterval);

    logger.info('WebSocket proxy initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: Socket): void {
    const userId = (socket as any).userId;
    const connectionId = socket.id;

    logger.info(`WebSocket connection established: ${connectionId} (user: ${userId})`);

    // Check connection limit
    const userConnections = Array.from(this.connections.values()).filter(
      conn => conn.userId === userId
    );

    if (userConnections.length >= this.config.maxConnectionsPerUser) {
      socket.emit('error', { message: 'Connection limit exceeded' });
      socket.disconnect();
      return;
    }

    // Create connection record
    const connection: ClientConnection = {
      socket,
      userId,
      queries: new Map(),
      lastActivity: new Date(),
    };

    this.connections.set(connectionId, connection);
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    // Set up event handlers
    socket.on('subscribe', (data) => this.handleSubscribe(connectionId, data));
    socket.on('unsubscribe', (data) => this.handleUnsubscribe(connectionId, data));
    socket.on('query', (data, callback) => this.handleQuery(connectionId, data, callback));
    socket.on('heartbeat', () => this.handleHeartbeat(connectionId));
    socket.on('disconnect', () => this.handleDisconnect(connectionId));

    // Send connection acknowledgment
    socket.emit('connected', {
      connectionId,
      serverTime: new Date().toISOString(),
      limits: {
        maxQueries: 10,
        maxQueryRate: 100, // per minute
        maxDataPoints: 1000,
      },
    });
  }

  /**
   * Handle subscription to live data
   */
  private async handleSubscribe(connectionId: string, data: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const query = LiveQuerySchema.parse(data);
      
      // Check if already subscribed
      if (connection.queries.has(query.queryId)) {
        connection.socket.emit('error', {
          queryId: query.queryId,
          message: 'Already subscribed to this query',
        });
        return;
      }

      // Check query limit
      if (connection.queries.size >= 10) {
        connection.socket.emit('error', {
          queryId: query.queryId,
          message: 'Query limit exceeded',
        });
        return;
      }

      // Start live query
      const interval = setInterval(async () => {
        await this.executeLiveQuery(connection, query);
      }, query.interval);

      // Store query info
      connection.queries.set(query.queryId, {
        queryId: query.queryId,
        interval,
        lastValue: null,
        errorCount: 0,
      });

      this.metrics.totalQueries++;
      this.metrics.activeQueries++;

      // Execute initial query
      await this.executeLiveQuery(connection, query);

      connection.socket.emit('subscribed', {
        queryId: query.queryId,
        status: 'active',
      });

      logger.debug(`Subscribed to live query: ${query.queryId}`);
    } catch (error) {
      logger.error('Subscribe error:', error);
      connection.socket.emit('error', {
        message: 'Invalid subscription request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Execute live query
   */
  private async executeLiveQuery(connection: ClientConnection, query: z.infer<typeof LiveQuerySchema>): Promise<void> {
    const activeQuery = connection.queries.get(query.queryId);
    if (!activeQuery) return;

    try {
      // Check cache first
      const cacheKey = JSON.stringify(query);
      const cached = this.queryCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        this.metrics.cacheHits++;
        connection.socket.emit('data', {
          queryId: query.queryId,
          data: cached.data,
          timestamp: new Date().toISOString(),
          cached: true,
        });
        return;
      }

      this.metrics.cacheMisses++;

      // Build and execute query
      const sql = this.buildLiveQuery(query);
      const result = await this.pgPool.query(sql);

      const data = result.rows.map(row => ({
        timestamp: row.timestamp,
        equipmentId: row.equipment_id,
        metrics: query.metrics.reduce((acc, metric) => {
          acc[metric] = row[metric];
          return acc;
        }, {} as Record<string, number>),
      }));

      // Update cache
      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      // Check if data changed
      const dataString = JSON.stringify(data);
      if (dataString !== JSON.stringify(activeQuery.lastValue)) {
        activeQuery.lastValue = data;
        
        connection.socket.emit('data', {
          queryId: query.queryId,
          data,
          timestamp: new Date().toISOString(),
          cached: false,
        });
      }

      activeQuery.errorCount = 0;
    } catch (error) {
      activeQuery.errorCount++;
      logger.error(`Live query error (${query.queryId}):`, error);

      if (activeQuery.errorCount >= 3) {
        // Stop query after 3 consecutive errors
        this.handleUnsubscribe(connection.socket.id, { queryId: query.queryId });
        
        connection.socket.emit('error', {
          queryId: query.queryId,
          message: 'Query failed multiple times and was terminated',
        });
      }
    }
  }

  /**
   * Build SQL for live query
   */
  private buildLiveQuery(query: z.infer<typeof LiveQuerySchema>): string {
    const metricConditions = query.metrics.map(m => `'${m}'`).join(', ');
    const aggregation = query.aggregation;
    
    let selectClause: string;
    if (aggregation === 'none') {
      selectClause = `
        timestamp,
        equipment_id,
        metric_name,
        metric_value
      `;
    } else {
      selectClause = `
        time_bucket('${query.interval}ms', timestamp) as timestamp,
        equipment_id,
        metric_name,
        ${aggregation}(metric_value) as metric_value
      `;
    }

    let sql = `
      SELECT ${selectClause}
      FROM manufacturing_metrics
      WHERE timestamp > NOW() - INTERVAL '${query.timeWindow}'
        AND metric_name IN (${metricConditions})
    `;

    if (query.equipmentId) {
      sql += ` AND equipment_id = '${query.equipmentId}'`;
    }

    if (aggregation !== 'none') {
      sql += ` GROUP BY time_bucket('${query.interval}ms', timestamp), equipment_id, metric_name`;
    }

    sql += ` ORDER BY timestamp DESC LIMIT 100`;

    return sql;
  }

  /**
   * Handle unsubscribe from live data
   */
  private handleUnsubscribe(connectionId: string, data: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { queryId } = data;
    const query = connection.queries.get(queryId);
    
    if (query) {
      clearInterval(query.interval);
      connection.queries.delete(queryId);
      this.metrics.activeQueries--;

      connection.socket.emit('unsubscribed', { queryId });
      logger.debug(`Unsubscribed from query: ${queryId}`);
    }
  }

  /**
   * Handle one-time query
   */
  private async handleQuery(connectionId: string, data: any, callback: Function): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const query = HistoricalQuerySchema.parse(data);
      
      // Build and execute query
      const sql = this.buildHistoricalQuery(query);
      const result = await this.pgPool.query(sql);

      callback({
        success: true,
        data: result.rows,
        count: result.rowCount,
      });

      connection.lastActivity = new Date();
    } catch (error) {
      logger.error('Query error:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Query failed',
      });
    }
  }

  /**
   * Build SQL for historical query
   */
  private buildHistoricalQuery(query: z.infer<typeof HistoricalQuerySchema>): string {
    const metricConditions = query.metrics.map(m => `'${m}'`).join(', ');
    
    let sql = `
      SELECT 
        time_bucket('${query.aggregation}', timestamp) as bucket,
        equipment_id,
        metric_name,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        COUNT(*) as sample_count
      FROM manufacturing_metrics
      WHERE timestamp BETWEEN '${query.startTime}' AND '${query.endTime}'
        AND metric_name IN (${metricConditions})
    `;

    if (query.equipmentId) {
      sql += ` AND equipment_id = '${query.equipmentId}'`;
    }

    sql += `
      GROUP BY bucket, equipment_id, metric_name
      ORDER BY bucket DESC
      LIMIT 10000
    `;

    return sql;
  }

  /**
   * Handle heartbeat
   */
  private handleHeartbeat(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
      connection.socket.emit('heartbeat', { timestamp: new Date().toISOString() });
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Clean up queries
    connection.queries.forEach(query => {
      clearInterval(query.interval);
      this.metrics.activeQueries--;
    });

    this.connections.delete(connectionId);
    this.metrics.activeConnections--;

    logger.info(`WebSocket disconnected: ${connectionId}`);
  }

  /**
   * Check for inactive connections
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const timeout = this.config.heartbeatInterval * 3; // 3 missed heartbeats

    this.connections.forEach((connection, connectionId) => {
      const lastActivity = connection.lastActivity.getTime();
      
      if (now - lastActivity > timeout) {
        logger.warn(`Disconnecting inactive connection: ${connectionId}`);
        connection.socket.disconnect();
        this.handleDisconnect(connectionId);
      }
    });
  }

  /**
   * Get proxy metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.queryCache.size,
      avgQueriesPerConnection: this.metrics.activeConnections > 0
        ? this.metrics.activeQueries / this.metrics.activeConnections
        : 0,
    };
  }

  /**
   * Shutdown WebSocket proxy
   */
  async shutdown(): Promise<void> {
    if (this.io) {
      // Disconnect all clients
      this.connections.forEach(connection => {
        connection.socket.emit('server-shutdown', {
          message: 'Server is shutting down',
        });
        connection.socket.disconnect();
      });

      // Close socket.io server
      this.io.close();
      this.io = null;
    }

    // Close database pool
    await this.pgPool.end();

    logger.info('WebSocket proxy shut down');
  }
}

// Export singleton instance
export const webSocketProxy = new WebSocketProxy({
  postgresUrl: process.env.DATABASE_URL || 'postgresql://analytics:development_password@localhost:5433/manufacturing',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3001').split(','),
  maxConnectionsPerUser: 5,
  heartbeatInterval: 30000, // 30 seconds
  queryTimeout: 30000, // 30 seconds
});