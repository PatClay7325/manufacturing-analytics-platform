import { vi } from 'vitest';
import { Equipment, Alert, KPI } from './factories';

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
export const mockAlertData: Alert[] = [
  {
    id: 'alert-1',
    severity: 'warning',
    message: 'Temperature above normal range',
    timestamp: '2023-06-10T14:30:00Z',
    equipmentId: 'equip-1',
    acknowledged: false,
    category: 'temperature',
  },
  {
    id: 'alert-2',
    severity: 'critical',
    message: 'Pressure exceeds safety threshold',
    timestamp: '2023-06-10T15:45:00Z',
    equipmentId: 'equip-2',
    acknowledged: true,
    category: 'pressure',
  },
  {
    id: 'alert-3',
    severity: 'info',
    message: 'Scheduled maintenance due',
    timestamp: '2023-06-11T09:15:00Z',
    equipmentId: 'equip-1',
    acknowledged: false,
    category: 'maintenance',
  },
  {
    id: 'alert-4',
    severity: 'warning',
    message: 'Vibration levels increasing',
    timestamp: '2023-06-11T10:22:00Z',
    equipmentId: 'equip-2',
    acknowledged: false,
    category: 'vibration',
  },
  {
    id: 'alert-5',
    severity: 'critical',
    message: 'Emergency stop activated',
    timestamp: '2023-06-11T11:07:00Z',
    equipmentId: 'equip-3',
    acknowledged: true,
    category: 'safety',
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

/**
 * Setup mock fetch for testing
 */
export const setupMockFetch = (responses: Record<string, any>) => {
  const mockFetchImpl = vi.fn((url: string) => {
    const path = new URL(url).pathname;
    const responseData = responses[path] || null;
    
    if (!responseData) {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
        text: () => Promise.resolve('Not found'),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
    }
    
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(responseData),
      text: () => Promise.resolve(JSON.stringify(responseData)),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });
  });
  
  // @ts-ignore
  global.fetch = mockFetchImpl;
  
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