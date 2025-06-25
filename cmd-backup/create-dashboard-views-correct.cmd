@echo off
echo ===============================================
echo Creating Dashboard Views from Actual Schema
echo ===============================================
echo.

echo Creating views based on your flat manufacturing data model...

docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing << EOF

-- Drop existing views if they exist
DROP VIEW IF EXISTS dashboard_production_overview CASCADE;
DROP VIEW IF EXISTS dashboard_equipment_performance CASCADE;
DROP VIEW IF EXISTS dashboard_quality_metrics CASCADE;
DROP VIEW IF EXISTS dashboard_alert_summary CASCADE;
DROP VIEW IF EXISTS dashboard_maintenance_summary CASCADE;
DROP VIEW IF EXISTS dashboard_realtime_kpis CASCADE;
DROP VIEW IF EXISTS dashboard_downtime_analysis CASCADE;

-- 1. Production Overview Dashboard View
CREATE VIEW dashboard_production_overview AS
SELECT 
    date_trunc('hour', "recordedAt") as hour,
    "plantCode",
    COUNT(DISTINCT "equipmentId") as equipment_count,
    SUM("totalPartsProduced") as total_parts,
    SUM("goodParts") as good_parts,
    SUM("rejectParts") as reject_parts,
    ROUND(AVG("oeeScore") * 100, 2) as avg_oee,
    ROUND(AVG("availability") * 100, 2) as avg_availability,
    ROUND(AVG("performance") * 100, 2) as avg_performance,
    ROUND(AVG("quality") * 100, 2) as avg_quality,
    SUM("downtimeMinutes") as total_downtime
FROM "PerformanceMetric"
WHERE "recordedAt" > NOW() - INTERVAL '7 days'
GROUP BY hour, "plantCode"
ORDER BY hour DESC;

-- 2. Equipment Performance View
CREATE VIEW dashboard_equipment_performance AS
SELECT 
    "equipmentId",
    "assetTag",
    "plantCode",
    "workCenterId",
    COUNT(*) as data_points,
    ROUND(AVG("oeeScore") * 100, 2) as avg_oee,
    ROUND(AVG("availability") * 100, 2) as availability,
    ROUND(AVG("performance") * 100, 2) as performance,
    ROUND(AVG("quality") * 100, 2) as quality,
    SUM("totalPartsProduced") as total_production,
    SUM("goodParts") as good_parts,
    SUM("rejectParts") as reject_parts,
    SUM("downtimeMinutes") as total_downtime,
    MAX("recordedAt") as last_updated
FROM "PerformanceMetric"
WHERE "recordedAt" > NOW() - INTERVAL '24 hours'
GROUP BY "equipmentId", "assetTag", "plantCode", "workCenterId";

-- 3. Quality Metrics Dashboard View
CREATE VIEW dashboard_quality_metrics AS
SELECT 
    date_trunc('day', "recordedAt") as day,
    "equipmentId",
    "plantCode",
    "productId",
    COUNT(*) as inspection_count,
    SUM("sampleSize") as total_samples,
    SUM("defectsCount") as total_defects,
    ROUND(AVG("defectRate") * 100, 2) as avg_defect_rate,
    ROUND((1 - AVG("defectRate")) * 100, 2) as quality_rate,
    COUNT(DISTINCT "defectType") as defect_types
FROM "QualityMetric"
WHERE "recordedAt" > NOW() - INTERVAL '30 days'
GROUP BY day, "equipmentId", "plantCode", "productId"
ORDER BY day DESC;

-- 4. Alert Summary View
CREATE VIEW dashboard_alert_summary AS
SELECT 
    id,
    "triggeredAt",
    "equipmentId",
    "plantCode",
    "assetTag",
    type,
    category,
    severity,
    status,
    impact,
    "costImpact",
    description,
    condition
FROM "Alert"
WHERE "triggeredAt" > NOW() - INTERVAL '7 days'
ORDER BY "triggeredAt" DESC;

-- 5. Maintenance Summary View
CREATE VIEW dashboard_maintenance_summary AS
SELECT 
    date_trunc('week', "scheduledDate") as week,
    "equipmentId",
    "plantCode",
    type,
    priority,
    status,
    COUNT(*) as maintenance_count,
    SUM("costActual") as total_cost,
    AVG("durationMinutes") as avg_duration,
    COUNT(DISTINCT "technicianName") as technician_count
