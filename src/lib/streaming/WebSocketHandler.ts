/**
 * WebSocket Handler for Real-time Manufacturing Data
 * Provides bi-directional communication for live updates
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { manufacturingDataStream, StreamEvent } from './ManufacturingDataStream';
import { logger } from '@/lib/logger';
import { performanceMonitor } from '@/lib/monitoring/PerformanceMonitor';
import { prisma } from '@/lib/database/prisma';

interface WSClient {
  id: string;
  userId?: string;
  ws: WebSocket;
  subscriptionId?: string;
  isAlive: boolean;
  permissions: Set<string>;
}

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'command' | 'query' | 'ping';
  data?: any;
  id?: string;
}

interface WSResponse {
  type: 'event' | 'response' | 'error' | 'pong';
  data?: any;
  id?: string;
  timestamp: Date;
}

export class WebSocketHandler {
  private wss?: WebSocketServer;
  private clients: Map<string, WSClient> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  /**
   * Initialize WebSocket server
   */
  initialize(server: any): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });
    
    // Start heartbeat monitoring
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 30000); // Every 30 seconds
    
    logger.info('WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const clientId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = this.extractUserId(request);
    
    const client: WSClient = {
      id: clientId,
      userId,
      ws,
      isAlive: true,
      permissions: new Set(['read']) // Default permissions
    };
    
    this.clients.set(clientId, client);
    performanceMonitor.incrementCounter('websocket.connections.active');
    
    logger.info('WebSocket client connected', { clientId, userId });
    
    // Send welcome message
    this.sendToClient(client, {
      type: 'event',
      data: {
        event: 'connected',
        clientId,
        capabilities: ['streaming', 'commands', 'queries']
      },
      timestamp: new Date()
    });
    
    // Set up event handlers
    ws.on('message', (data) => this.handleMessage(client, data));
    ws.on('close', () => this.handleDisconnect(client));
    ws.on('error', (error) => this.handleError(client, error));
    ws.on('pong', () => { client.isAlive = true; });
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(client: WSClient, data: any): Promise<void> {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      performanceMonitor.incrementCounter('websocket.messages.received');
      
      switch (message.type) {
        case 'subscribe':
          await this.handleSubscribe(client, message);
          break;
          
        case 'unsubscribe':
          await this.handleUnsubscribe(client, message);
          break;
          
        case 'command':
          await this.handleCommand(client, message);
          break;
          
        case 'query':
          await this.handleQuery(client, message);
          break;
          
        case 'ping':
          this.sendToClient(client, { type: 'pong', id: message.id, timestamp: new Date() });
          break;
          
        default:
          this.sendError(client, 'Unknown message type', message.id);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
      this.sendError(client, 'Invalid message format');
      performanceMonitor.recordError('websocket.message');
    }
  }

  /**
   * Handle subscription request
   */
  private async handleSubscribe(client: WSClient, message: WSMessage): Promise<void> {
    const { filters = {} } = message.data || {};
    
    // Unsubscribe from previous subscription if exists
    if (client.subscriptionId) {
      manufacturingDataStream.unsubscribe(client.subscriptionId);
    }
    
    // Create new subscription
    client.subscriptionId = manufacturingDataStream.subscribe(
      filters,
      (event: StreamEvent) => {
        this.sendToClient(client, {
          type: 'event',
          data: event,
          timestamp: new Date()
        });
      },
      client.userId
    );
    
    this.sendToClient(client, {
      type: 'response',
      id: message.id,
      data: {
        subscribed: true,
        subscriptionId: client.subscriptionId,
        filters
      },
      timestamp: new Date()
    });
    
    logger.info('WebSocket client subscribed', { 
      clientId: client.id, 
      subscriptionId: client.subscriptionId,
      filters 
    });
  }

  /**
   * Handle unsubscribe request
   */
  private async handleUnsubscribe(client: WSClient, message: WSMessage): Promise<void> {
    if (client.subscriptionId) {
      manufacturingDataStream.unsubscribe(client.subscriptionId);
      client.subscriptionId = undefined;
      
      this.sendToClient(client, {
        type: 'response',
        id: message.id,
        data: { unsubscribed: true },
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle command execution
   */
  private async handleCommand(client: WSClient, message: WSMessage): Promise<void> {
    const { command, params = {} } = message.data || {};
    
    // Check permissions
    if (!client.permissions.has('write')) {
      this.sendError(client, 'Insufficient permissions', message.id);
      return;
    }
    
    try {
      let result: any;
      
      switch (command) {
        case 'acknowledgeAlert':
          result = await this.acknowledgeAlert(params.alertId, client.userId);
          break;
          
        case 'updateEquipmentStatus':
          result = await this.updateEquipmentStatus(params.equipmentId, params.status, client.userId);
          break;
          
        case 'createAnnotation':
          result = await this.createAnnotation(params, client.userId);
          break;
          
        default:
          throw new Error(`Unknown command: ${command}`);
      }
      
      this.sendToClient(client, {
        type: 'response',
        id: message.id,
        data: { command, result },
        timestamp: new Date()
      });
      
    } catch (error: any) {
      this.sendError(client, error.message, message.id);
    }
  }

  /**
   * Handle real-time query
   */
  private async handleQuery(client: WSClient, message: WSMessage): Promise<void> {
    const { query, params = {} } = message.data || {};
    
    try {
      let result: any;
      
      switch (query) {
        case 'currentOEE':
          result = await this.getCurrentOEE(params.equipmentId);
          break;
          
        case 'activeAlerts':
          result = await this.getActiveAlerts(params.severity);
          break;
          
        case 'equipmentStatus':
          result = await this.getEquipmentStatus(params.equipmentIds);
          break;
          
        case 'productionRate':
          result = await this.getProductionRate(params.lineId, params.duration);
          break;
          
        default:
          throw new Error(`Unknown query: ${query}`);
      }
      
      this.sendToClient(client, {
        type: 'response',
        id: message.id,
        data: { query, result },
        timestamp: new Date()
      });
      
    } catch (error: any) {
      this.sendError(client, error.message, message.id);
    }
  }

  /**
   * Command: Acknowledge alert
   */
  private async acknowledgeAlert(alertId: string, userId?: string): Promise<any> {
    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        acknowledgedBy: userId,
        acknowledgedAt: new Date()
      }
    });
    
    // Broadcast update to all clients
    this.broadcast({
      type: 'event',
      data: {
        type: 'alert',
        action: 'acknowledged',
        alertId,
        userId
      },
      timestamp: new Date()
    });
    
    return alert;
  }

  /**
   * Command: Update equipment status
   */
  private async updateEquipmentStatus(equipmentId: string, status: string, userId?: string): Promise<any> {
    const equipment = await prisma.workUnit.update({
      where: { id: equipmentId },
      data: { status }
    });
    
    // Log the change
    await prisma.auditLog.create({
      data: {
        action: 'equipment.status.update',
        resourceType: 'equipment',
        resourceId: equipmentId,
        userId: userId || 'system',
        details: { oldStatus: equipment.status, newStatus: status }
      }
    });
    
    return equipment;
  }

  /**
   * Command: Create annotation
   */
  private async createAnnotation(params: any, userId?: string): Promise<any> {
    const annotation = await prisma.annotation.create({
      data: {
        ...params,
        userId: userId || 'system'
      }
    });
    
    return annotation;
  }

  /**
   * Query: Get current OEE
   */
  private async getCurrentOEE(equipmentId?: string): Promise<any> {
    const where = equipmentId ? { workUnitId: equipmentId } : {};
    
    const latestMetric = await prisma.performanceMetric.findFirst({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        WorkUnit: { select: { name: true } }
      }
    });
    
    if (!latestMetric) {
      return { oee: 0, message: 'No data available' };
    }
    
    return {
      oee: latestMetric.oeeScore,
      availability: latestMetric.availability,
      performance: latestMetric.performance,
      quality: latestMetric.quality,
      equipment: latestMetric.WorkUnit?.name,
      timestamp: latestMetric.timestamp
    };
  }

  /**
   * Query: Get active alerts
   */
  private async getActiveAlerts(severity?: string): Promise<any> {
    const where: any = { status: { in: ['active', 'pending'] } };
    if (severity) {
      where.severity = severity;
    }
    
    const alerts = await prisma.alert.findMany({
      where,
      include: {
        WorkUnit: { select: { name: true } }
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });
    
    return alerts.map(alert => ({
      id: alert.id,
      message: alert.message,
      severity: alert.severity,
      equipment: alert.WorkUnit?.name,
      timestamp: alert.timestamp
    }));
  }

  /**
   * Query: Get equipment status
   */
  private async getEquipmentStatus(equipmentIds?: string[]): Promise<any> {
    const where = equipmentIds ? { id: { in: equipmentIds } } : {};
    
    const equipment = await prisma.workUnit.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        equipmentType: true,
        _count: {
          select: {
            Alert: { where: { status: 'active' } }
          }
        }
      }
    });
    
    return equipment.map(unit => ({
      id: unit.id,
      name: unit.name,
      status: unit.status,
      type: unit.equipmentType,
      activeAlerts: unit._count.Alert
    }));
  }

  /**
   * Query: Get production rate
   */
  private async getProductionRate(lineId?: string, duration: number = 3600000): Promise<any> {
    const since = new Date(Date.now() - duration);
    const where: any = { timestamp: { gte: since } };
    
    if (lineId) {
      // Assuming lineId maps to a work center
      where.WorkUnit = { workCenterId: lineId };
    }
    
    const metrics = await prisma.performanceMetric.findMany({
      where,
      select: {
        timestamp: true,
        goodCount: true,
        totalCount: true,
        WorkUnit: {
          select: { name: true, workCenterId: true }
        }
      },
      orderBy: { timestamp: 'asc' }
    });
    
    // Calculate rate
    const totalGood = metrics.reduce((sum, m) => sum + (m.goodCount || 0), 0);
    const totalProduced = metrics.reduce((sum, m) => sum + (m.totalCount || 0), 0);
    const timeSpanHours = duration / (1000 * 60 * 60);
    
    return {
      rate: totalGood / timeSpanHours,
      totalGood,
      totalProduced,
      efficiency: totalProduced > 0 ? (totalGood / totalProduced) * 100 : 0,
      timeRange: { start: since, end: new Date() },
      dataPoints: metrics.length
    };
  }

  /**
   * Send message to specific client
   */
  private sendToClient(client: WSClient, response: WSResponse): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(response));
      performanceMonitor.incrementCounter('websocket.messages.sent');
    }
  }

  /**
   * Send error to client
   */
  private sendError(client: WSClient, error: string, messageId?: string): void {
    this.sendToClient(client, {
      type: 'error',
      id: messageId,
      data: { error },
      timestamp: new Date()
    });
  }

  /**
   * Broadcast message to all clients
   */
  private broadcast(response: WSResponse): void {
    this.clients.forEach(client => {
      this.sendToClient(client, response);
    });
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(client: WSClient): void {
    if (client.subscriptionId) {
      manufacturingDataStream.unsubscribe(client.subscriptionId);
    }
    
    this.clients.delete(client.id);
    performanceMonitor.incrementCounter('websocket.connections.closed');
    
    logger.info('WebSocket client disconnected', { clientId: client.id });
  }

  /**
   * Handle client error
   */
  private handleError(client: WSClient, error: Error): void {
    logger.error('WebSocket client error:', { clientId: client.id, error });
    performanceMonitor.recordError('websocket.client');
  }

  /**
   * Check client heartbeats
   */
  private checkHeartbeats(): void {
    this.clients.forEach((client) => {
      if (!client.isAlive) {
        client.ws.terminate();
        return;
      }
      
      client.isAlive = false;
      client.ws.ping();
    });
  }

  /**
   * Extract user ID from request
   */
  private extractUserId(request: IncomingMessage): string | undefined {
    // Extract from authorization header or cookie
    // This is a simplified version - implement proper auth
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      // Decode JWT or validate token
      return 'user_123'; // Placeholder
    }
    return undefined;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all client connections
    this.clients.forEach(client => {
      client.ws.close(1000, 'Server shutdown');
    });
    
    this.clients.clear();
    
    if (this.wss) {
      this.wss.close();
    }
    
    logger.info('WebSocket server shut down');
  }
}

// Singleton instance
export const webSocketHandler = new WebSocketHandler();