import { 
  Alert, 
  AlertFilter, 
  AlertStatistics, 
  AlertRule,
  AlertResponse,
  AlertSummary
} from '@/models/alert';

// Generate mock alerts
const generateMockAlerts = (): Alert[] => {
  const alerts: Alert[] = [
    {
      id: 'alert-1',
      message: 'Machine temperature exceeding threshold - CNC Machine XYZ-1000 temperature reached 78°C, exceeding the warning threshold of 75°C.',
      severity: 'high',
      status: 'active',
      alertType: 'performance',
      equipmentId: 'equip-1',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(), // 45 minutes ago
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedBy: null,
      resolvedAt: null,
      notes: 'Regular quarterly maintenance',
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 45 * 60000).toISOString()
    },
    {
      id: 'alert-2',
      message: 'Preventive maintenance required - Robot Arm RX-200 is due for scheduled maintenance. Please schedule maintenance within 48 hours.',
      severity: 'medium',
      status: 'acknowledged',
      alertType: 'maintenance',
      equipmentId: 'equip-2',
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(), // 12 hours ago
      acknowledgedBy: 'john.doe',
      acknowledgedAt: new Date(Date.now() - 10 * 3600000).toISOString(), // 10 hours ago
      resolvedBy: null,
      resolvedAt: null,
      notes: null,
      createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 3600000).toISOString()
    },
    {
      id: 'alert-3',
      message: 'Conveyor belt stopped unexpectedly - Conveyor Belt System CB-500 stopped unexpectedly. Error code: E-STOP-221. Immediate attention required.',
      severity: 'critical',
      status: 'active',
      alertType: 'equipment',
      equipmentId: 'equip-3',
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
      message: 'Production rate below target - Current production rate is 42 units/hour, below the target of 50 units/hour. Please check for bottlenecks.',
      severity: 'medium',
      status: 'active',
      alertType: 'production',
      equipmentId: null,
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
      message: 'Quality check failure rate increased - Defect rate has increased to 4.8%, exceeding the threshold of 3%. Most common defect: surface scratches.',
      severity: 'high',
      status: 'active',
      alertType: 'quality',
      equipmentId: null,
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
      message: 'Low inventory for raw material - Aluminum sheets (1.5mm) inventory is below reorder point. Current stock: 120 units, Reorder point: 200 units.',
      severity: 'medium',
      status: 'acknowledged',
      alertType: 'inventory',
      equipmentId: null,
      timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), // 2 days ago
      acknowledgedBy: 'jane.smith',
      acknowledgedAt: new Date(Date.now() - 1.5 * 24 * 3600000).toISOString(), // 1.5 days ago
      resolvedBy: null,
      resolvedAt: null,
      notes: null,
      createdAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 1.5 * 24 * 3600000).toISOString()
    },
    {
      id: 'alert-7',
      message: 'Safety guard interlock triggered - Safety interlock on Injection Molding Machine IM-800 was triggered. Machine has been automatically stopped. Please check and reset.',
      severity: 'critical',
      status: 'resolved',
      alertType: 'safety',
      equipmentId: 'equip-4',
      timestamp: new Date(Date.now() - 25 * 3600000).toISOString(), // 25 hours ago
      acknowledgedBy: 'operator-team',
      acknowledgedAt: new Date(Date.now() - 24.8 * 3600000).toISOString(),
      resolvedBy: 'maintenance-team',
      resolvedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      notes: null,
      createdAt: new Date(Date.now() - 25 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 3600000).toISOString()
    },
    {
      id: 'alert-8',
      message: 'Network connectivity issues - Intermittent network connectivity issues detected on factory floor network segment B. Some equipment may report delayed data.',
      severity: 'low',
      status: 'resolved',
      alertType: 'network',
      equipmentId: null,
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
      message: 'Laser power output unstable - Laser Cutting Machine LC-2000 is showing unstable power output fluctuations. Current variation: ±12%, Acceptable: ±5%.',
      severity: 'high',
      status: 'acknowledged',
      alertType: 'equipment',
      equipmentId: 'equip-5',
      timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), // 8 hours ago
      acknowledgedBy: 'engineer-team',
      acknowledgedAt: new Date(Date.now() - 7 * 3600000).toISOString(),
      resolvedBy: null,
      resolvedAt: null,
      notes: null,
      createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 3600000).toISOString()
    },
    {
      id: 'alert-10',
      message: 'Software update available - A critical security update is available for the Manufacturing Execution System. Schedule update during next maintenance window.',
      severity: 'info',
      status: 'active',
      alertType: 'system',
      equipmentId: null,
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
  
  return alerts;
};

