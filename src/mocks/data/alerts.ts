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
    equipmentId: 'equip-1',
    alertType: 'equipment',
    severity: 'high',
    message: 'Machine temperature exceeding threshold - CNC Machine XYZ-1000 temperature reached 78°C, exceeding the warning threshold of 75°C.',
    status: 'active',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(), // 45 minutes ago
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    notes: null,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60000).toISOString()
  },
  {
    id: 'alert-2',
    equipmentId: 'equip-2',
    alertType: 'maintenance',
    severity: 'medium',
    message: 'Preventive maintenance required - Robot Arm RX-200 is due for scheduled maintenance. Please schedule maintenance within 48 hours.',
    status: 'acknowledged',
    timestamp: new Date(Date.now() - 12 * 3600000).toISOString(), // 12 hours ago
    acknowledgedBy: 'john.doe',
    acknowledgedAt: new Date(Date.now() - 10 * 3600000).toISOString(),
    resolvedBy: null,
    resolvedAt: null,
    notes: 'I will schedule the maintenance for tomorrow morning.',
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 3600000).toISOString()
  },
  {
    id: 'alert-3',
    equipmentId: 'equip-3',
    alertType: 'equipment',
    severity: 'critical',
    message: 'Conveyor belt stopped unexpectedly - Conveyor Belt System CB-500 stopped unexpectedly. Error code: E-STOP-221. Immediate attention required.',
    status: 'active',
    timestamp: new Date(Date.now() - 20 * 60000).toISOString(), // 20 minutes ago
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    notes: null,
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60000).toISOString()
  },
  {
    id: 'alert-4',
    equipmentId: null,
    alertType: 'process',
    severity: 'medium',
    message: 'Production rate below target - Current production rate is 42 units/hour, below the target of 50 units/hour. Please check for bottlenecks.',
    status: 'active',
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    notes: null,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 3600000).toISOString()
  },
  {
    id: 'alert-5',
    equipmentId: null,
    alertType: 'quality',
    severity: 'high',
    message: 'Quality check failure rate increased - Defect rate has increased to 4.8%, exceeding the threshold of 3%. Most common defect: surface scratches.',
    status: 'active',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    notes: null,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 3600000).toISOString()
  },
  {
    id: 'alert-6',
    equipmentId: null,
    alertType: 'inventory',
    severity: 'medium',
    message: 'Low inventory for raw material - Aluminum sheets (1.5mm) inventory is below reorder point. Current stock: 120 units, Reorder point: 200 units.',
    status: 'acknowledged',
    timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), // 2 days ago
    acknowledgedBy: 'jane.smith',
    acknowledgedAt: new Date(Date.now() - 1.5 * 24 * 3600000).toISOString(),
    resolvedBy: null,
    resolvedAt: null,
    notes: 'I have placed an order for more materials.',
    createdAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1.5 * 24 * 3600000).toISOString()
  },
  {
    id: 'alert-7',
    equipmentId: 'equip-4',
    alertType: 'safety',
    severity: 'critical',
    message: 'Safety guard interlock triggered - Safety interlock on Injection Molding Machine IM-800 was triggered. Machine has been automatically stopped. Please check and reset.',
    status: 'resolved',
    timestamp: new Date(Date.now() - 25 * 3600000).toISOString(), // 25 hours ago
    acknowledgedBy: 'operator-team',
    acknowledgedAt: new Date(Date.now() - 24.8 * 3600000).toISOString(),
    resolvedBy: 'maintenance-team',
    resolvedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    notes: 'Guard door sensor was misaligned. Fixed and tested, machine back in operation.',
    createdAt: new Date(Date.now() - 25 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600000).toISOString()
  },
  {
    id: 'alert-8',
    equipmentId: null,
    alertType: 'system',
    severity: 'low',
    message: 'Network connectivity issues - Intermittent network connectivity issues detected on factory floor network segment B. Some equipment may report delayed data.',
    status: 'resolved',
    timestamp: new Date(Date.now() - 36 * 3600000).toISOString(), // 36 hours ago
    acknowledgedBy: 'it-support',
    acknowledgedAt: new Date(Date.now() - 35 * 3600000).toISOString(),
    resolvedBy: 'it-support',
    resolvedAt: new Date(Date.now() - 30 * 3600000).toISOString(),
    notes: null,
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 3600000).toISOString()
  },
  {
    id: 'alert-9',
    equipmentId: 'equip-5',
    alertType: 'equipment',
    severity: 'high',
    message: 'Laser power output unstable - Laser Cutting Machine LC-2000 is showing unstable power output fluctuations. Current variation: ±12%, Acceptable: ±5%.',
    status: 'acknowledged',
    timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), // 8 hours ago
    acknowledgedBy: 'engineer-team',
    acknowledgedAt: new Date(Date.now() - 7 * 3600000).toISOString(),
    resolvedBy: null,
    resolvedAt: null,
    notes: 'Investigating power fluctuations. Will require calibration.',
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 3600000).toISOString()
  },
  {
    id: 'alert-10',
    equipmentId: null,
    alertType: 'system',
    severity: 'info',
    message: 'Software update available - A critical security update is available for the Manufacturing Execution System. Schedule update during next maintenance window.',
    status: 'active',
    timestamp: new Date(Date.now() - 48 * 3600000).toISOString(), // 48 hours ago
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    notes: null,
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 3600000).toISOString()
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
  byAlertType: {
    equipment: alerts.filter(a => a.alertType === 'equipment').length,
    process: alerts.filter(a => a.alertType === 'process').length,
    quality: alerts.filter(a => a.alertType === 'quality').length,
    maintenance: alerts.filter(a => a.alertType === 'maintenance').length,
    inventory: alerts.filter(a => a.alertType === 'inventory').length,
    safety: alerts.filter(a => a.alertType === 'safety').length,
    system: alerts.filter(a => a.alertType === 'system').length,
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