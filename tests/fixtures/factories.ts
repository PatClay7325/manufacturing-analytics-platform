import { faker } from '@faker-js/faker';

// Set seed for consistent test data
faker.seed(12345);

// Types
export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer' | 'technician';
  department: string;
  permissions: string[];
}

export interface TestEquipment {
  id: string;
  name: string;
  type: 'CNC_MACHINE' | 'ASSEMBLY_ROBOT' | 'CONVEYOR' | 'PACKAGING_MACHINE' | 'QUALITY_SCANNER';
  status: 'operational' | 'maintenance' | 'offline';
  model: string;
  serialNumber: string;
  manufacturer: string;
  location: string;
  installationDate: Date;
  lastMaintenanceDate: Date;
  specifications: Record<string, any>;
  currentMetrics: {
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    temperature: number;
    pressure: number;
    vibration: number;
  };
}

export interface TestAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'acknowledged' | 'resolved';
  equipmentId: string;
  equipmentName: string;
  category: string;
  timestamp: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  metric?: string;
  threshold?: number;
  actualValue?: number;
}

export interface TestMetric {
  id: string;
  equipmentId: string;
  timestamp: Date;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  productionCount: number;
  defectCount: number;
  downtime: number;
  cycleTime: number;
}

export interface TestMaintenance {
  id: string;
  equipmentId: string;
  type: 'preventive' | 'corrective' | 'predictive' | 'emergency';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: Date;
  completedDate?: Date;
  duration: number; // minutes
  technician: string;
  description: string;
  partsUsed: Array<{ name: string; quantity: number; cost: number }>;
  notes?: string;
}

// Factories
export const UserFactory = {
  create(overrides?: Partial<TestUser>): TestUser {
    const roles = ['admin', 'operator', 'viewer', 'technician'] as const;
    const role = overrides?.role || faker.helpers.arrayElement(roles);
    
    return {
      id: faker.string.uuid(),
      email: faker.internet.email().toLowerCase(),
      password: 'TestPass123!',
      name: faker.person.fullName(),
      role,
      department: faker.helpers.arrayElement(['Production', 'Quality', 'Maintenance', 'Engineering']),
      permissions: getPermissionsForRole(role),
      ...overrides
    };
  },

  createBatch(count: number, overrides?: Partial<TestUser>): TestUser[] {
    return Array.from({ length: count }, () => this.create(overrides));
  },

  createAdmin(overrides?: Partial<TestUser>): TestUser {
    return this.create({ role: 'admin', ...overrides });
  },

  createOperator(overrides?: Partial<TestUser>): TestUser {
    return this.create({ role: 'operator', ...overrides });
  }
};

export const EquipmentFactory = {
  create(overrides?: Partial<TestEquipment>): TestEquipment {
    const type = overrides?.type || faker.helpers.arrayElement([
      'CNC_MACHINE', 'ASSEMBLY_ROBOT', 'CONVEYOR', 'PACKAGING_MACHINE', 'QUALITY_SCANNER'
    ]);
    
    const status = overrides?.status || faker.helpers.weightedArrayElement([
      { value: 'operational', weight: 70 },
      { value: 'maintenance', weight: 20 },
      { value: 'offline', weight: 10 }
    ]);

    const installationDate = faker.date.past({ years: 5 });
    const lastMaintenanceDate = faker.date.between({ 
      from: installationDate, 
      to: new Date() 
    });

    return {
      id: faker.string.uuid(),
      name: `${type.replace(/_/g, ' ')} ${faker.number.int({ min: 1, max: 99 })}`,
      type,
      status,
      model: `${faker.string.alpha({ length: 3 }).toUpperCase()}-${faker.number.int({ min: 1000, max: 9999 })}`,
      serialNumber: `SN-${faker.string.alphanumeric({ length: 10 }).toUpperCase()}`,
      manufacturer: faker.company.name(),
      location: `Building ${faker.string.alpha({ length: 1 }).toUpperCase()}, Floor ${faker.number.int({ min: 1, max: 5 })}`,
      installationDate,
      lastMaintenanceDate,
      specifications: generateSpecifications(type),
      currentMetrics: generateCurrentMetrics(status),
      ...overrides
    };
  },

  createBatch(count: number, overrides?: Partial<TestEquipment>): TestEquipment[] {
    return Array.from({ length: count }, () => this.create(overrides));
  },

  createOperational(overrides?: Partial<TestEquipment>): TestEquipment {
    return this.create({ 
      status: 'operational',
      currentMetrics: generateGoodMetrics(),
      ...overrides 
    });
  },

  createWithIssues(overrides?: Partial<TestEquipment>): TestEquipment {
    return this.create({ 
      status: 'operational',
      currentMetrics: generatePoorMetrics(),
      ...overrides 
    });
  }
};

