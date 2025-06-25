import { Equipment, EquipmentFilter, EquipmentSummary, Maintenance, EquipmentMetric } from '@/models/equipment';

// Mock data
const mockEquipmentData: Equipment[] = [
  {
    id: 'equip-1',
    name: 'CNC Machine XYZ-1000',
    serialNumber: 'SN12345',
    model: 'XYZ-1000',
    manufacturer: 'Machining Co.',
    type: 'CNC',
    location: 'Building A, Floor 2, Cell 3',
    department: 'Machining',
    installationDate: '2022-06-15',
    lastMaintenanceDate: '2023-01-15',
    nextMaintenanceDate: '2023-07-15',
    status: 'operational',
    specifications: {
      'Power': '7.5 kW',
      'Weight': '3200 kg',
      'Dimensions': '2400 x 1800 x 2100 mm',
      'Max Spindle Speed': '12000 RPM',
      'Axis Travel (X/Y/Z)': '500/400/450 mm',
      'Tool Capacity': '24 tools'
    },
    metrics: [
      {
        id: 'metric-1',
        name: 'Temperature',
        value: 65.2,
        unit: '°C',
        timestamp: new Date().toISOString(),
        min: 20,
        max: 85,
        warning: {
          high: 75,
          low: 25
        },
        critical: {
          high: 85,
          low: 20
        }
      },
      {
        id: 'metric-2',
        name: 'Vibration',
        value: 0.8,
        unit: 'mm/s',
        timestamp: new Date().toISOString(),
        max: 5,
        warning: {
          high: 3.5
        },
        critical: {
          high: 5
        }
      },
      {
        id: 'metric-3',
        name: 'Spindle Speed',
        value: 8500,
        unit: 'RPM',
        timestamp: new Date().toISOString(),
        max: 12000
      },
      {
        id: 'metric-4',
        name: 'Power Consumption',
        value: 5.2,
        unit: 'kW',
        timestamp: new Date().toISOString(),
        max: 7.5
      }
    ],
    maintenanceHistory: [
      {
        id: 'maint-1',
        type: 'preventive',
        scheduledDate: '2023-01-15',
        completedDate: '2023-01-15',
        description: 'Quarterly maintenance',
        status: 'completed',
        technician: 'John Smith',
        notes: 'Replaced filters, lubricant change, general inspection',
        parts: ['Filter set', 'Lubricant']
      },
      {
        id: 'maint-2',
        type: 'preventive',
        scheduledDate: '2023-07-15',
        description: 'Quarterly maintenance',
        status: 'scheduled'
      },
      {
        id: 'maint-3',
        type: 'corrective',
        scheduledDate: '2022-11-05',
        completedDate: '2022-11-05',
        description: 'Bearing replacement',
        status: 'completed',
        technician: 'Maria Rodriguez',
        notes: 'Replaced main spindle bearings due to excessive noise',
        parts: ['Spindle bearing set', 'Seals']
      }
    ],
    tags: ['machining', 'high-precision', 'metal'],
    createdAt: '2022-06-15T10:30:00Z',
    updatedAt: '2023-01-15T14:20:00Z'
  },
  {
    id: 'equip-2',
    name: 'Robot Arm RX-200',
    serialNumber: 'RX2004589',
    model: 'RX-200',
    manufacturer: 'Robotics Inc.',
    type: 'Robot',
    location: 'Building A, Floor 1, Assembly Line 2',
    department: 'Assembly',
    installationDate: '2021-08-10',
    lastMaintenanceDate: '2023-04-02',
    nextMaintenanceDate: '2023-10-02',
    status: 'maintenance',
    specifications: {
      'Power': '3.5 kW',
      'Weight': '520 kg',
      'Reach': '2800 mm',
      'Payload': '200 kg',
      'Axes': '6',
      'Repeatability': '±0.05 mm'
    },
    metrics: [
      {
        id: 'metric-5',
        name: 'Temperature',
        value: 42.1,
        unit: '°C',
        timestamp: new Date().toISOString(),
        max: 70,
        warning: {
          high: 60
        },
        critical: {
          high: 70
        }
      },
      {
        id: 'metric-6',
        name: 'Position Accuracy',
        value: 0.03,
        unit: 'mm',
        timestamp: new Date().toISOString(),
        max: 0.1
      },
      {
        id: 'metric-7',
        name: 'Cycle Time',
        value: 4.2,
        unit: 's',
        timestamp: new Date().toISOString(),
        target: 4.0
      },
      {
        id: 'metric-8',
        name: 'Battery Level',
        value: 92,
        unit: '%',
        timestamp: new Date().toISOString(),
        min: 10,
        warning: {
          low: 20
        },
        critical: {
          low: 10
        }
      }
    ],
    maintenanceHistory: [
      {
        id: 'maint-4',
        type: 'preventive',
        scheduledDate: '2023-04-02',
        completedDate: '2023-04-02',
        description: 'Bi-annual maintenance',
        status: 'completed',
        technician: 'Alex Chen',
        notes: 'Calibration, joint inspection, firmware update',
        parts: []
      },
      {
        id: 'maint-5',
        type: 'preventive',
        scheduledDate: '2023-10-02',
        description: 'Bi-annual maintenance',
        status: 'scheduled'
      }
    ],
    tags: ['assembly', 'automation', 'robotics'],
    createdAt: '2021-08-10T08:45:00Z',
    updatedAt: '2023-04-02T16:30:00Z'
  },
  {
    id: 'equip-3',
    name: 'Conveyor Belt System CB-500',
    serialNumber: 'CB500-789',
    model: 'CB-500',
    manufacturer: 'Convey Systems Ltd.',
    type: 'Conveyor',
    location: 'Building B, Floor 1, Packaging Area',
    department: 'Packaging',
    installationDate: '2020-03-20',
    lastMaintenanceDate: '2023-02-15',
    nextMaintenanceDate: '2023-08-15',
    status: 'offline',
    specifications: {
      'Power': '2.2 kW',
      'Length': '15 m',
      'Width': '60 cm',
      'Speed Range': '0.1-2.0 m/s',
      'Max Load': '50 kg/m'
    },
    metrics: [
      {
        id: 'metric-9',
        name: 'Motor Temperature',
        value: 35.7,
        unit: '°C',
        timestamp: new Date().toISOString(),
        max: 80,
        warning: {
          high: 70
        },
        critical: {
          high: 80
        }
      },
      {
        id: 'metric-10',
        name: 'Speed',
        value: 0,
        unit: 'm/s',
        timestamp: new Date().toISOString(),
        max: 2.0
      },
      {
        id: 'metric-11',
        name: 'Vibration',
        value: 0.4,
        unit: 'mm/s',
        timestamp: new Date().toISOString(),
        max: 4.0,
        warning: {
          high: 3.0
        },
        critical: {
          high: 4.0
        }
      }
    ],
    maintenanceHistory: [
      {
        id: 'maint-6',
        type: 'preventive',
        scheduledDate: '2023-02-15',
        completedDate: '2023-02-15',
        description: 'Quarterly maintenance',
        status: 'completed',
        technician: 'Sam Johnson',
        notes: 'Belt tension adjustment, roller cleaning, motor inspection',
        parts: []
      },
      {
        id: 'maint-7',
        type: 'corrective',
        scheduledDate: '2023-06-05',
        description: 'Motor replacement',
        status: 'in-progress',
        technician: 'David Miller',
        notes: 'Drive motor showing signs of bearing failure',
        parts: ['Drive motor', 'Motor controller']
      }
    ],
    tags: ['packaging', 'material-handling'],
    createdAt: '2020-03-20T14:15:00Z',
    updatedAt: '2023-06-05T09:10:00Z'
  },
  {
    id: 'equip-4',
    name: 'Injection Molding Machine IM-800',
    serialNumber: 'IM80012345',
    model: 'IM-800',
    manufacturer: 'Polymer Tech',
    type: 'Injection Molding',
    location: 'Building C, Floor 1, Molding Section',
    department: 'Production',
    installationDate: '2019-10-05',
    lastMaintenanceDate: '2023-05-12',
    nextMaintenanceDate: '2023-11-12',
    status: 'operational',
    specifications: {
      'Clamping Force': '800 tons',
      'Shot Size': '1200 cm³',
      'Injection Pressure': '180 MPa',
      'Power': '75 kW',
      'Oil Tank Capacity': '800 L'
    },
    metrics: [
      {
        id: 'metric-12',
        name: 'Oil Temperature',
        value: 55.3,
        unit: '°C',
        timestamp: new Date().toISOString(),
        min: 40,
        max: 70,
        warning: {
          low: 45,
          high: 65
        },
        critical: {
          low: 40,
          high: 70
        }
      },
      {
        id: 'metric-13',
        name: 'Cycle Time',
        value: 25.4,
        unit: 's',
        timestamp: new Date().toISOString(),
        target: 24.0
      },
      {
        id: 'metric-14',
        name: 'Pressure',
        value: 145.2,
        unit: 'MPa',
        timestamp: new Date().toISOString(),
        max: 180
      },
      {
        id: 'metric-15',
        name: 'Mold Temperature',
        value: 85.7,
        unit: '°C',
        timestamp: new Date().toISOString(),
        min: 80,
        max: 95
      }
    ],
    maintenanceHistory: [
      {
        id: 'maint-8',
        type: 'preventive',
        scheduledDate: '2023-05-12',
        completedDate: '2023-05-12',
        description: 'Bi-annual maintenance',
        status: 'completed',
        technician: 'Lisa Wong',
        notes: 'Hydraulic system check, oil change, nozzle inspection',
        parts: ['Hydraulic oil', 'Filters']
      },
      {
        id: 'maint-9',
        type: 'preventive',
        scheduledDate: '2023-11-12',
        description: 'Bi-annual maintenance',
        status: 'scheduled'
      }
    ],
    tags: ['molding', 'plastic', 'production'],
    createdAt: '2019-10-05T11:30:00Z',
    updatedAt: '2023-05-12T15:45:00Z'
  },
  {
    id: 'equip-5',
    name: 'Laser Cutting Machine LC-2000',
    serialNumber: 'LC2000-456',
    model: 'LC-2000',
    manufacturer: 'Precision Laser Systems',
    type: 'Laser Cutter',
    location: 'Building A, Floor 2, Cutting Area',
    department: 'Fabrication',
    installationDate: '2021-02-18',
    lastMaintenanceDate: '2023-03-30',
    nextMaintenanceDate: '2023-09-30',
    status: 'operational',
    specifications: {
      'Laser Type': 'Fiber',
      'Power': '2000 W',
      'Cutting Area': '3000 x 1500 mm',
      'Max Material Thickness': '15 mm (steel)',
      'Positioning Accuracy': '±0.05 mm'
    },
    metrics: [
      {
        id: 'metric-16',
        name: 'Temperature',
        value: 28.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
        max: 35,
        warning: {
          high: 32
        },
        critical: {
          high: 35
        }
      },
      {
        id: 'metric-17',
        name: 'Laser Power',
        value: 1850,
        unit: 'W',
        timestamp: new Date().toISOString(),
        max: 2000
      },
      {
        id: 'metric-18',
        name: 'Gas Pressure',
        value: 10.2,
        unit: 'bar',
        timestamp: new Date().toISOString(),
        min: 8,
        max: 12
      }
    ],
    maintenanceHistory: [
      {
        id: 'maint-10',
        type: 'preventive',
        scheduledDate: '2023-03-30',
        completedDate: '2023-03-30',
        description: 'Quarterly maintenance',
        status: 'completed',
        technician: 'Marcus Lee',
        notes: 'Optics cleaning, alignment check, cooling system inspection',
        parts: ['Lens cleaning kit']
      },
      {
        id: 'maint-11',
        type: 'preventive',
        scheduledDate: '2023-09-30',
        description: 'Quarterly maintenance',
        status: 'scheduled'
      }
    ],
    tags: ['cutting', 'laser', 'fabrication'],
    createdAt: '2021-02-18T09:20:00Z',
    updatedAt: '2023-03-30T13:15:00Z'
  }
];