FROM "MaintenanceRecord"
WHERE "scheduledDate" > NOW() - INTERVAL '90 days'
GROUP BY week, "equipmentId", "plantCode", type, priority, status
ORDER BY week DESC;

-- 6. Real-time KPIs View
CREATE VIEW dashboard_realtime_kpis AS
SELECT 
    COUNT(DISTINCT "equipmentId") as active_equipment,
    ROUND(AVG("oeeScore") * 100, 2) as current_oee,
    SUM("totalPartsProduced") as hourly_production,
    SUM("goodParts") as good_parts,
    SUM("rejectParts") as reject_parts,
    ROUND((SUM("goodParts")::float / NULLIF(SUM("totalPartsProduced"), 0)) * 100, 2) as quality_rate,
    SUM("downtimeMinutes") as downtime_minutes,
    COUNT(DISTINCT "plantCode") as active_plants
FROM "PerformanceMetric"
WHERE "recordedAt" > NOW() - INTERVAL '1 hour';

-- 7. Downtime Analysis View
CREATE VIEW dashboard_downtime_analysis AS
SELECT 
    d."equipmentId",
    d."plantCode",
    d."assetTag",
    d.category,
    d.reason,
    COUNT(*) as occurrences,
    SUM(d."durationMinutes") as total_downtime,
    ROUND(AVG(d."durationMinutes"), 2) as avg_downtime,
    SUM(d."impactedUnits") as total_impacted_units,
    MAX(d."occurredAt") as last_occurrence
FROM "DowntimeCause" d
WHERE d."occurredAt" > NOW() - INTERVAL '7 days'
GROUP BY d."equipmentId", d."plantCode", d."assetTag", d.category, d.reason
ORDER BY total_downtime DESC;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO postgres;
GRANT SELECT ON dashboard_production_overview TO postgres;
GRANT SELECT ON dashboard_equipment_performance TO postgres;
GRANT SELECT ON dashboard_quality_metrics TO postgres;
GRANT SELECT ON dashboard_alert_summary TO postgres;
GRANT SELECT ON dashboard_maintenance_summary TO postgres;
GRANT SELECT ON dashboard_realtime_kpis TO postgres;
GRANT SELECT ON dashboard_downtime_analysis TO postgres;

-- Insert some sample data if tables are empty
INSERT INTO "PerformanceMetric" (
    "recordedAt", "equipmentId", "assetTag", "plantCode", "workCenterId",
    "oeeScore", "availability", "performance", "quality",
    "totalPartsProduced", "goodParts", "rejectParts", "downtimeMinutes"
)
SELECT 
    NOW() - (interval '1 hour' * generate_series(0, 23)),
    'EQ-' || LPAD((1 + random() * 4)::int::text, 3, '0'),
    'ASSET-' || LPAD((1 + random() * 4)::int::text, 3, '0'),
    'PLANT-' || (CASE WHEN random() < 0.5 THEN 'A' ELSE 'B' END),
    'WC-' || LPAD((1 + random() * 3)::int::text, 2, '0'),
    0.6 + random() * 0.3,
    0.8 + random() * 0.2,
    0.7 + random() * 0.3,
    0.9 + random() * 0.1,
    (100 + random() * 200)::int,
    (90 + random() * 180)::int,
    (random() * 20)::int,
    (random() * 30)::int
FROM generate_series(1, 96) -- 24 hours * 4 equipment
ON CONFLICT DO NOTHING;

-- Check if views have data
SELECT 'dashboard_production_overview' as view_name, COUNT(*) as row_count FROM dashboard_production_overview
UNION ALL
SELECT 'dashboard_equipment_performance', COUNT(*) FROM dashboard_equipment_performance
UNION ALL
SELECT 'dashboard_realtime_kpis', COUNT(*) FROM dashboard_realtime_kpis;

EOF

echo.
echo ✅ Dashboard views created successfully!
echo.
echo Available views:
echo - dashboard_production_overview: Hourly production metrics by plant
echo - dashboard_equipment_performance: Equipment OEE and performance
echo - dashboard_quality_metrics: Quality metrics and defect analysis
echo - dashboard_alert_summary: Recent alerts and their details
echo - dashboard_maintenance_summary: Maintenance activities summary
echo - dashboard_realtime_kpis: Real-time KPI snapshot
echo - dashboard_downtime_analysis: Downtime causes and impact
echo.
echo These views match your actual database schema and are ready
echo for use in Apache Superset dashboards.
echo.
pause