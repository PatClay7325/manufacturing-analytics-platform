-- ISO 22400 Master Implementation SQL
-- Based on: ISO-Compliant ERD & Prisma Schema with AI-Ready Enhancements.md
-- Complete implementation with all features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==================== DIMENSION TABLES ====================

-- 1. DimDateRange: Automated Calendar Population
CREATE TABLE IF NOT EXISTS dim_date_range (
  range_id     SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  UNIQUE(name)
);

-- Function to refresh date ranges (from master doc)
CREATE OR REPLACE FUNCTION refresh_date_ranges() RETURNS void AS $$
BEGIN
  DELETE FROM dim_date_range;
  INSERT INTO dim_date_range(name, start_date, end_date)
  VALUES
    ('Today', CURRENT_DATE, CURRENT_DATE),
    ('Yesterday', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day'),
    ('MTD', date_trunc('month', CURRENT_DATE)::date, CURRENT_DATE),
    ('Last 7 days', CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE),
    ('Last 30 days', CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE),
    ('YTD', date_trunc('year', CURRENT_DATE)::date, CURRENT_DATE),
    ('Last Month', date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::date, 
                   date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 day'),
    ('Last Quarter', date_trunc('quarter', CURRENT_DATE - INTERVAL '3 months')::date,
                     date_trunc('quarter', CURRENT_DATE)::date - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- 2. OntologyTerm: Synonym Mapping (from master doc)
CREATE TABLE IF NOT EXISTS ontology_term (
  term        TEXT PRIMARY KEY,
  model_name  TEXT NOT NULL,
  field_name  TEXT NOT NULL,
  priority    INT DEFAULT 0
);

-- Populate initial ontology terms
INSERT INTO ontology_term(term, model_name, field_name, priority)
VALUES
  ('downtime reason', 'DimDowntimeReason', 'reason_description', 10),
  ('OEE', 'ViewOeeDaily', 'oee', 9),
  ('mean time to repair', 'ViewReliabilitySummary', 'mttr', 8),
  ('mean time between failures', 'ViewReliabilitySummary', 'mtbf', 8),
  ('scrap rate', 'ViewScrapSummary', 'scrap_rate', 7),
  ('equipment', 'DimEquipment', 'equipment_name', 7),
  ('shift', 'DimShift', 'shift_name', 6),
  ('product', 'DimProduct', 'product_name', 6),
  ('availability', 'ViewOeeDaily', 'availability', 8),
  ('performance', 'ViewOeeDaily', 'performance', 8),
  ('quality', 'ViewOeeDaily', 'quality', 8)
ON CONFLICT (term) DO UPDATE
  SET model_name = EXCLUDED.model_name,
      field_name = EXCLUDED.field_name,
      priority = EXCLUDED.priority;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ontology_priority ON ontology_term(priority DESC);

-- ==================== CORE DIMENSION TABLES ====================

-- Site dimension
CREATE TABLE IF NOT EXISTS dim_site (
  site_id    SERIAL PRIMARY KEY,
  site_code  VARCHAR(20) UNIQUE NOT NULL,
  site_name  VARCHAR(100) NOT NULL,
  timezone   VARCHAR(50) DEFAULT 'UTC'
);

-- Area dimension
CREATE TABLE IF NOT EXISTS dim_area (
  area_id    SERIAL PRIMARY KEY,
  area_code  VARCHAR(20) NOT NULL,
  area_name  VARCHAR(100) NOT NULL,
  site_id    INT NOT NULL REFERENCES dim_site(site_id),
  UNIQUE(area_code)
);

-- Work Center dimension
CREATE TABLE IF NOT EXISTS dim_work_center (
  work_center_id   SERIAL PRIMARY KEY,
  work_center_code VARCHAR(20) UNIQUE NOT NULL,
  work_center_name VARCHAR(100) NOT NULL,
  area_id          INT NOT NULL REFERENCES dim_area(area_id),
  capacity         DECIMAL(10,2),
  capacity_unit    VARCHAR(20)
);

-- Equipment dimension with JSONB attributes (from master doc)
CREATE TABLE IF NOT EXISTS dim_equipment (
  equipment_id       SERIAL PRIMARY KEY,
  equipment_code     VARCHAR(50) UNIQUE NOT NULL,
  equipment_name     VARCHAR(200) NOT NULL,
  equipment_type     VARCHAR(50),
  work_center_id     INT NOT NULL REFERENCES dim_work_center(work_center_id),
  manufacturer       VARCHAR(100),
  model              VARCHAR(100),
  serial_number      VARCHAR(100),
  installation_date  DATE,
  criticality_level  VARCHAR(20),
  theoretical_rate   DECIMAL(10,2),
  attributes         JSONB, -- Flexible attributes from master doc
  is_active          BOOLEAN DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add JSONB index for attributes (from master doc)
CREATE INDEX IF NOT EXISTS idx_eq_attributes ON dim_equipment USING GIN (attributes);

-- ==================== FACT TABLES ====================

-- 4. FactSensorEvent: High-Volume Partitioning (from master doc)
CREATE TABLE IF NOT EXISTS fact_sensor_event (
  event_id      BIGSERIAL,
  equipment_id  INT NOT NULL REFERENCES dim_equipment(equipment_id),
  event_ts      TIMESTAMPTZ NOT NULL,
  parameter     VARCHAR(100) NOT NULL,
  value         DECIMAL(20,6) NOT NULL,
  unit_id       INT,
  PRIMARY KEY (event_id, event_ts)
) PARTITION BY RANGE (event_ts);

-- Create monthly partitions for sensor events
DO $$
DECLARE
  start_date DATE;
  end_date DATE;
BEGIN
  FOR i IN 0..11 LOOP
    start_date := date_trunc('month', CURRENT_DATE - (i || ' months')::interval)::date;
    end_date := date_trunc('month', CURRENT_DATE - ((i-1) || ' months')::interval)::date;
    
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS fact_sensor_event_%s PARTITION OF fact_sensor_event 
       FOR VALUES FROM (''%s'') TO (''%s'');',
      to_char(start_date, 'YYYY_MM'),
      start_date,
      end_date
    );
  END LOOP;
END;
$$;

-- Convert to TimescaleDB hypertable if extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable('fact_sensor_event', 'event_ts', 
      chunk_time_interval => INTERVAL '1 week',
      if_not_exists => TRUE);
  END IF;
END;
$$;

-- ==================== AUDIT LOG ====================

-- 5. AuditLog: Trigger-Based Population (from master doc)
CREATE TABLE IF NOT EXISTS audit_log (
  log_id      BIGSERIAL PRIMARY KEY,
  username    VARCHAR(100) NOT NULL,
  action      VARCHAR(20) NOT NULL,
  table_name  VARCHAR(100) NOT NULL,
  record_id   VARCHAR(100) NOT NULL,
  log_ts      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  before_data JSONB,
  after_data  JSONB
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_table_ts ON audit_log(table_name, log_ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_ts ON audit_log(username, log_ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_before_data ON audit_log USING GIN (before_data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_audit_log_after_data ON audit_log USING GIN (after_data jsonb_path_ops);

-- Generic audit trigger function (from master doc)
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(username, action, table_name, record_id, after_data)
    VALUES(
      current_user,
      TG_OP,
      TG_TABLE_NAME,
      NEW::text,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(username, action, table_name, record_id, before_data, after_data)
    VALUES(
      current_user,
      TG_OP,
      TG_TABLE_NAME,
      NEW::text,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(username, action, table_name, record_id, before_data)
    VALUES(
      current_user,
      TG_OP,
      TG_TABLE_NAME,
      OLD::text,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'fact_production', 'fact_downtime', 'fact_scrap', 
    'fact_maintenance', 'dim_equipment'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      -- Drop existing trigger if exists
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%s ON %s', tbl, tbl);
      -- Create audit trigger
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%s 
         AFTER INSERT OR UPDATE OR DELETE ON %s 
         FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- ==================== MATERIALIZED VIEWS ====================

-- 3. Materialized Views: OEE Daily (from master doc)
CREATE MATERIALIZED VIEW IF NOT EXISTS view_oee_daily AS
SELECT
  EXTRACT(EPOCH FROM date_trunc('day', p.start_time))::INT / 86400 AS date_id,
  p.shift_id,
  p.equipment_id,
  -- Availability = (Operating Time - Downtime) / Operating Time
  CASE WHEN SUM(EXTRACT(EPOCH FROM (p.end_time - p.start_time))) = 0 THEN 0
       ELSE (SUM(EXTRACT(EPOCH FROM (p.end_time - p.start_time))) - 
             COALESCE(SUM(d.downtime_duration), 0)) / 
             SUM(EXTRACT(EPOCH FROM (p.end_time - p.start_time))) 
  END AS availability,
  -- Performance = Actual Production / Theoretical Production
  CASE WHEN SUM(p.planned_production_time) = 0 THEN 0
       ELSE SUM(p.total_parts_produced)::FLOAT / 
            (SUM(p.operating_time) / NULLIF(AVG(e.theoretical_rate), 0))
  END AS performance,
  -- Quality = Good Parts / Total Parts
  CASE WHEN SUM(p.total_parts_produced) = 0 THEN 0
       ELSE SUM(p.good_parts)::FLOAT / SUM(p.total_parts_produced)
  END AS quality,
  -- OEE = Availability × Performance × Quality
  CASE WHEN SUM(EXTRACT(EPOCH FROM (p.end_time - p.start_time))) = 0 
            OR SUM(p.planned_production_time) = 0 
            OR SUM(p.total_parts_produced) = 0 THEN 0
       ELSE 
         ((SUM(EXTRACT(EPOCH FROM (p.end_time - p.start_time))) - 
           COALESCE(SUM(d.downtime_duration), 0)) / 
           SUM(EXTRACT(EPOCH FROM (p.end_time - p.start_time)))) *
         (SUM(p.total_parts_produced)::FLOAT / 
          (SUM(p.operating_time) / NULLIF(AVG(e.theoretical_rate), 0))) *
         (SUM(p.good_parts)::FLOAT / SUM(p.total_parts_produced))
  END AS oee
FROM fact_production p
LEFT JOIN fact_downtime d ON p.production_id = d.production_id
LEFT JOIN dim_equipment e ON p.equipment_id = e.equipment_id
GROUP BY 1, 2, 3;

-- Create indexes on materialized view
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
  WHERE maintenance_type = 'Corrective'
  GROUP BY equipment_id, date_trunc('month', start_time)
),
operating_time AS (
  SELECT 
    equipment_id,
    date_trunc('month', start_time) AS period_start,
    SUM(operating_time) AS total_operating_seconds
  FROM fact_production
  GROUP BY equipment_id, date_trunc('month', start_time)
)
SELECT 
  m.equipment_id,
  m.period_start,
  (m.period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE AS period_end,
  m.failure_count AS total_failures,
  m.total_downtime_seconds::BIGINT AS total_downtime,
  -- MTBF = Operating Time / Number of Failures
  CASE WHEN m.failure_count > 0 
       THEN (o.total_operating_seconds / m.failure_count / 3600.0)::FLOAT
       ELSE NULL 
  END AS mtbf,
  -- MTTR = Total Repair Time / Number of Repairs
  CASE WHEN m.failure_count > 0 
       THEN (m.total_downtime_seconds / m.failure_count / 3600.0)::FLOAT
       ELSE NULL 
  END AS mttr,
  -- Availability = Operating Time / (Operating Time + Downtime)
  CASE WHEN (o.total_operating_seconds + m.total_downtime_seconds) > 0
       THEN (o.total_operating_seconds::FLOAT / 
             (o.total_operating_seconds + m.total_downtime_seconds))
       ELSE 0 
  END AS availability
FROM maintenance_stats m
JOIN operating_time o ON m.equipment_id = o.equipment_id 
                     AND m.period_start = o.period_start;

-- Create indexes
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
  SUM(s.scrap_cost) AS scrap_cost,
  CASE WHEN SUM(p.total_parts_produced) > 0 
       THEN SUM(s.scrap_qty)::FLOAT / SUM(p.total_parts_produced)
       ELSE 0 
  END AS scrap_rate
FROM fact_scrap s
JOIN fact_production p ON s.production_id = p.production_id
GROUP BY s.product_id, s.scrap_code, date_trunc('month', p.start_time);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_view_scrap_pk 
  ON view_scrap_summary(product_id, scrap_code, period_start);

-- ==================== REFRESH FUNCTIONS ====================

-- Function to refresh all materialized views (from master doc)
CREATE OR REPLACE FUNCTION refresh_all_views() RETURNS void AS $$
BEGIN
  -- Refresh with CONCURRENTLY to avoid blocking reads
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

-- ==================== PERFORMANCE OPTIMIZATIONS ====================

-- Create additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fact_production_date ON fact_production(start_time);
CREATE INDEX IF NOT EXISTS idx_fact_downtime_equipment_time ON fact_downtime(equipment_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_fact_sensor_event_param ON fact_sensor_event(parameter, event_ts DESC);

-- Create composite indexes for OEE calculations
CREATE INDEX IF NOT EXISTS idx_fact_production_oee 
  ON fact_production(equipment_id, shift_id, start_time DESC);

-- ==================== INITIAL DATA POPULATION ====================

-- Refresh date ranges
SELECT refresh_date_ranges();

-- Schedule periodic refresh (requires pg_cron or external scheduler)
-- Example for pg_cron:
-- SELECT cron.schedule('refresh-date-ranges', '0 2 * * *', 'SELECT refresh_date_ranges();');
-- SELECT cron.schedule('refresh-views', '0 3 * * *', 'SELECT refresh_all_views();');