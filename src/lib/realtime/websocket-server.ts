/**
 * WebSocket Server for Real-time Updates
 * Production-ready WebSocket implementation with scaling support
 */

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import { jwtService } from '@/lib/auth/jwt-service';

interface WebSocketClient {
  id: string;
  ws: WebSocket;
  userId: string;
  tenantId: string;
  subscriptions: Set<string>;
  lastActivity: Date;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
    [key: string]: any;
  };
}

interface WebSocketMessage {
  id: string;
  type: 'subscribe' | 'unsubscribe' | 'message' | 'ping' | 'pong' | 'error' | 'notification';
  channel?: string;
  data?: any;
  timestamp: Date;
  clientId?: string;
  userId?: string;
  tenantId?: string;
}

interface Channel {
  name: string;
  tenantId?: string;
  subscribers: Set<string>;
  permissions?: string[];
  metadata?: Record<string, any>;
}

interface PresenceInfo {
  userId: string;
  tenantId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  channels: string[];
  metadata?: Record<string, any>;
}

export class WebSocketServerService extends EventEmitter {
  private static instance: WebSocketServerService;
  private wss?: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private channels: Map<string, Channel> = new Map();
  private presence: Map<string, PresenceInfo> = new Map();
  private redis: Redis;
  private redisSubscriber: Redis;
  private redisPublisher: Redis;
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    super();
    
