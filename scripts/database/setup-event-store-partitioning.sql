-- Event Store Partitioning for Long-term Scalability
-- Manufacturing Analytics Platform

-- Create partitioned audit_event table
-- This replaces the existing audit_event table for better performance at scale

BEGIN;

-- First, create the new partitioned table structure
CREATE TABLE IF NOT EXISTS audit.audit_event_partitioned (
    event_id        BIGSERIAL,
    event_type      TEXT NOT NULL,
    aggregate_id    TEXT NOT NULL,
    aggregate_type  TEXT NOT NULL,
    event_data      JSONB NOT NULL,
    event_metadata  JSONB,
    user_id         TEXT,
    correlation_id  TEXT,
    causation_id    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (event_id, created_at)
) PARTITION BY RANGE (created_at);

-- Create indexes on the partitioned table
CREATE INDEX IF NOT EXISTS idx_audit_event_part_aggregate 
ON audit.audit_event_partitioned (aggregate_type, aggregate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_event_part_type 
ON audit.audit_event_partitioned (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_event_part_correlation 
ON audit.audit_event_partitioned (correlation_id) 
WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_event_part_event_data 
ON audit.audit_event_partitioned USING GIN (event_data);

-- Function to create monthly partitions
CREATE OR REPLACE FUNCTION audit.create_monthly_partition(
    table_name TEXT,
    start_date DATE
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    -- Calculate partition name and end date
    partition_name := table_name || '_y' || EXTRACT(YEAR FROM start_date) || 
                     'm' || LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');
    end_date := start_date + INTERVAL '1 month';
    
    -- Create the partition
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS audit.%I PARTITION OF audit.%I 
         FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        table_name,
        start_date,
        end_date
    );
    
    -- Add partition-specific indexes for better query performance
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I_equipment_idx 
         ON audit.%I (aggregate_id, created_at DESC) 
         WHERE aggregate_type = ''equipment''',
        partition_name,
        partition_name
    );
    
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I_production_idx 
         ON audit.%I (aggregate_id, created_at DESC) 
         WHERE aggregate_type = ''production''',
        partition_name,
        partition_name
    );
    
    RAISE NOTICE 'Created partition: %', partition_name;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create partitions
CREATE OR REPLACE FUNCTION audit.ensure_partition_exists(
    target_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS VOID AS $$
DECLARE
    start_of_month DATE;
    next_month DATE;
    partition_name TEXT;
BEGIN
    -- Calculate start of current and next month
    start_of_month := DATE_TRUNC('month', target_date)::DATE;
    next_month := start_of_month + INTERVAL '1 month';
    
    -- Create current month partition
    PERFORM audit.create_monthly_partition('audit_event_partitioned', start_of_month);
    
    -- Create next month partition (for writes that might span month boundary)
    PERFORM audit.create_monthly_partition('audit_event_partitioned', next_month::DATE);
END;
$$ LANGUAGE plpgsql;

-- Create initial partitions (current month + next 6 months)
DO $$
DECLARE
    i INTEGER;
    partition_date DATE;
BEGIN
    FOR i IN 0..6 LOOP
        partition_date := (DATE_TRUNC('month', NOW()) + (i || ' months')::INTERVAL)::DATE;
        PERFORM audit.create_monthly_partition('audit_event_partitioned', partition_date);
    END LOOP;
END $$;

-- Function to automatically clean old partitions
CREATE OR REPLACE FUNCTION audit.cleanup_old_partitions(
    retention_months INTEGER DEFAULT 24
) RETURNS INTEGER AS $$
DECLARE
    cutoff_date DATE;
    partition_record RECORD;
    dropped_count INTEGER := 0;
BEGIN
    cutoff_date := (DATE_TRUNC('month', NOW()) - (retention_months || ' months')::INTERVAL)::DATE;
    
    -- Find and drop old partitions
    FOR partition_record IN
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'audit' 
        AND tablename LIKE 'audit_event_partitioned_y%'
        AND tablename < 'audit_event_partitioned_y' || EXTRACT(YEAR FROM cutoff_date) ||
                        'm' || LPAD(EXTRACT(MONTH FROM cutoff_date)::TEXT, 2, '0')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS audit.%I', partition_record.tablename);
        RAISE NOTICE 'Dropped old partition: %', partition_record.tablename;
        dropped_count := dropped_count + 1;
    END LOOP;
    
    RETURN dropped_count;
END;
$$ LANGUAGE plpgsql;

-- Migration function to move data from old table to partitioned table
CREATE OR REPLACE FUNCTION audit.migrate_to_partitioned_events() RETURNS VOID AS $$
DECLARE
    batch_size INTEGER := 10000;
    total_migrated BIGINT := 0;
    batch_count INTEGER := 0;
BEGIN
    -- Ensure partitions exist for existing data
    PERFORM audit.ensure_partition_exists();
    
    -- Check if old table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'audit' AND table_name = 'audit_event') THEN
        
        RAISE NOTICE 'Starting migration from audit_event to audit_event_partitioned...';
        
        -- Migrate data in batches to avoid long locks
        LOOP
            INSERT INTO audit.audit_event_partitioned 
            SELECT * FROM audit.audit_event 
            WHERE event_id NOT IN (
                SELECT event_id FROM audit.audit_event_partitioned 
                WHERE event_id IS NOT NULL
            )
            LIMIT batch_size;
            
            GET DIAGNOSTICS batch_count = ROW_COUNT;
            total_migrated := total_migrated + batch_count;
            
            RAISE NOTICE 'Migrated batch: % rows (Total: %)', batch_count, total_migrated;
            
            -- Exit when no more rows to migrate
            EXIT WHEN batch_count = 0;
            
            -- Small delay to prevent overwhelming the system
            PERFORM pg_sleep(0.1);
        END LOOP;
        
        RAISE NOTICE 'Migration completed. Total rows migrated: %', total_migrated;
        
        -- Rename tables (keep old as backup initially)
        ALTER TABLE audit.audit_event RENAME TO audit_event_backup;
        ALTER TABLE audit.audit_event_partitioned RENAME TO audit_event;
        
        RAISE NOTICE 'Tables renamed. Old table backed up as audit_event_backup';
    ELSE
        -- If no old table exists, just rename the partitioned table
        ALTER TABLE audit.audit_event_partitioned RENAME TO audit_event;
        RAISE NOTICE 'Partitioned table ready as audit_event';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Set up automatic partition maintenance job trigger
CREATE OR REPLACE FUNCTION audit.partition_maintenance_trigger() 
RETURNS trigger AS $$
BEGIN
    -- Ensure partition exists for the new row's timestamp
    PERFORM audit.ensure_partition_exists(NEW.created_at);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create partitions on insert
CREATE TRIGGER ensure_partition_trigger
    BEFORE INSERT ON audit.audit_event_partitioned
    FOR EACH ROW
    EXECUTE FUNCTION audit.partition_maintenance_trigger();

-- Create a view for easy querying across all partitions
CREATE OR REPLACE VIEW audit.v_audit_events AS
SELECT 
    event_id,
    event_type,
    aggregate_id,
    aggregate_type,
    event_data,
    event_metadata,
    user_id,
    correlation_id,
    causation_id,
    created_at,
    -- Add partition information for monitoring
    pg_size_pretty(pg_total_relation_size(tableoid)) AS partition_size,
    schemaname || '.' || tablename AS partition_name
FROM audit.audit_event_partitioned ae
JOIN pg_tables pt ON pt.tablename = pg_class.relname
JOIN pg_class ON pg_class.oid = ae.tableoid;

-- Function to get partition statistics
CREATE OR REPLACE FUNCTION audit.get_partition_stats()
RETURNS TABLE (
    partition_name TEXT,
    row_count BIGINT,
    size_bytes BIGINT,
    size_pretty TEXT,
    min_date TIMESTAMPTZ,
    max_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.schemaname || '.' || pt.tablename,
        (SELECT count(*) FROM information_schema.tables WHERE table_name = pt.tablename)::BIGINT,
        pg_total_relation_size(pt.schemaname || '.' || pt.tablename),
        pg_size_pretty(pg_total_relation_size(pt.schemaname || '.' || pt.tablename)),
        (SELECT min(created_at) FROM audit.audit_event WHERE tableoid = (pt.schemaname || '.' || pt.tablename)::regclass),
        (SELECT max(created_at) FROM audit.audit_event WHERE tableoid = (pt.schemaname || '.' || pt.tablename)::regclass)
    FROM pg_tables pt
    WHERE pt.schemaname = 'audit' 
    AND pt.tablename LIKE 'audit_event_y%'
    ORDER BY pt.tablename;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Usage instructions:
-- 1. Run this script to set up partitioning
-- 2. Call audit.migrate_to_partitioned_events() to migrate existing data
-- 3. Set up a monthly cron job to call audit.ensure_partition_exists()
-- 4. Set up a quarterly cron job to call audit.cleanup_old_partitions()

-- Example cron jobs:
-- # Create next month's partition on the 25th of each month
-- 0 2 25 * * psql -d manufacturing_analytics -c "SELECT audit.ensure_partition_exists();"
-- 
-- # Clean old partitions quarterly (keep 24 months)
-- 0 3 1 1,4,7,10 * psql -d manufacturing_analytics -c "SELECT audit.cleanup_old_partitions(24);"