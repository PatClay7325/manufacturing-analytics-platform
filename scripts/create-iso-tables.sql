-- Create ISO-compliant tables that are missing from Prisma schema

-- 1. Create refresh_date_ranges function if not exists
CREATE OR REPLACE FUNCTION refresh_date_ranges() RETURNS void AS $$
BEGIN
  DELETE FROM dim_date_range;
  INSERT INTO dim_date_range(name, start_date, end_date)
  VALUES
    ('Today', CURRENT_DATE, CURRENT_DATE),
    ('Yesterday', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day'),
    ('This Week', date_trunc('week', CURRENT_DATE)::date, CURRENT_DATE),
    ('Last Week', date_trunc('week', CURRENT_DATE - INTERVAL '1 week')::date, 
                  date_trunc('week', CURRENT_DATE)::date - INTERVAL '1 day'),
    ('MTD', date_trunc('month', CURRENT_DATE)::date, CURRENT_DATE),
    ('Last Month', date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::date,
                   date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 day'),
    ('QTD', date_trunc('quarter', CURRENT_DATE)::date, CURRENT_DATE),
    ('YTD', date_trunc('year', CURRENT_DATE)::date, CURRENT_DATE),
    ('Last 7 days', CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE),
    ('Last 30 days', CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE),
    ('Last 90 days', CURRENT_DATE - INTERVAL '89 days', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- 2. Create OEE materialized view if not exists
DROP MATERIALIZED VIEW IF EXISTS view_oee_daily CASCADE;
CREATE MATERIALIZED VIEW view_oee_daily AS
WITH production_summary AS (
  SELECT 
    DATE(p.start_time) as date_id,
    p.shift_id,
    p.equipment_id,
    SUM(EXTRACT(EPOCH FROM (p.end_time - p.start_time))) as total_time,
    SUM(p.good_parts) as good_parts,
    SUM(p.total_parts_produced) as total_parts,
    SUM(p.planned_parts) as planned_parts
  FROM fact_production p
  GROUP BY 1, 2, 3
),
downtime_summary AS (
  SELECT 
    DATE(d.start_time) as date_id,
    d.equipment_id,
    SUM(EXTRACT(EPOCH FROM (d.end_time - d.start_time))) as downtime_seconds
  FROM fact_downtime d
  GROUP BY 1, 2
)
SELECT 
  ps.date_id,
  ps.shift_id,
  ps.equipment_id,
  -- Availability = (Total Time - Downtime) / Total Time
  CASE 
    WHEN ps.total_time = 0 THEN 0
    ELSE (ps.total_time - COALESCE(ds.downtime_seconds, 0)) / ps.total_time
  END::NUMERIC(5,4) as availability,
  -- Performance = Actual Production / Planned Production
  CASE 
    WHEN ps.planned_parts = 0 THEN 0
    ELSE ps.total_parts::NUMERIC / ps.planned_parts
  END::NUMERIC(5,4) as performance,
  -- Quality = Good Parts / Total Parts
  CASE 
    WHEN ps.total_parts = 0 THEN 0
    ELSE ps.good_parts::NUMERIC / ps.total_parts
  END::NUMERIC(5,4) as quality,
  -- OEE = Availability × Performance × Quality
  CASE 
    WHEN ps.total_time = 0 OR ps.planned_parts = 0 OR ps.total_parts = 0 THEN 0
    ELSE ((ps.total_time - COALESCE(ds.downtime_seconds, 0)) / ps.total_time) *
         (ps.total_parts::NUMERIC / ps.planned_parts) *
         (ps.good_parts::NUMERIC / ps.total_parts)
  END::NUMERIC(5,4) as oee
FROM production_summary ps
LEFT JOIN downtime_summary ds 
  ON ps.date_id = ds.date_id 
  AND ps.equipment_id = ds.equipment_id;

-- Create index for performance
CREATE INDEX idx_view_oee_daily_date ON view_oee_daily(date_id);
CREATE INDEX idx_view_oee_daily_equipment ON view_oee_daily(equipment_id);

-- 3. Create reliability summary view
DROP MATERIALIZED VIEW IF EXISTS view_reliability_summary CASCADE;
CREATE MATERIALIZED VIEW view_reliability_summary AS
WITH mtbf_calc AS (
  SELECT 
    equipment_id,
    COUNT(*) as failure_count,
    EXTRACT(EPOCH FROM (MAX(start_time) - MIN(start_time))) / 3600 as operating_hours
  FROM fact_downtime
  WHERE reason_id IN (SELECT reason_id FROM dim_downtime_reason WHERE is_failure = true)
  GROUP BY equipment_id
),
mttr_calc AS (
  SELECT 
    equipment_id,
    AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) as avg_repair_hours
  FROM fact_maintenance
  WHERE maintenance_type = 'Corrective'
  GROUP BY equipment_id
)
SELECT 
  e.equipment_id,
  e.equipment_code,
  e.equipment_name,
  COALESCE(m1.operating_hours / NULLIF(m1.failure_count, 0), 0) as mtbf_hours,
  COALESCE(m2.avg_repair_hours, 0) as mttr_hours,
  m1.failure_count
FROM dim_equipment e
LEFT JOIN mtbf_calc m1 ON e.equipment_id = m1.equipment_id
LEFT JOIN mttr_calc m2 ON e.equipment_id = m2.equipment_id;

-- 4. Create scrap summary view
DROP MATERIALIZED VIEW IF EXISTS view_scrap_summary CASCADE;
CREATE MATERIALIZED VIEW view_scrap_summary AS
SELECT 
  DATE(s.created_at) as date_id,
  p.equipment_id,
  p.product_id,
  s.scrap_code,
  dr.reason_description as scrap_reason,
  SUM(s.scrap_qty) as total_scrap_qty,
  COUNT(*) as scrap_incidents,
  SUM(s.scrap_qty * pr.standard_cost) as scrap_cost
FROM fact_scrap s
JOIN fact_production p ON s.production_id = p.production_id
JOIN dim_product pr ON p.product_id = pr.product_id
LEFT JOIN dim_downtime_reason dr ON s.scrap_code = dr.reason_code
GROUP BY 1, 2, 3, 4, 5;

-- 5. Add missing audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(username, action, table_name, record_id, log_ts, before_data)
    VALUES(current_user, TG_OP, TG_TABLE_NAME, OLD.id, now(), to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(username, action, table_name, record_id, log_ts, before_data, after_data)
    VALUES(current_user, TG_OP, TG_TABLE_NAME, NEW.id, now(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(username, action, table_name, record_id, log_ts, after_data)
    VALUES(current_user, TG_OP, TG_TABLE_NAME, NEW.id, now(), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Refresh all materialized views
REFRESH MATERIALIZED VIEW view_oee_daily;
REFRESH MATERIALIZED VIEW view_reliability_summary;
REFRESH MATERIALIZED VIEW view_scrap_summary;