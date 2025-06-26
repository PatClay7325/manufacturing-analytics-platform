-- ISO 22400 Compliant Manufacturing Analytics Schema
-- Optimized for TimescaleDB with proper partitioning and indexing
-- Balanced complexity for production use

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==================== REFERENCE DATA TABLES ====================

-- Sites (Manufacturing Plants)
CREATE TABLE IF NOT EXISTS "Site" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    country VARCHAR(2),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_site_active ON "Site"("isActive");

-- Work Centers (Production Lines/Cells)
CREATE TABLE IF NOT EXISTS "WorkCenter" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    "siteId" VARCHAR(30) NOT NULL REFERENCES "Site"(id),
    "workCenterType" VARCHAR(20) NOT NULL CHECK ("workCenterType" IN ('LINE', 'CELL', 'AREA')),
    "costCenter" VARCHAR(50),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workcenter_site ON "WorkCenter"("siteId");
CREATE INDEX idx_workcenter_type ON "WorkCenter"("workCenterType");

-- Equipment (ISO 22400: Work Units)
CREATE TABLE IF NOT EXISTS "Equipment" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    "workCenterId" VARCHAR(30) NOT NULL REFERENCES "WorkCenter"(id),
    "equipmentType" VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    "serialNumber" VARCHAR(100),
    "theoreticalCycleTime" DOUBLE PRECISION, -- seconds per unit
    "nominalSpeed" DOUBLE PRECISION, -- units per hour
    "currentState" VARCHAR(20) DEFAULT 'STOPPED' CHECK ("currentState" IN ('PRODUCING', 'IDLE', 'DOWN', 'PLANNED_STOP')),
    "isActive" BOOLEAN DEFAULT true,
    "commissionDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_equipment_workcenter ON "Equipment"("workCenterId");
CREATE INDEX idx_equipment_type ON "Equipment"("equipmentType");
CREATE INDEX idx_equipment_state ON "Equipment"("currentState");
CREATE INDEX idx_equipment_active ON "Equipment"("isActive", "currentState");

-- Shifts (Critical for OEE context)
CREATE TABLE IF NOT EXISTS "Shift" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "siteId" VARCHAR(30) NOT NULL REFERENCES "Site"(id),
    "shiftCode" VARCHAR(10) NOT NULL,
    "shiftName" VARCHAR(50) NOT NULL,
    "startTime" VARCHAR(5) NOT NULL, -- HH:MM format
    "endTime" VARCHAR(5) NOT NULL,   -- HH:MM format
    "breakMinutes" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    UNIQUE("siteId", "shiftCode")
);

CREATE INDEX idx_shift_site ON "Shift"("siteId");

-- Products
CREATE TABLE IF NOT EXISTS "Product" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    family VARCHAR(50),
    "standardCycleTime" DOUBLE PRECISION, -- seconds
    "targetPPM" INTEGER, -- parts per million defect target
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_family ON "Product"(family);
CREATE INDEX idx_product_active ON "Product"("isActive");

-- ==================== TIME-SERIES TABLES ====================

-- Equipment States (Core for availability tracking)
CREATE TABLE IF NOT EXISTS equipment_states (
    id VARCHAR(30) DEFAULT gen_random_uuid()::text,
    timestamp TIMESTAMPTZ NOT NULL,
    "equipmentId" VARCHAR(30) NOT NULL REFERENCES "Equipment"(id),
    state VARCHAR(20) NOT NULL CHECK (state IN ('PRODUCING', 'IDLE', 'DOWN', 'PLANNED_STOP')),
    "stateCategory" VARCHAR(30) NOT NULL CHECK ("stateCategory" IN ('PRODUCTION', 'AVAILABILITY_LOSS', 'PERFORMANCE_LOSS', 'PLANNED')),
    reason VARCHAR(255),
    "startTime" TIMESTAMPTZ NOT NULL,
    "endTime" TIMESTAMPTZ,
    "durationSeconds" INTEGER,
    "shiftInstanceId" VARCHAR(30),
    "operatorId" VARCHAR(30),
    "productionOrderId" VARCHAR(30),
    PRIMARY KEY (timestamp, "equipmentId", "startTime")
);

