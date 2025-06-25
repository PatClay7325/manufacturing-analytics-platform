/**
 * WebSocket Middleware for Next.js
 * Handles WebSocket upgrade requests
 */

import { Server } from 'http';
import { parse } from 'url';
import { webSocketHandler } from './WebSocketHandler';
import { logger } from '@/lib/logger';

export function initializeWebSocket(server: Server) {
  // Handle upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '');
    
    if (pathname === '/ws') {
      logger.info('WebSocket upgrade request received');
      
      // Let the WebSocketHandler handle the connection
      // This is handled internally by the ws library when initialized with the server
    } else {
      // Reject non-WebSocket paths
      socket.destroy();
    }
  });
  
  // Initialize the WebSocket handler
  webSocketHandler.initialize(server);
  
  logger.info('WebSocket middleware initialized');
}