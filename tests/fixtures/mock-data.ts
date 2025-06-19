// Pre-generated mock data for consistent testing
export const mockUsers = {
  admin: {
    id: 'user-admin-001',
    email: 'admin@manufacturing.com',
    password: 'SecurePass123!',
    name: 'Admin User',
    role: 'admin',
    department: 'IT',
    permissions: ['*']
  },
  operator: {
    id: 'user-operator-001',
    email: 'operator@manufacturing.com',
    password: 'OperatorPass123!',
    name: 'John Operator',
    role: 'operator',
    department: 'Production',
    permissions: ['equipment.read', 'equipment.update', 'alerts.read', 'alerts.acknowledge', 'metrics.read']
  },
  technician: {
    id: 'user-tech-001',
    email: 'technician@manufacturing.com',
    password: 'TechPass123!',
    name: 'Jane Technician',
    role: 'technician',
    department: 'Maintenance',
    permissions: ['equipment.read', 'equipment.update', 'maintenance.create', 'maintenance.update', 'alerts.read', 'alerts.resolve']
  },
  viewer: {
    id: 'user-viewer-001',
    email: 'viewer@manufacturing.com',
    password: 'ViewerPass123!',
    name: 'View Only User',
    role: 'viewer',
    department: 'Quality',
    permissions: ['equipment.read', 'alerts.read', 'metrics.read']
  }
};

export const mockEquipment = {
  cncMachine1: {
    id: 'equip-cnc-001',
    name: 'CNC Machine 1',
    type: 'CNC_MACHINE',
    status: 'operational',
    model: 'CNC-5000X',
    serialNumber: 'SN-CNC5000X-001',
    manufacturer: 'TechCorp Industries',
    location: 'Building A, Floor 1',
    installationDate: new Date('2022-01-15'),
    lastMaintenanceDate: new Date('2024-01-10'),
    specifications: {
      powerRequirement: '380V',
      weight: '2500kg',
      dimensions: '3m x 2m x 2.5m',
      spindleSpeed: '12000 RPM',
      axes: 5,
      accuracy: '±0.001mm'
    },
    currentMetrics: {
      oee: 87.5,
      availability: 92.3,
      performance: 89.1,
      quality: 95.2,
      temperature: 72.5,
      pressure: 3.1,
      vibration: 1.2
    }
  },
  assemblyRobot1: {
    id: 'equip-robot-001',
    name: 'Assembly Robot 1',
    type: 'ASSEMBLY_ROBOT',
    status: 'operational',
    model: 'AR-2000',
    serialNumber: 'SN-AR2000-001',
    manufacturer: 'RoboTech Corp',
    location: 'Building A, Floor 2',
    installationDate: new Date('2021-06-20'),
    lastMaintenanceDate: new Date('2024-01-05'),
    specifications: {
      powerRequirement: '240V',
      weight: '850kg',
      dimensions: '1.5m x 1.5m x 2m',
      payload: '50kg',
      reach: '1800mm',
      repeatability: '±0.02mm'
    },
    currentMetrics: {
      oee: 91.2,
      availability: 94.5,
      performance: 92.8,
      quality: 96.1,
      temperature: 68.3,
      pressure: 2.9,
      vibration: 0.8
    }
  },
  conveyor1: {
    id: 'equip-conv-001',
    name: 'Main Conveyor Line',
    type: 'CONVEYOR',
    status: 'maintenance',
    model: 'CONV-3000',
    serialNumber: 'SN-CONV3000-001',
    manufacturer: 'ConveyorTech Ltd',
    location: 'Building A, Floor 1',
    installationDate: new Date('2020-03-10'),
    lastMaintenanceDate: new Date('2024-01-15'),
    specifications: {
      powerRequirement: '220V',
      weight: '1200kg',
      dimensions: '20m x 1m x 1.5m',
      speed: '5m/min',
      capacity: '500kg/m',
      length: '20m'
    },
    currentMetrics: {
      oee: 0,
      availability: 0,
      performance: 0,
      quality: 95.0,
      temperature: 25.0,
      pressure: 1.0,
      vibration: 0.2
    }
  }
};

