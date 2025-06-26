-- Complete Migration to ISO 22400 Compliant Schema
-- This script migrates from the current schema to the ISO-compliant schema

BEGIN;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==================== CREATE NEW ISO-COMPLIANT TABLES ====================

-- 1. DimDateRange: Automated Calendar Population
CREATE TABLE IF NOT EXISTS dim_date_range (
  range_id     SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL
);

-- 2. OntologyTerm: Synonym Mapping
CREATE TABLE IF NOT EXISTS ontology_term (
  term        TEXT PRIMARY KEY,
  model_name  TEXT NOT NULL,
  field_name  TEXT NOT NULL,
  priority    INT DEFAULT 0
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_ontology_priority ON ontology_term(priority DESC);

-- 3. Create dimension tables
CREATE TABLE IF NOT EXISTS dim_site (
  site_id    SERIAL PRIMARY KEY,
  site_code  VARCHAR(20) UNIQUE NOT NULL,
  site_name  VARCHAR(100) NOT NULL,
  timezone   VARCHAR(50) DEFAULT 'UTC'
);

CREATE TABLE IF NOT EXISTS dim_area (
  area_id    SERIAL PRIMARY KEY,
  area_code  VARCHAR(20) UNIQUE NOT NULL,
  area_name  VARCHAR(100) NOT NULL,
  site_id    INT NOT NULL REFERENCES dim_site(site_id)
);

CREATE TABLE IF NOT EXISTS dim_work_center (
  work_center_id   SERIAL PRIMARY KEY,
  work_center_code VARCHAR(20) UNIQUE NOT NULL,
  work_center_name VARCHAR(100) NOT NULL,
  area_id          INT NOT NULL REFERENCES dim_area(area_id),
  capacity         DECIMAL(10,2),
  capacity_unit    VARCHAR(20)
);

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
  attributes         JSONB,
  is_active          BOOLEAN DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dim_shift (
  shift_id      SERIAL PRIMARY KEY,
  site_id       INT NOT NULL REFERENCES dim_site(site_id),
  shift_name    VARCHAR(50) NOT NULL,
  start_time    VARCHAR(8) NOT NULL,
  end_time      VARCHAR(8) NOT NULL,
  break_minutes INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  UNIQUE(site_id, shift_name)
);

CREATE TABLE IF NOT EXISTS dim_product (
  product_id       SERIAL PRIMARY KEY,
  product_code     VARCHAR(50) UNIQUE NOT NULL,
  product_name     VARCHAR(200) NOT NULL,
  product_family   VARCHAR(100),
  unit_of_measure  VARCHAR(20) DEFAULT 'EA',
  standard_cost    DECIMAL(12,4),
  target_cycle_time BIGINT
);

CREATE TABLE IF NOT EXISTS dim_downtime_reason (
  reason_id          SERIAL PRIMARY KEY,
  reason_code        VARCHAR(50) UNIQUE NOT NULL,
  reason_description VARCHAR(200) NOT NULL,
  reason_category    VARCHAR(50) NOT NULL,
  is_planned         BOOLEAN DEFAULT false,
  affects_oee        BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS dim_unit (
  unit_id   SERIAL PRIMARY KEY,
  unit_code VARCHAR(20) UNIQUE NOT NULL,
  unit_name VARCHAR(50) NOT NULL,
  unit_type VARCHAR(50) NOT NULL
);

-- ==================== MIGRATE DATA FROM EXISTING TABLES ====================

-- Migrate sites
INSERT INTO dim_site (site_code, site_name, timezone)
SELECT 
  site_code, 
  site_name, 
  timezone
FROM manufacturing_sites
ON CONFLICT (site_code) DO NOTHING;

-- Migrate areas
INSERT INTO dim_area (area_code, area_name, site_id)
SELECT 
  area_code,
  area_name,
  s.site_id
FROM manufacturing_areas ma
JOIN dim_site s ON s.site_code = (
  SELECT site_code FROM manufacturing_sites WHERE id = ma.site_id::uuid
)
ON CONFLICT (area_code) DO NOTHING;

-- Migrate work centers
INSERT INTO dim_work_center (work_center_code, work_center_name, area_id)
SELECT 
  work_center_code,
  work_center_name,
  a.area_id
FROM work_centers wc
JOIN dim_area a ON a.area_code = (
  SELECT area_code FROM manufacturing_areas WHERE id = wc.area_id::uuid
)
ON CONFLICT (work_center_code) DO NOTHING;

-- Migrate equipment
INSERT INTO dim_equipment (
  equipment_code, equipment_name, equipment_type,
  work_center_id, manufacturer, model, serial_number,
  installation_date, criticality_level, theoretical_rate, is_active
)
SELECT 
  equipment_code,
  equipment_name,
  equipment_type,
  w.work_center_id,
  manufacturer,
  model,
  serial_number,
  installation_date,
  criticality_level::varchar,
  ideal_run_rate,
  is_active
FROM equipment e
JOIN dim_work_center w ON w.work_center_code = (
  SELECT work_center_code FROM work_centers WHERE id = e.work_center_id::uuid
)
ON CONFLICT (equipment_code) DO NOTHING;

-- Migrate products
INSERT INTO dim_product (product_code, product_name, product_family, unit_of_measure, standard_cost)
SELECT 
  product_code,
  product_name,
  product_family,
  unit_of_measure,
  standard_cost
FROM products
ON CONFLICT (product_code) DO NOTHING;

-- Migrate shifts
INSERT INTO dim_shift (site_id, shift_name, start_time, end_time, break_minutes, is_active)
SELECT 
  s.site_id,
  shift_name,
  start_time,
  end_time,
  break_minutes,
  is_active
FROM shift_definitions sd
JOIN dim_site s ON s.site_code = (
  SELECT site_code FROM manufacturing_sites WHERE id = sd.site_id::uuid
)
ON CONFLICT (site_id, shift_name) DO NOTHING;

-- ==================== CREATE FACT TABLES ====================

CREATE TABLE IF NOT EXISTS fact_production (
  production_id           SERIAL PRIMARY KEY,
  date_id                 INT NOT NULL,
  shift_id                INT NOT NULL REFERENCES dim_shift(shift_id),
  equipment_id            INT NOT NULL REFERENCES dim_equipment(equipment_id),
  product_id              INT NOT NULL REFERENCES dim_product(product_id),
  order_number            VARCHAR(50),
  start_time              TIMESTAMPTZ NOT NULL,
  end_time                TIMESTAMPTZ NOT NULL,
  planned_production_time BIGINT NOT NULL,
  operating_time          BIGINT NOT NULL,
  total_parts_produced    INT NOT NULL,
  good_parts              INT NOT NULL,
  scrap_parts             INT DEFAULT 0,
  rework_parts            INT DEFAULT 0,
  operator_id             VARCHAR(50),
  created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fact_downtime (
  downtime_id       SERIAL PRIMARY KEY,
  production_id     INT REFERENCES fact_production(production_id),
  equipment_id      INT NOT NULL REFERENCES dim_equipment(equipment_id),
  reason_id         INT NOT NULL REFERENCES dim_downtime_reason(reason_id),
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  downtime_duration BIGINT NOT NULL,
  comments          TEXT,
  created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fact_scrap (
  scrap_id      SERIAL PRIMARY KEY,
  production_id INT NOT NULL REFERENCES fact_production(production_id),
  product_id    INT NOT NULL REFERENCES dim_product(product_id),
  scrap_code    VARCHAR(50) NOT NULL,
  scrap_qty     INT NOT NULL,
  scrap_cost    DECIMAL(12,2),
  created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fact_sensor_event (
  event_id      BIGSERIAL NOT NULL,
  equipment_id  INT NOT NULL REFERENCES dim_equipment(equipment_id),
  event_ts      TIMESTAMPTZ NOT NULL,
  parameter     VARCHAR(100) NOT NULL,
  value         DECIMAL(20,6) NOT NULL,
  unit_id       INT REFERENCES dim_unit(unit_id),
  PRIMARY KEY (event_id, event_ts)
) PARTITION BY RANGE (event_ts);

CREATE TABLE IF NOT EXISTS fact_maintenance (
  maintenance_id    SERIAL PRIMARY KEY,
  equipment_id      INT NOT NULL REFERENCES dim_equipment(equipment_id),
  work_order_number VARCHAR(50) NOT NULL,
  maintenance_type  VARCHAR(50) NOT NULL,
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  labor_hours       DECIMAL(10,2),
  material_cost     DECIMAL(12,2),
  description       TEXT,
  created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==================== CREATE AUDIT LOG ====================

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fact_production_date ON fact_production(start_time);
CREATE INDEX IF NOT EXISTS idx_fact_production_equipment ON fact_production(equipment_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_fact_downtime_equipment ON fact_downtime(equipment_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_fact_sensor_equipment ON fact_sensor_event(equipment_id, event_ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, log_ts DESC);

-- ==================== CREATE FUNCTIONS ====================

-- Function to refresh date ranges
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
    ('YTD', date_trunc('year', CURRENT_DATE)::date, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(username, action, table_name, record_id, after_data)
    VALUES(current_user, TG_OP, TG_TABLE_NAME, NEW::text, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(username, action, table_name, record_id, before_data, after_data)
    VALUES(current_user, TG_OP, TG_TABLE_NAME, NEW::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(username, action, table_name, record_id, before_data)
    VALUES(current_user, TG_OP, TG_TABLE_NAME, OLD::text, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==================== POPULATE INITIAL DATA ====================

-- Populate ontology terms
INSERT INTO ontology_term(term, model_name, field_name, priority)
VALUES
  ('downtime reason', 'DimDowntimeReason', 'reason_description', 10),
  ('OEE', 'ViewOeeDaily', 'oee', 9),
  ('mean time to repair', 'ViewReliabilitySummary', 'mttr', 8),
  ('equipment', 'DimEquipment', 'equipment_name', 7),
  ('shift', 'DimShift', 'shift_name', 6),
  ('product', 'DimProduct', 'product_name', 6)
ON CONFLICT (term) DO NOTHING;

-- Refresh date ranges
SELECT refresh_date_ranges();

-- Create some sample downtime reasons
INSERT INTO dim_downtime_reason (reason_code, reason_description, reason_category, is_planned, affects_oee)
VALUES
  ('MECH_FAIL', 'Mechanical Failure', 'Equipment Failure', false, true),
  ('ELEC_FAIL', 'Electrical Failure', 'Equipment Failure', false, true),
  ('NO_MAT', 'No Material', 'Material', false, true),
  ('NO_OP', 'No Operator', 'Operator', false, true),
  ('SETUP', 'Setup/Changeover', 'Setup', true, true),
  ('PM', 'Preventive Maintenance', 'Maintenance', true, false),
  ('BREAK', 'Break', 'Scheduled', true, false),
  ('QUALITY', 'Quality Issue', 'Quality', false, true)
ON CONFLICT (reason_code) DO NOTHING;

COMMIT;

-- Display summary
DO $$
DECLARE
  table_count INT;
  function_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name LIKE 'dim_%' OR table_name LIKE 'fact_%';
  
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION';
  
  RAISE NOTICE 'Migration Complete!';
  RAISE NOTICE '  - ISO-compliant tables: %', table_count;
  RAISE NOTICE '  - Functions created: %', function_count;
  RAISE NOTICE '  - Date ranges populated';
  RAISE NOTICE '  - Ontology terms loaded';
END $$;