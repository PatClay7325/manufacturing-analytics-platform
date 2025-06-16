import { 
  Alert, 
  AlertFilter, 
  AlertStatistics, 
  AlertRule,
  AlertResponse,
  AlertStatus,
  AlertSeverity,
  AlertSource,
  AlertSummary
} from '@/models/alert';

// Generate mock alerts
const generateMockAlerts = (): Alert[] => {
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
      title: alert.title,
      severity: alert.severity,
      status: alert.status,
      source: alert.source,
      sourceName: alert.sourceName,
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
    
    // Apply source filter
    if (filter.source && filter.source.length > 0) {
      filteredAlerts = filteredAlerts.filter(a => filter.source?.includes(a.source));
    }
    
    // Apply search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredAlerts = filteredAlerts.filter(a => 
        a.title.toLowerCase().includes(searchLower) ||
        a.description.toLowerCase().includes(searchLower) ||
        a.sourceName?.toLowerCase().includes(searchLower) ||
        a.tags?.some(tag => tag.toLowerCase().includes(searchLower))
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
    
    // Apply assigned to filter
    if (filter.assignedTo) {
      filteredAlerts = filteredAlerts.filter(a => a.assignedTo === filter.assignedTo);
    }
    
    return filteredAlerts;
  },
  
  // Get alert statistics
  getAlertStatistics: async (): Promise<AlertStatistics> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Count alerts by severity
    const bySeverity: Record<AlertSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    
    // Count alerts by status
    const byStatus: Record<AlertStatus, number> = {
      active: 0,
      acknowledged: 0,
      resolved: 0,
      muted: 0
    };
    
    // Count alerts by source
    const bySource: Record<AlertSource, number> = {
      equipment: 0,
      process: 0,
      quality: 0,
      maintenance: 0,
      inventory: 0,
      safety: 0,
      system: 0
    };
    
    // Count alerts
    mockAlerts.forEach(alert => {
      bySeverity[alert.severity]++;
      byStatus[alert.status]++;
      bySource[alert.source]++;
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
      bySource,
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
  
  // Assign alert
  assignAlert: async (alertId: string, userId: string, userName: string, assignedTo: string, comment?: string): Promise<Alert | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const index = mockAlerts.findIndex(a => a.id === alertId);
    if (index === -1) return null;
    
    const now = new Date().toISOString();
    
    // Update alert
    const updatedAlert: Alert = {
      ...mockAlerts[index],
      assignedTo,
      updatedAt: now
    };
    
    // Create response
    const response: AlertResponse = {
      id: `response-${mockAlertResponses.length + 1}`,
      alertId,
      type: 'assign',
      timestamp: now,
      userId,
      userName,
      assignedTo,
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