export const mockAlerts = {
  critical1: {
    id: 'alert-001',
    title: 'Emergency Stop Activated',
    description: 'Equipment has stopped unexpectedly. Production halted. Immediate intervention required.',
    severity: 'critical',
    status: 'active',
    equipmentId: 'equip-cnc-001',
    equipmentName: 'CNC Machine 1',
    category: 'Safety',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    metric: 'emergency_stop',
    threshold: 0,
    actualValue: 1
  },
  high1: {
    id: 'alert-002',
    title: 'Temperature Threshold Exceeded',
    description: 'Equipment temperature has exceeded the high threshold. Immediate attention required to prevent damage.',
    severity: 'high',
    status: 'acknowledged',
    equipmentId: 'equip-cnc-001',
    equipmentName: 'CNC Machine 1',
    category: 'Performance',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    acknowledgedBy: 'John Operator',
    acknowledgedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    metric: 'temperature',
    threshold: 80,
    actualValue: 85.3
  },
  medium1: {
    id: 'alert-003',
    title: 'Performance Degradation',
    description: 'Performance has dropped below acceptable levels. Current efficiency is significantly reduced.',
    severity: 'medium',
    status: 'active',
    equipmentId: 'equip-robot-001',
    equipmentName: 'Assembly Robot 1',
    category: 'Performance',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    metric: 'performance',
    threshold: 85,
    actualValue: 78.5
  },
  low1: {
    id: 'alert-004',
    title: 'Maintenance Reminder',
    description: 'Scheduled maintenance is due in 7 days. Please schedule downtime.',
    severity: 'low',
    status: 'resolved',
    equipmentId: 'equip-conv-001',
    equipmentName: 'Main Conveyor Line',
    category: 'Maintenance',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    acknowledgedBy: 'Jane Technician',
    acknowledgedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    resolvedBy: 'Jane Technician',
    resolvedAt: new Date(Date.now() - 18 * 60 * 60 * 1000)
  }
};

export const mockMetrics = {
  // Recent metrics for CNC Machine 1
  cncRecentMetrics: [
    {
      id: 'metric-cnc-001',
      equipmentId: 'equip-cnc-001',
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      oee: 87.5,
      availability: 92.3,
      performance: 89.1,
      quality: 95.2,
      productionCount: 485,
      defectCount: 3,
      downtime: 12,
      cycleTime: 45.2
    },
    {
      id: 'metric-cnc-002',
      equipmentId: 'equip-cnc-001',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      oee: 85.2,
      availability: 90.1,
      performance: 87.5,
      quality: 96.1,
      productionCount: 242,
      defectCount: 1,
      downtime: 8,
      cycleTime: 46.8
    },
    {
      id: 'metric-cnc-003',
      equipmentId: 'equip-cnc-001',
      timestamp: new Date(), // Now
      oee: 88.9,
      availability: 93.5,
      performance: 90.2,
      quality: 95.8,
      productionCount: 125,
      defectCount: 1,
      downtime: 0,
      cycleTime: 44.5
    }
  ],
  // Aggregated metrics for dashboard
  dashboardKPIs: {
    overallOEE: 86.7,
    averageAvailability: 91.2,
    averagePerformance: 88.5,
    averageQuality: 95.8,
    totalProduction: 15420,
    activeAlerts: 2,
    equipmentOperational: 18,
    equipmentMaintenance: 2,
    equipmentOffline: 0
  }
};

