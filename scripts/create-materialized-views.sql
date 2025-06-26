-- Create Materialized Views for ISO 22400 Compliance

-- OEE Daily View
CREATE MATERIALIZED VIEW IF NOT EXISTS view_oee_daily AS
SELECT
  EXTRACT(EPOCH FROM date_trunc('day', p.start_time))::INT / 86400 AS date_id,
  p.shift_id,
  p.equipment_id,
  -- Availability
  CASE WHEN SUM(p.operating_time) = 0 THEN 0
       ELSE (SUM(p.operating_time) - COALESCE(SUM(d.downtime_duration), 0))::FLOAT / SUM(p.operating_time)
  END AS availability,
  -- Performance
  CASE WHEN SUM(p.planned_production_time) = 0 OR MAX(e.theoretical_rate) = 0 THEN 0
       ELSE (SUM(p.total_parts_produced)::FLOAT * 3600) / (SUM(p.operating_time) * MAX(e.theoretical_rate))
  END AS performance,
  -- Quality
  CASE WHEN SUM(p.total_parts_produced) = 0 THEN 0
       ELSE SUM(p.good_parts)::FLOAT / SUM(p.total_parts_produced)
  END AS quality,
  -- OEE
  CASE WHEN SUM(p.operating_time) = 0 OR SUM(p.planned_production_time) = 0 OR SUM(p.total_parts_produced) = 0 THEN 0
       ELSE 
         ((SUM(p.operating_time) - COALESCE(SUM(d.downtime_duration), 0))::FLOAT / SUM(p.operating_time)) *
         ((SUM(p.total_parts_produced)::FLOAT * 3600) / (SUM(p.operating_time) * NULLIF(MAX(e.theoretical_rate), 0))) *
         (SUM(p.good_parts)::FLOAT / SUM(p.total_parts_produced))
  END AS oee
FROM fact_production p
LEFT JOIN fact_downtime d ON p.production_id = d.production_id
JOIN dim_equipment e ON p.equipment_id = e.equipment_id
GROUP BY 1, 2, 3;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_view_oee_daily_pk 
ON view_oee_daily(date_id, shift_id, equipment_id);

-- Reliability Summary View
CREATE MATERIALIZED VIEW IF NOT EXISTS view_reliability_summary AS
WITH maintenance_stats AS (
  SELECT 
    equipment_id,
    date_trunc('month', start_time) AS period_start,
    COUNT(*) AS failure_count,
    SUM(EXTRACT(EPOCH FROM (end_time - start_time))) AS total_downtime_seconds
  FROM fact_maintenance
  WHERE maintenance_type IN ('Corrective', 'Emergency')
  GROUP BY equipment_id, date_trunc('month', start_time)
),
operating_stats AS (
  SELECT 
    equipment_id,
    date_trunc('month', start_time) AS period_start,
    SUM(operating_time) AS total_operating_seconds
  FROM fact_production
  GROUP BY equipment_id, date_trunc('month', start_time)
)
SELECT 
  COALESCE(m.equipment_id, o.equipment_id) AS equipment_id,
  COALESCE(m.period_start, o.period_start) AS period_start,
  (COALESCE(m.period_start, o.period_start) + INTERVAL '1 month' - INTERVAL '1 day')::DATE AS period_end,
  COALESCE(m.failure_count, 0) AS total_failures,
  COALESCE(m.total_downtime_seconds, 0)::BIGINT AS total_downtime,
  -- MTBF (hours)
  CASE WHEN COALESCE(m.failure_count, 0) > 0 
       THEN (COALESCE(o.total_operating_seconds, 0) / m.failure_count / 3600.0)::FLOAT
       ELSE NULL 
  END AS mtbf,
  -- MTTR (hours)
  CASE WHEN COALESCE(m.failure_count, 0) > 0 
       THEN (m.total_downtime_seconds / m.failure_count / 3600.0)::FLOAT
       ELSE NULL 
  END AS mttr,
  -- Availability
  CASE WHEN (COALESCE(o.total_operating_seconds, 0) + COALESCE(m.total_downtime_seconds, 0)) > 0
       THEN COALESCE(o.total_operating_seconds, 0)::FLOAT / 
             (COALESCE(o.total_operating_seconds, 0) + COALESCE(m.total_downtime_seconds, 0))
       ELSE 1.0 
  END AS availability
FROM maintenance_stats m
FULL OUTER JOIN operating_stats o 
  ON m.equipment_id = o.equipment_id AND m.period_start = o.period_start;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_view_reliability_pk 
ON view_reliability_summary(equipment_id, period_start);

-- Scrap Summary View
CREATE MATERIALIZED VIEW IF NOT EXISTS view_scrap_summary AS
SELECT 
  s.product_id,
  s.scrap_code,
  date_trunc('month', p.start_time) AS period_start,
  (date_trunc('month', p.start_time) + INTERVAL '1 month' - INTERVAL '1 day')::DATE AS period_end,
  SUM(s.scrap_qty) AS total_scrap,
  SUM(COALESCE(s.scrap_cost, 0)) AS scrap_cost,
  CASE WHEN SUM(p.total_parts_produced) > 0 
       THEN SUM(s.scrap_qty)::FLOAT / SUM(p.total_parts_produced)
       ELSE 0 
  END AS scrap_rate
FROM fact_scrap s
JOIN fact_production p ON s.production_id = p.production_id
GROUP BY s.product_id, s.scrap_code, date_trunc('month', p.start_time);

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_view_scrap_pk 
ON view_scrap_summary(product_id, scrap_code, period_start);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_all_views() RETURNS void AS $$
BEGIN
  -- Refresh with CONCURRENTLY to avoid blocking
  REFRESH MATERIALIZED VIEW CONCURRENTLY view_oee_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY view_reliability_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY view_scrap_summary;
  
  -- Log the refresh
  INSERT INTO audit_log(username, action, table_name, record_id, after_data)
  VALUES(
    current_user,
    'REFRESH',
    'materialized_views',
    'all',
    jsonb_build_object(
      'timestamp', CURRENT_TIMESTAMP,
      'views_refreshed', ARRAY['view_oee_daily', 'view_reliability_summary', 'view_scrap_summary']
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Refresh views immediately
SELECT refresh_all_views();