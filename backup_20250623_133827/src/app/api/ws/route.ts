import { NextRequest } from 'next/server'

// Note: This is a placeholder for WebSocket endpoint documentation
// Actual WebSocket implementation requires a separate WebSocket server
// This can be implemented using:
// 1. A separate Node.js server with ws or socket.io
// 2. Next.js custom server with WebSocket support
// 3. External WebSocket service (e.g., Pusher, Ably)

export async function GET(request: NextRequest) {
  return new Response(JSON.stringify({
    message: 'WebSocket endpoint',
    note: 'WebSocket connections require upgrade from HTTP to WS protocol',
    implementation: 'See /src/services/websocket-server.ts for server implementation',
    clientUsage: {
      connect: "websocketService.connect()",
      subscribe: "websocketService.subscribe('channel', handler)",
      send: "websocketService.send('type', data)"
    },
    availableChannels: [
      'metric:equipmentId:metricName',
      'alerts:equipmentId',
      'status:equipmentId',
      'global:updates'
    ]
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}