-- Convert to hypertable with daily partitions
SELECT create_hypertable('equipment_states', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Indexes for equipment states
CREATE INDEX idx_equipment_states_equipment_time ON equipment_states("equipmentId", timestamp DESC);
CREATE INDEX idx_equipment_states_state_time ON equipment_states(state, timestamp DESC);
CREATE INDEX idx_equipment_states_shift ON equipment_states("shiftInstanceId") WHERE "shiftInstanceId" IS NOT NULL;
CREATE INDEX idx_equipment_states_endtime ON equipment_states("endTime") WHERE "endTime" IS NULL;

-- Production Counts (for performance and quality)
CREATE TABLE IF NOT EXISTS production_counts (
    id VARCHAR(30) DEFAULT gen_random_uuid()::text,
    timestamp TIMESTAMPTZ NOT NULL,
    "equipmentId" VARCHAR(30) NOT NULL REFERENCES "Equipment"(id),
    "totalCount" INTEGER NOT NULL,
    "goodCount" INTEGER NOT NULL,
    "rejectCount" INTEGER NOT NULL,
    "reworkCount" INTEGER DEFAULT 0,
    "productionOrderId" VARCHAR(30),
    "productId" VARCHAR(30),
    "shiftInstanceId" VARCHAR(30),
    "operatorId" VARCHAR(30),
    "actualCycleTime" DOUBLE PRECISION,
    PRIMARY KEY (timestamp, "equipmentId")
);

-- Convert to hypertable with hourly partitions
SELECT create_hypertable('production_counts', 'timestamp', 
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Indexes for production counts
CREATE INDEX idx_production_counts_equipment_time ON production_counts("equipmentId", timestamp DESC);
CREATE INDEX idx_production_counts_shift ON production_counts("shiftInstanceId") WHERE "shiftInstanceId" IS NOT NULL;
CREATE INDEX idx_production_counts_order ON production_counts("productionOrderId") WHERE "productionOrderId" IS NOT NULL;

-- Quality Events (detailed defect tracking)
CREATE TABLE IF NOT EXISTS quality_events (
    id VARCHAR(30) DEFAULT gen_random_uuid()::text,
    timestamp TIMESTAMPTZ NOT NULL,
    "equipmentId" VARCHAR(30) NOT NULL REFERENCES "Equipment"(id),
    "productId" VARCHAR(30),
    "eventType" VARCHAR(20) NOT NULL CHECK ("eventType" IN ('DEFECT', 'REWORK', 'SCRAP')),
    "defectCode" VARCHAR(50),
    "defectCategory" VARCHAR(50),
    quantity INTEGER NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('CRITICAL', 'MAJOR', 'MINOR')),
    "productionOrderId" VARCHAR(30),
    "shiftInstanceId" VARCHAR(30),
    "operatorId" VARCHAR(30),
    PRIMARY KEY (timestamp, "equipmentId", id)
);

-- Convert to hypertable
SELECT create_hypertable('quality_events', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Indexes for quality events
CREATE INDEX idx_quality_events_equipment_time ON quality_events("equipmentId", timestamp DESC);
CREATE INDEX idx_quality_events_type_time ON quality_events("eventType", timestamp DESC);
CREATE INDEX idx_quality_events_category ON quality_events("defectCategory");

-- ==================== PRODUCTION CONTEXT TABLES ====================

-- Shift Instances (actual shift occurrences)
CREATE TABLE IF NOT EXISTS "ShiftInstance" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shiftId" VARCHAR(30) NOT NULL REFERENCES "Shift"(id),
    "shiftDate" DATE NOT NULL,
    "actualStartTime" TIMESTAMPTZ NOT NULL,
    "actualEndTime" TIMESTAMPTZ,
    "plannedMinutes" INTEGER NOT NULL,
    "breakMinutes" INTEGER NOT NULL,
    UNIQUE("shiftId", "shiftDate")
);

CREATE INDEX idx_shift_instance_date ON "ShiftInstance"("shiftDate");
CREATE INDEX idx_shift_instance_shift ON "ShiftInstance"("shiftId");

-- Production Orders
CREATE TABLE IF NOT EXISTS "ProductionOrder" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderNumber" VARCHAR(50) UNIQUE NOT NULL,
    "workCenterId" VARCHAR(30) NOT NULL REFERENCES "WorkCenter"(id),
    "productId" VARCHAR(30) NOT NULL REFERENCES "Product"(id),
    "plannedQuantity" INTEGER NOT NULL,
    "producedQuantity" INTEGER DEFAULT 0,
    "goodQuantity" INTEGER DEFAULT 0,
    "plannedStartTime" TIMESTAMPTZ NOT NULL,
    "plannedEndTime" TIMESTAMPTZ NOT NULL,
    "actualStartTime" TIMESTAMPTZ,
    "actualEndTime" TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'RELEASED', 'STARTED', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX idx_production_order_workcenter ON "ProductionOrder"("workCenterId");
CREATE INDEX idx_production_order_product ON "ProductionOrder"("productId");
CREATE INDEX idx_production_order_status ON "ProductionOrder"(status);
CREATE INDEX idx_production_order_planned_start ON "ProductionOrder"("plannedStartTime");

-- ==================== CALCULATED METRICS ====================

-- OEE Calculations (pre-calculated for performance)
CREATE TABLE IF NOT EXISTS oee_calculations (
    id VARCHAR(30) DEFAULT gen_random_uuid()::text,
    timestamp TIMESTAMPTZ NOT NULL,
    "equipmentId" VARCHAR(30) NOT NULL REFERENCES "Equipment"(id),
    "shiftInstanceId" VARCHAR(30) NOT NULL REFERENCES "ShiftInstance"(id),
    
    -- Time periods in minutes
    "plannedTime" DOUBLE PRECISION NOT NULL,
    "availableTime" DOUBLE PRECISION NOT NULL,
    "operatingTime" DOUBLE PRECISION NOT NULL,
    "netOperatingTime" DOUBLE PRECISION NOT NULL,
    "productiveTime" DOUBLE PRECISION NOT NULL,
    
    -- OEE components (0-1)
    availability DOUBLE PRECISION NOT NULL CHECK (availability >= 0 AND availability <= 1),
    performance DOUBLE PRECISION NOT NULL CHECK (performance >= 0 AND performance <= 1),
    quality DOUBLE PRECISION NOT NULL CHECK (quality >= 0 AND quality <= 1),
    oee DOUBLE PRECISION NOT NULL CHECK (oee >= 0 AND oee <= 1),
    teep DOUBLE PRECISION CHECK (teep >= 0 AND teep <= 1),
    
    -- Counts
    "totalProduced" INTEGER NOT NULL,
    "goodProduced" INTEGER NOT NULL,
    "defectCount" INTEGER NOT NULL,
    "reworkCount" INTEGER NOT NULL,
    
    -- Loss tracking in minutes
    "breakdownLoss" DOUBLE PRECISION DEFAULT 0,
    "setupLoss" DOUBLE PRECISION DEFAULT 0,
    "minorStopLoss" DOUBLE PRECISION DEFAULT 0,
    "speedLoss" DOUBLE PRECISION DEFAULT 0,
    "defectLoss" DOUBLE PRECISION DEFAULT 0,
    "reworkLoss" DOUBLE PRECISION DEFAULT 0,
    
    "calculatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (timestamp, "equipmentId", "shiftInstanceId")
);

-- Convert to hypertable
SELECT create_hypertable('oee_calculations', 'timestamp', 
    chunk_time_interval => INTERVAL '1 week',
    if_not_exists => TRUE
);

-- Indexes for OEE calculations
CREATE INDEX idx_oee_calculations_equipment_time ON oee_calculations("equipmentId", timestamp DESC);
CREATE INDEX idx_oee_calculations_shift ON oee_calculations("shiftInstanceId");

-- Maintenance Events
CREATE TABLE IF NOT EXISTS "MaintenanceEvent" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "equipmentId" VARCHAR(30) NOT NULL REFERENCES "Equipment"(id),
    "eventType" VARCHAR(20) NOT NULL CHECK ("eventType" IN ('BREAKDOWN', 'PREVENTIVE', 'PREDICTIVE')),
    "startTime" TIMESTAMPTZ NOT NULL,
    "endTime" TIMESTAMPTZ,
    "durationMinutes" INTEGER,
    description TEXT,
    severity VARCHAR(20) CHECK (severity IN ('CRITICAL', 'MAJOR', 'MINOR')),
    "rootCause" VARCHAR(255),
    "actionTaken" TEXT,
    "laborHours" DOUBLE PRECISION,
    "partsCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION
);