export const AlertFactory = {
  create(overrides?: Partial<TestAlert>): TestAlert {
    const severity = overrides?.severity || faker.helpers.weightedArrayElement([
      { value: 'low', weight: 40 },
      { value: 'medium', weight: 30 },
      { value: 'high', weight: 20 },
      { value: 'critical', weight: 10 }
    ]);

    const status = overrides?.status || faker.helpers.weightedArrayElement([
      { value: 'active', weight: 50 },
      { value: 'acknowledged', weight: 30 },
      { value: 'resolved', weight: 20 }
    ]);

    const timestamp = overrides?.timestamp || faker.date.recent({ days: 7 });
    const equipment = EquipmentFactory.create();
    const alertType = faker.helpers.arrayElement([
      'Temperature Threshold Exceeded',
      'Vibration Anomaly Detected',
      'Performance Degradation',
      'Quality Issues Detected',
      'Maintenance Overdue',
      'Unexpected Downtime',
      'Pressure Out of Range',
      'Cycle Time Deviation'
    ]);

    const alert: TestAlert = {
      id: faker.string.uuid(),
      title: alertType,
      description: generateAlertDescription(alertType, severity),
      severity,
      status,
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      category: faker.helpers.arrayElement(['Performance', 'Quality', 'Maintenance', 'Safety']),
      timestamp,
      ...overrides
    };

    // Add acknowledgment data if acknowledged or resolved
    if (status === 'acknowledged' || status === 'resolved') {
      alert.acknowledgedBy = faker.person.fullName();
      alert.acknowledgedAt = faker.date.between({ 
        from: timestamp, 
        to: new Date() 
      });
    }

    // Add resolution data if resolved
    if (status === 'resolved') {
      alert.resolvedBy = faker.person.fullName();
      alert.resolvedAt = faker.date.between({ 
        from: alert.acknowledgedAt || timestamp, 
        to: new Date() 
      });
    }

    // Add metric data for threshold alerts
    if (alertType.includes('Threshold') || alertType.includes('Range')) {
      alert.metric = faker.helpers.arrayElement(['temperature', 'pressure', 'vibration', 'oee']);
      alert.threshold = faker.number.float({ min: 50, max: 90, precision: 0.1 });
      alert.actualValue = alert.threshold * faker.number.float({ min: 1.1, max: 1.5, precision: 0.01 });
    }

    return alert;
  },

  createBatch(count: number, overrides?: Partial<TestAlert>): TestAlert[] {
    return Array.from({ length: count }, () => this.create(overrides));
  },

  createCritical(overrides?: Partial<TestAlert>): TestAlert {
    return this.create({ 
      severity: 'critical',
      status: 'active',
      title: 'Critical System Failure',
      ...overrides 
    });
  },

  createForEquipment(equipmentId: string, equipmentName: string, overrides?: Partial<TestAlert>): TestAlert {
    return this.create({ 
      equipmentId,
      equipmentName,
      ...overrides 
    });
  }
};

