-- =====================================================
-- ISO-COMPLIANT MANUFACTURING ANALYTICS SCHEMA
-- Implements: ISO 22400 (OEE), ISO 9001 (Quality), ISO 14224 (Reliability)
-- This is the authoritative source of truth
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =====================================================
-- DIMENSION TABLES
-- =====================================================

-- DIM_DATE: Calendar dimension with fiscal support
CREATE TABLE dim_date (
    date_id INTEGER PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    month INTEGER NOT NULL,
    week INTEGER NOT NULL,
    day_of_year INTEGER NOT NULL,
    day_of_month INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    day_name VARCHAR(10) NOT NULL,
    month_name VARCHAR(10) NOT NULL,
    is_weekend BOOLEAN NOT NULL,
    is_holiday BOOLEAN DEFAULT FALSE,
    fiscal_year INTEGER,
    fiscal_quarter INTEGER,
    fiscal_period INTEGER
);

-- DIM_TIME: Time of day dimension (minute granularity)
CREATE TABLE dim_time (
    time_id INTEGER PRIMARY KEY,
    time TIME NOT NULL UNIQUE,
    hour INTEGER NOT NULL,
    minute INTEGER NOT NULL,
    hour_24 VARCHAR(2) NOT NULL,
    hour_12 VARCHAR(2) NOT NULL,
    am_pm VARCHAR(2) NOT NULL,
    time_string VARCHAR(8) NOT NULL
);

