import { vi } from 'vitest'

export const mockSystemStatus = {
  healthy: true,
  services: [
    {
      name: 'PostgreSQL Database',
      status: 'up' as const,
      lastCheck: new Date('2024-01-01T12:00:00Z'),
      responseTime: 15,
    },
    {
      name: 'Prometheus',
      status: 'up' as const,
      lastCheck: new Date('2024-01-01T12:00:00Z'),
      responseTime: 25,
    },
    {
      name: 'AnalyticsPlatform',
      status: 'degraded' as const,
      lastCheck: new Date('2024-01-01T12:00:00Z'),
      responseTime: 150,
    },
  ],
  lastUpdated: new Date('2024-01-01T12:00:00Z'),
}

export const mockActiveAlerts = {
  total: 3,
  critical: 1,
  warning: 2,
  info: 0,
  alerts: [
    {
      id: 'alert-1',
      severity: 'critical' as const,
      title: 'Manufacturing OEE Critical Low',
      description: 'OEE below 50% on Assembly Line 1',
      timestamp: new Date('2024-01-01T11:45:00Z'),
      equipment: 'equip-001',
    },
    {
      id: 'alert-2',
      severity: 'warning' as const,
      title: 'High Temperature',
      description: 'Temperature reading exceeds threshold',
      timestamp: new Date('2024-01-01T11:50:00Z'),
      equipment: 'equip-002',
    },
  ],
}

export const mockMetricsSummary = {
  avgResponseTime: 125,
  errorRate: 2.3,
  requestsPerMinute: 1250,
  activeUsers: 145,
  cpuUsage: 65.2,
  memoryUsage: 78.9,
}

export const mockMetricsData = {
  oee: {
    name: 'Overall Equipment Effectiveness',
    current: 75.2,
    previous: 72.8,
    unit: '%',
    data: [
      { timestamp: '2024-01-01T11:00:00Z', value: 72.5 },
      { timestamp: '2024-01-01T11:05:00Z', value: 74.1 },
      { timestamp: '2024-01-01T11:10:00Z', value: 75.2 },
    ],
  },
  availability: {
    name: 'Availability',
    current: 89.5,
    previous: 87.2,
    unit: '%',
    data: [
      { timestamp: '2024-01-01T11:00:00Z', value: 87.2 },
      { timestamp: '2024-01-01T11:05:00Z', value: 88.8 },
      { timestamp: '2024-01-01T11:10:00Z', value: 89.5 },
    ],
  },
}

export const mockPrometheusResponse = {
  status: 'success',
  data: {
    result: [
      {
        metric: { __name__: 'manufacturing_oee_score', equipment_id: 'equip-001' },
        values: [
          [1704110400, '75.2'],
          [1704110700, '74.8'],
          [1704111000, '76.1'],
        ],
      },
    ],
  },
}

export const mockLogEntries = [
  {
    timestamp: new Date('2024-01-01T12:00:00Z'),
    level: 'info' as const,
    source: 'manufacturing-api',
    message: 'Processing equipment metrics batch',
    metadata: { equipmentId: 'equip-001', batchSize: 100 },
  },
  {
    timestamp: new Date('2024-01-01T12:01:00Z'),
    level: 'warning' as const,
    source: 'prometheus',
    message: 'Scrape target timeout',
    metadata: { target: 'manufacturing-api:3000' },
  },
  {
    timestamp: new Date('2024-01-01T12:02:00Z'),
    level: 'error' as const,
    source: 'analyticsPlatform',
    message: 'Dashboard query failed',
    metadata: { dashboardId: 'manufacturing-overview', error: 'Connection timeout' },
  },
]

// Mock API responses
export const createMockFetch = (responses: Record<string, any>) => {
  return vi.fn().mockImplementation((url: string) => {
    const response = responses[url] || { ok: false, status: 404 }
    return Promise.resolve({
      ok: response.ok !== false,
      status: response.status || 200,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    })
  })
}

// Mock WebSocket for testing
export const createMockWebSocket = () => {
  const mockWebSocket = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
  }

  // Helper to simulate message
  const simulateMessage = (data: any) => {
    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage({ data: JSON.stringify(data) } as MessageEvent)
    }
  }

  return { mockWebSocket, simulateMessage }
}

// Test data factories
export const createTestAlert = (overrides: Partial<typeof mockActiveAlerts.alerts[0]> = {}) => ({
  id: 'test-alert-id',
  severity: 'warning' as const,
  title: 'Test Alert',
  description: 'Test alert description',
  timestamp: new Date(),
  equipment: 'test-equipment',
  ...overrides,
})

export const createTestMetric = (name: string, value: number) => ({
  name,
  current: value,
  previous: value * 0.9,
  unit: '%',
  data: Array.from({ length: 10 }, (_, i) => ({
    timestamp: new Date(Date.now() - (10 - i) * 60000).toISOString(),
    value: value + Math.random() * 10 - 5,
  })),
})

export const createTestService = (name: string, status: 'up' | 'down' | 'degraded' = 'up') => ({
  name,
  status,
  lastCheck: new Date(),
  responseTime: status === 'up' ? Math.floor(Math.random() * 100) : undefined,
})