export const MetricFactory = {
  create(overrides?: Partial<TestMetric>): TestMetric {
    const oee = faker.number.float({ min: 60, max: 95, precision: 0.1 });
    const availability = faker.number.float({ min: 70, max: 98, precision: 0.1 });
    const performance = faker.number.float({ min: 65, max: 95, precision: 0.1 });
    const quality = faker.number.float({ min: 85, max: 99.9, precision: 0.1 });

    return {
      id: faker.string.uuid(),
      equipmentId: faker.string.uuid(),
      timestamp: faker.date.recent({ days: 1 }),
      oee,
      availability,
      performance,
      quality,
      productionCount: faker.number.int({ min: 100, max: 5000 }),
      defectCount: faker.number.int({ min: 0, max: 50 }),
      downtime: faker.number.int({ min: 0, max: 120 }), // minutes
      cycleTime: faker.number.float({ min: 10, max: 300, precision: 0.1 }), // seconds
      ...overrides
    };
  },

  createBatch(count: number, overrides?: Partial<TestMetric>): TestMetric[] {
    return Array.from({ length: count }, () => this.create(overrides));
  },

  createTimeSeries(equipmentId: string, hours: number = 24, interval: number = 60): TestMetric[] {
    const metrics: TestMetric[] = [];
    const now = new Date();
    const dataPoints = Math.floor((hours * 60) / interval);

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = new Date(now.getTime() - (i * interval * 60 * 1000));
      
      // Add some realistic variation
      const baseOee = 85;
      const variation = Math.sin(i / 10) * 5 + Math.random() * 3;
      
      metrics.push(this.create({
        equipmentId,
        timestamp,
        oee: Math.max(60, Math.min(95, baseOee + variation)),
        availability: Math.max(70, Math.min(98, 90 + variation * 0.5)),
        performance: Math.max(65, Math.min(95, 87 + variation * 0.8)),
        quality: Math.max(85, Math.min(99.9, 95 + variation * 0.3))
      }));
    }

    return metrics.reverse(); // Return in chronological order
  },

  createWithAnomaly(overrides?: Partial<TestMetric>): TestMetric {
    return this.create({
      oee: faker.number.float({ min: 30, max: 50, precision: 0.1 }),
      availability: faker.number.float({ min: 40, max: 60, precision: 0.1 }),
      performance: faker.number.float({ min: 35, max: 55, precision: 0.1 }),
      quality: faker.number.float({ min: 60, max: 80, precision: 0.1 }),
      downtime: faker.number.int({ min: 120, max: 480 }),
      ...overrides
    });
  }
};

export const MaintenanceFactory = {
  create(overrides?: Partial<TestMaintenance>): TestMaintenance {
    const type = overrides?.type || faker.helpers.arrayElement(['preventive', 'corrective', 'predictive', 'emergency']);
    const status = overrides?.status || faker.helpers.weightedArrayElement([
      { value: 'completed', weight: 60 },
      { value: 'scheduled', weight: 25 },
      { value: 'in_progress', weight: 10 },
      { value: 'cancelled', weight: 5 }
    ]);

    const scheduledDate = overrides?.scheduledDate || faker.date.soon({ days: 30 });
    const duration = faker.number.int({ min: 30, max: 480 }); // 30 min to 8 hours

    const maintenance: TestMaintenance = {
      id: faker.string.uuid(),
      equipmentId: faker.string.uuid(),
      type,
      status,
      scheduledDate,
      duration,
      technician: faker.person.fullName(),
      description: generateMaintenanceDescription(type),
      partsUsed: generatePartsUsed(type),
      ...overrides
    };

    // Add completion data if completed
    if (status === 'completed') {
      maintenance.completedDate = faker.date.between({
        from: scheduledDate,
        to: new Date()
      });
      maintenance.notes = faker.helpers.maybe(() => 
        faker.lorem.sentence({ min: 5, max: 15 })
      );
    }

    return maintenance;
  },

  createBatch(count: number, overrides?: Partial<TestMaintenance>): TestMaintenance[] {
    return Array.from({ length: count }, () => this.create(overrides));
  },

  createScheduled(equipmentId: string, overrides?: Partial<TestMaintenance>): TestMaintenance {
    return this.create({
      equipmentId,
      status: 'scheduled',
      scheduledDate: faker.date.soon({ days: 14 }),
      ...overrides
    });
  },

  createHistory(equipmentId: string, count: number = 10): TestMaintenance[] {
    const history: TestMaintenance[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const daysAgo = (i + 1) * 30; // Monthly maintenance
      const scheduledDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      history.push(this.create({
        equipmentId,
        status: 'completed',
        scheduledDate,
        completedDate: new Date(scheduledDate.getTime() + 4 * 60 * 60 * 1000), // 4 hours later
        type: i % 3 === 0 ? 'preventive' : 'corrective'
      }));
    }

    return history;
  }
};