CREATE INDEX idx_maintenance_equipment_time ON "MaintenanceEvent"("equipmentId", "startTime" DESC);
CREATE INDEX idx_maintenance_type ON "MaintenanceEvent"("eventType");

-- ==================== SYSTEM TABLES ====================

-- Users
CREATE TABLE IF NOT EXISTS "User" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    "employeeId" VARCHAR(50) UNIQUE,
    role VARCHAR(20) DEFAULT 'operator',
    "siteId" VARCHAR(30) REFERENCES "Site"(id),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_site ON "User"("siteId");

-- Sessions
CREATE TABLE IF NOT EXISTS "Session" (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" VARCHAR(30) NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_session_token ON "Session"(token);
CREATE INDEX idx_session_user ON "Session"("userId");

-- ==================== CONTINUOUS AGGREGATES ====================

-- Hourly OEE by equipment
CREATE MATERIALIZED VIEW oee_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS hour,
    "equipmentId",
    AVG(oee) as avg_oee,
    AVG(availability) as avg_availability,
    AVG(performance) as avg_performance,
    AVG(quality) as avg_quality,
    SUM("totalProduced") as total_produced,
    SUM("goodProduced") as good_produced,
    COUNT(*) as calculation_count
FROM oee_calculations
GROUP BY hour, "equipmentId"
WITH NO DATA;

-- Daily OEE by work center
CREATE MATERIALIZED VIEW oee_daily_workcenter
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', oc.timestamp) AS day,
    e."workCenterId",
    AVG(oc.oee) as avg_oee,
    AVG(oc.availability) as avg_availability,
    AVG(oc.performance) as avg_performance,
    AVG(oc.quality) as avg_quality,
    SUM(oc."totalProduced") as total_produced,
    SUM(oc."goodProduced") as good_produced
FROM oee_calculations oc
JOIN "Equipment" e ON oc."equipmentId" = e.id
GROUP BY day, e."workCenterId"
WITH NO DATA;

-- ==================== POLICIES ====================

-- Compression policies
ALTER TABLE equipment_states SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = '"equipmentId"',
    timescaledb.compress_orderby = 'timestamp DESC'
);

