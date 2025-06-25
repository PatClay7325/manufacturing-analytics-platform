-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create metrics table for time-series data
CREATE TABLE IF NOT EXISTS manufacturing_metrics (
    timestamp TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    tags JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hypertable
SELECT create_hypertable(
    'manufacturing_metrics',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Add indexes for common queries
CREATE INDEX idx_metrics_equipment_time ON manufacturing_metrics (equipment_id, timestamp DESC);
CREATE INDEX idx_metrics_name_time ON manufacturing_metrics (metric_name, timestamp DESC);
CREATE INDEX idx_metrics_equipment_name_time ON manufacturing_metrics (equipment_id, metric_name, timestamp DESC);
CREATE INDEX idx_metrics_tags ON manufacturing_metrics USING GIN (tags);

-- Add compression policy (compress chunks older than 7 days)
SELECT add_compression_policy('manufacturing_metrics', INTERVAL '7 days');

-- Create OEE metrics view
CREATE OR REPLACE VIEW oee_metrics AS
SELECT 
    timestamp,
    equipment_id,
    MAX(CASE WHEN metric_name = 'oee' THEN metric_value END) as oee_score,
    MAX(CASE WHEN metric_name = 'availability' THEN metric_value END) as availability_score,
    MAX(CASE WHEN metric_name = 'performance' THEN metric_value END) as performance_score,
    MAX(CASE WHEN metric_name = 'quality' THEN metric_value END) as quality_score,
    MAX(CASE WHEN metric_name = 'production_count' THEN metric_value END) as production_count,
    MAX(CASE WHEN metric_name = 'good_count' THEN metric_value END) as good_count,
    MAX(CASE WHEN metric_name = 'reject_count' THEN metric_value END) as reject_count,
    tags
FROM manufacturing_metrics
WHERE metric_name IN ('oee', 'availability', 'performance', 'quality', 'production_count', 'good_count', 'reject_count')
GROUP BY timestamp, equipment_id, tags;

-- Create equipment status table
CREATE TABLE IF NOT EXISTS equipment_status (
    timestamp TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'stopped', 'maintenance', 'error')),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hypertable for equipment status
SELECT create_hypertable(
    'equipment_status',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Add indexes
CREATE INDEX idx_equipment_status_time ON equipment_status (equipment_id, timestamp DESC);
CREATE INDEX idx_equipment_status_status ON equipment_status (status, timestamp DESC);

-- Create downtime events table
CREATE TABLE IF NOT EXISTS downtime_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id UUID NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    reason_category TEXT NOT NULL,
    reason_detail TEXT,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN end_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60
            ELSE NULL
        END
    ) STORED,
    tags JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_downtime_equipment_time ON downtime_events (equipment_id, start_time DESC);
CREATE INDEX idx_downtime_reason ON downtime_events (reason_category, start_time DESC);
CREATE INDEX idx_downtime_active ON downtime_events (end_time) WHERE end_time IS NULL;

-- Create sensor readings table
CREATE TABLE IF NOT EXISTS sensor_readings (
    timestamp TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL,
    sensor_name TEXT NOT NULL,
    sensor_value DOUBLE PRECISION NOT NULL,
    unit TEXT,
    quality TEXT DEFAULT 'good' CHECK (quality IN ('good', 'uncertain', 'bad')),
    metadata JSONB DEFAULT '{}'
);

-- Create hypertable for sensor readings
SELECT create_hypertable(
    'sensor_readings',
    'timestamp',
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Add indexes
CREATE INDEX idx_sensor_equipment_time ON sensor_readings (equipment_id, timestamp DESC);
CREATE INDEX idx_sensor_name_time ON sensor_readings (sensor_name, timestamp DESC);
CREATE INDEX idx_sensor_equipment_name_time ON sensor_readings (equipment_id, sensor_name, timestamp DESC);

-- Add compression policy (compress chunks older than 3 days)
SELECT add_compression_policy('sensor_readings', INTERVAL '3 days');

-- Create continuous aggregates for OEE metrics (5-minute buckets)
CREATE MATERIALIZED VIEW oee_5min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('5 minutes', timestamp) AS bucket,
    equipment_id,
    AVG(metric_value) FILTER (WHERE metric_name = 'oee') as avg_oee,
    AVG(metric_value) FILTER (WHERE metric_name = 'availability') as avg_availability,
    AVG(metric_value) FILTER (WHERE metric_name = 'performance') as avg_performance,
    AVG(metric_value) FILTER (WHERE metric_name = 'quality') as avg_quality,
    SUM(metric_value) FILTER (WHERE metric_name = 'production_count') as total_production,
    SUM(metric_value) FILTER (WHERE metric_name = 'good_count') as total_good,
    SUM(metric_value) FILTER (WHERE metric_name = 'reject_count') as total_reject,
    COUNT(*) as sample_count
FROM manufacturing_metrics
WHERE metric_name IN ('oee', 'availability', 'performance', 'quality', 'production_count', 'good_count', 'reject_count')
GROUP BY bucket, equipment_id
WITH NO DATA;

-- Create continuous aggregates for OEE metrics (1-hour buckets)
CREATE MATERIALIZED VIEW oee_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS bucket,
    equipment_id,
    AVG(metric_value) FILTER (WHERE metric_name = 'oee') as avg_oee,
    AVG(metric_value) FILTER (WHERE metric_name = 'availability') as avg_availability,
    AVG(metric_value) FILTER (WHERE metric_name = 'performance') as avg_performance,
    AVG(metric_value) FILTER (WHERE metric_name = 'quality') as avg_quality,
    SUM(metric_value) FILTER (WHERE metric_name = 'production_count') as total_production,
    SUM(metric_value) FILTER (WHERE metric_name = 'good_count') as total_good,
    SUM(metric_value) FILTER (WHERE metric_name = 'reject_count') as total_reject,
    MIN(metric_value) FILTER (WHERE metric_name = 'oee') as min_oee,
    MAX(metric_value) FILTER (WHERE metric_name = 'oee') as max_oee,
    COUNT(*) as sample_count
FROM manufacturing_metrics
WHERE metric_name IN ('oee', 'availability', 'performance', 'quality', 'production_count', 'good_count', 'reject_count')
GROUP BY bucket, equipment_id
WITH NO DATA;

-- Create continuous aggregates for sensor data (1-minute buckets)
CREATE MATERIALIZED VIEW sensor_1min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', timestamp) AS bucket,
    equipment_id,
    sensor_name,
    AVG(sensor_value) as avg_value,
    MIN(sensor_value) as min_value,
    MAX(sensor_value) as max_value,
    STDDEV(sensor_value) as stddev_value,
    COUNT(*) as sample_count
FROM sensor_readings
WHERE quality = 'good'
GROUP BY bucket, equipment_id, sensor_name
WITH NO DATA;

-- Add refresh policies for continuous aggregates
SELECT add_continuous_aggregate_policy('oee_5min',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes');

SELECT add_continuous_aggregate_policy('oee_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

SELECT add_continuous_aggregate_policy('sensor_1min',
    start_offset => INTERVAL '10 minutes',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

-- Create data retention policies
SELECT add_retention_policy('manufacturing_metrics', INTERVAL '90 days');
SELECT add_retention_policy('sensor_readings', INTERVAL '30 days');
SELECT add_retention_policy('equipment_status', INTERVAL '90 days');

-- Create helper functions for data insertion
CREATE OR REPLACE FUNCTION insert_oee_metrics(
    p_equipment_id UUID,
    p_timestamp TIMESTAMPTZ,
    p_oee DOUBLE PRECISION,
    p_availability DOUBLE PRECISION,
    p_performance DOUBLE PRECISION,
    p_quality DOUBLE PRECISION,
    p_production_count INTEGER,
    p_good_count INTEGER,
    p_reject_count INTEGER,
    p_tags JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    -- Insert OEE components
    INSERT INTO manufacturing_metrics (timestamp, equipment_id, metric_name, metric_value, tags)
    VALUES 
        (p_timestamp, p_equipment_id, 'oee', p_oee, p_tags),
        (p_timestamp, p_equipment_id, 'availability', p_availability, p_tags),
        (p_timestamp, p_equipment_id, 'performance', p_performance, p_tags),
        (p_timestamp, p_equipment_id, 'quality', p_quality, p_tags),
        (p_timestamp, p_equipment_id, 'production_count', p_production_count, p_tags),
        (p_timestamp, p_equipment_id, 'good_count', p_good_count, p_tags),
        (p_timestamp, p_equipment_id, 'reject_count', p_reject_count, p_tags);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO grafana;
GRANT SELECT ON ALL MATERIALIZED VIEWS IN SCHEMA public TO grafana;