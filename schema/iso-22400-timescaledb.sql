-- ISO 22400-Compliant Manufacturing Analytics Schema
-- TimescaleDB optimized for manufacturing time-series data
-- Supports OEE, TEEP, and all ISO 22400 KPIs

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Manufacturing Sites and Hierarchy
CREATE TABLE manufacturing_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_code VARCHAR(20) UNIQUE NOT NULL,
    site_name VARCHAR(100) NOT NULL,
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE manufacturing_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES manufacturing_sites(id),
    area_code VARCHAR(20) NOT NULL,
    area_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, area_code)
);

CREATE TABLE work_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID NOT NULL REFERENCES manufacturing_areas(id),
    work_center_code VARCHAR(20) NOT NULL,
    work_center_name VARCHAR(100) NOT NULL,
    capacity_units VARCHAR(20) DEFAULT 'units/hour',
    theoretical_capacity DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(area_id, work_center_code)
);

-- Equipment Registry
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_center_id UUID NOT NULL REFERENCES work_centers(id),
    equipment_code VARCHAR(50) UNIQUE NOT NULL,
    equipment_name VARCHAR(200) NOT NULL,
    equipment_type VARCHAR(50),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    installation_date DATE,
    sap_equipment_number VARCHAR(50),
    criticality_level VARCHAR(20) CHECK (criticality_level IN ('Critical', 'Important', 'Standard')),
    maintenance_strategy VARCHAR(50),
    theoretical_cycle_time DECIMAL(10,4), -- seconds per unit
    ideal_run_rate DECIMAL(10,2), -- units per hour
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products and Bill of Materials
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_family VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'EA',
    standard_cost DECIMAL(12,4),
    target_cycle_time DECIMAL(10,4), -- seconds per unit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production Orders
CREATE TABLE production_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id),
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    planned_quantity DECIMAL(12,2) NOT NULL,
    produced_quantity DECIMAL(12,2) DEFAULT 0,
    good_quantity DECIMAL(12,2) DEFAULT 0,
    scrap_quantity DECIMAL(12,2) DEFAULT 0,
    rework_quantity DECIMAL(12,2) DEFAULT 0,
    planned_start_time TIMESTAMPTZ NOT NULL,
    planned_end_time TIMESTAMPTZ NOT NULL,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    order_status VARCHAR(20) CHECK (order_status IN ('Planned', 'Released', 'In_Progress', 'Completed', 'Cancelled')),
    priority_level INTEGER DEFAULT 5,
    sap_order_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shift Definitions
CREATE TABLE shift_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES manufacturing_sites(id),
    shift_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_overnight BOOLEAN DEFAULT false,
    break_minutes INTEGER DEFAULT 0,
    meal_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, shift_name)
);

-- Time-Series Tables for Manufacturing Metrics

