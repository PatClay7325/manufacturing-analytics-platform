/**
 * Server-Sent Events (SSE) Server
 * Fallback for WebSocket with HTTP/2 push support
 */

import { NextRequest, NextResponse } from 'next/server';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import { jwtService } from '@/lib/auth/jwt-service';

interface SSEClient {
  id: string;
  userId: string;
  tenantId: string;
  response: ReadableStream;
  controller: ReadableStreamDefaultController;
  subscriptions: Set<string>;
  lastActivity: Date;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
  };
}

interface SSEMessage {
  id: string;
  type: 'message' | 'notification' | 'error' | 'heartbeat' | 'reconnect';
  data?: any;
  timestamp: Date;
  retry?: number;
}

export class SSEServerService extends EventEmitter {
  private static instance: SSEServerService;
  private clients: Map<string, SSEClient> = new Map();
  private redis: Redis;
  private redisSubscriber: Redis;
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    super();
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_SSE_DB || '10'),
    });

    this.redisSubscriber = this.redis.duplicate();
    this.setupRedisSubscriptions();
    this.startHeartbeat();
    this.startCleanup();
  }

  static getInstance(): SSEServerService {
    if (!SSEServerService.instance) {
      SSEServerService.instance = new SSEServerService();
    }
    return SSEServerService.instance;
  }

  /**
   * Handle SSE connection request
   */
  async handleConnection(request: NextRequest): Promise<NextResponse> {
    try {
      // Extract and verify JWT token
      const url = new URL(request.url);
      const token = url.searchParams.get('token');
      
      if (!token) {
        return new NextResponse('Authentication required', { status: 401 });
      }

      const payload = await jwtService.verifyAccessToken(token);
      const clientId = randomUUID();

      // Create readable stream
      const stream = new ReadableStream({
        start: (controller) => {
          // Create client record
          const client: SSEClient = {
            id: clientId,
            userId: payload.sub,
            tenantId: payload.tenantId!,
            response: stream,
            controller,
            subscriptions: new Set(),
            lastActivity: new Date(),
            metadata: {
              userAgent: request.headers.get('user-agent') || undefined,
              ipAddress: request.headers.get('x-forwarded-for') || undefined,
              sessionId: payload.sessionId,
            },
          };

          this.clients.set(clientId, client);

          // Send initial connection message
          this.sendMessage(clientId, {
            type: 'message',
            data: {
              type: 'connected',
              clientId,
              serverId: process.env.SERVER_ID || 'default',
            },
          });

          this.emit('client_connected', {
            clientId,
            userId: client.userId,
            tenantId: client.tenantId,
          });
        },

        cancel: () => {
          this.handleDisconnection(clientId);
        },
      });

      // Return SSE response
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control',
          'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
      });
    } catch (error) {
      return new NextResponse('Authentication failed', { status: 401 });
    }
  }

  /**
   * Handle subscription request
   */
  async handleSubscription(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { clientId, action, channel } = body;

      const client = this.clients.get(clientId);
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }

      if (action === 'subscribe') {
        await this.subscribeToChannel(client, channel);
      } else if (action === 'unsubscribe') {
        await this.unsubscribeFromChannel(client, channel);
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }
  }

  /**
   * Subscribe client to channel
   */
  private async subscribeToChannel(client: SSEClient, channel: string): Promise<void> {
    const channelName = this.normalizeChannelName(channel, client.tenantId);
    
    // Check permissions
    if (!this.hasChannelPermission(client, channelName)) {
      this.sendMessage(client.id, {
        type: 'error',
        data: { error: 'Insufficient permissions', channel },
      });
      return;
    }

    client.subscriptions.add(channelName);

    // Subscribe to Redis channel
    await this.redis.sadd(`sse:subscribers:${channelName}`, client.id);

    this.sendMessage(client.id, {
      type: 'message',
      data: {
        type: 'subscribed',
        channel,
      },
    });

    this.emit('channel_subscribed', {
      clientId: client.id,
      userId: client.userId,
      channel: channelName,
    });
  }

  /**
   * Unsubscribe client from channel
   */
  private async unsubscribeFromChannel(client: SSEClient, channel: string): Promise<void> {
    const channelName = this.normalizeChannelName(channel, client.tenantId);
    
    client.subscriptions.delete(channelName);
    await this.redis.srem(`sse:subscribers:${channelName}`, client.id);

    this.sendMessage(client.id, {
      type: 'message',
      data: {
        type: 'unsubscribed',
        channel,
      },
    });
  }

  /**
   * Send message to specific client
   */
  private sendMessage(clientId: string, message: Partial<SSEMessage>): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const fullMessage: SSEMessage = {
      id: randomUUID(),
      timestamp: new Date(),
      ...message,
    } as SSEMessage;

    try {
      const sseData = this.formatSSEMessage(fullMessage);
      client.controller.enqueue(new TextEncoder().encode(sseData));
      client.lastActivity = new Date();
    } catch (error) {
      console.error('Failed to send SSE message:', error);
      this.handleDisconnection(clientId);
    }
  }

  /**
   * Format message for SSE protocol
   */
  private formatSSEMessage(message: SSEMessage): string {
    let sseMessage = '';
    
    if (message.id) {
      sseMessage += `id: ${message.id}\n`;
    }
    
    if (message.type) {
      sseMessage += `event: ${message.type}\n`;
    }
    
    if (message.retry) {
      sseMessage += `retry: ${message.retry}\n`;
    }
    
    if (message.data !== undefined) {
      const data = typeof message.data === 'string' 
        ? message.data 
        : JSON.stringify(message.data);
      
      // Handle multi-line data
      const lines = data.split('\n');
      for (const line of lines) {
        sseMessage += `data: ${line}\n`;
      }
    }
    
    sseMessage += '\n'; // End with empty line
    
    return sseMessage;
  }

  /**
   * Broadcast message to channel
   */
  async broadcastToChannel(channel: string, message: Partial<SSEMessage>): Promise<void> {
    // Get subscribers from Redis
    const subscriberIds = await this.redis.smembers(`sse:subscribers:${channel}`);
    
    // Send to local clients
    for (const clientId of subscriberIds) {
      const client = this.clients.get(clientId);
      if (client && client.subscriptions.has(channel)) {
        this.sendMessage(clientId, message);
      }
    }

    // Broadcast via Redis for other servers
    await this.redis.publish('sse:broadcast', JSON.stringify({
      channel,
      message,
      serverId: process.env.SERVER_ID || 'default',
    }));
  }

  /**
   * Send notification to user
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
    await this.redis.publish('sse:user-notification', JSON.stringify({
      userId,
      tenantId,
      message,
      serverId: process.env.SERVER_ID || 'default',
    }));
  }

  /**
   * Broadcast to all clients in tenant
   */
  async broadcastToTenant(tenantId: string, message: Partial<SSEMessage>): Promise<void> {
    const tenantClients = Array.from(this.clients.values())
      .filter(client => client.tenantId === tenantId);

    for (const client of tenantClients) {
      this.sendMessage(client.id, message);
    }

    // Redis broadcast
    await this.redis.publish('sse:tenant-broadcast', JSON.stringify({
      tenantId,
      message,
      serverId: process.env.SERVER_ID || 'default',
    }));
  }

  /**
   * Handle client disconnection
   */
  private async handleDisconnection(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all subscriptions
    for (const channel of client.subscriptions) {
      await this.redis.srem(`sse:subscribers:${channel}`, clientId);
    }

    // Close the stream
    try {
      client.controller.close();
    } catch (error) {
      // Stream may already be closed
    }

    this.clients.delete(clientId);

    this.emit('client_disconnected', {
      clientId,
      userId: client.userId,
      tenantId: client.tenantId,
    });
  }

  /**
   * Check channel permissions
   */
  private hasChannelPermission(client: SSEClient, channelName: string): boolean {
    // Tenant isolation
    return channelName.startsWith(`${client.tenantId}:`);
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
   * Setup Redis subscriptions
   */
  private setupRedisSubscriptions(): void {
    this.redisSubscriber.subscribe(
      'sse:broadcast',
      'sse:tenant-broadcast',
      'sse:user-notification'
    );

    this.redisSubscriber.on('message', (channel, message) => {
      const data = JSON.parse(message);
      
      // Skip messages from this server
      if (data.serverId === (process.env.SERVER_ID || 'default')) {
        return;
      }

      switch (channel) {
        case 'sse:broadcast':
          this.handleRedisBroadcast(data);
          break;
        case 'sse:tenant-broadcast':
          this.handleRedisTenantBroadcast(data);
          break;
        case 'sse:user-notification':
          this.handleRedisUserNotification(data);
          break;
      }
    });
  }

  /**
   * Handle Redis broadcast messages
   */
  private async handleRedisBroadcast(data: any): Promise<void> {
    const subscriberIds = await this.redis.smembers(`sse:subscribers:${data.channel}`);
    
    for (const clientId of subscriberIds) {
      const client = this.clients.get(clientId);
      if (client && client.subscriptions.has(data.channel)) {
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
      const timeout = 60000; // 60 seconds for SSE

      for (const [clientId, client] of this.clients.entries()) {
        const lastActivity = client.lastActivity.getTime();
        
        if (now - lastActivity > timeout) {
          // Send heartbeat
          this.sendMessage(clientId, {
            type: 'heartbeat',
            data: { timestamp: Date.now() },
          });
        }
        
        // Remove very stale connections
        if (now - lastActivity > timeout * 3) {
          this.handleDisconnection(clientId);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Start cleanup of old subscribers
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      // Clean up Redis subscriber sets
      const pattern = 'sse:subscribers:*';
      const keys = await this.redis.keys(pattern);
      
      for (const key of keys) {
        const members = await this.redis.smembers(key);
        const validMembers: string[] = [];
        
        for (const member of members) {
          if (this.clients.has(member)) {
            validMembers.push(member);
          }
        }
        
        // Replace with valid members
        if (validMembers.length === 0) {
          await this.redis.del(key);
        } else if (validMembers.length !== members.length) {
          await this.redis.del(key);
          if (validMembers.length > 0) {
            await this.redis.sadd(key, ...validMembers);
          }
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Get server statistics
   */
  getStats(): {
    connectedClients: number;
    clientsByTenant: Record<string, number>;
    totalSubscriptions: number;
  } {
    const clientsByTenant: Record<string, number> = {};
    let totalSubscriptions = 0;
    
    for (const client of this.clients.values()) {
      clientsByTenant[client.tenantId] = (clientsByTenant[client.tenantId] || 0) + 1;
      totalSubscriptions += client.subscriptions.size;
    }

    return {
      connectedClients: this.clients.size,
      clientsByTenant,
      totalSubscriptions,
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

    // Send reconnect message to all clients
    for (const client of this.clients.values()) {
      this.sendMessage(client.id, {
        type: 'reconnect',
        data: { reason: 'server_shutdown' },
        retry: 5000,
      });
    }

    // Close all connections after a delay
    setTimeout(() => {
      for (const client of this.clients.values()) {
        try {
          client.controller.close();
        } catch (error) {
          // Ignore errors
        }
      }
    }, 1000);

    // Close Redis connections
    await this.redis.quit();
    await this.redisSubscriber.quit();
  }
}

// Export singleton instance
export const sseServer = SSEServerService.getInstance();