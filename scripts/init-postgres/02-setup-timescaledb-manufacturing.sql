-- TimescaleDB Setup for Manufacturing Database
-- This script optimizes the main manufacturing database for Grafana-level performance

-- Connect to manufacturing database
\c manufacturing;

-- Enable TimescaleDB if not already enabled
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Check if tables exist and are not already hypertables
DO $$
BEGIN
    -- Convert Metric table to hypertable if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Metric') 
       AND NOT EXISTS (SELECT FROM timescaledb_information.hypertables WHERE hypertable_name = 'Metric') THEN
        PERFORM create_hypertable(
            '"Metric"',
            'timestamp',
            chunk_time_interval => INTERVAL '1 day',
            if_not_exists => TRUE
        );
        RAISE NOTICE 'Converted Metric table to hypertable';
    END IF;

    -- Convert PerformanceMetric table to hypertable if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'PerformanceMetric') 
       AND NOT EXISTS (SELECT FROM timescaledb_information.hypertables WHERE hypertable_name = 'PerformanceMetric') THEN
        PERFORM create_hypertable(
            '"PerformanceMetric"',
            'timestamp',
            chunk_time_interval => INTERVAL '1 day',
            if_not_exists => TRUE
        );
        RAISE NOTICE 'Converted PerformanceMetric table to hypertable';
    END IF;
END $$;

-- Set up compression policies (only if tables are hypertables)
DO $$
BEGIN
    IF EXISTS (SELECT FROM timescaledb_information.hypertables WHERE hypertable_name = 'Metric') THEN
        -- Add compression settings for Metric table
        ALTER TABLE "Metric" SET (
            timescaledb.compress,
            timescaledb.compress_orderby = 'timestamp DESC',
            timescaledb.compress_segmentby = '"workUnitId", name'
        );
        
        -- Add compression policy
        PERFORM add_compression_policy('"Metric"', INTERVAL '7 days', if_not_exists => TRUE);
        RAISE NOTICE 'Added compression policy for Metric table';
    END IF;

    IF EXISTS (SELECT FROM timescaledb_information.hypertables WHERE hypertable_name = 'PerformanceMetric') THEN
        -- Add compression settings for PerformanceMetric table
        ALTER TABLE "PerformanceMetric" SET (
            timescaledb.compress,
            timescaledb.compress_orderby = 'timestamp DESC',
            timescaledb.compress_segmentby = '"workUnitId"'
        );
        
        -- Add compression policy
        PERFORM add_compression_policy('"PerformanceMetric"', INTERVAL '7 days', if_not_exists => TRUE);
        RAISE NOTICE 'Added compression policy for PerformanceMetric table';
    END IF;
END $$;

