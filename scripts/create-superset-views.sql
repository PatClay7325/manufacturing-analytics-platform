-- =====================================================
-- CREATE VIEWS FOR APACHE SUPERSET DASHBOARDS
-- These views provide optimized access patterns for
-- dashboard creation and real-time monitoring
-- =====================================================

-- Real-time Production Dashboard View
CREATE OR REPLACE VIEW v_realtime_production AS
SELECT 
    d.date,
    t.time_string,
    s.shift_name,
    e.equipment_code,
    e.equipment_name,
    e.equipment_type,
    p.product_code,
    p.product_name,
    fp.planned_production_time / 3600.0 as planned_hours,
    fp.operating_time / 3600.0 as operating_hours,
    fp.total_parts_produced,
    fp.good_parts,
    fp.total_parts_produced - fp.good_parts as reject_parts,
    ROUND((fp.good_parts::NUMERIC / NULLIF(fp.total_parts_produced, 0)) * 100, 2) as quality_rate,
    fp.cycle_time_actual,
    fp.cycle_time_standard,
    fp.speed_rate,
    fp.operator_id,
    fp.work_order,
    fp.created_at
FROM fact_production fp
JOIN dim_date d ON fp.date_id = d.date_id
JOIN dim_time t ON fp.time_id = t.time_id
JOIN dim_shift s ON fp.shift_id = s.shift_id
JOIN dim_equipment e ON fp.equipment_id = e.equipment_id
JOIN dim_product p ON fp.product_id = p.product_id
WHERE d.date >= CURRENT_DATE - INTERVAL '7 days';

-- Equipment Status Overview
CREATE OR REPLACE VIEW v_equipment_status AS
WITH latest_production AS (
    SELECT DISTINCT ON (equipment_id)
        equipment_id,
        date_id,
        time_id,
        created_at
    FROM fact_production
    ORDER BY equipment_id, created_at DESC
),
recent_metrics AS (
    SELECT 
        equipment_id,
        AVG(oee) as avg_oee,
        AVG(availability) as avg_availability,
        AVG(performance) as avg_performance,
        AVG(quality) as avg_quality
    FROM view_oee_daily
    WHERE date_id >= TO_CHAR(CURRENT_DATE - INTERVAL '7 days', 'YYYYMMDD')::INTEGER
    GROUP BY equipment_id
)
SELECT 
    e.equipment_code,
    e.equipment_name,
    e.equipment_type,
    e.location_code,
    e.department,
    CASE 
        WHEN lp.created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 'Running'
        WHEN lp.created_at > CURRENT_TIMESTAMP - INTERVAL '4 hours' THEN 'Idle'
        ELSE 'Stopped'
    END as current_status,
    COALESCE(rm.avg_oee, 0) as oee_7_day_avg,
    COALESCE(rm.avg_availability, 0) as availability_7_day_avg,
    COALESCE(rm.avg_performance, 0) as performance_7_day_avg,
    COALESCE(rm.avg_quality, 0) as quality_7_day_avg,
    lp.created_at as last_activity
FROM dim_equipment e
LEFT JOIN latest_production lp ON e.equipment_id = lp.equipment_id
LEFT JOIN recent_metrics rm ON e.equipment_id = rm.equipment_id
WHERE e.is_active = true;

-- Downtime Analysis View
CREATE OR REPLACE VIEW v_downtime_analysis AS
SELECT 
    d.date,
    e.equipment_code,
    e.equipment_name,
    e.equipment_type,
    dr.reason_code,
    dr.reason_description,
    dr.category_level_1,
    dr.category_level_2,
    dr.category_level_3,
    COUNT(*) as occurrence_count,
    SUM(fd.downtime_duration) / 3600.0 as total_hours,
    AVG(fd.downtime_duration) / 60.0 as avg_minutes,
    MAX(fd.downtime_duration) / 60.0 as max_minutes,
    MIN(fd.downtime_duration) / 60.0 as min_minutes
FROM fact_downtime fd
JOIN dim_date d ON fd.date_id = d.date_id
JOIN dim_equipment e ON fd.equipment_id = e.equipment_id
JOIN dim_downtime_reason dr ON fd.reason_id = dr.reason_id
WHERE d.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY d.date, e.equipment_code, e.equipment_name, e.equipment_type,
         dr.reason_code, dr.reason_description, dr.category_level_1, 
         dr.category_level_2, dr.category_level_3;

-- Quality Metrics View
CREATE OR REPLACE VIEW v_quality_metrics AS
SELECT 
    d.date,
    e.equipment_code,
    e.equipment_name,
    p.product_code,
    p.product_name,
    fq.inspection_type,
    COUNT(*) as inspection_count,
    SUM(fq.sample_size) as total_samples,
    SUM(fq.defects_found) as total_defects,
    ROUND((SUM(fq.defects_found)::NUMERIC / NULLIF(SUM(fq.sample_size), 0)) * 1000000, 2) as dppm,
    ROUND((1 - SUM(fq.defects_found)::NUMERIC / NULLIF(SUM(fq.sample_size), 0)) * 100, 2) as quality_rate
FROM fact_quality fq
JOIN dim_date d ON fq.date_id = d.date_id
JOIN dim_equipment e ON fq.equipment_id = e.equipment_id
JOIN dim_product p ON fq.product_id = p.product_id
WHERE d.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY d.date, e.equipment_code, e.equipment_name, 
         p.product_code, p.product_name, fq.inspection_type;