// Helper Functions
function getPermissionsForRole(role: TestUser['role']): string[] {
  const permissions: Record<TestUser['role'], string[]> = {
    admin: ['*'],
    operator: ['equipment.read', 'equipment.update', 'alerts.read', 'alerts.acknowledge', 'metrics.read'],
    technician: ['equipment.read', 'equipment.update', 'maintenance.create', 'maintenance.update', 'alerts.read', 'alerts.resolve'],
    viewer: ['equipment.read', 'alerts.read', 'metrics.read']
  };
  
  return permissions[role];
}

function generateSpecifications(type: TestEquipment['type']): Record<string, any> {
  const baseSpecs = {
    powerRequirement: `${faker.number.int({ min: 200, max: 480 })}V`,
    weight: `${faker.number.int({ min: 500, max: 5000 })}kg`,
    dimensions: `${faker.number.int({ min: 1, max: 5 })}m x ${faker.number.int({ min: 1, max: 5 })}m x ${faker.number.int({ min: 2, max: 4 })}m`
  };

  const typeSpecificSpecs: Record<TestEquipment['type'], Record<string, any>> = {
    CNC_MACHINE: {
      spindleSpeed: `${faker.number.int({ min: 1000, max: 20000 })} RPM`,
      axes: faker.number.int({ min: 3, max: 5 }),
      accuracy: '±0.001mm'
    },
    ASSEMBLY_ROBOT: {
      payload: `${faker.number.int({ min: 5, max: 500 })}kg`,
      reach: `${faker.number.int({ min: 500, max: 3000 })}mm`,
      repeatability: '±0.02mm'
    },
    CONVEYOR: {
      speed: `${faker.number.int({ min: 1, max: 10 })}m/min`,
      capacity: `${faker.number.int({ min: 100, max: 1000 })}kg/m`,
      length: `${faker.number.int({ min: 5, max: 50 })}m`
    },
    PACKAGING_MACHINE: {
      throughput: `${faker.number.int({ min: 20, max: 200 })} units/min`,
      packageTypes: ['Box', 'Bag', 'Bottle', 'Carton'],
      sealingTemp: `${faker.number.int({ min: 100, max: 200 })}°C`
    },
    QUALITY_SCANNER: {
      resolution: '0.01mm',
      scanSpeed: `${faker.number.int({ min: 100, max: 1000 })} points/sec`,
      accuracy: '±0.005mm'
    }
  };

  return { ...baseSpecs, ...typeSpecificSpecs[type] };
}

function generateCurrentMetrics(status: TestEquipment['status']): TestEquipment['currentMetrics'] {
  if (status === 'offline') {
    return {
      oee: 0,
      availability: 0,
      performance: 0,
      quality: 0,
      temperature: 0,
      pressure: 0,
      vibration: 0
    };
  }

  if (status === 'maintenance') {
    return {
      oee: 0,
      availability: 0,
      performance: 0,
      quality: faker.number.float({ min: 85, max: 99, precision: 0.1 }),
      temperature: faker.number.float({ min: 20, max: 25, precision: 0.1 }),
      pressure: faker.number.float({ min: 0.8, max: 1.2, precision: 0.01 }),
      vibration: faker.number.float({ min: 0, max: 0.5, precision: 0.01 })
    };
  }

  // Operational
  return {
    oee: faker.number.float({ min: 75, max: 95, precision: 0.1 }),
    availability: faker.number.float({ min: 85, max: 98, precision: 0.1 }),
    performance: faker.number.float({ min: 80, max: 95, precision: 0.1 }),
    quality: faker.number.float({ min: 90, max: 99.9, precision: 0.1 }),
    temperature: faker.number.float({ min: 60, max: 80, precision: 0.1 }),
    pressure: faker.number.float({ min: 2.8, max: 3.2, precision: 0.01 }),
    vibration: faker.number.float({ min: 0.5, max: 2.5, precision: 0.01 })
  };
}

function generateGoodMetrics(): TestEquipment['currentMetrics'] {
  return {
    oee: faker.number.float({ min: 85, max: 95, precision: 0.1 }),
    availability: faker.number.float({ min: 90, max: 98, precision: 0.1 }),
    performance: faker.number.float({ min: 87, max: 95, precision: 0.1 }),
    quality: faker.number.float({ min: 95, max: 99.9, precision: 0.1 }),
    temperature: faker.number.float({ min: 65, max: 75, precision: 0.1 }),
    pressure: faker.number.float({ min: 2.9, max: 3.1, precision: 0.01 }),
    vibration: faker.number.float({ min: 0.5, max: 1.5, precision: 0.01 })
  };
}