export const mockMaintenance = {
  scheduled1: {
    id: 'maint-001',
    equipmentId: 'equip-cnc-001',
    type: 'preventive',
    status: 'scheduled',
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    duration: 240, // 4 hours
    technician: 'Jane Technician',
    description: 'Routine preventive maintenance as per schedule',
    partsUsed: [
      { name: 'Oil Filter', quantity: 2, cost: 45.00 },
      { name: 'Lubricant', quantity: 5, cost: 25.00 }
    ]
  },
  completed1: {
    id: 'maint-002',
    equipmentId: 'equip-cnc-001',
    type: 'corrective',
    status: 'completed',
    scheduledDate: new Date('2024-01-10'),
    completedDate: new Date('2024-01-10T14:30:00'),
    duration: 180, // 3 hours
    technician: 'Mike Maintenance',
    description: 'Replacement of worn spindle bearings',
    partsUsed: [
      { name: 'Spindle Bearing', quantity: 2, cost: 350.00 },
      { name: 'Seal', quantity: 4, cost: 15.00 }
    ],
    notes: 'Bearings showed signs of wear. Replaced proactively to avoid failure.'
  }
};

// Mock chat conversations
export const mockChatConversations = {
  oeeInquiry: [
    {
      id: 'msg-001',
      role: 'user',
      content: 'What is the current OEE for CNC Machine 1?',
      timestamp: new Date(Date.now() - 5 * 60 * 1000)
    },
    {
      id: 'msg-002',
      role: 'assistant',
      content: `Based on the latest data, CNC Machine 1 has the following performance metrics:

- **Overall OEE**: 87.5%
- **Availability**: 92.3%
- **Performance**: 89.1%
- **Quality**: 95.2%

The machine is performing well above the industry standard of 85% OEE. The slight dip in performance (89.1%) could be investigated to potentially improve overall efficiency.`,
      timestamp: new Date(Date.now() - 4.5 * 60 * 1000)
    }
  ],
  troubleshooting: [
    {
      id: 'msg-003',
      role: 'user',
      content: 'Assembly Robot 1 is showing performance degradation. What could be the cause?',
      timestamp: new Date(Date.now() - 10 * 60 * 1000)
    },
    {
      id: 'msg-004',
      role: 'assistant',
      content: `I've analyzed the data for Assembly Robot 1 and found several potential causes for the performance degradation:

1. **Current Performance**: 78.5% (below the 85% threshold)
2. **Recent Trends**: Performance has declined by 14.3% over the past 4 hours

**Possible Causes:**
- **Mechanical wear**: Check for worn gripper components or joint friction
- **Programming issues**: Verify motion paths haven't been altered
- **Payload variations**: Confirm parts are within specified weight limits
- **Environmental factors**: Check ambient temperature and vibration levels

**Recommended Actions:**
1. Perform visual inspection of moving parts
2. Run diagnostic self-test routine
3. Check error logs for any fault codes
4. Verify calibration settings

Would you like me to generate a maintenance work order for this issue?`,
      timestamp: new Date(Date.now() - 9 * 60 * 1000)
    }
  ]
};

// Mock WebSocket messages for real-time updates
export const mockWebSocketMessages = {
  kpiUpdate: {
    type: 'kpi-update',
    data: {
      'overall-oee': { value: 87.2, trend: 'up', change: 0.5 },
      'availability': { value: 91.8, trend: 'up', change: 0.6 },
      'performance': { value: 88.9, trend: 'stable', change: 0.4 },
      'quality': { value: 95.7, trend: 'down', change: -0.1 }
    }
  },
  newAlert: {
    type: 'new-alert',
    data: {
      id: 'alert-new-001',
      severity: 'high',
      title: 'Vibration Anomaly Detected',
      description: 'Abnormal vibration patterns detected on CNC Machine 2',
      equipmentId: 'equip-cnc-002',
      equipmentName: 'CNC Machine 2',
      timestamp: new Date().toISOString()
    }
  },
  equipmentStatusChange: {
    type: 'equipment-status-change',
    data: {
      equipmentId: 'equip-conv-001',
      previousStatus: 'maintenance',
      newStatus: 'operational',
      timestamp: new Date().toISOString()
    }
  },
  metricsUpdate: {
    type: 'metrics-update',
    data: {
      equipmentId: 'equip-cnc-001',
      metrics: {
        temperature: 73.2,
        pressure: 3.05,
        vibration: 1.15,
        cycleTime: 44.8
      },
      timestamp: new Date().toISOString()
    }
  }
};