-- Create continuous aggregates only if base tables exist
DO $$
BEGIN
    -- OEE 1-minute aggregates
    IF EXISTS (SELECT FROM timescaledb_information.hypertables WHERE hypertable_name = 'PerformanceMetric') 
       AND NOT EXISTS (SELECT FROM timescaledb_information.continuous_aggregates WHERE view_name = 'oee_metrics_1min') THEN
        CREATE MATERIALIZED VIEW oee_metrics_1min
        WITH (timescaledb.continuous) AS
        SELECT 
            "workUnitId",
            time_bucket('1 minute', timestamp) AS bucket,
            AVG("oeeScore") as avg_oee,
            AVG(availability) as avg_availability,
            AVG(performance) as avg_performance,
            AVG(quality) as avg_quality,
            COUNT(*) as sample_count,
            MAX(timestamp) as last_updated
        FROM "PerformanceMetric"
        GROUP BY "workUnitId", bucket
        WITH NO DATA;
        
        -- Add refresh policy
        PERFORM add_continuous_aggregate_policy('oee_metrics_1min',
            start_offset => INTERVAL '2 hours',
            end_offset => INTERVAL '1 minute',
            schedule_interval => INTERVAL '1 minute',
            if_not_exists => TRUE
        );
        RAISE NOTICE 'Created oee_metrics_1min continuous aggregate';
    END IF;

    -- OEE 5-minute aggregates
    IF EXISTS (SELECT FROM timescaledb_information.continuous_aggregates WHERE view_name = 'oee_metrics_1min')
       AND NOT EXISTS (SELECT FROM timescaledb_information.continuous_aggregates WHERE view_name = 'oee_metrics_5min') THEN
        CREATE MATERIALIZED VIEW oee_metrics_5min
        WITH (timescaledb.continuous) AS
        SELECT 
            "workUnitId",
            time_bucket('5 minutes', bucket) AS bucket,
            AVG(avg_oee) as avg_oee,
            AVG(avg_availability) as avg_availability,
            AVG(avg_performance) as avg_performance,
            AVG(avg_quality) as avg_quality,
            SUM(sample_count) as sample_count,
            MAX(last_updated) as last_updated
        FROM oee_metrics_1min
        GROUP BY "workUnitId", time_bucket('5 minutes', bucket)
        WITH NO DATA;
        
        -- Add refresh policy
        PERFORM add_continuous_aggregate_policy('oee_metrics_5min',
            start_offset => INTERVAL '6 hours',
            end_offset => INTERVAL '5 minutes',
            schedule_interval => INTERVAL '5 minutes',
            if_not_exists => TRUE
        );
        RAISE NOTICE 'Created oee_metrics_5min continuous aggregate';
    END IF;

    -- OEE hourly aggregates
    IF EXISTS (SELECT FROM timescaledb_information.continuous_aggregates WHERE view_name = 'oee_metrics_5min')
       AND NOT EXISTS (SELECT FROM timescaledb_information.continuous_aggregates WHERE view_name = 'oee_metrics_hourly') THEN
        CREATE MATERIALIZED VIEW oee_metrics_hourly
        WITH (timescaledb.continuous) AS
        SELECT 
            "workUnitId",
            time_bucket('1 hour', bucket) AS bucket,
            AVG(avg_oee) as avg_oee,
            AVG(avg_availability) as avg_availability,
            AVG(avg_performance) as avg_performance,
            AVG(avg_quality) as avg_quality,
            SUM(sample_count) as sample_count,
            MAX(last_updated) as last_updated
        FROM oee_metrics_5min
        GROUP BY "workUnitId", time_bucket('1 hour', bucket)
        WITH NO DATA;
        
        -- Add refresh policy
        PERFORM add_continuous_aggregate_policy('oee_metrics_hourly',
            start_offset => INTERVAL '2 days',
            end_offset => INTERVAL '1 hour',
            schedule_interval => INTERVAL '1 hour',
            if_not_exists => TRUE
        );
        RAISE NOTICE 'Created oee_metrics_hourly continuous aggregate';
    END IF;

    -- OEE daily aggregates
    IF EXISTS (SELECT FROM timescaledb_information.continuous_aggregates WHERE view_name = 'oee_metrics_hourly')
       AND NOT EXISTS (SELECT FROM timescaledb_information.continuous_aggregates WHERE view_name = 'oee_metrics_daily') THEN
        CREATE MATERIALIZED VIEW oee_metrics_daily
        WITH (timescaledb.continuous) AS
        SELECT 
            "workUnitId",
            time_bucket('1 day', bucket) AS bucket,
            AVG(avg_oee) as avg_oee,
            AVG(avg_availability) as avg_availability,
            AVG(avg_performance) as avg_performance,
            AVG(avg_quality) as avg_quality,
            MIN(avg_oee) as min_oee,
            MAX(avg_oee) as max_oee,
            SUM(sample_count) as sample_count,
            MAX(last_updated) as last_updated
        FROM oee_metrics_hourly
        GROUP BY "workUnitId", time_bucket('1 day', bucket)
        WITH NO DATA;
        
        -- Add refresh policy
        PERFORM add_continuous_aggregate_policy('oee_metrics_daily',
            start_offset => INTERVAL '7 days',
            end_offset => INTERVAL '1 day',
            schedule_interval => INTERVAL '1 day',
            if_not_exists => TRUE
        );
        RAISE NOTICE 'Created oee_metrics_daily continuous aggregate';
    END IF;
END $$;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_metric_workunit_name_time 
ON "Metric" ("workUnitId", name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_performance_workunit_time 
ON "PerformanceMetric" ("workUnitId", timestamp DESC);

-- Create real-time notification function
CREATE OR REPLACE FUNCTION notify_metric_update() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify(
        'metric_updates_' || NEW."workUnitId",
        json_build_object(
            'metric', NEW.name,
            'value', NEW.value,
            'timestamp', NEW.timestamp
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time updates (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Metric') THEN
        DROP TRIGGER IF EXISTS metric_update_notify ON "Metric";
        CREATE TRIGGER metric_update_notify
        AFTER INSERT ON "Metric"
        FOR EACH ROW
        EXECUTE FUNCTION notify_metric_update();
        RAISE NOTICE 'Created real-time notification trigger';
    END IF;
END $$;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Output summary
DO $$
DECLARE
    hypertable_count INTEGER;
    aggregate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO hypertable_count FROM timescaledb_information.hypertables;
    SELECT COUNT(*) INTO aggregate_count FROM timescaledb_information.continuous_aggregates;
    
    RAISE NOTICE 'TimescaleDB setup complete:';
    RAISE NOTICE '  Hypertables: %', hypertable_count;
    RAISE NOTICE '  Continuous Aggregates: %', aggregate_count;
END $$;