export const equipmentService = {
  // Get all equipment
  getAllEquipment: async (): Promise<Equipment[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mockEquipmentData;
  },
  
  // Get equipment summaries (for dashboard, lists)
  getEquipmentSummaries: async (): Promise<EquipmentSummary[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return mockEquipmentData.map(equipment => ({
      id: equipment.id,
      name: equipment.name,
      type: equipment.type,
      status: equipment.status,
      location: equipment.location,
      lastMaintenanceDate: equipment.lastMaintenanceDate,
      nextMaintenanceDate: equipment.nextMaintenanceDate,
      metrics: {
        // Mock OEE and uptime values
        oee: Math.floor(Math.random() * 30) + 70, // 70-99%
        uptime: Math.floor(Math.random() * 20) + 80, // 80-99%
      }
    }));
  },
  
  // Get equipment by ID
  getEquipmentById: async (id: string): Promise<Equipment | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const equipment = mockEquipmentData.find(e => e.id === id);
    return equipment || null;
  },
  
  // Filter equipment
  filterEquipment: async (filter: EquipmentFilter): Promise<Equipment[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    let filteredEquipment = [...mockEquipmentData];
    
    // Apply filters
    if (filter.status && filter.status.length > 0) {
      filteredEquipment = filteredEquipment.filter(e => filter.status?.includes(e.status));
    }
    
    if (filter.type && filter.type.length > 0) {
      filteredEquipment = filteredEquipment.filter(e => filter.type?.includes(e.type));
    }
    
    if (filter.location && filter.location.length > 0) {
      filteredEquipment = filteredEquipment.filter(e => e.location && filter.location?.includes(e.location));
    }
    
    if (filter.department && filter.department.length > 0) {
      filteredEquipment = filteredEquipment.filter(e => e.department && filter.department?.includes(e.department));
    }
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredEquipment = filteredEquipment.filter(e => 
        e.name.toLowerCase().includes(searchLower) ||
        e.serialNumber.toLowerCase().includes(searchLower) ||
        e.model?.toLowerCase().includes(searchLower) ||
        e.manufacturer?.toLowerCase().includes(searchLower) ||
        e.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    return filteredEquipment;
  },
  
  // Get maintenance history
  getMaintenanceHistory: async (equipmentId: string): Promise<Maintenance[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const equipment = mockEquipmentData.find(e => e.id === equipmentId);
    return ((equipment?.maintenanceHistory || []));
  },
  
  // Get equipment metrics
  getEquipmentMetrics: async (equipmentId: string): Promise<EquipmentMetric[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const equipment = mockEquipmentData.find(e => e.id === equipmentId);
    return ((equipment?.metrics || []));
  },
  
  // Add new equipment
  addEquipment: async (equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newEquipment: Equipment = {
      ...equipment,
      id: `equip-${mockEquipmentData.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // In a real application, this would be a server call
    mockEquipmentData.push(newEquipment);
    
    return newEquipment;
  },
  
  // Update equipment
  updateEquipment: async (id: string, equipment: Partial<Equipment>): Promise<Equipment | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const index = mockEquipmentData.findIndex(e => e.id === id);
    if (index === -1) return null;
    
    const updatedEquipment: Equipment = {
      ...mockEquipmentData[index],
      ...equipment,
      updatedAt: new Date().toISOString()
    };
    
    // In a real application, this would be a server call
    mockEquipmentData[index] = updatedEquipment;
    
    return updatedEquipment;
  },
  
  // Add maintenance record
  addMaintenanceRecord: async (equipmentId: string, maintenance: Omit<Maintenance, 'id'>): Promise<Maintenance | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const equipment = mockEquipmentData.find(e => e.id === equipmentId);
    if (!equipment) return null;
    
    const newMaintenance: Maintenance = {
      ...maintenance,
      id: `maint-${Math.floor(Math.random() * 1000)}`
    };
    
    if (!equipment.maintenanceHistory) {
      equipment.maintenanceHistory = [];
    }
    
    // In a real application, this would be a server call
    equipment.maintenanceHistory.push(newMaintenance);
    equipment.updatedAt = new Date().toISOString();
    
    // If maintenance is completed, update lastMaintenanceDate
    if (maintenance.status === 'completed' && maintenance.completedDate) {
      equipment.lastMaintenanceDate = maintenance.completedDate;
    }
    
    return newMaintenance;
  },
  
  // Update maintenance record
  updateMaintenanceRecord: async (
    equipmentId: string, 
    maintenanceId: string, 
    maintenance: Partial<Maintenance>
  ): Promise<Maintenance | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const equipment = mockEquipmentData.find(e => e.id === equipmentId);
    if (!equipment || !equipment.maintenanceHistory) return null;
    
    const index = equipment.maintenanceHistory.findIndex(m => m.id === maintenanceId);
    if (index === -1) return null;
    
    const updatedMaintenance: Maintenance = {
      ...equipment.maintenanceHistory[index],
      ...maintenance
    };
    
    // In a real application, this would be a server call
    equipment.maintenanceHistory[index] = updatedMaintenance;
    equipment.updatedAt = new Date().toISOString();
    
    // If maintenance is completed, update lastMaintenanceDate
    if (updatedMaintenance.status === 'completed' && updatedMaintenance.completedDate) {
      equipment.lastMaintenanceDate = updatedMaintenance.completedDate;
    }
    
    return updatedMaintenance;
  }
};

export default equipmentService;