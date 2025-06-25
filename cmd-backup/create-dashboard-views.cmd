@echo off
echo ===============================================
echo Creating Dashboard Views from Existing Data
echo ===============================================
echo.

echo Creating views from your existing manufacturing data...
echo.

REM Create SQL for views based on existing schema
(
echo -- Dashboard Views for Manufacturing Analytics Platform
echo.
echo -- 1. Real-time OEE Overview
echo CREATE OR REPLACE VIEW dashboard_oee_realtime AS
echo SELECT 
echo     equipmentId,
echo     name as metric_name,
echo     value,
echo     unit,
echo     timestamp,
echo     CASE 
echo         WHEN name = 'oee' THEN 'OEE'
echo         WHEN name = 'availability' THEN 'Availability'
echo         WHEN name = 'performance' THEN 'Performance'  
echo         WHEN name = 'quality' THEN 'Quality'
echo         ELSE name
echo     END as display_name
echo FROM "Metric"
echo WHERE name IN ('oee', 'availability', 'performance', 'quality'^)
echo   AND timestamp ^> NOW(^) - INTERVAL '24 hours'
echo ORDER BY timestamp DESC;
echo.
echo -- 2. Equipment Status Summary
echo CREATE OR REPLACE VIEW dashboard_equipment_status AS
echo SELECT 
echo     e.id,
echo     e.name,
echo     e.type,
echo     e.status,
echo     e.location,
echo     COUNT(DISTINCT m.id^) as metric_count,
echo     MAX(m.timestamp^) as last_update
echo FROM "Equipment" e
echo LEFT JOIN "Metric" m ON e.id = m."equipmentId"
echo GROUP BY e.id, e.name, e.type, e.status, e.location;
echo.
echo -- 3. Production Metrics Summary
echo CREATE OR REPLACE VIEW dashboard_production_summary AS
echo SELECT 
echo     DATE_TRUNC('hour', timestamp^) as hour,
echo     equipmentId,
echo     COUNT(*^) as data_points,
echo     AVG(CASE WHEN name = 'production_rate' THEN value END^) as avg_production_rate,
echo     AVG(CASE WHEN name = 'oee' THEN value END^) as avg_oee,
echo     AVG(CASE WHEN name = 'quality' THEN value END^) as avg_quality
echo FROM "Metric"
echo WHERE timestamp ^> NOW(^) - INTERVAL '7 days'
echo GROUP BY DATE_TRUNC('hour', timestamp^), equipmentId
echo ORDER BY hour DESC;
echo.
echo -- 4. Alert Summary View
echo CREATE OR REPLACE VIEW dashboard_alert_summary AS
echo SELECT 
echo     a.id,
echo     a.name as alert_name,
echo     a.severity,
echo     a.status,
echo     a.createdAt,
echo     a.acknowledgedAt,
echo     e.name as equipment_name,
echo     u.name as acknowledged_by
echo FROM "Alert" a
echo LEFT JOIN "Equipment" e ON a."equipmentId" = e.id
echo LEFT JOIN "User" u ON a."acknowledgedBy" = u.id
echo WHERE a."createdAt" ^> NOW(^) - INTERVAL '7 days'
echo ORDER BY a."createdAt" DESC;
echo.
echo -- 5. KPI Summary View
echo CREATE OR REPLACE VIEW dashboard_kpi_summary AS
echo SELECT 
echo     'Total Equipment' as kpi_name,
echo     COUNT(DISTINCT id^) as value,
echo     'count' as unit
echo FROM "Equipment"
echo UNION ALL
echo SELECT 
echo     'Active Alerts' as kpi_name,
echo     COUNT(*^) as value,
echo     'count' as unit
echo FROM "Alert"
echo WHERE status = 'active'
echo UNION ALL
echo SELECT 
echo     'Avg OEE (24h^)' as kpi_name,
echo     ROUND(AVG(value^)::numeric, 1^) as value,
echo     '%%' as unit
echo FROM "Metric"
echo WHERE name = 'oee' AND timestamp ^> NOW(^) - INTERVAL '24 hours'
echo UNION ALL
echo SELECT 
echo     'Total Metrics (24h^)' as kpi_name,
echo     COUNT(*^) as value,
echo     'count' as unit
echo FROM "Metric"
echo WHERE timestamp ^> NOW(^) - INTERVAL '24 hours';
echo.
echo -- Grant permissions
echo GRANT SELECT ON ALL TABLES IN SCHEMA public TO postgres;
echo GRANT SELECT ON dashboard_oee_realtime TO postgres;
echo GRANT SELECT ON dashboard_equipment_status TO postgres;
echo GRANT SELECT ON dashboard_production_summary TO postgres;
echo GRANT SELECT ON dashboard_alert_summary TO postgres;
echo GRANT SELECT ON dashboard_kpi_summary TO postgres;
) > dashboard_views.sql

REM Execute the SQL
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < dashboard_views.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Dashboard views created successfully!
    echo.
    echo Available views:
    echo - dashboard_oee_realtime: Real-time OEE metrics
    echo - dashboard_equipment_status: Equipment status overview
    echo - dashboard_production_summary: Hourly production metrics
    echo - dashboard_alert_summary: Recent alerts
    echo - dashboard_kpi_summary: Key performance indicators
    echo.
    echo These views are optimized for dashboard queries and can be used
    echo in your Next.js application or any BI tool.
) else (
    echo.
    echo ❌ Error creating views. Please check your database connection.
)

REM Clean up
del dashboard_views.sql

echo.
pause