-- Production Quantities (ISO 22400 KPI 1-10)
CREATE TABLE fact_production_quantities (
    timestamp TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    production_order_id UUID REFERENCES production_orders(id),
    shift_id UUID REFERENCES shift_definitions(id),
    planned_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    produced_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    good_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    scrap_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    rework_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- ISO 22400 calculated fields
    actual_production_time DECIMAL(10,2), -- minutes
    planned_production_time DECIMAL(10,2), -- minutes
    loading_time DECIMAL(10,2), -- minutes
    operation_time DECIMAL(10,2), -- minutes
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('fact_production_quantities', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Equipment States and Downtime (ISO 22400 KPI 11-20)
CREATE TABLE fact_equipment_states (
    timestamp TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    state_code VARCHAR(20) NOT NULL, -- Run, Stop, Idle, Setup, Maintenance, etc.
    state_category VARCHAR(20) NOT NULL CHECK (state_category IN ('Productive', 'Scheduled_Downtime', 'Unscheduled_Downtime', 'Setup', 'Break')),
    reason_code VARCHAR(50),
    reason_description TEXT,
    duration_minutes DECIMAL(10,2),
    operator_id VARCHAR(50),
    shift_id UUID REFERENCES shift_definitions(id),
    
    -- Availability calculation fields
    is_planned_downtime BOOLEAN DEFAULT false,
    affects_oee BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('fact_equipment_states', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Quality Metrics (ISO 22400 KPI 21-30)
CREATE TABLE fact_quality_metrics (
    timestamp TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    production_order_id UUID REFERENCES production_orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    defect_type VARCHAR(100),
    defect_category VARCHAR(50), -- Critical, Major, Minor
    defect_count INTEGER DEFAULT 1,
    defect_description TEXT,
    root_cause VARCHAR(200),
    corrective_action TEXT,
    inspector_id VARCHAR(50),
    severity_score INTEGER CHECK (severity_score BETWEEN 1 AND 10),
    
    -- Quality rate calculations
    inspection_lot_size INTEGER,
    total_inspected INTEGER,
    total_defects INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('fact_quality_metrics', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Performance Metrics (Speed/Rate)
CREATE TABLE fact_performance_metrics (
    timestamp TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    production_order_id UUID REFERENCES production_orders(id),
    cycle_time DECIMAL(10,4), -- actual cycle time in seconds
    theoretical_cycle_time DECIMAL(10,4), -- ideal cycle time
    actual_run_rate DECIMAL(10,2), -- units per hour
    ideal_run_rate DECIMAL(10,2), -- theoretical maximum
    speed_loss_minutes DECIMAL(10,2),
    micro_stops_count INTEGER DEFAULT 0,
    reduced_speed_minutes DECIMAL(10,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('fact_performance_metrics', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Energy and Resource Consumption
CREATE TABLE fact_energy_metrics (
    timestamp TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    energy_type VARCHAR(20) CHECK (energy_type IN ('Electricity', 'Gas', 'Steam', 'Compressed_Air', 'Water')),
    consumption_value DECIMAL(12,4) NOT NULL,
    consumption_unit VARCHAR(20) NOT NULL, -- kWh, m³, kg, etc.
    cost_per_unit DECIMAL(10,4),
    total_cost DECIMAL(12,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('fact_energy_metrics', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Maintenance Events
CREATE TABLE fact_maintenance_events (
    timestamp TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    maintenance_type VARCHAR(50) CHECK (maintenance_type IN ('Preventive', 'Predictive', 'Corrective', 'Emergency')),
    maintenance_category VARCHAR(50),
    work_order_number VARCHAR(50),
    planned_duration_minutes DECIMAL(10,2),
    actual_duration_minutes DECIMAL(10,2),
    labor_hours DECIMAL(10,2),
    material_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    technician_id VARCHAR(50),
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('fact_maintenance_events', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Calculated OEE Metrics (Pre-aggregated for performance)
CREATE TABLE fact_oee_metrics (
    timestamp TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    production_order_id UUID REFERENCES production_orders(id),
    shift_id UUID REFERENCES shift_definitions(id),
    
    -- Time components (minutes)
    planned_production_time DECIMAL(10,2) NOT NULL,
    actual_production_time DECIMAL(10,2) NOT NULL,
    downtime_minutes DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Quantity components
    planned_quantity DECIMAL(12,2) NOT NULL,
    produced_quantity DECIMAL(12,2) NOT NULL,
    good_quantity DECIMAL(12,2) NOT NULL,
    scrap_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Rate components
    ideal_cycle_time DECIMAL(10,4),
    actual_cycle_time DECIMAL(10,4),
    
    -- ISO 22400 OEE Components (0-1 scale)
    availability DECIMAL(8,6) NOT NULL CHECK (availability >= 0 AND availability <= 1),
    performance DECIMAL(8,6) NOT NULL CHECK (performance >= 0 AND performance <= 1),
    quality DECIMAL(8,6) NOT NULL CHECK (quality >= 0 AND quality <= 1),
    
    -- Final OEE calculation
    oee DECIMAL(8,6) GENERATED ALWAYS AS (availability * performance * quality) STORED,
    
    -- TEEP (Total Effective Equipment Performance)
    utilization DECIMAL(8,6), -- Equipment usage vs calendar time
    teep DECIMAL(8,6) GENERATED ALWAYS AS (utilization * availability * performance * quality) STORED,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('fact_oee_metrics', 'timestamp', chunk_time_interval => INTERVAL '1 hour');

-- Create indexes for optimal query performance
CREATE INDEX idx_production_quantities_equipment_time ON fact_production_quantities (equipment_id, timestamp DESC);
CREATE INDEX idx_production_quantities_order ON fact_production_quantities (production_order_id, timestamp DESC);

CREATE INDEX idx_equipment_states_equipment_time ON fact_equipment_states (equipment_id, timestamp DESC);
CREATE INDEX idx_equipment_states_category ON fact_equipment_states (state_category, timestamp DESC);

CREATE INDEX idx_quality_metrics_equipment_time ON fact_quality_metrics (equipment_id, timestamp DESC);
CREATE INDEX idx_quality_metrics_defect_type ON fact_quality_metrics (defect_type, timestamp DESC);

CREATE INDEX idx_performance_metrics_equipment_time ON fact_performance_metrics (equipment_id, timestamp DESC);

CREATE INDEX idx_energy_metrics_equipment_time ON fact_energy_metrics (equipment_id, timestamp DESC);
CREATE INDEX idx_energy_metrics_type ON fact_energy_metrics (energy_type, timestamp DESC);

CREATE INDEX idx_maintenance_events_equipment_time ON fact_maintenance_events (equipment_id, timestamp DESC);
CREATE INDEX idx_maintenance_events_type ON fact_maintenance_events (maintenance_type, timestamp DESC);

CREATE INDEX idx_oee_metrics_equipment_time ON fact_oee_metrics (equipment_id, timestamp DESC);
CREATE INDEX idx_oee_metrics_shift ON fact_oee_metrics (shift_id, timestamp DESC);
CREATE INDEX idx_oee_metrics_oee_score ON fact_oee_metrics (oee DESC, timestamp DESC);

-- Continuous aggregates for common time ranges (hourly, daily, weekly)
CREATE MATERIALIZED VIEW oee_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS time_bucket,
    equipment_id,
    AVG(availability) AS avg_availability,
    AVG(performance) AS avg_performance,
    AVG(quality) AS avg_quality,
    AVG(oee) AS avg_oee,
    AVG(teep) AS avg_teep,
    SUM(planned_quantity) AS total_planned_quantity,
    SUM(produced_quantity) AS total_produced_quantity,
    SUM(good_quantity) AS total_good_quantity,
    SUM(scrap_quantity) AS total_scrap_quantity,
    COUNT(*) AS record_count
FROM fact_oee_metrics
GROUP BY time_bucket, equipment_id;

CREATE MATERIALIZED VIEW oee_daily  
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', timestamp) AS time_bucket,
    equipment_id,
    AVG(availability) AS avg_availability,
    AVG(performance) AS avg_performance,
    AVG(quality) AS avg_quality,
    AVG(oee) AS avg_oee,
    AVG(teep) AS avg_teep,
    SUM(planned_quantity) AS total_planned_quantity,
    SUM(produced_quantity) AS total_produced_quantity,
    SUM(good_quantity) AS total_good_quantity,
    SUM(scrap_quantity) AS total_scrap_quantity,
    COUNT(*) AS record_count
FROM fact_oee_metrics
GROUP BY time_bucket, equipment_id;

-- Enable real-time aggregation refresh
SELECT add_continuous_aggregate_policy('oee_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes');

SELECT add_continuous_aggregate_policy('oee_daily',
    start_offset => INTERVAL '2 days', 
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- Data retention policies (keep raw data for 2 years, aggregates for 7 years)
SELECT add_retention_policy('fact_production_quantities', INTERVAL '2 years');
SELECT add_retention_policy('fact_equipment_states', INTERVAL '2 years');
SELECT add_retention_policy('fact_quality_metrics', INTERVAL '2 years');
SELECT add_retention_policy('fact_performance_metrics', INTERVAL '2 years');
SELECT add_retention_policy('fact_energy_metrics', INTERVAL '2 years');
SELECT add_retention_policy('fact_maintenance_events', INTERVAL '5 years');
SELECT add_retention_policy('fact_oee_metrics', INTERVAL '2 years');

-- Row Level Security (RLS) for multi-tenant data access
ALTER TABLE manufacturing_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_oee_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_production_quantities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Functions for common calculations
CREATE OR REPLACE FUNCTION calculate_oee(
    p_availability DECIMAL(8,6),
    p_performance DECIMAL(8,6), 
    p_quality DECIMAL(8,6)
) RETURNS DECIMAL(8,6) AS $$
BEGIN
    RETURN p_availability * p_performance * p_quality;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_availability(
    p_planned_time DECIMAL(10,2),
    p_downtime DECIMAL(10,2)
) RETURNS DECIMAL(8,6) AS $$
BEGIN
    IF p_planned_time <= 0 THEN
        RETURN 0;
    END IF;
    RETURN GREATEST(0, LEAST(1, (p_planned_time - p_downtime) / p_planned_time));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_performance(
    p_produced_quantity DECIMAL(12,2),
    p_ideal_cycle_time DECIMAL(10,4),
    p_actual_runtime DECIMAL(10,2)
) RETURNS DECIMAL(8,6) AS $$
BEGIN
    IF p_actual_runtime <= 0 THEN
        RETURN 0;
    END IF;
    RETURN LEAST(1, (p_produced_quantity * p_ideal_cycle_time / 60.0) / p_actual_runtime);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_quality(
    p_good_quantity DECIMAL(12,2),
    p_total_quantity DECIMAL(12,2)
) RETURNS DECIMAL(8,6) AS $$
BEGIN
    IF p_total_quantity <= 0 THEN
        RETURN 0;
    END IF;
    RETURN p_good_quantity / p_total_quantity;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Views for common reporting needs
CREATE VIEW v_current_equipment_status AS
SELECT 
    e.equipment_code,
    e.equipment_name,
    wc.work_center_name,
    ma.area_name,
    ms.site_name,
    es.state_code,
    es.state_category,
    es.reason_description,
    es.duration_minutes,
    es.timestamp as last_update
FROM equipment e
JOIN work_centers wc ON e.work_center_id = wc.id
JOIN manufacturing_areas ma ON wc.area_id = ma.id  
JOIN manufacturing_sites ms ON ma.site_id = ms.id
JOIN LATERAL (
    SELECT * FROM fact_equipment_states 
    WHERE equipment_id = e.id 
    ORDER BY timestamp DESC 
    LIMIT 1
) es ON true
WHERE e.is_active = true;

CREATE VIEW v_oee_summary_last_24h AS
SELECT 
    e.equipment_code,
    e.equipment_name,
    wc.work_center_name,
    AVG(oee.availability) as avg_availability,
    AVG(oee.performance) as avg_performance,
    AVG(oee.quality) as avg_quality,
    AVG(oee.oee) as avg_oee,
    COUNT(*) as data_points
FROM equipment e
JOIN work_centers wc ON e.work_center_id = wc.id
JOIN fact_oee_metrics oee ON e.id = oee.equipment_id
WHERE oee.timestamp >= NOW() - INTERVAL '24 hours'
  AND e.is_active = true
GROUP BY e.id, e.equipment_code, e.equipment_name, wc.work_center_name
ORDER BY avg_oee DESC;

-- Insert initial reference data
INSERT INTO manufacturing_sites (site_code, site_name, address, timezone) VALUES
('MAIN', 'Main Manufacturing Plant', '123 Industrial Blvd, Manufacturing City', 'America/New_York'),
('PILOT', 'Pilot Production Facility', '456 Innovation Drive, Tech Park', 'America/New_York');

INSERT INTO shift_definitions (site_id, shift_name, start_time, end_time, break_minutes, meal_minutes) 
SELECT ms.id, shift_name, start_time, end_time, break_minutes, meal_minutes
FROM manufacturing_sites ms
CROSS JOIN (VALUES 
    ('Day Shift', '06:00:00', '14:00:00', 30, 30),
    ('Evening Shift', '14:00:00', '22:00:00', 30, 30), 
    ('Night Shift', '22:00:00', '06:00:00', 30, 30)
) AS shifts(shift_name, start_time, end_time, break_minutes, meal_minutes);

COMMENT ON SCHEMA public IS 'ISO 22400-compliant manufacturing analytics schema optimized for TimescaleDB';
COMMENT ON TABLE fact_oee_metrics IS 'Pre-calculated OEE metrics following ISO 22400 standard: OEE = Availability × Performance × Quality';
COMMENT ON COLUMN fact_oee_metrics.availability IS 'Availability = (Planned Production Time - Downtime) / Planned Production Time';
COMMENT ON COLUMN fact_oee_metrics.performance IS 'Performance = (Produced Quantity × Ideal Cycle Time) / Actual Runtime';
COMMENT ON COLUMN fact_oee_metrics.quality IS 'Quality Rate = Good Quantity / Total Quantity Produced';
COMMENT ON COLUMN fact_oee_metrics.teep IS 'TEEP = Utilization × Availability × Performance × Quality (includes calendar time utilization)';