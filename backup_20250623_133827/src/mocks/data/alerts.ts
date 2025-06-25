import { 
  Alert, 
  AlertRule, 
  AlertResponse, 
  AlertStatistics 
} from '@/models/alert';

// Mock alerts
const alerts: Alert[] = [
  {
    id: 'alert-1',
    title: 'Machine temperature exceeding threshold',
    description: 'CNC Machine XYZ-1000 temperature reached 78°C, exceeding the warning threshold of 75°C.',
    severity: 'high',
    status: 'active',
    source: 'equipment',
    sourceId: 'equip-1',
    sourceName: 'CNC Machine XYZ-1000',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(), // 45 minutes ago
    updatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    dueBy: new Date(Date.now() + 30 * 60000).toISOString(), // Due in 30 minutes
    category: 'temperature',
    tags: ['temperature', 'maintenance-required', 'cnc']
  },
  {
    id: 'alert-2',
    title: 'Preventive maintenance required',
    description: 'Robot Arm RX-200 is due for scheduled maintenance. Please schedule maintenance within 48 hours.',
    severity: 'medium',
    status: 'acknowledged',
    source: 'maintenance',
    sourceId: 'equip-2',
    sourceName: 'Robot Arm RX-200',
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(), // 12 hours ago
    updatedAt: new Date(Date.now() - 10 * 3600000).toISOString(), // 10 hours ago
    acknowledgedAt: new Date(Date.now() - 10 * 3600000).toISOString(),
    acknowledgedBy: 'john.doe',
    dueBy: new Date(Date.now() + 48 * 3600000).toISOString(), // Due in 48 hours
    assignedTo: 'maintenance-team',
    category: 'maintenance',
    tags: ['scheduled-maintenance', 'robot', 'preventive']
  },
  {
    id: 'alert-3',
    title: 'Conveyor belt stopped unexpectedly',
    description: 'Conveyor Belt System CB-500 stopped unexpectedly. Error code: E-STOP-221. Immediate attention required.',
    severity: 'critical',
    status: 'active',
    source: 'equipment',
    sourceId: 'equip-3',
    sourceName: 'Conveyor Belt System CB-500',
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(), // 20 minutes ago
    updatedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    category: 'equipment-failure',
    tags: ['emergency', 'downtime', 'conveyor']
  },
  {
    id: 'alert-4',
    title: 'Production rate below target',
    description: 'Current production rate is 42 units/hour, below the target of 50 units/hour. Please check for bottlenecks.',
    severity: 'medium',
    status: 'active',
    source: 'process',
    sourceName: 'Production Line A',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
    updatedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    category: 'performance',
    tags: ['production', 'efficiency', 'bottleneck']
  },
  {
    id: 'alert-5',
    title: 'Quality check failure rate increased',
    description: 'Defect rate has increased to 4.8%, exceeding the threshold of 3%. Most common defect: surface scratches.',
    severity: 'high',
    status: 'active',
    source: 'quality',
    sourceName: 'Quality Station 2',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
    updatedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    category: 'quality',
    tags: ['defects', 'quality-control', 'surface-finish']
  },
  {
    id: 'alert-6',
    title: 'Low inventory for raw material',
    description: 'Aluminum sheets (1.5mm) inventory is below reorder point. Current stock: 120 units, Reorder point: 200 units.',
    severity: 'medium',
    status: 'acknowledged',
    source: 'inventory',
    sourceName: 'Warehouse A',
    createdAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 1.5 * 24 * 3600000).toISOString(), // 1.5 days ago
    acknowledgedAt: new Date(Date.now() - 1.5 * 24 * 3600000).toISOString(),
    acknowledgedBy: 'jane.smith',
    assignedTo: 'procurement-team',
    category: 'inventory',
    tags: ['inventory', 'raw-materials', 'reorder']
  },
  {
    id: 'alert-7',
    title: 'Safety guard interlock triggered',
    description: 'Safety interlock on Injection Molding Machine IM-800 was triggered. Machine has been automatically stopped. Please check and reset.',
    severity: 'critical',
    status: 'resolved',
    source: 'safety',
    sourceId: 'equip-4',
    sourceName: 'Injection Molding Machine IM-800',
    createdAt: new Date(Date.now() - 25 * 3600000).toISOString(), // 25 hours ago
    updatedAt: new Date(Date.now() - 24 * 3600000).toISOString(), // 24 hours ago
    acknowledgedAt: new Date(Date.now() - 24.8 * 3600000).toISOString(),
    acknowledgedBy: 'operator-team',
    resolvedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    resolvedBy: 'maintenance-team',
    category: 'safety',
    tags: ['safety', 'interlock', 'molding-machine']
  },
  {
    id: 'alert-8',
    title: 'Network connectivity issues',
    description: 'Intermittent network connectivity issues detected on factory floor network segment B. Some equipment may report delayed data.',
    severity: 'low',
    status: 'resolved',
    source: 'system',
    sourceName: 'Network Segment B',
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString(), // 36 hours ago
    updatedAt: new Date(Date.now() - 30 * 3600000).toISOString(), // 30 hours ago
    acknowledgedAt: new Date(Date.now() - 35 * 3600000).toISOString(),
    acknowledgedBy: 'it-support',
    resolvedAt: new Date(Date.now() - 30 * 3600000).toISOString(),
    resolvedBy: 'it-support',
    category: 'network',
    tags: ['network', 'connectivity', 'data-delay']
  },
  {
    id: 'alert-9',
    title: 'Laser power output unstable',
    description: 'Laser Cutting Machine LC-2000 is showing unstable power output fluctuations. Current variation: ±12%, Acceptable: ±5%.',
    severity: 'high',
    status: 'acknowledged',
    source: 'equipment',
    sourceId: 'equip-5',
    sourceName: 'Laser Cutting Machine LC-2000',
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(), // 8 hours ago
    updatedAt: new Date(Date.now() - 7 * 3600000).toISOString(), // 7 hours ago
    acknowledgedAt: new Date(Date.now() - 7 * 3600000).toISOString(),
    acknowledgedBy: 'engineer-team',
    assignedTo: 'maintenance-team',
    category: 'equipment-performance',
    tags: ['laser', 'calibration', 'power-fluctuation']
  },
  {
    id: 'alert-10',
    title: 'Software update available',
    description: 'A critical security update is available for the Manufacturing Execution System. Schedule update during next maintenance window.',
    severity: 'info',
    status: 'active',
    source: 'system',
    sourceName: 'Manufacturing Execution System',
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(), // 48 hours ago
    updatedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    category: 'software',
    tags: ['update', 'security', 'mes']
  }
];

