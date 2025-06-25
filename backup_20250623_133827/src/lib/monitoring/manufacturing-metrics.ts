/**
 * Manufacturing AnalyticsPlatform - Custom Metrics Implementation
 * This is our own proprietary monitoring solution for manufacturing analytics
 */

import { Counter, Gauge, Histogram, Summary, register } from 'prom-client';

// Manufacturing OEE Metrics
export const manufacturingOEE = new Gauge({
  name: 'manufacturing_oee_percentage',
  help: 'Overall Equipment Effectiveness percentage (0-100)',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit', 'shift'],
  registers: [register]
});

export const equipmentAvailability = new Gauge({
  name: 'manufacturing_availability_percentage',
  help: 'Equipment availability as percentage of scheduled time',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit'],
  registers: [register]
});

export const equipmentPerformance = new Gauge({
  name: 'manufacturing_performance_percentage',
  help: 'Equipment performance efficiency percentage',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit'],
  registers: [register]
});

export const productionQuality = new Gauge({
  name: 'manufacturing_quality_percentage',
  help: 'First pass quality rate percentage',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit', 'product'],
  registers: [register]
});

// Production Metrics
export const unitsProduced = new Counter({
  name: 'manufacturing_units_produced_total',
  help: 'Total units produced',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit', 'product', 'shift'],
  registers: [register]
});

export const cycleTime = new Histogram({
  name: 'manufacturing_cycle_time_seconds',
  help: 'Production cycle time in seconds',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit', 'product'],
  buckets: [5, 10, 30, 60, 120, 300, 600, 1200, 3600],
  registers: [register]
});

export const defectsDetected = new Counter({
  name: 'manufacturing_defects_total',
  help: 'Total defects detected',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit', 'defect_type', 'severity', 'product'],
  registers: [register]
});

export const scrapProduced = new Counter({
  name: 'manufacturing_scrap_units_total',
  help: 'Total scrap units produced',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit', 'scrap_reason', 'product'],
  registers: [register]
});

// Equipment Health Metrics
export const equipmentTemperature = new Gauge({
  name: 'equipment_temperature_celsius',
  help: 'Equipment temperature in Celsius',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit', 'sensor_id', 'component'],
  registers: [register]
});

export const equipmentVibration = new Gauge({
  name: 'equipment_vibration_mm_s',
  help: 'Equipment vibration in mm/s RMS',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit', 'sensor_id', 'axis'],
  registers: [register]
});

export const equipmentPressure = new Gauge({
  name: 'equipment_pressure_bar',
  help: 'Equipment pressure in bar',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit', 'sensor_id', 'circuit'],
  registers: [register]
});

export const equipmentPowerConsumption = new Gauge({
  name: 'equipment_power_consumption_kw',
  help: 'Equipment power consumption in kilowatts',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit'],
  registers: [register]
});

// Maintenance Metrics
export const maintenanceEvents = new Counter({
  name: 'manufacturing_maintenance_events_total',
  help: 'Total maintenance events',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit', 'maintenance_type', 'severity'],
  registers: [register]
});

export const mtbf = new Gauge({
  name: 'manufacturing_mtbf_hours',
  help: 'Mean Time Between Failures in hours',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit'],
  registers: [register]
});

export const mttr = new Gauge({
  name: 'manufacturing_mttr_minutes',
  help: 'Mean Time To Repair in minutes',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'work_unit'],
  registers: [register]
});

// Supply Chain Metrics
export const inventoryLevel = new Gauge({
  name: 'manufacturing_inventory_units',
  help: 'Current inventory level in units',
  labelNames: ['enterprise', 'site', 'material_type', 'material_id', 'location'],
  registers: [register]
});

export const materialConsumption = new Counter({
  name: 'manufacturing_material_consumption_total',
  help: 'Total material consumption',
  labelNames: ['enterprise', 'site', 'area', 'work_center', 'material_type', 'material_id'],
  registers: [register]
});

// AI/Analytics Metrics
export const aiPredictionAccuracy = new Gauge({
  name: 'analytics_ai_prediction_accuracy',
  help: 'AI prediction accuracy percentage',
  labelNames: ['model_type', 'prediction_category', 'time_horizon'],
  registers: [register]
});

export const chatQueryLatency = new Histogram({
  name: 'analytics_chat_query_latency_ms',
  help: 'Chat query response latency in milliseconds',
  labelNames: ['query_type', 'context_type', 'user_role'],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
  registers: [register]
});

export const agentExecutions = new Counter({
  name: 'analytics_agent_executions_total',
  help: 'Total agent executions',
  labelNames: ['agent_type', 'action_type', 'success'],
  registers: [register]
});

// Compliance Metrics
export const complianceScore = new Gauge({
  name: 'manufacturing_compliance_score',
  help: 'Compliance score percentage (0-100)',
  labelNames: ['enterprise', 'site', 'compliance_type', 'standard'],
  registers: [register]
});

export const auditFindings = new Counter({
  name: 'manufacturing_audit_findings_total',
  help: 'Total audit findings',
  labelNames: ['enterprise', 'site', 'finding_type', 'severity', 'standard'],
  registers: [register]
});

// Custom Metrics Collection
export class ManufacturingMetricsCollector {
  private collectInterval: NodeJS.Timeout | null = null;

  startCollection(intervalMs: number = 10000) {
    this.collectInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  stopCollection() {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = null;
    }
  }

  private async collectMetrics() {
    // This will be implemented to collect real metrics from the database
    // and equipment sensors
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  async getContentType(): string {
    return register.contentType;
  }
}