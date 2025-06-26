-- =============================================================================
-- MATERIALIZED VIEWS FOR ISO-COMPLIANT ANALYTICS
-- =============================================================================
-- Purpose: Pre-aggregated views for OEE, Reliability, and Scrap analysis
-- Performance: Refreshed nightly via scheduled jobs
-- =============================================================================

-- 1. Daily OEE View (ISO 22400 compliant)
CREATE MATERIALIZED VIEW IF NOT EXISTS view_oee_daily AS
SELECT
  p.date_id,
  p.shift_id,
  p.equipment_id,
  e.code as equipment_code,
  e.name as equipment_name,
  wc.code as work_center_code,
  wc.name as work_center_name,
  a.code as area_code,
  a.name as area_name,
  s.code as site_code,
  s.name as site_name,
  sh.name as shift_name,
  
  -- Availability = (Operating Time - Downtime) / Operating Time
  CASE 
    WHEN SUM(p.operating_time) = 0 THEN 0
    ELSE (SUM(p.operating_time) - COALESCE(SUM(d.downtime_duration), 0))::numeric / 
         SUM(p.operating_time)::numeric 
  END AS availability,
  
  -- Performance = Actual Production / Theoretical Production
  CASE 
    WHEN SUM(p.planned_production_time) = 0 OR e.theoretical_rate IS NULL THEN 0
    ELSE SUM(p.total_parts_produced)::numeric / 
         (SUM(p.planned_production_time)::numeric / 3600 * e.theoretical_rate)
  END AS performance,
  
  -- Quality = Good Parts / Total Parts
  CASE 
    WHEN SUM(p.total_parts_produced) = 0 THEN 0
    ELSE SUM(p.good_parts)::numeric / SUM(p.total_parts_produced)::numeric
  END AS quality,
  
  -- OEE = Availability × Performance × Quality
  CASE 
    WHEN SUM(p.operating_time) = 0 OR SUM(p.total_parts_produced) = 0 THEN 0
    ELSE 
      ((SUM(p.operating_time) - COALESCE(SUM(d.downtime_duration), 0))::numeric / 
       SUM(p.operating_time)::numeric) *
      (CASE 
         WHEN SUM(p.planned_production_time) = 0 OR e.theoretical_rate IS NULL THEN 0
         ELSE SUM(p.total_parts_produced)::numeric / 
              (SUM(p.planned_production_time)::numeric / 3600 * e.theoretical_rate)
       END) *
      (SUM(p.good_parts)::numeric / SUM(p.total_parts_produced)::numeric)
  END AS oee,
  
  -- Additional metrics
  SUM(p.total_parts_produced) as total_parts,
  SUM(p.good_parts) as good_parts,
  SUM(p.scrap_parts) as scrap_parts,
  SUM(p.operating_time) as operating_time_seconds,
  COALESCE(SUM(d.downtime_duration), 0) as downtime_seconds,
  COUNT(DISTINCT p.production_id) as production_runs
  
FROM fact_production p
JOIN dim_equipment e ON p.equipment_id = e.equipment_id
JOIN dim_work_center wc ON e.work_center_id = wc.work_center_id
JOIN dim_area a ON wc.area_id = a.area_id
JOIN dim_site s ON a.site_id = s.site_id
JOIN dim_shift sh ON p.shift_id = sh.shift_id
LEFT JOIN fact_downtime d ON p.production_id = d.production_id
GROUP BY 
  p.date_id, p.shift_id, p.equipment_id, 
  e.code, e.name, e.theoretical_rate,
  wc.code, wc.name, a.code, a.name, 
  s.code, s.name, sh.name;

-- Create indexes for performance
CREATE INDEX idx_view_oee_daily_date ON view_oee_daily(date_id);
CREATE INDEX idx_view_oee_daily_equipment ON view_oee_daily(equipment_id);
CREATE INDEX idx_view_oee_daily_oee ON view_oee_daily(oee);

-- 2. Reliability Summary View (ISO 14224 compliant)
CREATE MATERIALIZED VIEW IF NOT EXISTS view_reliability_summary AS
WITH downtime_analysis AS (
  SELECT
    d.equipment_id,
    d.reason_id,
    dr.code as reason_code,
    dr.description as reason_description,
    dr.category as reason_category,
    dr.is_planned,
    COUNT(*) as failure_count,
    SUM(d.downtime_duration) as total_downtime_seconds,
    AVG(d.downtime_duration) as avg_downtime_seconds,
    MAX(d.downtime_duration) as max_downtime_seconds,
    MIN(d.downtime_duration) as min_downtime_seconds
  FROM fact_downtime d
  JOIN dim_downtime_reason dr ON d.reason_id = dr.reason_id
  WHERE dr.is_planned = false  -- Only unplanned downtime for MTBF
  GROUP BY d.equipment_id, d.reason_id, dr.code, dr.description, dr.category, dr.is_planned
),
equipment_operating_time AS (
  SELECT
    equipment_id,
    SUM(operating_time) as total_operating_seconds
  FROM fact_production
  GROUP BY equipment_id
)
SELECT
  e.equipment_id,
  e.code as equipment_code,
  e.name as equipment_name,
  e.type as equipment_type,
  e.criticality_level,
  wc.code as work_center_code,
  wc.name as work_center_name,
  
  -- MTBF (Mean Time Between Failures) in hours
  CASE 
    WHEN COALESCE(SUM(da.failure_count), 0) = 0 THEN NULL
    ELSE (eot.total_operating_seconds / 3600.0) / SUM(da.failure_count)
  END as mtbf_hours,
  
  -- MTTR (Mean Time To Repair) in hours
  CASE 
    WHEN COALESCE(SUM(da.failure_count), 0) = 0 THEN NULL
    ELSE SUM(da.total_downtime_seconds) / SUM(da.failure_count) / 3600.0
  END as mttr_hours,
  
  -- Availability based on uptime
  CASE 
    WHEN eot.total_operating_seconds = 0 THEN 0
    ELSE (eot.total_operating_seconds - COALESCE(SUM(da.total_downtime_seconds), 0))::numeric / 
         eot.total_operating_seconds::numeric * 100
  END as availability_percentage,
  
  -- Failure metrics
  COALESCE(SUM(da.failure_count), 0) as total_failures,
  COALESCE(SUM(da.total_downtime_seconds) / 3600.0, 0) as total_downtime_hours,
  
  -- Top failure reason
  (
    SELECT dr2.description 
    FROM downtime_analysis da2 
    JOIN dim_downtime_reason dr2 ON da2.reason_id = dr2.reason_id
    WHERE da2.equipment_id = e.equipment_id 
    ORDER BY da2.total_downtime_seconds DESC 
    LIMIT 1
  ) as top_failure_reason

