-- =====================================================
-- Phase 2: Database Redesign
-- Simplified, performant schema optimized for manufacturing analytics
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Drop existing complex schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- =====================================================
-- CORE TABLES (Simplified)
-- =====================================================

-- Equipment master data (denormalized)
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    site_code VARCHAR(50) NOT NULL,
    site_name VARCHAR(200) NOT NULL,
    area_code VARCHAR(50) NOT NULL,
    area_name VARCHAR(200) NOT NULL,
    attributes JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product master data
CREATE TABLE product (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    family VARCHAR(100),
    ideal_cycle_time_seconds NUMERIC NOT NULL,
    attributes JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shift definitions
CREATE TABLE shift (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    days_of_week INTEGER[] NOT NULL, -- 1=Monday, 7=Sunday
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- TIME-SERIES TABLES (Hypertables)
-- =====================================================

-- Main production metrics table (denormalized for performance)
CREATE TABLE production_metrics (
    time TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL,
    equipment_code VARCHAR(50) NOT NULL,
    equipment_name VARCHAR(200) NOT NULL,
    site_code VARCHAR(50) NOT NULL,
    area_code VARCHAR(50) NOT NULL,
    shift_code VARCHAR(20),
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    
    -- Time buckets (pre-calculated for performance)
    hour_bucket TIMESTAMPTZ NOT NULL,
    day_bucket DATE NOT NULL,
    week_bucket DATE NOT NULL,
    month_bucket DATE NOT NULL,
    
    -- Production counts
    units_produced INTEGER NOT NULL DEFAULT 0,
    units_good INTEGER NOT NULL DEFAULT 0,
    units_scrap INTEGER NOT NULL DEFAULT 0,
    
    -- Time metrics (seconds)
    planned_production_time INTEGER NOT NULL,
    runtime INTEGER NOT NULL,
    downtime INTEGER NOT NULL DEFAULT 0,
    planned_downtime INTEGER NOT NULL DEFAULT 0,
    
    -- OEE components (pre-calculated)
    availability NUMERIC(5,4) GENERATED ALWAYS AS (
        CASE 
            WHEN planned_production_time - planned_downtime > 0 
            THEN (runtime::NUMERIC) / (planned_production_time - planned_downtime)
            ELSE 0 
        END
    ) STORED,
    
    performance NUMERIC(5,4),
    quality NUMERIC(5,4) GENERATED ALWAYS AS (
        CASE 
            WHEN units_produced > 0 
            THEN units_good::NUMERIC / units_produced 
            ELSE 0 
        END
    ) STORED,
    
    oee NUMERIC(5,4) GENERATED ALWAYS AS (
        CASE 
            WHEN planned_production_time - planned_downtime > 0 AND units_produced > 0
            THEN (runtime::NUMERIC / (planned_production_time - planned_downtime)) * 
                 COALESCE(performance, 1) * 
                 (units_good::NUMERIC / units_produced)
            ELSE 0
        END
    ) STORED,
    
    -- Metadata
    operator_id VARCHAR(50),
    work_order VARCHAR(50),
    batch_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hypertable
SELECT create_hypertable('production_metrics', 'time', chunk_time_interval => INTERVAL '1 day');

-- Downtime events
CREATE TABLE downtime_events (
    time TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL,
    equipment_code VARCHAR(50) NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    reason_category VARCHAR(50) NOT NULL,
    reason_description TEXT,
    duration_seconds INTEGER NOT NULL,
    is_planned BOOLEAN DEFAULT false,
    operator_id VARCHAR(50),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('downtime_events', 'time', chunk_time_interval => INTERVAL '1 day');

-- Quality events
CREATE TABLE quality_events (
    time TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    defect_code VARCHAR(50) NOT NULL,
    defect_category VARCHAR(50) NOT NULL,
    severity INTEGER CHECK (severity BETWEEN 1 AND 5),
    quantity INTEGER NOT NULL,
    is_rework BOOLEAN DEFAULT false,
    cost_impact NUMERIC(10,2),
    operator_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('quality_events', 'time', chunk_time_interval => INTERVAL '1 day');

-- Sensor data (high-volume)
CREATE TABLE sensor_data (
    time TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL,
    sensor_id VARCHAR(100) NOT NULL,
    value NUMERIC NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quality_flag VARCHAR(10) DEFAULT 'GOOD'
);

SELECT create_hypertable('sensor_data', 'time', chunk_time_interval => INTERVAL '1 hour');

-- =====================================================
-- LOOKUP TABLES
-- =====================================================

-- Downtime reasons (simplified)
CREATE TABLE downtime_reason (
    code VARCHAR(50) PRIMARY KEY,
    description VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_planned BOOLEAN DEFAULT false,
    impacts_availability BOOLEAN DEFAULT true,
    impacts_performance BOOLEAN DEFAULT false,
    impacts_quality BOOLEAN DEFAULT false
);

-- Quality defect types
CREATE TABLE defect_type (
    code VARCHAR(50) PRIMARY KEY,
    description VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity_default INTEGER CHECK (severity_default BETWEEN 1 AND 5),
    scrap_cost_default NUMERIC(10,2),
    rework_cost_default NUMERIC(10,2)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Production metrics indexes
CREATE INDEX idx_production_metrics_equipment_time ON production_metrics (equipment_id, time DESC);
CREATE INDEX idx_production_metrics_site_time ON production_metrics (site_code, time DESC);
CREATE INDEX idx_production_metrics_hour ON production_metrics (hour_bucket, equipment_id);
CREATE INDEX idx_production_metrics_day ON production_metrics (day_bucket, equipment_id);
CREATE INDEX idx_production_metrics_oee ON production_metrics (time DESC, oee) WHERE oee > 0;

-- Downtime indexes
CREATE INDEX idx_downtime_equipment_time ON downtime_events (equipment_id, time DESC);
CREATE INDEX idx_downtime_reason ON downtime_events (reason_code, time DESC);
CREATE INDEX idx_downtime_duration ON downtime_events (duration_seconds DESC);

-- Quality indexes
CREATE INDEX idx_quality_equipment_time ON quality_events (equipment_id, time DESC);
CREATE INDEX idx_quality_product ON quality_events (product_code, time DESC);
CREATE INDEX idx_quality_severity ON quality_events (severity, time DESC);

-- Sensor data indexes
CREATE INDEX idx_sensor_equipment_time ON sensor_data (equipment_id, time DESC);
CREATE INDEX idx_sensor_id_time ON sensor_data (sensor_id, time DESC);

-- =====================================================
-- CONTINUOUS AGGREGATES (Pre-calculated views)
-- =====================================================

-- Hourly aggregates
CREATE MATERIALIZED VIEW production_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS hour,
    equipment_id,
    equipment_code,
    site_code,
    area_code,
    COUNT(*) as data_points,
    SUM(units_produced) as total_units,
    SUM(units_good) as good_units,
    SUM(units_scrap) as scrap_units,
    SUM(runtime) as total_runtime,
    SUM(downtime) as total_downtime,
    AVG(availability) as avg_availability,
    AVG(performance) as avg_performance,
    AVG(quality) as avg_quality,
    AVG(oee) as avg_oee
FROM production_metrics
GROUP BY hour, equipment_id, equipment_code, site_code, area_code;

-- Daily aggregates
CREATE MATERIALIZED VIEW production_daily
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', time) AS day,
    equipment_id,
    equipment_code,
    site_code,
    COUNT(DISTINCT shift_code) as shifts_run,
    SUM(units_produced) as total_units,
    SUM(units_good) as good_units,
    SUM(runtime) as total_runtime,
    SUM(downtime) as total_downtime,
    AVG(oee) as avg_oee,
    MAX(oee) as best_oee,
    MIN(oee) as worst_oee
FROM production_metrics
GROUP BY day, equipment_id, equipment_code, site_code;

-- Create refresh policies
SELECT add_continuous_aggregate_policy('production_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '30 minutes');

SELECT add_continuous_aggregate_policy('production_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 hour');

-- =====================================================
-- RETENTION POLICIES
-- =====================================================

-- Keep detailed data for 90 days, then drop
SELECT add_retention_policy('production_metrics', INTERVAL '90 days');
SELECT add_retention_policy('sensor_data', INTERVAL '30 days');
SELECT add_retention_policy('downtime_events', INTERVAL '1 year');
SELECT add_retention_policy('quality_events', INTERVAL '1 year');

-- =====================================================
-- COMPRESSION POLICIES
-- =====================================================

-- Compress data older than 7 days
SELECT add_compression_policy('production_metrics', INTERVAL '7 days');
SELECT add_compression_policy('sensor_data', INTERVAL '1 day');

-- =====================================================
-- AUDIT SYSTEM (Simplified)
-- =====================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    changes JSONB,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_log (timestamp DESC);
CREATE INDEX idx_audit_user ON audit_log (user_id, timestamp DESC);
CREATE INDEX idx_audit_table ON audit_log (table_name, timestamp DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Calculate performance based on ideal cycle time
CREATE OR REPLACE FUNCTION calculate_performance(
    product_code VARCHAR,
    units_produced INTEGER,
    runtime_seconds INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    ideal_cycle_time NUMERIC;
    ideal_time NUMERIC;
BEGIN
    SELECT ideal_cycle_time_seconds INTO ideal_cycle_time
    FROM product
    WHERE code = product_code;
    
    IF ideal_cycle_time IS NULL OR runtime_seconds = 0 THEN
        RETURN 1;
    END IF;
    
    ideal_time := ideal_cycle_time * units_produced;
    RETURN LEAST(ideal_time / runtime_seconds, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get current shift
CREATE OR REPLACE FUNCTION get_current_shift(
    check_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS VARCHAR AS $$
DECLARE
    current_dow INTEGER;
    current_time TIME;
    shift_code VARCHAR;
BEGIN
    current_dow := EXTRACT(ISODOW FROM check_time);
    current_time := check_time::TIME;
    
    SELECT code INTO shift_code
    FROM shift
    WHERE current_dow = ANY(days_of_week)
    AND current_time >= start_time
    AND current_time < end_time
    AND is_active = true
    LIMIT 1;
    
    RETURN shift_code;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- POPULATE LOOKUP DATA
-- =====================================================

-- Downtime reasons
INSERT INTO downtime_reason (code, description, category, is_planned, impacts_availability, impacts_performance, impacts_quality) VALUES
('BREAKDOWN', 'Equipment Breakdown', 'Unplanned', false, true, false, false),
('MATERIAL', 'Material Shortage', 'Unplanned', false, true, false, false),
('QUALITY', 'Quality Issue', 'Unplanned', false, false, false, true),
('CHANGEOVER', 'Product Changeover', 'Planned', true, true, false, false),
('MAINTENANCE', 'Scheduled Maintenance', 'Planned', true, true, false, false),
('BREAK', 'Scheduled Break', 'Planned', true, false, false, false),
('MINOR_STOP', 'Minor Stop (<5min)', 'Unplanned', false, false, true, false),
('SPEED_LOSS', 'Reduced Speed', 'Unplanned', false, false, true, false);

-- Defect types
INSERT INTO defect_type (code, description, category, severity_default, scrap_cost_default, rework_cost_default) VALUES
('DIMENSION', 'Dimensional Error', 'Measurement', 3, 50.00, 10.00),
('SURFACE', 'Surface Defect', 'Appearance', 2, 30.00, 15.00),
('MATERIAL', 'Material Defect', 'Material', 4, 100.00, 0.00),
('ASSEMBLY', 'Assembly Error', 'Process', 3, 40.00, 20.00),
('FUNCTION', 'Functional Failure', 'Performance', 5, 200.00, 0.00);

-- Standard shifts
INSERT INTO shift (code, name, start_time, end_time, break_minutes, days_of_week) VALUES
('MORNING', 'Morning Shift', '06:00', '14:00', 30, ARRAY[1,2,3,4,5]),
('AFTERNOON', 'Afternoon Shift', '14:00', '22:00', 30, ARRAY[1,2,3,4,5]),
('NIGHT', 'Night Shift', '22:00', '06:00', 30, ARRAY[1,2,3,4,5]),
('WEEKEND_DAY', 'Weekend Day', '06:00', '18:00', 60, ARRAY[6,7]),
('WEEKEND_NIGHT', 'Weekend Night', '18:00', '06:00', 60, ARRAY[6,7]);

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Real-time dashboard view
CREATE VIEW v_realtime_dashboard AS
WITH last_hour AS (
    SELECT * FROM production_metrics
    WHERE time > NOW() - INTERVAL '1 hour'
)
SELECT 
    equipment_code,
    equipment_name,
    site_code,
    area_code,
    MAX(time) as last_update,
    SUM(units_produced) as units_last_hour,
    AVG(oee) as oee_last_hour,
    SUM(downtime) as downtime_seconds,
    COUNT(DISTINCT shift_code) as shifts_active
FROM last_hour
GROUP BY equipment_code, equipment_name, site_code, area_code;

-- Equipment status view
CREATE VIEW v_equipment_status AS
SELECT 
    e.code,
    e.name,
    e.site_code,
    e.area_code,
    COALESCE(ph.avg_oee, 0) as current_oee,
    COALESCE(ph.total_units, 0) as units_today,
    CASE 
        WHEN MAX(pm.time) > NOW() - INTERVAL '10 minutes' THEN 'Running'
        WHEN MAX(pm.time) > NOW() - INTERVAL '1 hour' THEN 'Idle'
        ELSE 'Stopped'
    END as status,
    MAX(pm.time) as last_activity
FROM equipment e
LEFT JOIN production_metrics pm ON e.id = pm.equipment_id AND pm.time > NOW() - INTERVAL '24 hours'
LEFT JOIN production_hourly ph ON e.id = ph.equipment_id AND ph.hour = date_trunc('hour', NOW())
WHERE e.is_active = true
GROUP BY e.code, e.name, e.site_code, e.area_code, ph.avg_oee, ph.total_units;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database Redesign Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Features implemented:';
    RAISE NOTICE '✓ Simplified denormalized schema';
    RAISE NOTICE '✓ TimescaleDB hypertables';
    RAISE NOTICE '✓ Continuous aggregates';
    RAISE NOTICE '✓ Retention policies';
    RAISE NOTICE '✓ Compression policies';
    RAISE NOTICE '✓ Performance indexes';
    RAISE NOTICE '✓ Real-time views';
    RAISE NOTICE '========================================';
END $$;