// Mock alert rules
const rules: AlertRule[] = [
  {
    id: 'rule-1',
    name: 'Equipment Temperature High',
    description: 'Alert when equipment temperature exceeds warning threshold',
    condition: {
      type: 'threshold',
      source: 'equipment',
      metric: 'temperature',
      operator: '>',
      value: 75
    },
    severity: 'high',
    enabled: true,
    autoResolve: true,
    autoResolveAfter: 60,
    createdAt: new Date(Date.now() - 30 * 24 * 3600000).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
    lastTriggered: new Date(Date.now() - 45 * 60000).toISOString(),
    tags: ['temperature', 'equipment', 'threshold']
  },
  {
    id: 'rule-2',
    name: 'Preventive Maintenance Due',
    description: 'Alert when equipment is due for preventive maintenance',
    condition: {
      type: 'threshold',
      source: 'maintenance',
      metric: 'daysSinceLastMaintenance',
      operator: '>=',
      value: 90
    },
    severity: 'medium',
    enabled: true,
    notifyUsers: ['maintenance-team', 'operations-manager'],
    createdAt: new Date(Date.now() - 60 * 24 * 3600000).toISOString(), // 60 days ago
    updatedAt: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
    lastTriggered: new Date(Date.now() - 12 * 3600000).toISOString(),
    tags: ['maintenance', 'preventive', 'schedule']
  },
  {
    id: 'rule-3',
    name: 'Production Rate Low',
    description: 'Alert when production rate falls below target for >30 minutes',
    condition: {
      type: 'threshold',
      source: 'process',
      metric: 'productionRate',
      operator: '<',
      value: 50,
      duration: 30
    },
    severity: 'medium',
    enabled: true,
    notifyUsers: ['production-supervisor', 'operations-manager'],
    createdAt: new Date(Date.now() - 90 * 24 * 3600000).toISOString(), // 90 days ago
    updatedAt: new Date(Date.now() - 45 * 24 * 3600000).toISOString(), // 45 days ago
    lastTriggered: new Date(Date.now() - 3 * 3600000).toISOString(),
    tags: ['production', 'efficiency', 'target']
  }
];

