@echo off
echo ===============================================
echo Creating Dashboard Views (Corrected Schema)
echo ===============================================
echo.

echo Creating views matching your actual database schema...
echo.

REM Create SQL for views based on corrected schema
(
echo -- Dashboard Views for Manufacturing Analytics Platform
echo -- Corrected for actual database schema
echo.
echo -- 1. Real-time Metrics Overview
echo CREATE OR REPLACE VIEW dashboard_metrics_realtime AS
echo SELECT 
echo     m.id,
echo     m.name as metric_name,
echo     m.value,
echo     m.unit,
echo     m.timestamp,
echo     m.category,
echo     m.source,
echo     m.quality,
echo     CASE 
echo         WHEN m.name = 'oee' THEN 'OEE'
echo         WHEN m.name = 'availability' THEN 'Availability'
echo         WHEN m.name = 'performance' THEN 'Performance'  
echo         WHEN m.name = 'quality' THEN 'Quality'
echo         ELSE m.name
echo     END as display_name
echo FROM "Metric" m
echo WHERE m.timestamp ^> NOW(^) - INTERVAL '24 hours'
echo ORDER BY m.timestamp DESC;
echo.
echo -- 2. Work Center Status Summary
echo CREATE OR REPLACE VIEW dashboard_workcenter_status AS
echo SELECT 
echo     wc.id,
echo     wc.name,
echo     wc.code,
echo     a.name as area_name,
echo     s.name as site_name,
echo     COUNT(DISTINCT po.id^) as active_orders,
echo     COUNT(DISTINCT kpi.id^) as kpi_records
echo FROM "WorkCenter" wc
echo LEFT JOIN "Area" a ON wc."areaId" = a.id
echo LEFT JOIN "Site" s ON a."siteId" = s.id
echo LEFT JOIN "ProductionOrder" po ON wc.id = po."workCenterId" AND po.status = 'active'
echo LEFT JOIN "WorkCenterKPISummary" kpi ON wc.id = kpi."workCenterId"
echo GROUP BY wc.id, wc.name, wc.code, a.name, s.name;
echo.
echo -- 3. Production Data Summary (Monthly View^)
echo CREATE OR REPLACE VIEW dashboard_production_summary AS
echo SELECT 
echo     pd.id,
echo     pd.month,
echo     pd.year,
echo     pd.actual,
echo     pd.target,
echo     ROUND((pd.actual::float / NULLIF(pd.target, 0^)^) * 100, 2^) as achievement_percentage,
echo     pd."createdAt",
echo     pd."updatedAt"
echo FROM "ProductionData" pd
echo ORDER BY pd.year DESC, pd.month DESC;
echo.
echo -- 4. Alert Summary View (Using title instead of name^)
echo CREATE OR REPLACE VIEW dashboard_alert_summary AS
echo SELECT 
echo     a.id,
echo     a.title as alert_title,
echo     a."alertType",
echo     a.severity,
echo     a.status,
echo     a."createdAt",
echo     a."acknowledgedAt",
echo     a.message,
echo     u.name as acknowledged_by
echo FROM "Alert" a
echo LEFT JOIN "User" u ON a."acknowledgedBy" = u.id
echo WHERE a."createdAt" ^> NOW(^) - INTERVAL '7 days'
echo ORDER BY a."createdAt" DESC;
echo.
echo -- 5. KPI Summary View
echo CREATE OR REPLACE VIEW dashboard_kpi_summary AS
echo SELECT 
echo     'Total Work Centers' as kpi_name,
echo     COUNT(DISTINCT id^) as value,
echo     'count' as unit
echo FROM "WorkCenter"
echo UNION ALL
echo SELECT 
echo     'Active Alerts' as kpi_name,
echo     COUNT(*^) as value,
echo     'count' as unit
echo FROM "Alert"
echo WHERE status = 'active'
echo UNION ALL
echo SELECT 
echo     'Active Production Orders' as kpi_name,
echo     COUNT(*^) as value,
echo     'count' as unit
echo FROM "ProductionOrder"
echo WHERE status = 'active'
echo UNION ALL
echo SELECT 
echo     'Total Metrics (24h^)' as kpi_name,
echo     COUNT(*^) as value,
echo     'count' as unit
echo FROM "Metric"
echo WHERE timestamp ^> NOW(^) - INTERVAL '24 hours';
echo.
echo -- 6. Work Center KPI Summary (Using periodStart/periodEnd^)
echo CREATE OR REPLACE VIEW dashboard_workcenter_kpi AS
echo SELECT 
echo     wc.name as workcenter_name,
echo     kpi."periodStart",
echo     kpi."periodEnd",
echo     kpi.oee,
echo     kpi.availability,
echo     kpi.performance,
echo     kpi.quality,
echo     kpi."productionCount",
echo     kpi."scrapRate",
echo     kpi."energyConsumption",
echo     kpi."updatedAt"
echo FROM "WorkCenterKPISummary" kpi
echo JOIN "WorkCenter" wc ON kpi."workCenterId" = wc.id
echo WHERE kpi."periodEnd" ^> NOW(^) - INTERVAL '7 days'
echo ORDER BY kpi."updatedAt" DESC;
echo.
echo -- 7. Site Overview (Without timezone^)
echo CREATE OR REPLACE VIEW dashboard_site_overview AS
echo SELECT 
echo     s.id,
echo     s.name as site_name,
echo     s.location,
echo     s.code as site_code,
echo     COUNT(DISTINCT a.id^) as area_count,
echo     COUNT(DISTINCT wc.id^) as workcenter_count,
echo     e.name as enterprise_name
echo FROM "Site" s
echo LEFT JOIN "Enterprise" e ON s."enterpriseId" = e.id
echo LEFT JOIN "Area" a ON s.id = a."siteId"
echo LEFT JOIN "WorkCenter" wc ON a.id = wc."areaId"
echo GROUP BY s.id, s.name, s.location, s.code, e.name;
echo.
echo -- 8. Recent Quality Metrics
echo CREATE OR REPLACE VIEW dashboard_quality_metrics AS
echo SELECT 
echo     qm.id,
echo     qm.parameter,
echo     qm.value,
echo     qm.uom as unit,
echo     qm."isWithinSpec",
echo     qm."isInControl",
echo     qm.timestamp,
echo     qm."batchNumber",
echo     qm.inspector,
echo     qm.shift
echo FROM "QualityMetric" qm
echo WHERE qm.timestamp ^> NOW(^) - INTERVAL '24 hours'
echo ORDER BY qm.timestamp DESC
echo LIMIT 100;
echo.
echo -- 9. Production Orders Overview
echo CREATE OR REPLACE VIEW dashboard_production_orders AS
echo SELECT 
echo     po.id,
echo     po."orderNumber",
echo     po.product,
echo     po.quantity,
echo     po.status,
echo     po.priority,
echo     po."targetStartDate",
echo     po."targetEndDate",
echo     po."actualStartDate",
echo     po."actualEndDate",
echo     wc.name as workcenter_name,
echo     CASE 
echo         WHEN po."actualEndDate" IS NOT NULL THEN 
echo             EXTRACT(EPOCH FROM (po."actualEndDate" - po."actualStartDate"^)^) / 3600
echo         ELSE NULL 
echo     END as actual_duration_hours
echo FROM "ProductionOrder" po
echo JOIN "WorkCenter" wc ON po."workCenterId" = wc.id
echo ORDER BY po."createdAt" DESC;
echo.
echo -- Grant permissions
echo GRANT SELECT ON ALL TABLES IN SCHEMA public TO postgres;
echo GRANT SELECT ON dashboard_metrics_realtime TO postgres;
echo GRANT SELECT ON dashboard_workcenter_status TO postgres;
echo GRANT SELECT ON dashboard_production_summary TO postgres;
echo GRANT SELECT ON dashboard_alert_summary TO postgres;
echo GRANT SELECT ON dashboard_kpi_summary TO postgres;
echo GRANT SELECT ON dashboard_workcenter_kpi TO postgres;
echo GRANT SELECT ON dashboard_site_overview TO postgres;
echo GRANT SELECT ON dashboard_quality_metrics TO postgres;
echo GRANT SELECT ON dashboard_production_orders TO postgres;
) > dashboard_views_corrected.sql

REM Execute the SQL
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < dashboard_views_corrected.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Dashboard views created successfully!
    echo.
    echo Available views:
    echo - dashboard_metrics_realtime: Real-time metrics data
    echo - dashboard_workcenter_status: Work center status overview
    echo - dashboard_production_summary: Monthly production data
    echo - dashboard_alert_summary: Recent alerts with titles
    echo - dashboard_kpi_summary: Key performance indicators
    echo - dashboard_workcenter_kpi: Work center KPI with date ranges
    echo - dashboard_site_overview: Site hierarchy overview
    echo - dashboard_quality_metrics: Recent quality measurements
    echo - dashboard_production_orders: Production orders with durations
    echo.
    echo These views now match your actual database schema and should
    echo work correctly with your dashboard queries.
) else (
    echo.
    echo ❌ Error creating views. Please check your database connection.
)

REM Clean up
del dashboard_views_corrected.sql

echo.
pause