FROM dim_equipment e
JOIN dim_work_center wc ON e.work_center_id = wc.work_center_id
LEFT JOIN equipment_operating_time eot ON e.equipment_id = eot.equipment_id
LEFT JOIN downtime_analysis da ON e.equipment_id = da.equipment_id
WHERE e.is_active = true
GROUP BY 
  e.equipment_id, e.code, e.name, e.type, e.criticality_level,
  wc.code, wc.name, eot.total_operating_seconds;

-- Create indexes
CREATE INDEX idx_view_reliability_equipment ON view_reliability_summary(equipment_id);
CREATE INDEX idx_view_reliability_mtbf ON view_reliability_summary(mtbf_hours);
CREATE INDEX idx_view_reliability_criticality ON view_reliability_summary(criticality_level);

-- 3. Scrap Summary View (ISO 9001 compliant)
CREATE MATERIALIZED VIEW IF NOT EXISTS view_scrap_summary AS
SELECT
  s.product_id,
  pr.code as product_code,
  pr.name as product_name,
  pr.family as product_family,
  e.equipment_id,
  e.code as equipment_code,
  e.name as equipment_name,
  wc.code as work_center_code,
  wc.name as work_center_name,
  s.scrap_code,
  
  -- Aggregated metrics
  COUNT(*) as scrap_occurrences,
  SUM(s.scrap_qty) as total_scrap_qty,
  AVG(s.scrap_qty) as avg_scrap_qty,
  SUM(s.scrap_cost) as total_scrap_cost,
  
  -- Quality metrics
  (
    SELECT SUM(p2.total_parts_produced)
    FROM fact_production p2
    WHERE p2.product_id = s.product_id 
    AND p2.equipment_id = e.equipment_id
  ) as total_produced,
  
  -- Scrap rate
  CASE 
    WHEN (
      SELECT SUM(p2.total_parts_produced)
      FROM fact_production p2
      WHERE p2.product_id = s.product_id 
      AND p2.equipment_id = e.equipment_id
    ) = 0 THEN 0
    ELSE SUM(s.scrap_qty)::numeric / (
      SELECT SUM(p2.total_parts_produced)
      FROM fact_production p2
      WHERE p2.product_id = s.product_id 
      AND p2.equipment_id = e.equipment_id
    )::numeric * 100
  END as scrap_rate_percentage,
  
  -- Time range
  MIN(s.created_at) as first_occurrence,
  MAX(s.created_at) as last_occurrence
  
FROM fact_scrap s
JOIN fact_production p ON s.production_id = p.production_id
JOIN dim_product pr ON s.product_id = pr.product_id
JOIN dim_equipment e ON p.equipment_id = e.equipment_id
JOIN dim_work_center wc ON e.work_center_id = wc.work_center_id
GROUP BY 
  s.product_id, pr.code, pr.name, pr.family,
  e.equipment_id, e.code, e.name,
  wc.code, wc.name, s.scrap_code;

-- Create indexes
CREATE INDEX idx_view_scrap_product ON view_scrap_summary(product_id);
CREATE INDEX idx_view_scrap_equipment ON view_scrap_summary(equipment_id);
CREATE INDEX idx_view_scrap_rate ON view_scrap_summary(scrap_rate_percentage);

-- 4. Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_views() RETURNS void AS $$
BEGIN
  -- Refresh with CONCURRENTLY to avoid locking
  REFRESH MATERIALIZED VIEW CONCURRENTLY view_oee_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY view_reliability_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY view_scrap_summary;
  
  -- Log the refresh
  INSERT INTO system_metrics(metric_type, metric_name, metric_value, metric_unit, service_name)
  VALUES ('maintenance', 'views_refreshed', 1, 'count', 'materialized_view_refresh');
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON view_oee_daily TO PUBLIC;
GRANT SELECT ON view_reliability_summary TO PUBLIC;
GRANT SELECT ON view_scrap_summary TO PUBLIC;