function generatePoorMetrics(): TestEquipment['currentMetrics'] {
  return {
    oee: faker.number.float({ min: 45, max: 65, precision: 0.1 }),
    availability: faker.number.float({ min: 50, max: 70, precision: 0.1 }),
    performance: faker.number.float({ min: 55, max: 75, precision: 0.1 }),
    quality: faker.number.float({ min: 70, max: 85, precision: 0.1 }),
    temperature: faker.number.float({ min: 85, max: 95, precision: 0.1 }),
    pressure: faker.number.float({ min: 3.5, max: 4.0, precision: 0.01 }),
    vibration: faker.number.float({ min: 3.0, max: 5.0, precision: 0.01 })
  };
}

function generateAlertDescription(type: string, severity: TestAlert['severity']): string {
  const descriptions: Record<string, string> = {
    'Temperature Threshold Exceeded': `Equipment temperature has exceeded the ${severity} threshold. Immediate attention required to prevent damage.`,
    'Vibration Anomaly Detected': `Abnormal vibration patterns detected, indicating potential mechanical issues. ${severity === 'critical' ? 'Equipment automatically stopped.' : 'Monitor closely.'}`,
    'Performance Degradation': `Performance has dropped below acceptable levels. Current efficiency is significantly reduced.`,
    'Quality Issues Detected': `Product quality metrics are below standards. Defect rate has increased above tolerance.`,
    'Maintenance Overdue': `Scheduled maintenance is overdue by ${faker.number.int({ min: 1, max: 30 })} days. Equipment reliability may be compromised.`,
    'Unexpected Downtime': `Equipment has stopped unexpectedly. Production halted. Immediate intervention required.`,
    'Pressure Out of Range': `System pressure is outside normal operating range. ${severity === 'critical' ? 'Safety protocols activated.' : 'Adjustment needed.'}`,
    'Cycle Time Deviation': `Production cycle time has deviated from standard by ${faker.number.int({ min: 10, max: 50 })}%. Efficiency impacted.`
  };

  return descriptions[type] || faker.lorem.paragraph();
}

function generateMaintenanceDescription(type: TestMaintenance['type']): string {
  const descriptions: Record<TestMaintenance['type'], string[]> = {
    preventive: [
      'Routine preventive maintenance as per schedule',
      'Regular inspection and lubrication',
      'Filter replacement and system cleaning',
      'Calibration and adjustment of parameters'
    ],
    corrective: [
      'Repair of faulty component',
      'Replacement of worn parts',
      'Fix for reported malfunction',
      'Correction of performance issues'
    ],
    predictive: [
      'Maintenance based on condition monitoring',
      'Proactive component replacement before failure',
      'Vibration analysis indicated bearing replacement',
      'Thermal imaging revealed hot spots requiring attention'
    ],
    emergency: [
      'Emergency repair due to unexpected failure',
      'Critical component failure - immediate action taken',
      'Production line stoppage - urgent repair',
      'Safety-critical repair performed'
    ]
  };

  return faker.helpers.arrayElement(descriptions[type]);
}

function generatePartsUsed(type: TestMaintenance['type']): Array<{ name: string; quantity: number; cost: number }> {
  const partsByType: Record<TestMaintenance['type'], string[]> = {
    preventive: ['Oil Filter', 'Air Filter', 'Lubricant', 'Cleaning Solution', 'Belt'],
    corrective: ['Bearing', 'Seal', 'Gasket', 'Sensor', 'Valve', 'Motor'],
    predictive: ['Bearing', 'Belt', 'Coupling', 'Sensor', 'Vibration Dampener'],
    emergency: ['Control Board', 'Power Supply', 'Motor', 'Hydraulic Pump', 'Emergency Kit']
  };

  const availableParts = partsByType[type];
  const partCount = faker.number.int({ min: 1, max: Math.min(4, availableParts.length) });
  const selectedParts = faker.helpers.arrayElements(availableParts, partCount);

  return selectedParts.map(name => ({
    name,
    quantity: faker.number.int({ min: 1, max: 5 }),
    cost: faker.number.float({ min: 10, max: 500, precision: 0.01 })
  }));
}

