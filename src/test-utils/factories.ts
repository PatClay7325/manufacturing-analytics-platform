/**
 * Test data factories
 * 
 * These functions create test data objects with sensible defaults
 * that can be overridden as needed for specific test cases.
 */

export interface Equipment {
  id: string;
  name: string;
  type: string;
  status: 'operational' | 'maintenance' | 'offline' | 'error';
  lastMaintenance?: string;
  nextMaintenance?: string;
  metrics?: Record<string, number>;
  location?: string;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  equipmentId: string;
  acknowledged: boolean;
  category?: string;
}

export interface KPI {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable' | 'neutral';
  change?: number;
  target?: number;
  history?: Array<{ date: string; value: number }>;
}

/**
 * Creates an equipment object with default values
 */
export const createEquipment = (overrides: Partial<Equipment> = {}): Equipment => ({
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
  ...overrides,
});

/**
 * Creates an alert object with default values
 */
export const createAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'alert-1',
  severity: 'warning',
  message: 'Temperature above normal range',
  timestamp: '2023-06-10T14:30:00Z',
  equipmentId: 'equip-1',
  acknowledged: false,
  category: 'temperature',
  ...overrides,
});

/**
 * Creates a KPI object with default values
 */
export const createKPI = (overrides: Partial<KPI> = {}): KPI => ({
  id: 'kpi-1',
  name: 'OEE',
  value: 85,
  unit: '%',
  trend: 'up',
  change: 3.5,
  target: 90,
  history: [
    { date: '2023-05-10', value: 82 },
    { date: '2023-05-17', value: 83 },
    { date: '2023-05-24', value: 84 },
    { date: '2023-05-31', value: 85 }
  ],
  ...overrides,
});

/**
 * Creates an array of equipment objects
 */
export const createEquipmentList = (count: number = 3): Equipment[] => {
  return Array.from({ length: count }, (_, index) => createEquipment({
    id: `equip-${index + 1}`,
    name: `Equipment ${index + 1}`,
    status: index % 3 === 0 ? 'maintenance' : (index % 2 === 0 ? 'operational' : 'offline')
  }));
};

/**
 * Creates an array of alert objects
 */
export const createAlertList = (count: number = 5): Alert[] => {
  return Array.from({ length: count }, (_, index) => createAlert({
    id: `alert-${index + 1}`,
    severity: index % 3 === 0 ? 'critical' : (index % 2 === 0 ? 'warning' : 'info'),
    message: `Alert message ${index + 1}`,
    equipmentId: `equip-${(index % 3) + 1}`
  }));
};

/**
 * Creates an array of KPI objects
 */
export const createKPIList = (count: number = 4): KPI[] => {
  const kpiNames = ['OEE', 'Availability', 'Performance', 'Quality'];
  const kpiUnits = ['%', '%', '%', '%'];
  
  return Array.from({ length: count }, (_, index) => createKPI({
    id: `kpi-${index + 1}`,
    name: kpiNames[index % kpiNames.length],
    value: 75 + index * 5,
    unit: kpiUnits[index % kpiUnits.length],
    trend: index % 2 === 0 ? 'up' : 'down'
  }));
};

// Aliases for backwards compatibility
export const createMockAlert = createAlert;
export const createMockKPI = createKPI;
export const createMockEquipmentList = createEquipmentList;