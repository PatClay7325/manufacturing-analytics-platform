import { vi, Mock } from 'vitest';
import { Equipment, Alert, KPI, TestAlert } from './factories';

/**
 * Mock Next.js router
 */
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  pathname: '/',
  query: {},
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
};

/**
 * Mock Next.js hooks
 */
export const mockNextHooks = {
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
};

/**
 * Mock equipment data
 */
export const mockEquipmentData: Equipment[] = [
  {
    id: 'equip-1',
    name: 'CNC Machine 1',
    type: 'CNC',
    status: 'operational',
    lastMaintenance: '2023-01-15',
    nextMaintenance: '2023-07-15',
    metrics: {
      temperature: 65,
      vibration: 0.2,
      speed: 1200,
      powerConsumption: 5.8
    },
    location: 'Building A, Floor 2',
  },
  {
    id: 'equip-2',
    name: 'Robot Arm 1',
    type: 'Robot',
    status: 'maintenance',
    lastMaintenance: '2023-05-10',
    nextMaintenance: '2023-11-10',
    metrics: {
      temperature: 48,
      vibration: 0.4,
      position: 90,
      powerConsumption: 3.2
    },
    location: 'Building A, Floor 1',
  },
  {
    id: 'equip-3',
    name: 'Conveyor Belt 2',
    type: 'Conveyor',
    status: 'offline',
    lastMaintenance: '2023-04-20',
    nextMaintenance: '2023-10-20',
    metrics: {
      temperature: 28,
      vibration: 0.8,
      speed: 0,
      powerConsumption: 0
    },
    location: 'Building B, Floor 1',
  },
];

/**
 * Mock alert data
 */
export const mockAlertData: TestAlert[] = [
  {
    id: 'alert-1',
    severity: 'warning',
    message: 'Temperature above normal range',
    timestamp: '2023-06-10T14:30:00Z',
    equipmentId: 'equip-1',
    acknowledged: false,
    category: 'temperature',
    alertType: 'performance',
    status: 'active',
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    notes: null,
    createdAt: '2023-06-10T14:30:00Z',
    updatedAt: '2023-06-10T14:30:00Z',
    equipment: 'CNC Machine 1',
    type: 'warning'
  },
  {
    id: 'alert-2',
    severity: 'critical',
    message: 'Pressure exceeds safety threshold',
    timestamp: '2023-06-10T15:45:00Z',
    equipmentId: 'equip-2',
    acknowledged: true,
    category: 'pressure',
    alertType: 'performance',
    status: 'acknowledged',
    acknowledgedBy: 'user1',
    acknowledgedAt: '2023-06-10T15:50:00Z',
    resolvedBy: null,
    resolvedAt: null,
    notes: null,
    createdAt: '2023-06-10T15:45:00Z',
    updatedAt: '2023-06-10T15:50:00Z',
    equipment: 'Robot Arm 1',
    type: 'error'
  },
  {
    id: 'alert-3',
    severity: 'info',
    message: 'Scheduled maintenance due',
    timestamp: '2023-06-11T09:15:00Z',
    equipmentId: 'equip-1',
    acknowledged: false,
    category: 'maintenance',
    alertType: 'maintenance',
    status: 'active',
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    notes: null,
    createdAt: '2023-06-11T09:15:00Z',
    updatedAt: '2023-06-11T09:15:00Z',
    equipment: 'CNC Machine 1',
    type: 'info'
  },
  {
    id: 'alert-4',
    severity: 'warning',
    message: 'Vibration levels increasing',
    timestamp: '2023-06-11T10:22:00Z',
    equipmentId: 'equip-2',
    acknowledged: false,
    category: 'vibration',
    alertType: 'performance',
    status: 'active',
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    notes: null,
    createdAt: '2023-06-11T10:22:00Z',
    updatedAt: '2023-06-11T10:22:00Z',
    equipment: 'Robot Arm 1',
    type: 'warning'
  },
  {
    id: 'alert-5',
    severity: 'critical',
    message: 'Emergency stop activated',
    timestamp: '2023-06-11T11:07:00Z',
    equipmentId: 'equip-3',
    acknowledged: true,
    category: 'safety',
    alertType: 'safety',
    status: 'resolved',
    acknowledgedBy: 'user2',
    acknowledgedAt: '2023-06-11T11:10:00Z',
    resolvedBy: 'user2',
    resolvedAt: '2023-06-11T11:30:00Z',
    notes: 'Fixed and restarted',
    createdAt: '2023-06-11T11:07:00Z',
    updatedAt: '2023-06-11T11:30:00Z',
    equipment: 'Conveyor Belt 2',
    type: 'error'
  },
];

/**
 * Mock KPI data
 */