// Mock API responses
export const mockApiResponses = {
  loginSuccess: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWFkbWluLTAwMSIsImVtYWlsIjoiYWRtaW5AbWFudWZhY3R1cmluZy5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDUzMjAwMDAsImV4cCI6MTcwNTQwNjQwMH0.mock-signature',
    user: mockUsers.admin,
    expiresIn: 86400
  },
  loginError: {
    error: 'Invalid credentials',
    message: 'The email or password you entered is incorrect.'
  },
  equipmentList: {
    items: [mockEquipment.cncMachine1, mockEquipment.assemblyRobot1, mockEquipment.conveyor1],
    total: 3,
    page: 1,
    pageSize: 20,
    totalPages: 1
  },
  alertsList: {
    items: Object.values(mockAlerts),
    total: 4,
    page: 1,
    pageSize: 50,
    statistics: {
      total: 4,
      critical: 1,
      high: 1,
      medium: 1,
      low: 1,
      active: 2,
      acknowledged: 1,
      resolved: 1
    }
  }
};

// Test scenarios for different states
export const testScenarios = {
  // All systems operational
  normalOperation: {
    equipment: Object.values(mockEquipment).map(e => ({ ...e, status: 'operational' })),
    alerts: [],
    metrics: {
      ...mockMetrics.dashboardKPIs,
      activeAlerts: 0,
      equipmentOperational: 20,
      equipmentMaintenance: 0,
      equipmentOffline: 0
    }
  },
  
  // Critical situation
  criticalSituation: {
    equipment: [
      { ...mockEquipment.cncMachine1, status: 'offline' },
      { ...mockEquipment.assemblyRobot1, status: 'operational' },
      { ...mockEquipment.conveyor1, status: 'maintenance' }
    ],
    alerts: [
      mockAlerts.critical1,
      { ...mockAlerts.high1, status: 'active' },
      { ...mockAlerts.medium1, status: 'active' }
    ],
    metrics: {
      ...mockMetrics.dashboardKPIs,
      overallOEE: 65.3,
      activeAlerts: 8,
      equipmentOperational: 15,
      equipmentMaintenance: 3,
      equipmentOffline: 2
    }
  },
  
  // Maintenance window
  maintenanceWindow: {
    equipment: Object.values(mockEquipment).map(e => ({ ...e, status: 'maintenance' })),
    alerts: [mockAlerts.low1],
    metrics: {
      ...mockMetrics.dashboardKPIs,
      overallOEE: 0,
      averageAvailability: 0,
      averagePerformance: 0,
      activeAlerts: 1,
      equipmentOperational: 0,
      equipmentMaintenance: 20,
      equipmentOffline: 0
    }
  }
};

// Helper function to get mock data by scenario
export function getMockDataForScenario(scenario: keyof typeof testScenarios) {
  return testScenarios[scenario];
}

// Helper function to generate time series data
export function generateMockTimeSeries(hours: number = 24, interval: number = 60) {
  const dataPoints = Math.floor((hours * 60) / interval);
  const now = Date.now();
  const series = [];

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = new Date(now - (i * interval * 60 * 1000));
    const baseOee = 85;
    const variation = Math.sin(i / 10) * 5 + (Math.random() - 0.5) * 3;
    
    series.push({
      timestamp,
      oee: Math.max(60, Math.min(95, baseOee + variation)),
      availability: Math.max(70, Math.min(98, 90 + variation * 0.5)),
      performance: Math.max(65, Math.min(95, 87 + variation * 0.8)),
      quality: Math.max(85, Math.min(99.9, 95 + variation * 0.3))
    });
  }

  return series.reverse(); // Return in chronological order
}