ALTER TABLE production_counts SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = '"equipmentId"',
    timescaledb.compress_orderby = 'timestamp DESC'
);

-- Add compression policies (compress data older than 7 days)
SELECT add_compression_policy('equipment_states', INTERVAL '7 days');
SELECT add_compression_policy('production_counts', INTERVAL '7 days');
SELECT add_compression_policy('quality_events', INTERVAL '30 days');
SELECT add_compression_policy('oee_calculations', INTERVAL '30 days');

-- Retention policies (keep 2 years of data)
SELECT add_retention_policy('equipment_states', INTERVAL '2 years');
SELECT add_retention_policy('production_counts', INTERVAL '2 years');
SELECT add_retention_policy('quality_events', INTERVAL '3 years');
SELECT add_retention_policy('oee_calculations', INTERVAL '5 years');

-- Continuous aggregate policies
SELECT add_continuous_aggregate_policy('oee_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '30 minutes');

SELECT add_continuous_aggregate_policy('oee_daily_workcenter',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- ==================== HELPER FUNCTIONS ====================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updatedAt
CREATE TRIGGER update_site_updated BEFORE UPDATE ON "Site"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_workcenter_updated BEFORE UPDATE ON "WorkCenter"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_equipment_updated BEFORE UPDATE ON "Equipment"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_product_updated BEFORE UPDATE ON "Product"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_updated BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate OEE for a shift
CREATE OR REPLACE FUNCTION calculate_shift_oee(
    p_equipment_id VARCHAR,
    p_shift_instance_id VARCHAR
) RETURNS VOID AS $$
DECLARE
    v_shift_start TIMESTAMPTZ;
    v_shift_end TIMESTAMPTZ;
    v_planned_minutes DOUBLE PRECISION;
    v_operating_time DOUBLE PRECISION;
    v_total_produced INTEGER;
    v_good_produced INTEGER;
    v_theoretical_output DOUBLE PRECISION;
BEGIN
    -- Get shift details
    SELECT si."actualStartTime", si."actualEndTime", si."plannedMinutes"
    INTO v_shift_start, v_shift_end, v_planned_minutes
    FROM "ShiftInstance" si
    WHERE si.id = p_shift_instance_id;
    
    -- Calculate operating time from equipment states
    SELECT COALESCE(SUM(
        CASE 
            WHEN state = 'PRODUCING' THEN 
                EXTRACT(EPOCH FROM (COALESCE("endTime", v_shift_end) - "startTime")) / 60
            ELSE 0
        END
    ), 0)
    INTO v_operating_time
    FROM equipment_states
    WHERE "equipmentId" = p_equipment_id
    AND "shiftInstanceId" = p_shift_instance_id;
    
    -- Get production counts
    SELECT 
        COALESCE(SUM("totalCount"), 0),
        COALESCE(SUM("goodCount"), 0)
    INTO v_total_produced, v_good_produced
    FROM production_counts
    WHERE "equipmentId" = p_equipment_id
    AND "shiftInstanceId" = p_shift_instance_id;
    
    -- Calculate theoretical output based on cycle time
    SELECT (v_operating_time * 60) / COALESCE(e."theoreticalCycleTime", 60)
    INTO v_theoretical_output
    FROM "Equipment" e
    WHERE e.id = p_equipment_id;
    
    -- Insert OEE calculation
    INSERT INTO oee_calculations (
        timestamp,
        "equipmentId",
        "shiftInstanceId",
        "plannedTime",
        "operatingTime",
        "availableTime",
        "netOperatingTime",
        "productiveTime",
        availability,
        performance,
        quality,
        oee,
        "totalProduced",
        "goodProduced",
        "defectCount",
        "reworkCount"
    ) VALUES (
        v_shift_end,
        p_equipment_id,
        p_shift_instance_id,
        v_planned_minutes,
        v_operating_time,
        v_planned_minutes, -- Simplified for now
        v_operating_time * LEAST(v_total_produced / NULLIF(v_theoretical_output, 0), 1),
        v_operating_time * LEAST(v_total_produced / NULLIF(v_theoretical_output, 0), 1) * (v_good_produced::DOUBLE PRECISION / NULLIF(v_total_produced, 0)),
        v_operating_time / NULLIF(v_planned_minutes, 0),
        LEAST(v_total_produced::DOUBLE PRECISION / NULLIF(v_theoretical_output, 0), 1),
        v_good_produced::DOUBLE PRECISION / NULLIF(v_total_produced, 0),
        (v_operating_time / NULLIF(v_planned_minutes, 0)) *
        LEAST(v_total_produced::DOUBLE PRECISION / NULLIF(v_theoretical_output, 0), 1) *
        (v_good_produced::DOUBLE PRECISION / NULLIF(v_total_produced, 0)),
        v_total_produced,
        v_good_produced,
        v_total_produced - v_good_produced,
        0 -- Rework count would come from quality events
    );
END;
$$ LANGUAGE plpgsql;