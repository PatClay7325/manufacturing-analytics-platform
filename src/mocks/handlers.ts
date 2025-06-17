import { http, HttpResponse, delay } from 'msw';
import { mockAlertData, mockKPIData, mockEquipmentData } from '../test-utils/mocks';
import { createAlert } from '../test-utils/factories';

// Type definitions for request body data
interface AcknowledgeAlertRequest {
  userId: string;
  userName: string;
  notes?: string;
}

interface ResolveAlertRequest {
  userId: string;
  userName: string;
  notes?: string;
}

interface CreateChatRequest {
  title: string;
}

interface AddChatMessageRequest {
  content: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  name?: string;
}

interface ChangePasswordRequest {
  password: string;
}

// Simulate network delay
const simulateNetworkDelay = async () => {
  await delay(300);
};

export const handlers = [
  http.get('/api/ping', () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  // Equipment endpoints
  http.get('/api/equipment', async () => {
    await simulateNetworkDelay();
    return HttpResponse.json(mockEquipmentData);
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

  http.get('/api/equipment/:id/alerts', async ({ params }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const alerts = mockAlertData.filter(item => item.equipmentId === id);
    
    return HttpResponse.json({
      alerts,
      total: alerts.length,
    });
  }),

  // Alert endpoints
  http.get('/api/alerts', async ({ request }) => {
    await simulateNetworkDelay();
    const url = new URL(request.url);
    const severity = url.searchParams.get('severity');
    const alertType = url.searchParams.get('alertType');
    const status = url.searchParams.get('status');
    const equipmentId = url.searchParams.get('equipmentId');
    
    let filteredAlerts = [...mockAlertData];
    
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }
    
    if (alertType) {
      filteredAlerts = filteredAlerts.filter(alert => alert.alertType === alertType);
    }

    if (status) {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
    }

    if (equipmentId) {
      filteredAlerts = filteredAlerts.filter(alert => alert.equipmentId === equipmentId);
    }
    
    return HttpResponse.json({
      alerts: filteredAlerts,
      total: filteredAlerts.length,
    });
  }),

  http.get('/api/alerts/:id', async ({ params }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const alert = mockAlertData.find(item => item.id === id);
    
    if (!alert) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Alert not found'
      });
    }
    
    return HttpResponse.json(alert);
  }),

  http.post('/api/alerts/:id/acknowledge', async ({ params, request }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const alertIndex = mockAlertData.findIndex(item => item.id === id);
    
    if (alertIndex === -1) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Alert not found'
      });
    }
    
    const data = await request.json() as AcknowledgeAlertRequest;
    const userId = data?.userId || 'unknown';
    const userName = data?.userName || 'Unknown User';
    const notes = data?.notes;
    
    const now = new Date().toISOString();
    
    // Create a copy and update
    const updatedAlert = {
      ...mockAlertData[alertIndex],
      status: 'acknowledged',
      acknowledgedBy: userId,
      acknowledgedAt: now,
      updatedAt: now,
      notes: notes || mockAlertData[alertIndex].notes,
    };
    
    // Update in the mock data array
    mockAlertData[alertIndex] = updatedAlert;
    
    return HttpResponse.json(updatedAlert);
  }),

  http.post('/api/alerts/:id/resolve', async ({ params, request }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const alertIndex = mockAlertData.findIndex(item => item.id === id);
    
    if (alertIndex === -1) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Alert not found'
      });
    }
    
    const data = await request.json() as ResolveAlertRequest;
    const userId = data?.userId || 'unknown';
    const userName = data?.userName || 'Unknown User';
    const notes = data?.notes;
    
    const now = new Date().toISOString();
    
    // Create a copy and update
    const updatedAlert = {
      ...mockAlertData[alertIndex],
      status: 'resolved',
      resolvedBy: userId,
      resolvedAt: now,
      updatedAt: now,
      notes: notes || mockAlertData[alertIndex].notes,
    };
    
    // Update in the mock data array
    mockAlertData[alertIndex] = updatedAlert;
    
    return HttpResponse.json(updatedAlert);
  }),

  // KPI endpoints
  http.get('/api/kpis', async () => {
    await simulateNetworkDelay();
    return HttpResponse.json(mockKPIData);
  }),

  http.get('/api/kpis/:id', async ({ params }) => {
    await simulateNetworkDelay();
    const { id } = params;
    const kpi = mockKPIData.find(item => item.id === id);
    
    if (!kpi) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'KPI not found'
      });
    }
    
    return HttpResponse.json(kpi);
  }),

  // Chat endpoints
  http.get('/api/chat', async () => {
    await simulateNetworkDelay();
    
    return HttpResponse.json({
      sessions: [
        {
          id: 'chat-1',
          title: 'Equipment Troubleshooting',
          createdAt: '2023-06-01T10:15:00Z',
          updatedAt: '2023-06-01T10:45:00Z',
          messageCount: 8
        },
        {
          id: 'chat-2',
          title: 'Maintenance Scheduling',
          createdAt: '2023-06-02T14:30:00Z',
          updatedAt: '2023-06-02T15:00:00Z',
          messageCount: 6
        },
        {
          id: 'chat-3',
          title: 'Production Planning',
          createdAt: '2023-06-03T09:00:00Z',
          updatedAt: '2023-06-03T09:20:00Z',
          messageCount: 4
        }
      ]
    });
  }),

  http.post('/api/chat', async ({ request }) => {
    await simulateNetworkDelay();
    
    const data = await request.json() as CreateChatRequest;
    
    if (!data || !data.title) {
      return new HttpResponse(null, { 
        status: 400,
        statusText: 'Title is required'
      });
    }
    
    const now = new Date().toISOString();
    const newSession = {
      id: `chat-${Date.now()}`,
      title: data.title,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'system',
          content: 'Hello! How can I help you with manufacturing analytics today?',
          timestamp: now
        }
      ]
    };
    
    return HttpResponse.json(newSession);
  }),

  http.get('/api/chat/:id', async ({ params }) => {
    await simulateNetworkDelay();
    const { id } = params;
    
    // Return a mock chat session
    if (id === 'chat-1') {
      return HttpResponse.json({
        id: 'chat-1',
        title: 'Equipment Troubleshooting',
        createdAt: '2023-06-01T10:15:00Z',
        updatedAt: '2023-06-01T10:45:00Z',
        messages: [
          {
            id: 'msg-1',
            role: 'system',
            content: 'Hello! How can I help you with manufacturing analytics today?',
            timestamp: '2023-06-01T10:15:00Z'
          },
          {
            id: 'msg-2',
            role: 'user',
            content: 'I\'m seeing high temperature alerts on CNC Machine 1. What could be causing this?',
            timestamp: '2023-06-01T10:16:00Z'
          },
          {
            id: 'msg-3',
            role: 'assistant',
            content: 'High temperatures in CNC machines can be caused by several factors: 1) Insufficient coolant, 2) Blocked coolant lines, 3) Excessive cutting speed or feed rate, or 4) Dull tooling. I recommend checking the coolant level and flow first, as that\'s the most common cause.',
            timestamp: '2023-06-01T10:17:00Z'
          }
        ]
      });
    }
    
    return new HttpResponse(null, { 
      status: 404,
      statusText: 'Chat session not found'
    });
  }),

  http.post('/api/chat/:id/messages', async ({ params, request }) => {
    await simulateNetworkDelay();
    const { id } = params;
    
    const data = await request.json() as AddChatMessageRequest;
    
    if (!data || !data.content) {
      return new HttpResponse(null, { 
        status: 400,
        statusText: 'Message content is required'
      });
    }
    
    const now = new Date().toISOString();
    
    // Mock user message
    const userMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: data.content,
      timestamp: now
    };
    
    // Mock assistant response
    const assistantMessage = {
      id: `msg-assistant-${Date.now()}`,
      role: 'assistant',
      content: 'I\'ve analyzed your request. Based on the manufacturing data, I would recommend checking the equipment calibration and ensuring all preventive maintenance is up to date.',
      timestamp: new Date(Date.now() + 1000).toISOString()
    };
    
    return HttpResponse.json({
      messages: [userMessage, assistantMessage]
    });
  }),

  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    await simulateNetworkDelay();
    
    const data = await request.json() as LoginRequest;
    const username = data?.username;
    const password = data?.password;
    
    if (username === 'demo' && password === 'demo123') {
      return HttpResponse.json({
        user: {
          id: 'user-1',
          username: 'demo',
          name: 'Demo User',
          email: 'demo@example.com',
          role: 'operator'
        },
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token'
      });
    }
    
    return new HttpResponse(null, { 
      status: 401,
      statusText: 'Invalid credentials'
    });
  }),

  http.post('/api/auth/refresh', async ({ request }) => {
    await simulateNetworkDelay();
    
    const data = await request.json() as RefreshTokenRequest;
    const refreshToken = data?.refreshToken;
    
    if (refreshToken === 'mock-refresh-token') {
      return HttpResponse.json({
        token: 'new-mock-jwt-token',
        refreshToken: 'new-mock-refresh-token'
      });
    }
    
    return new HttpResponse(null, { 
      status: 401,
      statusText: 'Invalid refresh token'
    });
  }),

  http.post('/api/auth/register', async ({ request }) => {
    await simulateNetworkDelay();
    
    const userData = await request.json() as RegisterRequest;
    
    if (userData && userData.username && userData.email && userData.password) {
      return HttpResponse.json({
        user: {
          id: `user-${Date.now()}`,
          username: userData.username,
          name: userData.name || userData.username,
          email: userData.email,
          role: 'operator'
        },
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token'
      });
    }
    
    return new HttpResponse(null, { 
      status: 400,
      statusText: 'Invalid user data'
    });
  }),

  http.post('/api/auth/change-password', async ({ request }) => {
    await simulateNetworkDelay();
    
    const data = await request.json() as ChangePasswordRequest;
    
    if (!data || !data.password) {
      return new HttpResponse(null, { 
        status: 400,
        statusText: 'Password is required'
      });
    }
    
    return HttpResponse.json({ success: true });
  })
];