// Mock alert rules
const mockAlertRules: AlertRule[] = [
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

// Mock data
const mockAlerts = generateMockAlerts();

// Mock alert responses
const mockAlertResponses: AlertResponse[] = [
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

export const alertService = {
  // Get all alerts
  getAllAlerts: async (): Promise<Alert[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mockAlerts;
  },
  
  // Get alert summaries (for dashboard widgets)
  getAlertSummaries: async (): Promise<AlertSummary[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return mockAlerts.map(alert => ({
      id: alert.id,
      message: alert.message,
      severity: alert.severity,
      status: alert.status,
      alertType: alert.alertType,
      equipmentId: alert.equipmentId,
      createdAt: alert.createdAt
    }));
  },
  
  // Get alert by ID
  getAlertById: async (id: string): Promise<Alert | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const alert = mockAlerts.find(a => a.id === id);
    return alert || null;
  },
  
  // Filter alerts
  filterAlerts: async (filter: AlertFilter): Promise<Alert[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    let filteredAlerts = [...mockAlerts];
    
    // Apply severity filter
    if (filter.severity && filter.severity.length > 0) {
      filteredAlerts = filteredAlerts.filter(a => filter.severity?.includes(a.severity));
    }
    
    // Apply status filter
    if (filter.status && filter.status.length > 0) {
      filteredAlerts = filteredAlerts.filter(a => filter.status?.includes(a.status));
    }
    
    // Apply alertType filter
    if (filter.alertType && filter.alertType.length > 0) {
      filteredAlerts = filteredAlerts.filter(a => filter.alertType?.includes(a.alertType));
    }
    
    // Apply search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredAlerts = filteredAlerts.filter(a => 
        a.message.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply date range filter
    if (filter.dateRange) {
      if (filter.dateRange.start) {
        const startDate = new Date(filter.dateRange.start).getTime();
        filteredAlerts = filteredAlerts.filter(a => new Date(a.createdAt).getTime() >= startDate);
      }
      if (filter.dateRange.end) {
        const endDate = new Date(filter.dateRange.end).getTime();
        filteredAlerts = filteredAlerts.filter(a => new Date(a.createdAt).getTime() <= endDate);
      }
    }
    
    // Apply equipmentId filter
    if (filter.equipmentId) {
      filteredAlerts = filteredAlerts.filter(a => a.equipmentId === filter.equipmentId);
    }
    
    return filteredAlerts;
  },
  
  // Get alert statistics
  getAlertStatistics: async (): Promise<AlertStatistics> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Count alerts by severity
    const bySeverity: Record<string, number> = {};
    
    // Count alerts by status
    const byStatus: Record<string, number> = {};
    
    // Count alerts by alert type
    const byAlertType: Record<string, number> = {};
    
    // Count alerts
    mockAlerts.forEach(alert => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;
      byAlertType[alert.alertType] = (byAlertType[alert.alertType] || 0) + 1;
    });
    
    // Generate trend data (last 7 days)
    const trend = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const count = mockAlerts.filter(a => {
        const alertDate = new Date(a.createdAt);
        return alertDate >= date && alertDate < nextDay;
      }).length;
      
      trend.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }
    
    return {
      total: mockAlerts.length,
      bySeverity,
      byStatus,
      byAlertType,
      trend
    };
  },
  
  // Get alert rules
  getAlertRules: async (): Promise<AlertRule[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return mockAlertRules;
  },
  
  // Get alert rule by ID
  getAlertRuleById: async (id: string): Promise<AlertRule | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const rule = mockAlertRules.find(r => r.id === id);
    return rule || null;
  },
  
  // Create alert rule
  createAlertRule: async (rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${mockAlertRules.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // In a real application, this would be a server call
    mockAlertRules.push(newRule);
    
    return newRule;
  },
  
  // Update alert rule
  updateAlertRule: async (id: string, rule: Partial<AlertRule>): Promise<AlertRule | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = mockAlertRules.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    const updatedRule: AlertRule = {
      ...mockAlertRules[index],
      ...rule,
      updatedAt: new Date().toISOString()
    };
    
    // In a real application, this would be a server call
    mockAlertRules[index] = updatedRule;
    
    return updatedRule;
  },
  
  // Delete alert rule
  deleteAlertRule: async (id: string): Promise<boolean> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = mockAlertRules.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    // In a real application, this would be a server call
    mockAlertRules.splice(index, 1);
    
    return true;
  },
  
  // Acknowledge alert
  acknowledgeAlert: async (alertId: string, userId: string, userName: string, comment?: string): Promise<Alert | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const index = mockAlerts.findIndex(a => a.id === alertId);
    if (index === -1) return null;
    
    // Only active alerts can be acknowledged
    if (mockAlerts[index].status !== 'active') return null;
    
    const now = new Date().toISOString();
    
    // Update alert
    const updatedAlert: Alert = {
      ...mockAlerts[index],
      status: 'acknowledged',
      acknowledgedAt: now,
      acknowledgedBy: userId,
      updatedAt: now
    };
    
    // Create response
    const response: AlertResponse = {
      id: `response-${mockAlertResponses.length + 1}`,
      alertId,
      type: 'acknowledge',
      timestamp: now,
      userId,
      userName,
      comment
    };
    
    // In a real application, these would be server calls
    mockAlerts[index] = updatedAlert;
    mockAlertResponses.push(response);
    
    return updatedAlert;
  },
  
  // Resolve alert
  resolveAlert: async (alertId: string, userId: string, userName: string, comment?: string): Promise<Alert | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const index = mockAlerts.findIndex(a => a.id === alertId);
    if (index === -1) return null;
    
    // Only active or acknowledged alerts can be resolved
    if (mockAlerts[index].status !== 'active' && mockAlerts[index].status !== 'acknowledged') return null;
    
    const now = new Date().toISOString();
    
    // Update alert
    const updatedAlert: Alert = {
      ...mockAlerts[index],
      status: 'resolved',
      resolvedAt: now,
      resolvedBy: userId,
      updatedAt: now
    };
    
    // Create response
    const response: AlertResponse = {
      id: `response-${mockAlertResponses.length + 1}`,
      alertId,
      type: 'resolve',
      timestamp: now,
      userId,
      userName,
      comment
    };
    
    // In a real application, these would be server calls
    mockAlerts[index] = updatedAlert;
    mockAlertResponses.push(response);
    
    return updatedAlert;
  },
  
  // Get alert responses
  getAlertResponses: async (alertId: string): Promise<AlertResponse[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return mockAlertResponses.filter(r => r.alertId === alertId);
  },
  
  // Add comment to alert
  addAlertComment: async (alertId: string, userId: string, userName: string, comment: string): Promise<AlertResponse | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check if alert exists
    const alert = mockAlerts.find(a => a.id === alertId);
    if (!alert) return null;
    
    const now = new Date().toISOString();
    
    // Create response
    const response: AlertResponse = {
      id: `response-${mockAlertResponses.length + 1}`,
      alertId,
      type: 'comment',
      timestamp: now,
      userId,
      userName,
      comment
    };
    
    // In a real application, this would be a server call
    mockAlertResponses.push(response);
    
    return response;
  }
};

export default alertService;