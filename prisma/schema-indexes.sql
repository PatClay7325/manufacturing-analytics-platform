-- Manufacturing Analytics Platform - Performance Indexes
-- Optimizes query performance for common access patterns

-- PerformanceMetric indexes (most frequently queried table)
CREATE INDEX idx_performance_metric_timestamp ON "PerformanceMetric"(timestamp DESC);
CREATE INDEX idx_performance_metric_work_unit_timestamp ON "PerformanceMetric"("workUnitId", timestamp DESC);
CREATE INDEX idx_performance_metric_shift ON "PerformanceMetric"(shift);
CREATE INDEX idx_performance_metric_product_type ON "PerformanceMetric"("productType");
CREATE INDEX idx_performance_metric_oee_score ON "PerformanceMetric"("oeeScore" DESC);
CREATE INDEX idx_performance_metric_composite ON "PerformanceMetric"("workUnitId", shift, timestamp DESC);

-- EquipmentHealth indexes
CREATE INDEX idx_equipment_health_work_unit ON "EquipmentHealth"("workUnitId");
CREATE INDEX idx_equipment_health_overall_health ON "EquipmentHealth"("overallHealth");
CREATE INDEX idx_equipment_health_risk_level ON "EquipmentHealth"("riskLevel");
CREATE INDEX idx_equipment_health_maintenance_due ON "EquipmentHealth"("nextMaintenanceDue");
CREATE INDEX idx_equipment_health_risk_maintenance ON "EquipmentHealth"("riskLevel", "nextMaintenanceDue");

-- Alert indexes
CREATE INDEX idx_alert_status ON "Alert"(status);
CREATE INDEX idx_alert_severity ON "Alert"(severity);
CREATE INDEX idx_alert_timestamp ON "Alert"(timestamp DESC);
CREATE INDEX idx_alert_work_unit ON "Alert"("workUnitId");
CREATE INDEX idx_alert_type ON "Alert"("alertType");
CREATE INDEX idx_alert_composite ON "Alert"(status, severity, timestamp DESC);

-- QualityMetric indexes
CREATE INDEX idx_quality_metric_timestamp ON "QualityMetric"(timestamp DESC);
CREATE INDEX idx_quality_metric_work_unit ON "QualityMetric"("workUnitId");
CREATE INDEX idx_quality_metric_parameter ON "QualityMetric"(parameter);
CREATE INDEX idx_quality_metric_within_spec ON "QualityMetric"("isWithinSpec");
CREATE INDEX idx_quality_metric_composite ON "QualityMetric"("workUnitId", parameter, timestamp DESC);

-- MaintenanceRecord indexes
CREATE INDEX idx_maintenance_start_time ON "MaintenanceRecord"("startTime" DESC);
CREATE INDEX idx_maintenance_work_unit ON "MaintenanceRecord"("workUnitId");
CREATE INDEX idx_maintenance_type ON "MaintenanceRecord"("maintenanceType");
CREATE INDEX idx_maintenance_status ON "MaintenanceRecord"(status);
CREATE INDEX idx_maintenance_composite ON "MaintenanceRecord"("workUnitId", "startTime" DESC);

-- EnergyMetric indexes
CREATE INDEX idx_energy_metric_timestamp ON "EnergyMetric"(timestamp DESC);
CREATE INDEX idx_energy_metric_work_unit ON "EnergyMetric"("workUnitId");
CREATE INDEX idx_energy_metric_shift ON "EnergyMetric"(shift);
CREATE INDEX idx_energy_composite ON "EnergyMetric"("workUnitId", timestamp DESC);

-- ProductionLineMetric indexes
CREATE INDEX idx_production_line_timestamp ON "ProductionLineMetric"(timestamp DESC);
CREATE INDEX idx_production_line_work_unit ON "ProductionLineMetric"("workUnitId");
CREATE INDEX idx_production_line_status ON "ProductionLineMetric"("lineStatus");
CREATE INDEX idx_production_line_composite ON "ProductionLineMetric"("workUnitId", timestamp DESC);

-- ShiftReport indexes
CREATE INDEX idx_shift_report_date ON "ShiftReport"("shiftDate" DESC);
CREATE INDEX idx_shift_report_shift ON "ShiftReport"(shift);
CREATE INDEX idx_shift_report_kpi ON "ShiftReport"("kpiMet");
CREATE INDEX idx_shift_report_composite ON "ShiftReport"(shift, "shiftDate" DESC);

-- Hierarchy indexes (for joins and filtering)
CREATE INDEX idx_work_unit_work_center ON "WorkUnit"("workCenterId");
CREATE INDEX idx_work_unit_equipment_type ON "WorkUnit"("equipmentType");
CREATE INDEX idx_work_unit_status ON "WorkUnit"(status);
CREATE INDEX idx_work_center_area ON "WorkCenter"("areaId");
CREATE INDEX idx_area_site ON "Area"("siteId");
CREATE INDEX idx_site_enterprise ON "Site"("enterpriseId");

-- Text search indexes (for searching)
CREATE INDEX idx_work_unit_name ON "WorkUnit"(name);
CREATE INDEX idx_alert_message ON "Alert" USING GIN (to_tsvector('english', message));
CREATE INDEX idx_maintenance_description ON "MaintenanceRecord" USING GIN (to_tsvector('english', description));

-- Partial indexes for common filters
CREATE INDEX idx_active_alerts ON "Alert"(timestamp DESC) WHERE status IN ('active', 'acknowledged');
CREATE INDEX idx_operational_equipment ON "WorkUnit"("workCenterId") WHERE status = 'operational';
CREATE INDEX idx_high_risk_equipment ON "EquipmentHealth"("overallHealth", "workUnitId") WHERE "riskLevel" = 'high';
CREATE INDEX idx_recent_performance ON "PerformanceMetric"(timestamp DESC) WHERE timestamp > NOW() - INTERVAL '7 days';

-- Covering indexes for common queries
CREATE INDEX idx_oee_dashboard_covering ON "PerformanceMetric"(
  "workUnitId", 
  timestamp DESC
) INCLUDE (
  availability, 
  performance, 
  quality, 
  "oeeScore",
  "totalParts",
  "goodParts"
);

CREATE INDEX idx_equipment_health_covering ON "EquipmentHealth"(
  "workUnitId"
) INCLUDE (
  "overallHealth",
  "mtbf",
  "mttr",
  "riskLevel",
  "nextMaintenanceDue"
);

-- Function-based indexes
CREATE INDEX idx_oee_calculation ON "PerformanceMetric"(
  ((availability * performance * quality) / 10000)
);

-- Update statistics for query planner
ANALYZE "PerformanceMetric";
ANALYZE "EquipmentHealth";
ANALYZE "Alert";
ANALYZE "QualityMetric";
ANALYZE "MaintenanceRecord";
ANALYZE "EnergyMetric";
ANALYZE "ProductionLineMetric";
ANALYZE "ShiftReport";
ANALYZE "WorkUnit";
ANALYZE "WorkCenter";
ANALYZE "Area";
ANALYZE "Site";
ANALYZE "Enterprise";