// Test Data Scenarios
export const TestScenarios = {
  // High-performing production line
  optimalProduction: () => {
    const equipment = EquipmentFactory.createBatch(5, { status: 'operational' });
    const metrics = equipment.flatMap(e => 
      MetricFactory.createTimeSeries(e.id, 24, 15).map(m => ({
        ...m,
        oee: faker.number.float({ min: 85, max: 95 }),
        availability: faker.number.float({ min: 90, max: 98 }),
        performance: faker.number.float({ min: 88, max: 95 }),
        quality: faker.number.float({ min: 95, max: 99.9 })
      }))
    );
    const alerts = AlertFactory.createBatch(2, { severity: 'low', status: 'resolved' });
    
    return { equipment, metrics, alerts };
  },

  // Equipment with issues
  problematicEquipment: () => {
    const equipment = EquipmentFactory.createWithIssues();
    const metrics = MetricFactory.createTimeSeries(equipment.id, 24, 15).map((m, i) => ({
      ...m,
      oee: 65 - (i * 0.5), // Degrading performance
      availability: 70 - (i * 0.3),
      performance: 68 - (i * 0.4)
    }));
    const alerts = [
      AlertFactory.createCritical({ equipmentId: equipment.id, equipmentName: equipment.name }),
      ...AlertFactory.createBatch(5, { 
        equipmentId: equipment.id, 
        equipmentName: equipment.name,
        severity: 'high',
        status: 'active'
      })
    ];
    
    return { equipment: [equipment], metrics, alerts };
  },

  // Maintenance scenario
  maintenanceSchedule: () => {
    const equipment = EquipmentFactory.createBatch(10);
    const maintenance = equipment.flatMap(e => [
      MaintenanceFactory.createScheduled(e.id),
      ...MaintenanceFactory.createHistory(e.id, 6)
    ]);
    
    return { equipment, maintenance };
  },

  // Real-time monitoring
  realtimeData: () => {
    const equipment = EquipmentFactory.createBatch(3, { status: 'operational' });
    let metrics: TestMetric[] = [];
    
    // Generate continuous stream of metrics
    const generateNextMetric = (equipmentId: string) => {
      const lastMetric = metrics.filter(m => m.equipmentId === equipmentId).pop();
      const baseOee = lastMetric?.oee || 85;
      const variation = (Math.random() - 0.5) * 5;
      
      return MetricFactory.create({
        equipmentId,
        timestamp: new Date(),
        oee: Math.max(60, Math.min(95, baseOee + variation))
      });
    };
    
    return { 
      equipment, 
      generateNextMetric,
      initialMetrics: equipment.map(e => generateNextMetric(e.id))
    };
  }
};

// Export a function to generate complete test database
export function generateTestDatabase(scale: 'small' | 'medium' | 'large' = 'medium') {
  const counts = {
    small: { equipment: 5, users: 10, daysOfData: 7 },
    medium: { equipment: 20, users: 50, daysOfData: 30 },
    large: { equipment: 100, users: 200, daysOfData: 90 }
  };

  const config = counts[scale];

  // Generate users
  const users = UserFactory.createBatch(config.users);

  // Generate equipment
  const equipment = EquipmentFactory.createBatch(config.equipment);

  // Generate metrics
  const metrics = equipment.flatMap(e => 
    MetricFactory.createTimeSeries(e.id, config.daysOfData * 24, 60)
  );

  // Generate alerts
  const alerts = equipment.flatMap(e => 
    AlertFactory.createBatch(
      faker.number.int({ min: 0, max: 10 }), 
      { equipmentId: e.id, equipmentName: e.name }
    )
  );

  // Generate maintenance
  const maintenance = equipment.flatMap(e => [
    ...MaintenanceFactory.createHistory(e.id, Math.floor(config.daysOfData / 30)),
    ...(faker.datatype.boolean() ? [MaintenanceFactory.createScheduled(e.id)] : [])
  ]);

  return {
    users,
    equipment,
    metrics,
    alerts,
    maintenance,
    summary: {
      userCount: users.length,
      equipmentCount: equipment.length,
      metricCount: metrics.length,
      alertCount: alerts.length,
      maintenanceCount: maintenance.length,
      activeAlerts: alerts.filter(a => a.status === 'active').length,
      operationalEquipment: equipment.filter(e => e.status === 'operational').length
    }
  };
}