export const mockKPIData: KPI[] = [
  {
    id: 'kpi-1',
    name: 'OEE',
    value: 85,
    unit: '%',
    trend: 'up',
    target: 90,
    history: [
      { date: '2023-05-10', value: 82 },
      { date: '2023-05-17', value: 83 },
      { date: '2023-05-24', value: 84 },
      { date: '2023-05-31', value: 85 }
    ],
  },
  {
    id: 'kpi-2',
    name: 'Availability',
    value: 92,
    unit: '%',
    trend: 'stable',
    target: 95,
    history: [
      { date: '2023-05-10', value: 91 },
      { date: '2023-05-17', value: 93 },
      { date: '2023-05-24', value: 92 },
      { date: '2023-05-31', value: 92 }
    ],
  },
  {
    id: 'kpi-3',
    name: 'Performance',
    value: 88,
    unit: '%',
    trend: 'down',
    target: 90,
    history: [
      { date: '2023-05-10', value: 91 },
      { date: '2023-05-17', value: 90 },
      { date: '2023-05-24', value: 89 },
      { date: '2023-05-31', value: 88 }
    ],
  },
  {
    id: 'kpi-4',
    name: 'Quality',
    value: 97,
    unit: '%',
    trend: 'up',
    target: 98,
    history: [
      { date: '2023-05-10', value: 95 },
      { date: '2023-05-17', value: 96 },
      { date: '2023-05-24', value: 96 },
      { date: '2023-05-31', value: 97 }
    ],
  },
];

/**
 * Mock fetch implementation for testing API calls
 */
export const mockFetch = (mockData: any, status = 200) => {
  return vi.fn().mockImplementation(() => 
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(mockData),
      text: () => Promise.resolve(JSON.stringify(mockData)),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    })
  );
};

/**
 * Mock API handlers
 */
export const mockApiHandlers = {
  getEquipment: () => mockEquipmentData,
  getEquipmentById: (id: string) => mockEquipmentData.find(e => e.id === id),
  getAlerts: () => mockAlertData,
  getAlertsByEquipmentId: (id: string) => mockAlertData.filter(a => a.equipmentId === id),
  getKPIs: () => mockKPIData,
  acknowledgeAlert: (id: string) => {
    const alert = mockAlertData.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
    }
    return alert;
  },
};

// Mock fetch with restore method
type MockFetchInstance = ReturnType<typeof vi.fn> & {
  restore: () => void;
  mockResolvedValue: (value: any) => MockFetchInstance;
  mockResolvedValueOnce: (value: any) => MockFetchInstance;
  mockRejectedValue: (value: any) => MockFetchInstance;
  mockRejectedValueOnce: (value: any) => MockFetchInstance;
};

/**
 * Setup mock fetch for testing
 */
export const setupMockFetch = (responses?: Record<string, any>): MockFetchInstance => {
  const mockFetchImpl = vi.fn() as MockFetchInstance;
  
  // Store the original fetch
  const originalFetch = global.fetch;
  
  // Replace global fetch with mock
  global.fetch = mockFetchImpl as unknown as typeof fetch;
  
  // Add helper method to restore original fetch
  mockFetchImpl.restore = () => {
    global.fetch = originalFetch;
  };
  
  // If responses are provided, set up the mock implementation
  if (responses) {
    mockFetchImpl.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      // Extract URL from RequestInfo
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const urlObj = new URL(url, 'http://localhost');
      const path = urlObj.pathname;
      
      const responseData = responses[path] || null;
      
      if (!responseData) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not found' }),
          text: () => Promise.resolve('Not found'),
          headers: new Headers({ 'Content-Type': 'application/json' }),
        } as Response);
      }
      
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(responseData),
        text: () => Promise.resolve(JSON.stringify(responseData)),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);
    });
  }
  
  // Add method implementations
  mockFetchImpl.mockResolvedValue = (value: any) => {
    mockFetchImpl.mockImplementation(() => Promise.resolve(value));
    return mockFetchImpl;
  };
  
  mockFetchImpl.mockResolvedValueOnce = (value: any) => {
    mockFetchImpl.mockImplementationOnce(() => Promise.resolve(value));
    return mockFetchImpl;
  };
  
  mockFetchImpl.mockRejectedValue = (value: any) => {
    mockFetchImpl.mockImplementation(() => Promise.reject(value));
    return mockFetchImpl;
  };
  
  mockFetchImpl.mockRejectedValueOnce = (value: any) => {
    mockFetchImpl.mockImplementationOnce(() => Promise.reject(value));
    return mockFetchImpl;
  };
  
  return mockFetchImpl;
};

/**
 * Setup global mocks for testing
 */
export const setupGlobalMocks = () => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
};