-- Scrap and Cost Analysis View
CREATE OR REPLACE VIEW v_scrap_analysis AS
SELECT 
    d.date,
    e.equipment_code,
    e.equipment_name,
    p.product_code,
    p.product_name,
    dt.defect_code,
    dt.defect_name,
    dt.defect_category,
    dt.severity_level,
    COUNT(*) as scrap_events,
    SUM(fs.scrap_quantity) as total_quantity,
    SUM(fs.scrap_weight) as total_weight_kg,
    SUM(fs.scrap_cost) as total_cost,
    SUM(CASE WHEN fs.can_rework THEN fs.scrap_quantity ELSE 0 END) as rework_quantity,
    ROUND(AVG(fs.scrap_cost), 2) as avg_cost_per_event
FROM fact_scrap fs
JOIN dim_date d ON fs.date_id = d.date_id
JOIN dim_equipment e ON fs.equipment_id = e.equipment_id
JOIN dim_product p ON fs.product_id = p.product_id
JOIN dim_quality_defect_type dt ON fs.defect_type_id = dt.defect_type_id
WHERE d.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY d.date, e.equipment_code, e.equipment_name, p.product_code, 
         p.product_name, dt.defect_code, dt.defect_name, dt.defect_category, dt.severity_level;

-- Hourly OEE Trend View
CREATE OR REPLACE VIEW v_oee_hourly_trend AS
SELECT 
    d.date,
    EXTRACT(HOUR FROM t.time) as hour,
    e.equipment_code,
    e.equipment_name,
    e.equipment_type,
    AVG(v.oee) as avg_oee,
    AVG(v.availability) as avg_availability,
    AVG(v.performance) as avg_performance,
    AVG(v.quality) as avg_quality,
    SUM(v.total_parts) as total_parts,
    SUM(v.good_parts) as good_parts
FROM view_oee_daily v
JOIN dim_date d ON v.date_id = d.date_id
JOIN dim_equipment e ON v.equipment_id = e.equipment_id
JOIN fact_production fp ON v.date_id = fp.date_id 
    AND v.equipment_id = fp.equipment_id 
    AND v.shift_id = fp.shift_id
JOIN dim_time t ON fp.time_id = t.time_id
WHERE d.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY d.date, EXTRACT(HOUR FROM t.time), e.equipment_code, e.equipment_name, e.equipment_type;

-- Shift Performance Comparison View
CREATE OR REPLACE VIEW v_shift_performance AS
SELECT 
    s.shift_code,
    s.shift_name,
    e.equipment_type,
    COUNT(DISTINCT d.date) as days_worked,
    AVG(v.oee) as avg_oee,
    AVG(v.availability) as avg_availability,
    AVG(v.performance) as avg_performance,
    AVG(v.quality) as avg_quality,
    SUM(v.total_parts) as total_parts_produced,
    SUM(v.good_parts) as total_good_parts,
    SUM(v.downtime) / 3600.0 as total_downtime_hours
FROM view_oee_daily v
JOIN dim_date d ON v.date_id = d.date_id
JOIN dim_shift s ON v.shift_id = s.shift_id
JOIN dim_equipment e ON v.equipment_id = e.equipment_id
WHERE d.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.shift_code, s.shift_name, e.equipment_type;

-- KPI Summary View
CREATE OR REPLACE VIEW v_kpi_summary AS
WITH current_period AS (
    SELECT 
        COUNT(DISTINCT equipment_id) as active_equipment,
        AVG(oee) as current_oee,
        AVG(availability) as current_availability,
        AVG(performance) as current_performance,
        AVG(quality) as current_quality,
        SUM(total_parts) as total_production,
        SUM(good_parts) as good_production
    FROM view_oee_daily
    WHERE date_id = TO_CHAR(CURRENT_DATE, 'YYYYMMDD')::INTEGER
),
mtd_period AS (
    SELECT 
        AVG(oee) as mtd_oee,
        SUM(total_parts) as mtd_production,
        SUM(good_parts) as mtd_good_production,
        SUM(downtime) / 3600.0 as mtd_downtime_hours
    FROM view_oee_daily
    WHERE date_id >= TO_CHAR(date_trunc('month', CURRENT_DATE), 'YYYYMMDD')::INTEGER
),
reliability AS (
    SELECT 
        AVG(mtbf_hours) as avg_mtbf,
        AVG(mttr_hours) as avg_mttr
    FROM view_reliability_summary
    WHERE date_id >= TO_CHAR(CURRENT_DATE - INTERVAL '30 days', 'YYYYMMDD')::INTEGER
)
SELECT 
    cp.active_equipment,
    ROUND(cp.current_oee, 1) as current_oee,
    ROUND(cp.current_availability, 1) as current_availability,
    ROUND(cp.current_performance, 1) as current_performance,
    ROUND(cp.current_quality, 1) as current_quality,
    cp.total_production as today_production,
    cp.good_production as today_good_production,
    ROUND(mp.mtd_oee, 1) as mtd_oee,
    mp.mtd_production,
    mp.mtd_good_production,
    ROUND(mp.mtd_downtime_hours, 1) as mtd_downtime_hours,
    ROUND(r.avg_mtbf, 1) as avg_mtbf_hours,
    ROUND(r.avg_mttr, 1) as avg_mttr_hours
FROM current_period cp
CROSS JOIN mtd_period mp
CROSS JOIN reliability r;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO postgres;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Superset Views Created Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Available views for dashboards:';
    RAISE NOTICE '- v_realtime_production: Real-time production data';
    RAISE NOTICE '- v_equipment_status: Current equipment status';
    RAISE NOTICE '- v_downtime_analysis: Downtime patterns';
    RAISE NOTICE '- v_quality_metrics: Quality and DPPM';
    RAISE NOTICE '- v_scrap_analysis: Scrap costs and trends';
    RAISE NOTICE '- v_oee_hourly_trend: Hourly OEE patterns';
    RAISE NOTICE '- v_shift_performance: Shift comparisons';
    RAISE NOTICE '- v_kpi_summary: Executive KPIs';
    RAISE NOTICE '========================================';
END $$;