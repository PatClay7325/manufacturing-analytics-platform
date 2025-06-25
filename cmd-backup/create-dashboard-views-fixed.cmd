@echo off
echo ===============================================
echo Creating Dashboard Views from Existing Schema
echo ===============================================
echo.

echo Creating views from your hierarchical manufacturing data...
echo.

REM Create SQL for views based on actual schema
(
echo -- Dashboard Views for Manufacturing Analytics Platform
echo -- Based on actual hierarchical schema
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
echo -- 3. Production Summary by Work Center
echo CREATE OR REPLACE VIEW dashboard_production_summary AS
echo SELECT 
echo     DATE_TRUNC('hour', pd.timestamp^) as hour,
echo     wc.name as workcenter_name,
echo     COUNT(*^) as data_points,
echo     SUM(pd."actualQuantity"^) as total_quantity,
echo     SUM(pd."goodQuantity"^) as good_quantity,
echo     SUM(pd."scrapQuantity"^) as scrap_quantity,
echo     ROUND(AVG(CASE WHEN pd."goodQuantity" ^> 0 
echo                    THEN pd."goodQuantity"::float / pd."actualQuantity" * 100 
echo                    ELSE 0 END^), 2^) as quality_rate
echo FROM "ProductionData" pd
echo JOIN "ProductionOrder" po ON pd."productionOrderId" = po.id
echo JOIN "WorkCenter" wc ON po."workCenterId" = wc.id
echo WHERE pd.timestamp ^> NOW(^) - INTERVAL '7 days'
echo GROUP BY DATE_TRUNC('hour', pd.timestamp^), wc.name
echo ORDER BY hour DESC;
echo.
echo -- 4. Alert Summary View
echo CREATE OR REPLACE VIEW dashboard_alert_summary AS
echo SELECT 
echo     a.id,
echo     a.name as alert_name,
echo     a.severity,
echo     a.status,
echo     a."createdAt",
echo     a."acknowledgedAt",
echo     a.description,
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
echo -- 6. Work Center KPI Summary
echo CREATE OR REPLACE VIEW dashboard_workcenter_kpi AS
echo SELECT 
echo     wc.name as workcenter_name,
echo     kpi.period,
echo     kpi.oee,
echo     kpi.availability,
echo     kpi.performance,
echo     kpi.quality,
echo     kpi."totalUnits",
echo     kpi."goodUnits",
echo     kpi."defectiveUnits",
echo     kpi."updatedAt"
echo FROM "WorkCenterKPISummary" kpi
echo JOIN "WorkCenter" wc ON kpi."workCenterId" = wc.id
echo WHERE kpi.period = 'daily'
echo   AND kpi."updatedAt" ^> NOW(^) - INTERVAL '7 days'
echo ORDER BY kpi."updatedAt" DESC;
echo.
echo -- 7. Site Overview
echo CREATE OR REPLACE VIEW dashboard_site_overview AS
echo SELECT 
echo     s.id,
echo     s.name as site_name,
echo     s.location,
echo     s."timeZone",
echo     COUNT(DISTINCT a.id^) as area_count,
echo     COUNT(DISTINCT wc.id^) as workcenter_count,
echo     e.name as enterprise_name
echo FROM "Site" s
echo LEFT JOIN "Enterprise" e ON s."enterpriseId" = e.id
echo LEFT JOIN "Area" a ON s.id = a."siteId"
echo LEFT JOIN "WorkCenter" wc ON a.id = wc."areaId"
echo GROUP BY s.id, s.name, s.location, s."timeZone", e.name;
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
) > dashboard_views_fixed.sql

REM Execute the SQL
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < dashboard_views_fixed.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Dashboard views created successfully!
    echo.
    echo Available views:
    echo - dashboard_metrics_realtime: Real-time metrics data
    echo - dashboard_workcenter_status: Work center status overview
    echo - dashboard_production_summary: Hourly production metrics
    echo - dashboard_alert_summary: Recent alerts
    echo - dashboard_kpi_summary: Key performance indicators
    echo - dashboard_workcenter_kpi: Work center KPI details
    echo - dashboard_site_overview: Site hierarchy overview
    echo.
    echo These views are optimized for dashboard queries and match
    echo your hierarchical manufacturing data model.
) else (
    echo.
    echo ❌ Error creating views. Please check your database connection.
)

REM Clean up
del dashboard_views_fixed.sql

echo.
pause