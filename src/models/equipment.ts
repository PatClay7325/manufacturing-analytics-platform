export type EquipmentStatus = 'operational' | 'maintenance' | 'offline' | 'error';

export type MaintenanceType = 'preventive' | 'corrective' | 'predictive' | 'condition-based';

export interface Maintenance {
  id: string;
  maintenanceType: string; // 'Preventive' | 'Corrective' | 'Predictive' | 'Calibration'
  startTime: string;
  endTime: string;
  workOrderNumber: string;
  laborHours?: number;
  materialCost?: number;
  description?: string;
  equipmentId: number;
  createdAt?: string;
}

export interface EquipmentMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  min?: number;
  max?: number;
  target?: number;
  critical?: {
    low?: number;
    high?: number;
  };
  warning?: {
    low?: number;
    high?: number;
  };
}

export interface Equipment {
  id: string;
  name: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  type: string;
  location?: string;
  department?: string;
  installationDate?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  status: EquipmentStatus;
  metrics?: EquipmentMetric[];
  specifications?: Record<string, string | number>;
  maintenanceHistory?: Maintenance[];
  image?: string;
  notes?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EquipmentFilter {
  status?: EquipmentStatus[];
  type?: string[];
  location?: string[];
  department?: string[];
  search?: string;
}

// Performance metrics
export interface PerformanceMetrics {
  oee?: number; // Overall Equipment Effectiveness
  availability?: number; // Percentage of scheduled time the equipment is available to operate
  performance?: number; // Speed at which the equipment runs as a percentage of its designed speed
  quality?: number; // Percentage of good units produced out of total units started
  mtbf?: number; // Mean Time Between Failures (hours)
  mttr?: number; // Mean Time To Repair (hours)
  downtime?: number; // Total downtime in hours
  uptime?: number; // Total uptime in hours
  throughput?: number; // Units produced per hour
}

// Summary used for quick views (dashboard, lists)
export interface EquipmentSummary {
  id: string;
  name: string;
  type: string;
  status: EquipmentStatus;
  location?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  metrics?: {
    oee?: number;
    uptime?: number;
  };
}