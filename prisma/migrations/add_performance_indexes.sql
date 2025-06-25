-- Performance optimization indexes for manufacturing analytics platform
-- These indexes significantly improve query performance for the chat API

-- Composite indexes for time-based queries
CREATE INDEX IF NOT EXISTS idx_performance_metric_timestamp_workunit 
ON "PerformanceMetric" ("timestamp" DESC, "workUnitId");

CREATE INDEX IF NOT EXISTS idx_quality_metric_timestamp_workunit 
ON "QualityMetric" ("timestamp" DESC, "workUnitId");

CREATE INDEX IF NOT EXISTS idx_alert_timestamp_severity 
ON "Alert" ("timestamp" DESC, "severity", "status");

CREATE INDEX IF NOT EXISTS idx_maintenance_record_time_type 
ON "MaintenanceRecord" ("startTime" DESC, "endTime" DESC, "type");

-- Indexes for equipment hierarchy queries
CREATE INDEX IF NOT EXISTS idx_workunit_status_type 
ON "WorkUnit" ("status", "equipmentType");

CREATE INDEX IF NOT EXISTS idx_workunit_workcenter 
ON "WorkUnit" ("workCenterId");

-- Indexes for aggregation queries
CREATE INDEX IF NOT EXISTS idx_performance_metric_oee_components 
ON "PerformanceMetric" ("availability", "performance", "quality", "oeeScore");

CREATE INDEX IF NOT EXISTS idx_quality_metric_spec 
ON "QualityMetric" ("isWithinSpec", "value");

-- Indexes for user and session queries
CREATE INDEX IF NOT EXISTS idx_user_email 
ON "User" ("email");

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp_user 
ON "AuditLog" ("timestamp" DESC, "userId");

-- Partial indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_alert_active 
ON "Alert" ("timestamp" DESC, "workUnitId") 
WHERE "status" IN ('active', 'pending');

CREATE INDEX IF NOT EXISTS idx_workunit_operational 
ON "WorkUnit" ("id", "name", "workCenterId") 
WHERE "status" = 'operational';

-- Text search indexes for chat queries
CREATE INDEX IF NOT EXISTS idx_alert_message_gin 
ON "Alert" USING gin(to_tsvector('english', "message"));

-- Function-based index for date ranges
CREATE INDEX IF NOT EXISTS idx_performance_metric_date 
ON "PerformanceMetric" ((DATE("timestamp")));

-- Covering indexes for common queries
CREATE INDEX IF NOT EXISTS idx_performance_metric_covering 
ON "PerformanceMetric" ("workUnitId", "timestamp" DESC) 
INCLUDE ("oeeScore", "availability", "performance", "quality", "goodCount", "totalCount");

-- Analyze tables to update statistics
ANALYZE "PerformanceMetric";
ANALYZE "QualityMetric";
ANALYZE "Alert";
ANALYZE "MaintenanceRecord";
ANALYZE "WorkUnit";
ANALYZE "User";
ANALYZE "AuditLog";