// Mock alert responses
const responses: AlertResponse[] = [
  {
    id: 'response-1',
    alertId: 'alert-2',
    type: 'acknowledge',
    timestamp: new Date(Date.now() - 10 * 3600000).toISOString(),
    userId: 'user-1',
    userName: 'John Doe',
    comment: 'I will schedule the maintenance for tomorrow morning.'
  },
  {
    id: 'response-2',
    alertId: 'alert-6',
    type: 'acknowledge',
    timestamp: new Date(Date.now() - 1.5 * 24 * 3600000).toISOString(),
    userId: 'user-2',
    userName: 'Jane Smith',
    comment: 'I have placed an order for more materials.'
  },
  {
    id: 'response-3',
    alertId: 'alert-7',
    type: 'acknowledge',
    timestamp: new Date(Date.now() - 24.8 * 3600000).toISOString(),
    userId: 'user-3',
    userName: 'Operator Team',
    comment: 'Safety interlock triggered due to guard door being opened during operation.'
  },
  {
    id: 'response-4',
    alertId: 'alert-7',
    type: 'resolve',
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
    userId: 'user-4',
    userName: 'Maintenance Team',
    comment: 'Guard door sensor was misaligned. Fixed and tested, machine back in operation.'
  },
  {
    id: 'response-5',
    alertId: 'alert-9',
    type: 'acknowledge',
    timestamp: new Date(Date.now() - 7 * 3600000).toISOString(),
    userId: 'user-5',
    userName: 'Engineer Team',
    comment: 'Investigating power fluctuations. Will require calibration.'
  },
  {
    id: 'response-6',
    alertId: 'alert-9',
    type: 'assign',
    timestamp: new Date(Date.now() - 7 * 3600000).toISOString(),
    userId: 'user-5',
    userName: 'Engineer Team',
    assignedTo: 'maintenance-team',
    comment: 'Assigning to maintenance team for laser calibration.'
  }
];

// Mock alert statistics
const statistics: AlertStatistics = {
  total: alerts.length,
  bySeverity: {
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
    info: alerts.filter(a => a.severity === 'info').length,
  },
  byStatus: {
    active: alerts.filter(a => a.status === 'active').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    muted: alerts.filter(a => a.status === 'muted').length,
  },
  bySource: {
    equipment: alerts.filter(a => a.source === 'equipment').length,
    process: alerts.filter(a => a.source === 'process').length,
    quality: alerts.filter(a => a.source === 'quality').length,
    maintenance: alerts.filter(a => a.source === 'maintenance').length,
    inventory: alerts.filter(a => a.source === 'inventory').length,
    safety: alerts.filter(a => a.source === 'safety').length,
    system: alerts.filter(a => a.source === 'system').length,
  },
  trend: [
    { date: new Date(Date.now() - 6 * 24 * 3600000).toISOString().split('T')[0], count: 3 },
    { date: new Date(Date.now() - 5 * 24 * 3600000).toISOString().split('T')[0], count: 5 },
    { date: new Date(Date.now() - 4 * 24 * 3600000).toISOString().split('T')[0], count: 2 },
    { date: new Date(Date.now() - 3 * 24 * 3600000).toISOString().split('T')[0], count: 4 },
    { date: new Date(Date.now() - 2 * 24 * 3600000).toISOString().split('T')[0], count: 6 },
    { date: new Date(Date.now() - 1 * 24 * 3600000).toISOString().split('T')[0], count: 3 },
    { date: new Date().toISOString().split('T')[0], count: 4 }
  ]
};

// Export all mock data
export const mockAlertData = {
  alerts,
  rules,
  responses,
  statistics
};