-- DIM_SHIFT: Work shift definitions
CREATE TABLE dim_shift (
    shift_id SERIAL PRIMARY KEY,
    shift_name VARCHAR(50) NOT NULL,
    shift_code VARCHAR(10) NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DIM_EQUIPMENT: Equipment master with JSONB attributes
CREATE TABLE dim_equipment (
    equipment_id SERIAL PRIMARY KEY,
    equipment_code VARCHAR(50) NOT NULL UNIQUE,
    equipment_name VARCHAR(100) NOT NULL,
    equipment_type VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    purchase_date DATE,
    commission_date DATE,
    location_code VARCHAR(50),
    department VARCHAR(50),
    cost_center VARCHAR(20),
    nominal_speed NUMERIC(10,2),
    nominal_speed_unit VARCHAR(20),
    attributes JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DIM_PRODUCT: Product specifications
CREATE TABLE dim_product (
    product_id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(100) NOT NULL,
    product_family VARCHAR(50),
    product_group VARCHAR(50),
    standard_cycle_time NUMERIC(10,3),
    cycle_time_unit VARCHAR(20),
    weight_per_unit NUMERIC(10,3),
    weight_unit VARCHAR(20),
    quality_specs JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DIM_UNIT_OF_MEASURE: Standardized units
CREATE TABLE dim_unit_of_measure (
    unit_id SERIAL PRIMARY KEY,
    unit_code VARCHAR(20) NOT NULL UNIQUE,
    unit_name VARCHAR(50) NOT NULL,
    unit_type VARCHAR(30) NOT NULL, -- 'time', 'weight', 'count', 'temperature', etc.
    base_unit_code VARCHAR(20),
    conversion_factor NUMERIC(15,6) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DIM_QUALITY_DEFECT_TYPE: Quality defect classifications
CREATE TABLE dim_quality_defect_type (
    defect_type_id SERIAL PRIMARY KEY,
    defect_code VARCHAR(20) NOT NULL UNIQUE,
    defect_name VARCHAR(100) NOT NULL,
    defect_category VARCHAR(50) NOT NULL,
    severity_level INTEGER CHECK (severity_level BETWEEN 1 AND 5),
    is_scrap BOOLEAN DEFAULT FALSE,
    is_rework BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DIM_DOWNTIME_REASON: Downtime categorization (ISO 14224)
CREATE TABLE dim_downtime_reason (
    reason_id SERIAL PRIMARY KEY,
    reason_code VARCHAR(20) NOT NULL UNIQUE,
    reason_description VARCHAR(200) NOT NULL,
    category_level_1 VARCHAR(50) NOT NULL, -- 'Planned', 'Unplanned'
    category_level_2 VARCHAR(50) NOT NULL, -- 'Maintenance', 'Setup', 'Breakdown', etc.
    category_level_3 VARCHAR(50),
    impacts_availability BOOLEAN DEFAULT TRUE,
    impacts_performance BOOLEAN DEFAULT FALSE,
    impacts_quality BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DIM_DATE_RANGE: Named date ranges for queries
CREATE TABLE dim_date_range (
    range_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FACT TABLES
-- =====================================================

-- FACT_PRODUCTION: Core production events
CREATE TABLE fact_production (
    production_id BIGSERIAL PRIMARY KEY,
    date_id INTEGER NOT NULL REFERENCES dim_date(date_id),
    time_id INTEGER NOT NULL REFERENCES dim_time(time_id),
    shift_id INTEGER NOT NULL REFERENCES dim_shift(shift_id),
    equipment_id INTEGER NOT NULL REFERENCES dim_equipment(equipment_id),
    product_id INTEGER NOT NULL REFERENCES dim_product(product_id),
    operator_id VARCHAR(50),
    work_order VARCHAR(50),
    batch_number VARCHAR(50),
    planned_production_time BIGINT NOT NULL, -- seconds
    operating_time BIGINT NOT NULL, -- seconds
    total_parts_produced INTEGER NOT NULL,
    good_parts INTEGER NOT NULL,
    cycle_time_actual NUMERIC(10,3),
    cycle_time_standard NUMERIC(10,3),
    speed_rate NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_parts CHECK (good_parts <= total_parts_produced)
);

-- FACT_DOWNTIME: Equipment downtime records
CREATE TABLE fact_downtime (
    downtime_id BIGSERIAL PRIMARY KEY,
    production_id BIGINT REFERENCES fact_production(production_id),
    equipment_id INTEGER NOT NULL REFERENCES dim_equipment(equipment_id),
    date_id INTEGER NOT NULL REFERENCES dim_date(date_id),
    time_start_id INTEGER NOT NULL REFERENCES dim_time(time_id),
    time_end_id INTEGER NOT NULL REFERENCES dim_time(time_id),
    reason_id INTEGER NOT NULL REFERENCES dim_downtime_reason(reason_id),
    downtime_duration BIGINT NOT NULL, -- seconds
    operator_id VARCHAR(50),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FACT_QUALITY: Quality inspection results
CREATE TABLE fact_quality (
    quality_id BIGSERIAL PRIMARY KEY,
    production_id BIGINT REFERENCES fact_production(production_id),
    date_id INTEGER NOT NULL REFERENCES dim_date(date_id),
    time_id INTEGER NOT NULL REFERENCES dim_time(time_id),
    equipment_id INTEGER NOT NULL REFERENCES dim_equipment(equipment_id),
    product_id INTEGER NOT NULL REFERENCES dim_product(product_id),
    inspection_type VARCHAR(50) NOT NULL,
    sample_size INTEGER NOT NULL,
    defects_found INTEGER NOT NULL DEFAULT 0,
    defect_details JSONB DEFAULT '[]',
    inspector_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_defects CHECK (defects_found <= sample_size)
);

-- FACT_SCRAP: Scrap and waste tracking
CREATE TABLE fact_scrap (
    scrap_id BIGSERIAL PRIMARY KEY,
    production_id BIGINT REFERENCES fact_production(production_id),
    date_id INTEGER NOT NULL REFERENCES dim_date(date_id),
    time_id INTEGER NOT NULL REFERENCES dim_time(time_id),
    equipment_id INTEGER NOT NULL REFERENCES dim_equipment(equipment_id),
    product_id INTEGER NOT NULL REFERENCES dim_product(product_id),
    defect_type_id INTEGER NOT NULL REFERENCES dim_quality_defect_type(defect_type_id),
    scrap_quantity INTEGER NOT NULL,
    scrap_weight NUMERIC(10,3),
    scrap_cost NUMERIC(10,2),
    can_rework BOOLEAN DEFAULT FALSE,
    operator_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FACT_SENSOR_EVENT: High-volume sensor data (partitioned)
CREATE TABLE fact_sensor_event (
    event_id BIGSERIAL,
    equipment_id INTEGER NOT NULL REFERENCES dim_equipment(equipment_id),
    event_ts TIMESTAMP NOT NULL,
    parameter VARCHAR(100) NOT NULL,
    value NUMERIC NOT NULL,
    unit_id INTEGER REFERENCES dim_unit_of_measure(unit_id),
    quality_flag VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, event_ts)
) PARTITION BY RANGE (event_ts);

-- Create TimescaleDB hypertable
SELECT create_hypertable('fact_sensor_event', 'event_ts', chunk_time_interval => INTERVAL '1 day');

-- =====================================================
-- AI-READY COMPONENTS
-- =====================================================

-- ONTOLOGY_TERM: Synonym mapping for natural language
CREATE TABLE ontology_term (
    term TEXT PRIMARY KEY,
    model_name TEXT NOT NULL,
    field_name TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    examples TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT_LOG: Complete audit trail
CREATE TABLE audit_log (
    log_id BIGSERIAL PRIMARY KEY,
    log_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    table_name VARCHAR(100) NOT NULL,
    record_id TEXT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    client_ip INET,
    user_agent TEXT
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Fact table indexes
CREATE INDEX idx_fact_production_date ON fact_production(date_id);
CREATE INDEX idx_fact_production_equipment ON fact_production(equipment_id);
CREATE INDEX idx_fact_production_product ON fact_production(product_id);
CREATE INDEX idx_fact_production_shift ON fact_production(shift_id);

CREATE INDEX idx_fact_downtime_date ON fact_downtime(date_id);
CREATE INDEX idx_fact_downtime_equipment ON fact_downtime(equipment_id);
CREATE INDEX idx_fact_downtime_reason ON fact_downtime(reason_id);

CREATE INDEX idx_fact_quality_date ON fact_quality(date_id);
CREATE INDEX idx_fact_quality_equipment ON fact_quality(equipment_id);
CREATE INDEX idx_fact_quality_product ON fact_quality(product_id);

CREATE INDEX idx_fact_scrap_date ON fact_scrap(date_id);
CREATE INDEX idx_fact_scrap_equipment ON fact_scrap(equipment_id);
CREATE INDEX idx_fact_scrap_defect ON fact_scrap(defect_type_id);

-- JSONB indexes
CREATE INDEX idx_equipment_attributes ON dim_equipment USING GIN (attributes);
CREATE INDEX idx_quality_defect_details ON fact_quality USING GIN (defect_details);
CREATE INDEX idx_audit_before_data ON audit_log USING GIN (before_data);
CREATE INDEX idx_audit_after_data ON audit_log USING GIN (after_data);

-- =====================================================
-- FUNCTIONS AND PROCEDURES
-- =====================================================

-- Function to refresh date ranges
CREATE OR REPLACE FUNCTION refresh_date_ranges() RETURNS void AS $$
BEGIN
    DELETE FROM dim_date_range;
    INSERT INTO dim_date_range(name, start_date, end_date)
    VALUES
        ('Today', CURRENT_DATE, CURRENT_DATE),
        ('Yesterday', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day'),
        ('This Week', date_trunc('week', CURRENT_DATE)::date, CURRENT_DATE),
        ('Last Week', date_trunc('week', CURRENT_DATE - INTERVAL '1 week')::date, 
         date_trunc('week', CURRENT_DATE)::date - 1),
        ('This Month', date_trunc('month', CURRENT_DATE)::date, CURRENT_DATE),
        ('Last Month', date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::date,
         date_trunc('month', CURRENT_DATE)::date - 1),
        ('This Quarter', date_trunc('quarter', CURRENT_DATE)::date, CURRENT_DATE),
        ('Last Quarter', date_trunc('quarter', CURRENT_DATE - INTERVAL '3 months')::date,
         date_trunc('quarter', CURRENT_DATE)::date - 1),
        ('This Year', date_trunc('year', CURRENT_DATE)::date, CURRENT_DATE),
        ('Last Year', date_trunc('year', CURRENT_DATE - INTERVAL '1 year')::date,
         date_trunc('year', CURRENT_DATE)::date - 1),
        ('Last 7 Days', CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE),
        ('Last 30 Days', CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE),
        ('Last 90 Days', CURRENT_DATE - INTERVAL '89 days', CURRENT_DATE),
        ('Last 365 Days', CURRENT_DATE - INTERVAL '364 days', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Populate initial date ranges
SELECT refresh_date_ranges();

-- =====================================================
-- MATERIALIZED VIEWS
-- =====================================================

-- VIEW_OEE_DAILY: Daily OEE calculations
CREATE MATERIALIZED VIEW view_oee_daily AS
WITH production_summary AS (
    SELECT
        p.date_id,
        p.shift_id,
        p.equipment_id,
        p.product_id,
        SUM(p.planned_production_time) AS planned_time,
        SUM(p.operating_time) AS operating_time,
        SUM(COALESCE(d.downtime_duration, 0)) AS downtime,
        SUM(p.total_parts_produced) AS total_parts,
        SUM(p.good_parts) AS good_parts,
        SUM(p.total_parts_produced * p.cycle_time_standard) AS standard_time,
        SUM(p.total_parts_produced * p.cycle_time_actual) AS actual_time
    FROM fact_production p
    LEFT JOIN fact_downtime d ON p.production_id = d.production_id
    GROUP BY p.date_id, p.shift_id, p.equipment_id, p.product_id
)
SELECT
    ps.date_id,
    ps.shift_id,
    ps.equipment_id,
    ps.product_id,
    -- Availability = (Operating Time - Downtime) / Planned Time
    CASE 
        WHEN ps.planned_time > 0 THEN 
            ROUND(((ps.operating_time - ps.downtime)::NUMERIC / ps.planned_time) * 100, 2)
        ELSE 0 
    END AS availability,
    -- Performance = (Standard Time * Total Parts) / Operating Time
    CASE 
        WHEN ps.operating_time > 0 AND ps.standard_time > 0 THEN 
            ROUND((ps.standard_time::NUMERIC / ps.actual_time) * 100, 2)
        ELSE 0 
    END AS performance,
    -- Quality = Good Parts / Total Parts
    CASE 
        WHEN ps.total_parts > 0 THEN 
            ROUND((ps.good_parts::NUMERIC / ps.total_parts) * 100, 2)
        ELSE 0 
    END AS quality,
    -- OEE = Availability * Performance * Quality
    CASE 
        WHEN ps.planned_time > 0 AND ps.operating_time > 0 AND ps.total_parts > 0 THEN
            ROUND(
                ((ps.operating_time - ps.downtime)::NUMERIC / ps.planned_time) *
                (ps.standard_time::NUMERIC / NULLIF(ps.actual_time, 0)) *
                (ps.good_parts::NUMERIC / ps.total_parts) * 100, 2
            )
        ELSE 0 
    END AS oee,
    ps.planned_time,
    ps.operating_time,
    ps.downtime,
    ps.total_parts,
    ps.good_parts
FROM production_summary ps;

CREATE UNIQUE INDEX idx_view_oee_daily ON view_oee_daily(date_id, shift_id, equipment_id, product_id);

-- VIEW_RELIABILITY_SUMMARY: MTBF, MTTR calculations
CREATE MATERIALIZED VIEW view_reliability_summary AS
WITH downtime_events AS (
    SELECT
        equipment_id,
        date_id,
        COUNT(*) AS failure_count,
        SUM(downtime_duration) AS total_downtime,
        AVG(downtime_duration) AS avg_downtime
    FROM fact_downtime
    WHERE reason_id IN (
        SELECT reason_id FROM dim_downtime_reason 
        WHERE category_level_1 = 'Unplanned'
    )
    GROUP BY equipment_id, date_id
),
operating_hours AS (
    SELECT
        equipment_id,
        date_id,
        SUM(operating_time) AS total_operating_time
    FROM fact_production
    GROUP BY equipment_id, date_id
)
SELECT
    oh.equipment_id,
    oh.date_id,
    oh.total_operating_time,
    COALESCE(de.failure_count, 0) AS failure_count,
    COALESCE(de.total_downtime, 0) AS total_downtime,
    -- MTBF = Total Operating Time / Number of Failures
    CASE 
        WHEN COALESCE(de.failure_count, 0) > 0 THEN
            ROUND((oh.total_operating_time::NUMERIC / de.failure_count) / 3600, 2) -- Convert to hours
        ELSE NULL 
    END AS mtbf_hours,
    -- MTTR = Total Downtime / Number of Failures
    CASE 
        WHEN COALESCE(de.failure_count, 0) > 0 THEN
            ROUND((de.total_downtime::NUMERIC / de.failure_count) / 3600, 2) -- Convert to hours
        ELSE NULL 
    END AS mttr_hours,
    -- Availability = Operating Time / (Operating Time + Downtime)
    CASE 
        WHEN oh.total_operating_time + COALESCE(de.total_downtime, 0) > 0 THEN
            ROUND((oh.total_operating_time::NUMERIC / 
                  (oh.total_operating_time + COALESCE(de.total_downtime, 0))) * 100, 2)
        ELSE 100 
    END AS availability_percentage
FROM operating_hours oh
LEFT JOIN downtime_events de ON oh.equipment_id = de.equipment_id AND oh.date_id = de.date_id;

CREATE UNIQUE INDEX idx_view_reliability ON view_reliability_summary(equipment_id, date_id);

-- VIEW_SCRAP_SUMMARY: Scrap analysis
CREATE MATERIALIZED VIEW view_scrap_summary AS
SELECT
    s.date_id,
    s.equipment_id,
    s.product_id,
    s.defect_type_id,
    COUNT(*) AS scrap_events,
    SUM(s.scrap_quantity) AS total_scrap_quantity,
    SUM(s.scrap_cost) AS total_scrap_cost,
    SUM(CASE WHEN s.can_rework THEN s.scrap_quantity ELSE 0 END) AS rework_quantity,
    AVG(s.scrap_quantity) AS avg_scrap_per_event
FROM fact_scrap s
GROUP BY s.date_id, s.equipment_id, s.product_id, s.defect_type_id;

CREATE UNIQUE INDEX idx_view_scrap ON view_scrap_summary(date_id, equipment_id, product_id, defect_type_id);

-- =====================================================
-- AUDIT TRIGGERS
-- =====================================================

-- Generic audit function
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log(username, action, table_name, record_id, before_data)
        VALUES (current_user, TG_OP, TG_TABLE_NAME, OLD.production_id::TEXT, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log(username, action, table_name, record_id, before_data, after_data)
        VALUES (current_user, TG_OP, TG_TABLE_NAME, NEW.production_id::TEXT, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log(username, action, table_name, record_id, after_data)
        VALUES (current_user, TG_OP, TG_TABLE_NAME, NEW.production_id::TEXT, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to fact tables
CREATE TRIGGER audit_fact_production
    AFTER INSERT OR UPDATE OR DELETE ON fact_production
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_fact_downtime
    AFTER INSERT OR UPDATE OR DELETE ON fact_downtime
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_fact_quality
    AFTER INSERT OR UPDATE OR DELETE ON fact_quality
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_fact_scrap
    AFTER INSERT OR UPDATE OR DELETE ON fact_scrap
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- PERMISSIONS
-- =====================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ISO-Compliant Schema Created Successfully!';
    RAISE NOTICE 'Implements: ISO 22400, ISO 9001, ISO 14224';
    RAISE NOTICE 'Features: Partitioning, Auditing, AI-Ready';
    RAISE NOTICE '========================================';
END $$;