    // Redis connections for pub/sub
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_WEBSOCKET_DB || '9'),
    });

    this.redisSubscriber = this.redis.duplicate();
    this.redisPublisher = this.redis.duplicate();

    this.setupRedisSubscriptions();
  }

  static getInstance(): WebSocketServerService {
    if (!WebSocketServerService.instance) {
      WebSocketServerService.instance = new WebSocketServerService();
    }
    return WebSocketServerService.instance;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer, path = '/ws'): void {
    this.wss = new WebSocketServer({
      server,
      path,
      perMessageDeflate: {
        // Enable per-message deflate compression
        threshold: 1024,
        serverMaxNoContextTakeover: false,
        clientMaxNoContextTakeover: false,
      },
    });

    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    // Start periodic tasks
    this.startHeartbeat();
    this.startCleanup();

    this.emit('server_started', { path });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, request: any): Promise<void> {
    const clientId = randomUUID();
    
    try {
      // Extract and verify JWT token
      const url = new URL(request.url, `http://${request.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      const payload = await jwtService.verifyAccessToken(token);
      
      // Create client record
      const client: WebSocketClient = {
        id: clientId,
        ws,
        userId: payload.sub,
        tenantId: payload.tenantId!,
        subscriptions: new Set(),
        lastActivity: new Date(),
        metadata: {
          userAgent: request.headers['user-agent'],
          ipAddress: request.headers['x-forwarded-for'] || request.socket.remoteAddress,
          sessionId: payload.sessionId,
        },
      };

      this.clients.set(clientId, client);

      // Update presence
      await this.updatePresence(client.userId, client.tenantId, 'online');

      // Setup message handlers
      ws.on('message', (data) => {
        this.handleMessage(clientId, data);
      });

      ws.on('close', () => {
        this.handleDisconnection(clientId);
      });

      ws.on('error', (error) => {
        this.handleError(clientId, error);
      });

      // Send welcome message
      this.sendMessage(clientId, {
        type: 'message',
        data: {
          type: 'connected',
          clientId,
          serverId: process.env.SERVER_ID || 'default',
        },
      });

      this.emit('client_connected', { clientId, userId: client.userId, tenantId: client.tenantId });
    } catch (error) {
      ws.close(1008, 'Authentication failed');
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(clientId: string, data: Buffer): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      message.clientId = clientId;
      message.userId = client.userId;
      message.tenantId = client.tenantId;
      message.timestamp = new Date();

      switch (message.type) {
        case 'subscribe':
          await this.handleSubscribe(client, message);
          break;
        
        case 'unsubscribe':
          await this.handleUnsubscribe(client, message);
          break;
        
        case 'message':
          await this.handleChannelMessage(client, message);
          break;
        
        case 'ping':
          this.sendMessage(clientId, { type: 'pong', data: message.data });
          break;
        
        default:
          this.sendMessage(clientId, {
            type: 'error',
            data: { error: 'Unknown message type', type: message.type },
          });
      }

      this.emit('message_received', { clientId, message });
    } catch (error) {
      this.sendMessage(clientId, {
        type: 'error',
        data: { error: 'Invalid message format' },
      });
    }
  }

  /**
   * Handle channel subscription
   */
  private async handleSubscribe(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    if (!message.channel) {
      this.sendMessage(client.id, {
        type: 'error',
        data: { error: 'Channel name required' },
      });
      return;
    }

    const channelName = this.normalizeChannelName(message.channel, client.tenantId);
    
    // Check permissions
    if (!await this.hasChannelPermission(client, channelName, 'subscribe')) {
      this.sendMessage(client.id, {
        type: 'error',
        data: { error: 'Insufficient permissions', channel: message.channel },
      });
      return;
    }

    // Add to subscriptions
    client.subscriptions.add(channelName);
    
    // Create or update channel
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, {
        name: channelName,
        tenantId: client.tenantId,
        subscribers: new Set(),
      });
    }
    
    const channel = this.channels.get(channelName)!;
    channel.subscribers.add(client.id);

    // Notify Redis for multi-server coordination
    await this.redisPublisher.publish('ws:subscription', JSON.stringify({
      action: 'subscribe',
      clientId: client.id,
      userId: client.userId,
      tenantId: client.tenantId,
      channel: channelName,
    }));

    this.sendMessage(client.id, {
      type: 'message',
      data: {
        type: 'subscribed',
        channel: message.channel,
        subscribers: channel.subscribers.size,
      },
    });

    this.emit('channel_subscribed', {
      clientId: client.id,
      userId: client.userId,
      channel: channelName,
    });
  }

  /**
   * Handle channel unsubscription
   */
  private async handleUnsubscribe(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    if (!message.channel) {
      this.sendMessage(client.id, {
        type: 'error',
        data: { error: 'Channel name required' },
      });
      return;
    }

    const channelName = this.normalizeChannelName(message.channel, client.tenantId);
    
    // Remove from subscriptions
    client.subscriptions.delete(channelName);
    
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.subscribers.delete(client.id);
      
      // Remove empty channels
      if (channel.subscribers.size === 0) {
        this.channels.delete(channelName);
      }
    }

    // Notify Redis
    await this.redisPublisher.publish('ws:subscription', JSON.stringify({
      action: 'unsubscribe',
      clientId: client.id,
      userId: client.userId,
      tenantId: client.tenantId,
      channel: channelName,
    }));

    this.sendMessage(client.id, {
      type: 'message',
      data: {
        type: 'unsubscribed',
        channel: message.channel,
      },
    });
  }

  /**
   * Handle channel message broadcast
   */
  private async handleChannelMessage(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    if (!message.channel) {
      this.sendMessage(client.id, {
        type: 'error',
        data: { error: 'Channel name required' },
      });
      return;
    }

    const channelName = this.normalizeChannelName(message.channel, client.tenantId);
    
    // Check permissions
    if (!await this.hasChannelPermission(client, channelName, 'publish')) {
      this.sendMessage(client.id, {
        type: 'error',
        data: { error: 'Insufficient permissions', channel: message.channel },
      });
      return;
    }

    // Broadcast via Redis for multi-server support
    await this.broadcastToChannel(channelName, {
      type: 'notification',
      channel: message.channel,
      data: message.data,
      from: {
        userId: client.userId,
        clientId: client.id,
      },
    });
  }

  /**
   * Handle client disconnection
   */
  private async handleDisconnection(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all channels
    for (const channelName of client.subscriptions) {
      const channel = this.channels.get(channelName);
      if (channel) {
        channel.subscribers.delete(clientId);
        
        if (channel.subscribers.size === 0) {
          this.channels.delete(channelName);
        }
      }
    }

    // Update presence
    await this.updatePresence(client.userId, client.tenantId, 'offline');

    // Remove client
    this.clients.delete(clientId);

    this.emit('client_disconnected', {
      clientId,
      userId: client.userId,
      tenantId: client.tenantId,
    });
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(clientId: string, error: Error): void {
    const client = this.clients.get(clientId);
    
    this.emit('client_error', {
      clientId,
      userId: client?.userId,
      error: error.message,
    });

    // Close connection on error
    if (client) {
      client.ws.close(1011, 'Internal error');
    }
  }

  /**
   * Send message to specific client
   */
  private sendMessage(clientId: string, message: Partial<WebSocketMessage>): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const fullMessage: WebSocketMessage = {
      id: randomUUID(),
      timestamp: new Date(),
      ...message,
    } as WebSocketMessage;

    try {
      client.ws.send(JSON.stringify(fullMessage));
    } catch (error) {
      console.error('Failed to send message:', error);
      this.handleDisconnection(clientId);
    }
  }

  /**
   * Broadcast message to channel
   */
  async broadcastToChannel(channelName: string, message: Partial<WebSocketMessage>): Promise<void> {
    // Local broadcast
    const channel = this.channels.get(channelName);
    if (channel) {
      for (const clientId of channel.subscribers) {
        this.sendMessage(clientId, message);
      }
    }

    // Redis broadcast for other servers
    await this.redisPublisher.publish('ws:broadcast', JSON.stringify({
      channel: channelName,
      message,
      serverId: process.env.SERVER_ID || 'default',
    }));
  }

  /**
   * Broadcast to all clients in tenant
   */
  async broadcastToTenant(tenantId: string, message: Partial<WebSocketMessage>): Promise<void> {
    const tenantClients = Array.from(this.clients.values())
      .filter(client => client.tenantId === tenantId);

    for (const client of tenantClients) {
      this.sendMessage(client.id, message);
    }

    // Redis broadcast
    await this.redisPublisher.publish('ws:tenant-broadcast', JSON.stringify({
      tenantId,
      message,
      serverId: process.env.SERVER_ID || 'default',
    }));
  }

  /**
   * Send notification to specific user
   */
  async sendNotificationToUser(
    userId: string,
    tenantId: string,
    notification: any
  ): Promise<void> {
    const userClients = Array.from(this.clients.values())
      .filter(client => client.userId === userId && client.tenantId === tenantId);

    const message = {
      type: 'notification' as const,
      data: notification,
    };

    for (const client of userClients) {
      this.sendMessage(client.id, message);
    }

    // Redis broadcast for other servers
    await this.redisPublisher.publish('ws:user-notification', JSON.stringify({
      userId,
      tenantId,
      message,
      serverId: process.env.SERVER_ID || 'default',
    }));
  }

  /**
   * Update user presence
   */
  private async updatePresence(
    userId: string,
    tenantId: string,
    status: PresenceInfo['status']
  ): Promise<void> {
    const presence: PresenceInfo = {
      userId,
      tenantId,
      status,
      lastSeen: new Date(),
      channels: Array.from(this.clients.values())
        .filter(c => c.userId === userId && c.tenantId === tenantId)
        .flatMap(c => Array.from(c.subscriptions)),
    };

    this.presence.set(`${tenantId}:${userId}`, presence);

    // Store in Redis with TTL
    await this.redis.setex(
      `presence:${tenantId}:${userId}`,
      300, // 5 minutes
      JSON.stringify(presence)
    );

    // Broadcast presence update
    await this.broadcastToTenant(tenantId, {
      type: 'notification',
      data: {
        type: 'presence_update',
        userId,
        status,
        lastSeen: presence.lastSeen,
      },
    });
  }

  /**
   * Get user presence
   */
  async getUserPresence(userId: string, tenantId: string): Promise<PresenceInfo | null> {
    // Check local first
    const local = this.presence.get(`${tenantId}:${userId}`);
    if (local) return local;

    // Check Redis
    const stored = await this.redis.get(`presence:${tenantId}:${userId}`);
    if (stored) {
      return JSON.parse(stored);
    }

    return null;
  }

  /**
   * Get all online users in tenant
   */
  async getOnlineUsers(tenantId: string): Promise<PresenceInfo[]> {
    const pattern = `presence:${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    
    const presences = await Promise.all(
      keys.map(async (key) => {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      })
    );

    return presences.filter(p => p && p.status === 'online');
  }

  /**
   * Check channel permissions
   */
  private async hasChannelPermission(
    client: WebSocketClient,
    channelName: string,
    action: 'subscribe' | 'publish'
  ): Promise<boolean> {
    // Tenant isolation - can only access channels in own tenant
    if (!channelName.startsWith(`${client.tenantId}:`)) {
      return false;
    }

    // Check specific channel permissions
    const channel = this.channels.get(channelName);
    if (channel?.permissions) {
      const requiredPermission = `channel:${action}:${channelName}`;
      // Would check against user permissions here
      return true; // Simplified for now
    }

    return true; // Allow by default for tenant channels
  }

  /**
   * Normalize channel name with tenant prefix
   */
  private normalizeChannelName(channel: string, tenantId: string): string {
    if (channel.startsWith(`${tenantId}:`)) {
      return channel;
    }
    return `${tenantId}:${channel}`;
  }

  /**
   * Setup Redis subscriptions for multi-server coordination
   */
  private setupRedisSubscriptions(): void {
    this.redisSubscriber.subscribe(
      'ws:broadcast',
      'ws:tenant-broadcast',
      'ws:user-notification',
      'ws:subscription'
    );

    this.redisSubscriber.on('message', (channel, message) => {
      const data = JSON.parse(message);
      
      // Skip messages from this server
      if (data.serverId === (process.env.SERVER_ID || 'default')) {
        return;
      }

      switch (channel) {
        case 'ws:broadcast':
          this.handleRedisBroadcast(data);
          break;
        case 'ws:tenant-broadcast':
          this.handleRedisTenantBroadcast(data);
          break;
        case 'ws:user-notification':
          this.handleRedisUserNotification(data);
          break;
      }
    });
  }

  /**
   * Handle Redis broadcast messages
   */
  private handleRedisBroadcast(data: any): void {
    const localChannel = this.channels.get(data.channel);
    if (localChannel) {
      for (const clientId of localChannel.subscribers) {
        this.sendMessage(clientId, data.message);
      }
    }
  }

  /**
   * Handle Redis tenant broadcast
   */
  private handleRedisTenantBroadcast(data: any): void {
    const tenantClients = Array.from(this.clients.values())
      .filter(client => client.tenantId === data.tenantId);

    for (const client of tenantClients) {
      this.sendMessage(client.id, data.message);
    }
  }

  /**
   * Handle Redis user notifications
   */
  private handleRedisUserNotification(data: any): void {
    const userClients = Array.from(this.clients.values())
      .filter(client => 
        client.userId === data.userId && 
        client.tenantId === data.tenantId
      );

    for (const client of userClients) {
      this.sendMessage(client.id, data.message);
    }
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds

      for (const [clientId, client] of this.clients.entries()) {
        const lastActivity = client.lastActivity.getTime();
        
        if (now - lastActivity > timeout) {
          if (client.ws.readyState === WebSocket.OPEN) {
            // Send ping
            this.sendMessage(clientId, { type: 'ping' });
          } else {
            // Remove dead connection
            this.handleDisconnection(clientId);
          }
        }
      }
    }, 15000); // Check every 15 seconds
  }

  /**
   * Start cleanup of old presence data
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      // Cleanup local presence data
      const now = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes

      for (const [key, presence] of this.presence.entries()) {
        if (now - presence.lastSeen.getTime() > timeout) {
          this.presence.delete(key);
        }
      }

      // Cleanup empty channels
      for (const [channelName, channel] of this.channels.entries()) {
        if (channel.subscribers.size === 0) {
          this.channels.delete(channelName);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Get server statistics
   */
  getStats(): {
    connectedClients: number;
    activeChannels: number;
    onlineUsers: number;
    totalMessages: number;
    clientsByTenant: Record<string, number>;
  } {
    const clientsByTenant: Record<string, number> = {};
    
    for (const client of this.clients.values()) {
      clientsByTenant[client.tenantId] = (clientsByTenant[client.tenantId] || 0) + 1;
    }

    return {
      connectedClients: this.clients.size,
      activeChannels: this.channels.size,
      onlineUsers: this.presence.size,
      totalMessages: 0, // Would track this
      clientsByTenant,
    };
  }

  /**
   * Shutdown server gracefully
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    for (const client of this.clients.values()) {
      client.ws.close(1001, 'Server shutting down');
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    // Close Redis connections
    await this.redis.quit();
    await this.redisSubscriber.quit();
    await this.redisPublisher.quit();
  }
}

// Export singleton instance
export const webSocketServer = WebSocketServerService.getInstance();