-- TimescaleDB Performance Optimization Setup
-- This migration optimizes your PostgreSQL database for Grafana-level performance

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert Metric table to hypertable for time-series optimization
SELECT create_hypertable(
  '"Metric"',
  'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Convert PerformanceMetric table to hypertable
SELECT create_hypertable(
  '"PerformanceMetric"',
  'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Add compression policy for Metric table (compress data older than 7 days)
ALTER TABLE "Metric" SET (
  timescaledb.compress,
  timescaledb.compress_orderby = 'timestamp DESC',
  timescaledb.compress_segmentby = '"workUnitId", name'
);

SELECT add_compression_policy('"Metric"', INTERVAL '7 days');

-- Add compression policy for PerformanceMetric table
ALTER TABLE "PerformanceMetric" SET (
  timescaledb.compress,
  timescaledb.compress_orderby = 'timestamp DESC',
  timescaledb.compress_segmentby = '"workUnitId"'
);

SELECT add_compression_policy('"PerformanceMetric"', INTERVAL '7 days');

-- Create continuous aggregate for 1-minute OEE metrics
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

-- Create continuous aggregate for 5-minute metrics
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

-- Create continuous aggregate for hourly metrics
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

-- Create continuous aggregate for daily metrics
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

-- Add refresh policies for continuous aggregates
SELECT add_continuous_aggregate_policy('oee_metrics_1min',
  start_offset => INTERVAL '2 hours',
  end_offset => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute'
);

SELECT add_continuous_aggregate_policy('oee_metrics_5min',
  start_offset => INTERVAL '6 hours',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes'
);

SELECT add_continuous_aggregate_policy('oee_metrics_hourly',
  start_offset => INTERVAL '2 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);

SELECT add_continuous_aggregate_policy('oee_metrics_daily',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day'
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_metric_workunit_name_time 
ON "Metric" ("workUnitId", name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_performance_workunit_time 
ON "PerformanceMetric" ("workUnitId", timestamp DESC);

-- Add data retention policy (optional - keeps only 1 year of raw data)
-- SELECT add_retention_policy('"Metric"', INTERVAL '1 year');
-- SELECT add_retention_policy('"PerformanceMetric"', INTERVAL '1 year');

-- Create function for real-time notifications
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

-- Create trigger for real-time updates
CREATE TRIGGER metric_update_notify
AFTER INSERT ON "Metric"
FOR EACH ROW
EXECUTE FUNCTION notify_metric_update();

-- Refresh all aggregates with historical data
CALL refresh_continuous_aggregate('oee_metrics_1min', NULL, NULL);
CALL refresh_continuous_aggregate('oee_metrics_5min', NULL, NULL);
CALL refresh_continuous_aggregate('oee_metrics_hourly', NULL, NULL);
CALL refresh_continuous_aggregate('oee_metrics_daily', NULL, NULL);