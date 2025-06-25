import { http, HttpResponse, delay, passthrough } from 'msw';
import { mockEquipmentData } from './data/equipment';
import { mockAlertData } from './data/alerts';
import { mockChatData } from './data/chat';
import { mockMetricsData } from './data/metrics';
import { mockUserData } from './data/users';

// Helper to simulate network delay (between 100-300ms)
const simulateNetworkDelay = () => delay(Math.floor(Math.random() * 200) + 100);

export const handlers = [
  // Equipment endpoints
  http.get('/api/equipment', async () => {
    await simulateNetworkDelay();
    return HttpResponse.json({
      equipment: mockEquipmentData,
      total: mockEquipmentData.length,
    });
  }),

  http.get('/api/equipment/:id', async ({ params }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const equipment = mockEquipmentData.find(item => item.id === id);
    
    if (!equipment) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Equipment not found'
      });
    }
    
    return HttpResponse.json(equipment);
  }),

  // Alert endpoints
  http.get('/api/alerts', async ({ request }) => {
    await simulateNetworkDelay();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const severity = url.searchParams.get('severity');
    const source = url.searchParams.get('source');
    
    let filteredAlerts = [...mockAlertData.alerts];
    
    if (status) {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
    }
    
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }
    
    if (source) {
      filteredAlerts = filteredAlerts.filter(alert => alert.source === source);
    }
    
    return HttpResponse.json({
      alerts: filteredAlerts,
      total: filteredAlerts.length,
    });
  }),

  http.get('/api/alerts/:id', async ({ params }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const alert = mockAlertData.alerts.find(item => item.id === id);
    
    if (!alert) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Alert not found'
      });
    }
    
    return HttpResponse.json(alert);
  }),

  http.post('/api/alerts/:id/acknowledge', async ({ params }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const alert = mockAlertData.alerts.find(item => item.id === id);
    
    if (!alert) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Alert not found'
      });
    }
    
    return HttpResponse.json({
      id,
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
    });
  }),

  http.post('/api/alerts/:id/resolve', async ({ params }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const alert = mockAlertData.alerts.find(item => item.id === id);
    
    if (!alert) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Alert not found'
      });
    }
    
    return HttpResponse.json({
      id,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
  }),

  http.get('/api/alerts/statistics', async () => {
    await simulateNetworkDelay();
    return HttpResponse.json(mockAlertData.statistics);
  }),

  http.get('/api/alerts/rules', async () => {
    await simulateNetworkDelay();
    return HttpResponse.json({
      rules: mockAlertData.rules,
      total: mockAlertData.rules.length
    });
  }),

  // Chat endpoints
  http.get('/api/chat/sessions', async () => {
    await simulateNetworkDelay();
    return HttpResponse.json({
      sessions: mockChatData.sessions,
      total: mockChatData.sessions.length
    });
  }),

  http.get('/api/chat/sessions/:id', async ({ params }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const session = mockChatData.sessions.find(s => s.id === id);
    
    if (!session) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Chat session not found'
      });
    }
    
    return HttpResponse.json(session);
  }),

  http.get('/api/chat/sessions/:id/messages', async ({ params }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const messages = mockChatData.messages[id];
    
    if (!messages) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Chat session not found'
      });
    }
    
    return HttpResponse.json({
      messages,
      total: messages.length
    });
  }),

  http.post('/api/chat/sessions', async ({ request }) => {
    await simulateNetworkDelay();
    const data = await request.json();
    
    const newSession = {
      id: `session-${Date.now()}`,
      title: data.title || 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0
    };
    
    return HttpResponse.json(newSession);
  }),

  http.post('/api/chat/sessions/:id/messages', async ({ params, request }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const data = await request.json();
    
    const newMessage = {
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    return HttpResponse.json(newMessage);
  }),

  http.post('/api/chat/completions', async ({ request }) => {
    await simulateNetworkDelay();
    // Add extra delay to simulate AI processing
    await delay(500);
    
    const data = await request.json();
    const messages = data.messages;
    
    // Get the last user message
    const lastUserMessage = messages
      .filter(msg => msg.role === 'user')
      .pop()?.content.toLowerCase() || '';
    
    // Find an appropriate response based on keywords
    let responseContent = mockChatData.completionResponses.default;
    
    for (const [keyword, response] of Object.entries(mockChatData.completionResponses)) {
      if (keyword !== 'default' && lastUserMessage.includes(keyword)) {
        responseContent = response;
        break;
      }
    }
    
    return HttpResponse.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'manufacturing-assistant-1',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: responseContent
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: messages.reduce((acc, msg) => acc + msg.content.length / 4, 0),
        completion_tokens: responseContent.length / 4,
        total_tokens: messages.reduce((acc, msg) => acc + msg.content.length / 4, 0) + responseContent.length / 4
      }
    });
  }),

  http.get('/api/chat/sample-questions', async () => {
    await simulateNetworkDelay();
    return HttpResponse.json({
      questions: mockChatData.sampleQuestions
    });
  }),

  // Metrics endpoints
  http.get('/api/metrics/production', async ({ request }) => {
    await simulateNetworkDelay();
    const url = new URL(request.url);
    const lineId = url.searchParams.get('lineId');
    const period = url.searchParams.get('period');
    
    let filteredMetrics = [...mockMetricsData.productionMetrics];
    
    if (lineId) {
      filteredMetrics = filteredMetrics.filter(metric => metric.lineId === lineId);
    }
    
    if (period) {
      filteredMetrics = filteredMetrics.filter(metric => !metric.period || metric.period === period);
    }
    
    return HttpResponse.json(filteredMetrics);
  }),

  http.get('/api/metrics/downtime', async ({ request }) => {
    await simulateNetworkDelay();
    const url = new URL(request.url);
    const count = url.searchParams.get('count');
    
    let downtimeData = [...mockMetricsData.downtimeReasons];
    
    if (count) {
      downtimeData = downtimeData.slice(0, parseInt(count));
    }
    
    return HttpResponse.json(downtimeData);
  }),

  http.get('/api/metrics/quality', async () => {
    await simulateNetworkDelay();
    return HttpResponse.json(mockMetricsData.qualityMetrics);
  }),

  http.get('/api/metrics/dashboard', async () => {
    await simulateNetworkDelay();
    return HttpResponse.json(mockMetricsData.dashboardMetrics);
  }),

  http.get('/api/metrics/oee/trend', async ({ request }) => {
    await simulateNetworkDelay();
    const url = new URL(request.url);
    const days = url.searchParams.get('days');
    
    return HttpResponse.json(
      days ? mockMetricsData.oeeTrend.slice(-parseInt(days)) : mockMetricsData.oeeTrend
    );
  }),

  http.get('/api/metrics/production/trend', async ({ request }) => {
    await simulateNetworkDelay();
    const url = new URL(request.url);
    const days = url.searchParams.get('days');
    
    return HttpResponse.json(
      days ? mockMetricsData.productionTrend.slice(-parseInt(days)) : mockMetricsData.productionTrend
    );
  }),

  http.get('/api/metrics/quality/trend', async ({ request }) => {
    await simulateNetworkDelay();
    const url = new URL(request.url);
    const days = url.searchParams.get('days');
    
    return HttpResponse.json(
      days ? mockMetricsData.qualityTrend.slice(-parseInt(days)) : mockMetricsData.qualityTrend
    );
  }),

  http.get('/api/metrics/equipment/:id/performance', async ({ params }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const performance = mockMetricsData.equipmentPerformance[id];
    
    if (!performance) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Equipment performance data not found'
      });
    }
    
    return HttpResponse.json(performance);
  }),

  // Authentication endpoints
  http.post('/api/auth/login', async ({ request }) => {
    await simulateNetworkDelay();
    const { username, password } = await request.json();
    
    // Simple validation - in real app, would verify password hash
    if (password !== 'password') {
      return new HttpResponse(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401 }
      );
    }
    
    const loginResponse = mockUserData.loginResponses[username];
    
    if (!loginResponse) {
      return new HttpResponse(
        JSON.stringify({ error: 'User not found' }),
        { status: 401 }
      );
    }
    
    return HttpResponse.json(loginResponse);
  }),

  http.post('/api/auth/logout', async () => {
    await simulateNetworkDelay();
    return HttpResponse.json({ success: true });
  }),

  http.get('/api/auth/me', async ({ request }) => {
    await simulateNetworkDelay();
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new HttpResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }
    
    // In a real implementation, we would verify the JWT token
    // For mock purposes, just return the admin user
    return HttpResponse.json({
      user: mockUserData.users.find(u => u.username === 'admin')
    });
  }),

  http.post('/api/auth/refresh-token', async ({ request }) => {
    await simulateNetworkDelay();
    const { refreshToken } = await request.json();
    
    // In a real implementation, we would verify the refresh token
    // For mock purposes, just generate a new token
    return HttpResponse.json({
      token: `new-jwt-token-${Date.now()}`,
      expiresAt: Date.now() + 3600000, // 1 hour from now
    });
  }),

  http.post('/api/auth/register', async ({ request }) => {
    await simulateNetworkDelay();
    const userData = await request.json();
    
    // Simple validation
    if (!userData.username || !userData.email || !userData.password) {
      return new HttpResponse(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }
    
    // Check if user already exists
    if (mockUserData.users.some(u => u.username === userData.username || u.email === userData.email)) {
      return new HttpResponse(
        JSON.stringify({ error: 'User already exists' }),
        { status: 409 }
      );
    }
    
    // Create new user (without returning password)
    const { password, ...userWithoutPassword } = userData;
    const newUser = {
      id: `user-${Date.now()}`,
      ...userWithoutPassword,
      role: 'user',
      permissions: ['view:equipment', 'view:alerts'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return HttpResponse.json(newUser);
  }),

  // WebSocket simulation endpoint (for real-time updates)
  http.get('/api/ws/info', async () => {
    await simulateNetworkDelay();
    return HttpResponse.json({
      wsUrl: 'ws://localhost:3000/ws',
      reconnectInterval: 5000,
    });
  }),
];

// Error simulation handlers for testing error states
export const errorHandlers = [
  http.get('/api/equipment', () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }),
  
  http.get('/api/alerts', () => {
    return HttpResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }),
  
  http.post('/api/auth/login', () => {
    return HttpResponse.json(
      { error: 'Authentication service temporarily unavailable' },
      { status: 503 }
    );
  }),
  
  // Metrics endpoints
  http.post('/api/metrics/query', async ({ request }) => {
    await simulateNetworkDelay();
    
    const body = await request.json() as any;
    const { metrics = ['temperature', 'pressure'], timeRange, aggregation = 'none' } = body;
    
    // Generate mock time series data
    const generateDatapoints = (metricName: string) => {
      const now = new Date(timeRange?.to || new Date());
      const from = new Date(timeRange?.from || new Date(now.getTime() - 60 * 60 * 1000)); // 1 hour ago
      const pointCount = aggregation === 'none' ? 60 : 12;
      const interval = (now.getTime() - from.getTime()) / pointCount;
      
      const datapoints: [number, number][] = [];
      
      for (let i = 0; i < pointCount; i++) {
        const timestamp = from.getTime() + (i * interval);
        let value = 0;
        
        // Generate realistic values based on metric type
        switch (metricName) {
          case 'temperature':
            value = 65 + Math.sin(i / 10) * 5 + (Math.random() - 0.5) * 2;
            break;
          case 'pressure':
            value = 4.5 + Math.cos(i / 8) * 0.5 + (Math.random() - 0.5) * 0.2;
            break;
          case 'vibration':
            value = 0.5 + Math.abs(Math.sin(i / 5)) * 0.3 + (Math.random() - 0.5) * 0.1;
            break;
          case 'production_count':
            value = Math.floor(50 + i * 2 + (Math.random() - 0.5) * 10);
            break;
          default:
            value = 50 + (Math.random() - 0.5) * 20;
        }
        
        datapoints.push([value, timestamp]);
      }
      
      return datapoints;
    };
    
    const response = metrics.map((metricName: string) => ({
      target: metricName,
      datapoints: generateDatapoints(metricName)
    }));
    
    return HttpResponse.json({
      success: true,
      data: response
    });
  }),
  
  // Handler for Next.js API routes that might not be mocked
  http.all('/api/*', ({ request }) => {
    console.warn(`[MSW] Unhandled API request: ${request.method} ${request.url}`);
    return new HttpResponse(null, { status: 404 });
  }),

  // Bypass external URLs (fonts, CDNs, etc.)
  http.get(/^https?:\/\/(?!localhost).*/, () => {
    return passthrough();
  }),
  http.post(/^https?:\/\/(?!localhost).*/, () => {
    return passthrough();
  }),
];