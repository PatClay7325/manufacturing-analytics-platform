-- Simplified Schema Migration with Proper Indexes and TimescaleDB Setup
-- This replaces the overly complex 17-table schema with 7 core tables

-- Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 1. Sites table (simple manufacturing locations)
CREATE TABLE IF NOT EXISTS "Site" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_site_active ON "Site"("isActive");

-- 2. Equipment table (simplified)
CREATE TABLE IF NOT EXISTS "Equipment" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    "siteId" VARCHAR(30) NOT NULL REFERENCES "Site"(id),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Proper compound indexes for common queries
CREATE INDEX idx_equipment_site ON "Equipment"("siteId");
CREATE INDEX idx_equipment_type ON "Equipment"(type);
CREATE INDEX idx_equipment_active ON "Equipment"("isActive");
CREATE INDEX idx_equipment_site_type ON "Equipment"("siteId", type); -- Compound index

-- 3. Metrics table (for time-series data)
CREATE TABLE IF NOT EXISTS metrics (
    id VARCHAR(30) DEFAULT gen_random_uuid()::text,
    timestamp TIMESTAMPTZ NOT NULL,
    "equipmentId" VARCHAR(30) NOT NULL REFERENCES "Equipment"(id),
    "metricType" VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quality INTEGER DEFAULT 192,
    PRIMARY KEY (timestamp, "equipmentId", "metricType")
);

-- Convert to hypertable with proper partitioning
SELECT create_hypertable('metrics', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Indexes for time-series queries
CREATE INDEX idx_metrics_equipment_time ON metrics("equipmentId", timestamp DESC);
CREATE INDEX idx_metrics_type_time ON metrics("metricType", timestamp DESC);

-- Add compression policy (compress data older than 7 days)
ALTER TABLE metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = '"equipmentId","metricType"',
    timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy('metrics', INTERVAL '7 days');

-- 4. OEE Data table
CREATE TABLE IF NOT EXISTS oee_data (
    id VARCHAR(30) DEFAULT gen_random_uuid()::text,
    timestamp TIMESTAMPTZ NOT NULL,
    "equipmentId" VARCHAR(30) NOT NULL REFERENCES "Equipment"(id),
    "shiftStartTime" TIMESTAMPTZ NOT NULL,
    "shiftEndTime" TIMESTAMPTZ NOT NULL,
    availability DOUBLE PRECISION NOT NULL CHECK (availability >= 0 AND availability <= 100),
    performance DOUBLE PRECISION NOT NULL CHECK (performance >= 0 AND performance <= 100),
    quality DOUBLE PRECISION NOT NULL CHECK (quality >= 0 AND quality <= 100),
    oee DOUBLE PRECISION NOT NULL CHECK (oee >= 0 AND oee <= 100),
    "plannedTime" INTEGER NOT NULL,
    "runTime" INTEGER NOT NULL,
    "idealCycleTime" DOUBLE PRECISION NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "goodCount" INTEGER NOT NULL,
    PRIMARY KEY (timestamp, "equipmentId")
);

-- Convert to hypertable
SELECT create_hypertable('oee_data', 'timestamp', 
    chunk_time_interval => INTERVAL '1 week',
    if_not_exists => TRUE
);

-- Index for equipment-based queries
CREATE INDEX idx_oee_equipment_time ON oee_data("equipmentId", timestamp DESC);

-- Create continuous aggregate for hourly OEE (simplified)
CREATE MATERIALIZED VIEW oee_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS hour,
    "equipmentId",
    AVG(oee) as avg_oee,
    AVG(availability) as avg_availability,
    AVG(performance) as avg_performance,
    AVG(quality) as avg_quality,
    COUNT(*) as sample_count
FROM oee_data
GROUP BY hour, "equipmentId"
WITH NO DATA;

-- Refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('oee_hourly',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- 5. Alerts table (simplified)
CREATE TABLE IF NOT EXISTS "Alert" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "equipmentId" VARCHAR(30) NOT NULL REFERENCES "Equipment"(id),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    acknowledged BOOLEAN DEFAULT false,
    "acknowledgedAt" TIMESTAMPTZ,
    "acknowledgedBy" VARCHAR(30)
);

-- Indexes for alert queries
CREATE INDEX idx_alert_equipment_active ON "Alert"("equipmentId", "isActive");
CREATE INDEX idx_alert_severity_active ON "Alert"(severity, "isActive");
CREATE INDEX idx_alert_timestamp ON "Alert"(timestamp DESC);

-- 6. Users table (simplified)
CREATE TABLE IF NOT EXISTS "User" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'operator' CHECK (role IN ('operator', 'supervisor', 'admin')),
    "siteId" VARCHAR(30) REFERENCES "Site"(id),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_site ON "User"("siteId");

-- 7. Sessions table
CREATE TABLE IF NOT EXISTS "Session" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" VARCHAR(30) NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_session_token ON "Session"(token);
CREATE INDEX idx_session_user ON "Session"("userId");

-- Add update triggers for updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_site_updated_at BEFORE UPDATE ON "Site"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON "Equipment"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Data retention policies (keep 2 years of data)
SELECT add_retention_policy('metrics', INTERVAL '2 years');
SELECT add_retention_policy('oee_data', INTERVAL '2 years');