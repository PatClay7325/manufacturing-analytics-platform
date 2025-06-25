-- =====================================================
-- SCHEDULE AUTOMATED JOBS
-- Sets up pg_cron jobs for maintaining the ISO-compliant
-- database with automated refreshes and maintenance
-- =====================================================

-- Ensure pg_cron extension is installed
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_cron for the manufacturing database
UPDATE pg_database SET datallowconn = true WHERE datname = 'manufacturing';

-- =====================================================
-- JOB 1: Refresh Date Ranges (Daily at 00:01)
-- =====================================================
SELECT cron.schedule(
    'refresh-date-ranges',
    '1 0 * * *', -- At 00:01 every day
    $$SELECT refresh_date_ranges();$$
);

-- =====================================================
-- JOB 2: Refresh Materialized Views (Every 4 hours)
-- =====================================================
SELECT cron.schedule(
    'refresh-oee-view',
    '5 */4 * * *', -- At 5 minutes past every 4th hour
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY view_oee_daily;$$
);

SELECT cron.schedule(
    'refresh-reliability-view',
    '10 */4 * * *', -- At 10 minutes past every 4th hour
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY view_reliability_summary;$$
);

SELECT cron.schedule(
    'refresh-scrap-view',
    '15 */4 * * *', -- At 15 minutes past every 4th hour
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY view_scrap_summary;$$
);

-- =====================================================
-- JOB 3: Create Monthly Partitions (1st of each month)
-- =====================================================
CREATE OR REPLACE FUNCTION create_monthly_partitions() RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    -- Create partition for next month
    start_date := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
    end_date := date_trunc('month', CURRENT_DATE + INTERVAL '2 months');
    partition_name := 'fact_sensor_event_' || TO_CHAR(start_date, 'YYYY_MM');
    
    -- Check if partition already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = partition_name 
        AND schemaname = 'public'
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF fact_sensor_event FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            start_date,
            end_date
        );
        RAISE NOTICE 'Created partition: %', partition_name;
    END IF;
    
    -- Create indexes on new partition
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_equipment ON %I(equipment_id)',
        partition_name,
        partition_name
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_ts ON %I(event_ts)',
        partition_name,
        partition_name
    );
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule(
    'create-sensor-partitions',
    '0 2 1 * *', -- At 02:00 on the 1st of every month
    $$SELECT create_monthly_partitions();$$
);

-- =====================================================
-- JOB 4: Archive Old Audit Logs (Monthly)
-- =====================================================
CREATE OR REPLACE FUNCTION archive_old_audit_logs() RETURNS void AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Create archive table if it doesn't exist
    CREATE TABLE IF NOT EXISTS audit_log_archive (LIKE audit_log INCLUDING ALL);
    
    -- Move logs older than 6 months to archive
    WITH moved AS (
        DELETE FROM audit_log 
        WHERE log_ts < CURRENT_TIMESTAMP - INTERVAL '6 months'
        RETURNING *
    )
    INSERT INTO audit_log_archive SELECT * FROM moved;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    IF archived_count > 0 THEN
        RAISE NOTICE 'Archived % audit log entries', archived_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule(
    'archive-audit-logs',
    '0 3 1 * *', -- At 03:00 on the 1st of every month
    $$SELECT archive_old_audit_logs();$$
);

