-- =====================================================
-- CLEANUP LEGACY SCHEMA SCRIPT
-- This script removes all non-ISO-compliant tables and views
-- to establish a clean foundation for the new schema
-- =====================================================

-- Set session parameters for safety
SET client_min_messages = WARNING;
SET statement_timeout = '30min';

-- Create backup schema for legacy data
CREATE SCHEMA IF NOT EXISTS legacy_backup;

-- Function to safely move tables to backup schema
CREATE OR REPLACE FUNCTION backup_and_drop_table(table_name TEXT) RETURNS void AS $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = backup_and_drop_table.table_name) THEN
        -- Move to backup schema
        EXECUTE format('ALTER TABLE public.%I SET SCHEMA legacy_backup', table_name);
        RAISE NOTICE 'Moved table % to legacy_backup schema', table_name;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not move table %: %', table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Backup and remove legacy tables
SELECT backup_and_drop_table('PerformanceMetric');
SELECT backup_and_drop_table('Alert');
SELECT backup_and_drop_table('MaintenanceRecord');
SELECT backup_and_drop_table('QualityMetric');
SELECT backup_and_drop_table('DowntimeCause');
SELECT backup_and_drop_table('Equipment');
SELECT backup_and_drop_table('WorkCenter');
SELECT backup_and_drop_table('Area');
SELECT backup_and_drop_table('Site');
SELECT backup_and_drop_table('Enterprise');
SELECT backup_and_drop_table('User');
SELECT backup_and_drop_table('Team');
SELECT backup_and_drop_table('ApiKey');

-- Drop legacy views
DROP VIEW IF EXISTS dashboard_production_overview CASCADE;
DROP VIEW IF EXISTS dashboard_equipment_performance CASCADE;
DROP VIEW IF EXISTS dashboard_quality_metrics CASCADE;
DROP VIEW IF EXISTS dashboard_alert_summary CASCADE;
DROP VIEW IF EXISTS dashboard_maintenance_summary CASCADE;
DROP VIEW IF EXISTS dashboard_realtime_kpis CASCADE;
DROP VIEW IF EXISTS dashboard_downtime_analysis CASCADE;
DROP VIEW IF EXISTS production_overview CASCADE;
DROP VIEW IF EXISTS equipment_performance CASCADE;
DROP VIEW IF EXISTS realtime_kpis CASCADE;

-- Drop any legacy functions
DROP FUNCTION IF EXISTS refresh_date_ranges() CASCADE;
DROP FUNCTION IF EXISTS refresh_all_views() CASCADE;
DROP FUNCTION IF EXISTS audit_fact_production() CASCADE;

-- Drop legacy triggers
DO $$
DECLARE
    trig RECORD;
BEGIN
    FOR trig IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', trig.trigger_name, trig.event_object_table);
    END LOOP;
END $$;

-- Drop legacy indexes
DO $$
DECLARE
    idx RECORD;
BEGIN
    FOR idx IN 
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname NOT LIKE 'pg_%'
        AND indexname NOT LIKE '%_pkey'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I CASCADE', idx.indexname);
    END LOOP;
END $$;

-- Drop legacy sequences
DO $$
DECLARE
    seq RECORD;
BEGIN
    FOR seq IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('DROP SEQUENCE IF EXISTS %I CASCADE', seq.sequence_name);
    END LOOP;
END $$;

-- Clean up any remaining objects
DROP TYPE IF EXISTS alert_severity CASCADE;
DROP TYPE IF EXISTS alert_status CASCADE;
DROP TYPE IF EXISTS maintenance_type CASCADE;
DROP TYPE IF EXISTS maintenance_priority CASCADE;
DROP TYPE IF EXISTS maintenance_status CASCADE;

-- Verify cleanup
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    IF remaining_count > 0 THEN
        RAISE WARNING 'There are still % tables remaining in public schema', remaining_count;
    ELSE
        RAISE NOTICE 'Public schema is clean and ready for ISO-compliant schema';
    END IF;
END $$;

-- Clean up the function
DROP FUNCTION IF EXISTS backup_and_drop_table(TEXT);

-- Grant permissions for the new schema
GRANT ALL ON SCHEMA public TO postgres;
GRANT CREATE ON SCHEMA public TO postgres;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Legacy schema cleanup completed!';
    RAISE NOTICE 'Legacy data backed up to: legacy_backup schema';
    RAISE NOTICE 'Public schema is ready for ISO-compliant implementation';
    RAISE NOTICE '========================================';
END $$;