-- =====================================================
-- JOB 5: Update Equipment Metrics Cache (Hourly)
-- =====================================================
CREATE OR REPLACE FUNCTION update_equipment_metrics_cache() RETURNS void AS $$
BEGIN
    -- This function would update a cache table with latest equipment metrics
    -- Useful for real-time dashboards
    CREATE TABLE IF NOT EXISTS equipment_metrics_cache AS
    SELECT 
        e.equipment_id,
        e.equipment_code,
        e.equipment_name,
        COALESCE(oee.oee, 0) as current_oee,
        COALESCE(oee.availability, 0) as current_availability,
        COALESCE(oee.performance, 0) as current_performance,
        COALESCE(oee.quality, 0) as current_quality,
        COALESCE(r.mtbf_hours, 0) as mtbf,
        COALESCE(r.mttr_hours, 0) as mttr,
        CURRENT_TIMESTAMP as last_updated
    FROM dim_equipment e
    LEFT JOIN LATERAL (
        SELECT * FROM view_oee_daily 
        WHERE equipment_id = e.equipment_id 
        AND date_id = TO_CHAR(CURRENT_DATE, 'YYYYMMDD')::INTEGER
        ORDER BY shift_id DESC 
        LIMIT 1
    ) oee ON true
    LEFT JOIN LATERAL (
        SELECT * FROM view_reliability_summary 
        WHERE equipment_id = e.equipment_id 
        AND date_id = TO_CHAR(CURRENT_DATE, 'YYYYMMDD')::INTEGER
        LIMIT 1
    ) r ON true;
    
    -- Recreate the table with fresh data
    DROP TABLE IF EXISTS equipment_metrics_cache_old;
    ALTER TABLE IF EXISTS equipment_metrics_cache RENAME TO equipment_metrics_cache_old;
    
    CREATE TABLE equipment_metrics_cache AS
    SELECT 
        e.equipment_id,
        e.equipment_code,
        e.equipment_name,
        COALESCE(oee.oee, 0) as current_oee,
        COALESCE(oee.availability, 0) as current_availability,
        COALESCE(oee.performance, 0) as current_performance,
        COALESCE(oee.quality, 0) as current_quality,
        COALESCE(r.mtbf_hours, 0) as mtbf,
        COALESCE(r.mttr_hours, 0) as mttr,
        CURRENT_TIMESTAMP as last_updated
    FROM dim_equipment e
    LEFT JOIN LATERAL (
        SELECT * FROM view_oee_daily 
        WHERE equipment_id = e.equipment_id 
        AND date_id = TO_CHAR(CURRENT_DATE, 'YYYYMMDD')::INTEGER
        ORDER BY shift_id DESC 
        LIMIT 1
    ) oee ON true
    LEFT JOIN LATERAL (
        SELECT * FROM view_reliability_summary 
        WHERE equipment_id = e.equipment_id 
        AND date_id = TO_CHAR(CURRENT_DATE, 'YYYYMMDD')::INTEGER
        LIMIT 1
    ) r ON true;
    
    DROP TABLE IF EXISTS equipment_metrics_cache_old;
    
    -- Create indexes
    CREATE INDEX idx_equipment_metrics_cache_id ON equipment_metrics_cache(equipment_id);
    CREATE INDEX idx_equipment_metrics_cache_oee ON equipment_metrics_cache(current_oee);
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule(
    'update-equipment-cache',
    '30 * * * *', -- At 30 minutes past every hour
    $$SELECT update_equipment_metrics_cache();$$
);

-- =====================================================
-- JOB 6: Clean Up Old Sensor Data (Weekly)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_sensor_data() RETURNS void AS $$
DECLARE
    deleted_count BIGINT;
BEGIN
    -- Delete sensor data older than 1 year
    DELETE FROM fact_sensor_event 
    WHERE event_ts < CURRENT_TIMESTAMP - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Deleted % old sensor records', deleted_count;
    END IF;
    
    -- Drop old partitions
    DECLARE
        partition_record RECORD;
    BEGIN
        FOR partition_record IN 
            SELECT tablename 
            FROM pg_tables 
            WHERE tablename LIKE 'fact_sensor_event_%' 
            AND schemaname = 'public'
            AND tablename < 'fact_sensor_event_' || TO_CHAR(CURRENT_DATE - INTERVAL '1 year', 'YYYY_MM')
        LOOP
            EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.tablename);
            RAISE NOTICE 'Dropped old partition: %', partition_record.tablename;
        END LOOP;
    END;
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule(
    'cleanup-sensor-data',
    '0 4 * * 0', -- At 04:00 on Sunday
    $$SELECT cleanup_old_sensor_data();$$
);

-- =====================================================
-- JOB 7: Update Statistics (Daily)
-- =====================================================
SELECT cron.schedule(
    'update-statistics',
    '0 5 * * *', -- At 05:00 every day
    $$ANALYZE;$$
);

-- =====================================================
-- View Scheduled Jobs
-- =====================================================
CREATE OR REPLACE VIEW v_scheduled_jobs AS
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
ORDER BY jobid;

-- =====================================================
-- Job Monitoring Function
-- =====================================================
CREATE OR REPLACE FUNCTION check_job_status() RETURNS TABLE(
    job_name TEXT,
    last_run TIMESTAMP,
    status TEXT,
    runtime_seconds NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.jobname::TEXT,
        jh.start_time::TIMESTAMP,
        jh.status::TEXT,
        EXTRACT(EPOCH FROM (jh.end_time - jh.start_time))::NUMERIC as runtime_seconds
    FROM cron.job j
    LEFT JOIN LATERAL (
        SELECT * FROM cron.job_run_details 
        WHERE jobid = j.jobid 
        ORDER BY runid DESC 
        LIMIT 1
    ) jh ON true
    ORDER BY j.jobid;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Automated Jobs Scheduled Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Jobs created:';
    RAISE NOTICE '1. Date range refresh - Daily at 00:01';
    RAISE NOTICE '2. Materialized view refresh - Every 4 hours';
    RAISE NOTICE '3. Partition creation - Monthly on 1st';
    RAISE NOTICE '4. Audit log archival - Monthly on 1st';
    RAISE NOTICE '5. Equipment cache update - Hourly';
    RAISE NOTICE '6. Sensor data cleanup - Weekly on Sunday';
    RAISE NOTICE '7. Statistics update - Daily at 05:00';
    RAISE NOTICE '';
    RAISE NOTICE 'View jobs: SELECT * FROM v_scheduled_jobs;';
    RAISE NOTICE 'Check status: SELECT * FROM check_job_status();';
    RAISE NOTICE '========================================';
END $$;