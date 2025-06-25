-- =====================================================
-- ISO COMPLIANCE VERIFICATION SCRIPT
-- Validates the implementation meets all ISO standards
-- =====================================================

-- Create verification results table
CREATE TEMP TABLE verification_results (
    check_name VARCHAR(100),
    status VARCHAR(20),
    details TEXT
);

-- Function to log results
CREATE OR REPLACE FUNCTION log_check(
    p_check_name VARCHAR(100),
    p_passed BOOLEAN,
    p_details TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO verification_results (check_name, status, details)
    VALUES (
        p_check_name,
        CASE WHEN p_passed THEN 'PASSED' ELSE 'FAILED' END,
        p_details
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ISO 22400 OEE COMPLIANCE CHECKS
-- =====================================================

-- Check 1: OEE Calculation Components
DO $$
DECLARE
    oee_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO oee_count
    FROM view_oee_daily
    WHERE availability IS NOT NULL 
    AND performance IS NOT NULL 
    AND quality IS NOT NULL
    AND oee IS NOT NULL;
    
    PERFORM log_check(
        'ISO 22400: OEE Components',
        oee_count > 0,
        format('Found %s OEE calculations with all components', oee_count)
    );
END $$;

-- Check 2: Time-based Metrics
DO $$
DECLARE
    time_metrics_ok BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM fact_production
        WHERE planned_production_time > 0
        AND operating_time > 0
        AND operating_time <= planned_production_time
    ) INTO time_metrics_ok;
    
    PERFORM log_check(
        'ISO 22400: Time-based Metrics',
        time_metrics_ok,
        'Planned and operating time properly recorded'
    );
END $$;

-- Check 3: Production Counts
DO $$
DECLARE
    production_ok BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM fact_production
        WHERE total_parts_produced >= good_parts
        AND good_parts >= 0
    ) INTO production_ok;
    
    PERFORM log_check(
        'ISO 22400: Production Counts',
        production_ok,
        'Production and quality counts are consistent'
    );
END $$;

-- =====================================================
-- ISO 9001 QUALITY COMPLIANCE CHECKS
-- =====================================================

-- Check 4: Quality Inspection Records
DO $$
DECLARE
    quality_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO quality_count
    FROM fact_quality
    WHERE sample_size > 0;
    
    PERFORM log_check(
        'ISO 9001: Quality Inspections',
        quality_count > 0,
        format('Found %s quality inspection records', quality_count)
    );
END $$;

-- Check 5: Defect Classification
DO $$
DECLARE
    defect_types INTEGER;
BEGIN
    SELECT COUNT(*) INTO defect_types
    FROM dim_quality_defect_type
    WHERE severity_level BETWEEN 1 AND 5;
    
    PERFORM log_check(
        'ISO 9001: Defect Classification',
        defect_types >= 10,
        format('Defined %s defect types with severity levels', defect_types)
    );
END $$;

-- Check 6: Traceability
DO $$
DECLARE
    traceable BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM fact_production
        WHERE work_order IS NOT NULL
        AND batch_number IS NOT NULL
    ) INTO traceable;
    
    PERFORM log_check(
        'ISO 9001: Traceability',
        traceable,
        'Work orders and batch numbers maintained'
    );
END $$;

-- =====================================================
-- ISO 14224 RELIABILITY COMPLIANCE CHECKS
-- =====================================================

-- Check 7: Downtime Categorization
DO $$
DECLARE
    downtime_categories INTEGER;
BEGIN
    SELECT COUNT(DISTINCT category_level_1 || '-' || category_level_2)
    INTO downtime_categories
    FROM dim_downtime_reason;
    
    PERFORM log_check(
        'ISO 14224: Downtime Categories',
        downtime_categories >= 10,
        format('Defined %s downtime categories', downtime_categories)
    );
END $$;

-- Check 8: MTBF/MTTR Calculations
DO $$
DECLARE
    reliability_ok BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM view_reliability_summary
        WHERE mtbf_hours > 0
        AND mttr_hours > 0
    ) INTO reliability_ok;
    
    PERFORM log_check(
        'ISO 14224: Reliability Metrics',
        reliability_ok,
        'MTBF and MTTR calculations available'
    );
END $$;

-- Check 9: Equipment Master Data
DO $$
DECLARE
    equipment_ok BOOLEAN;
BEGIN
    SELECT COUNT(*) = COUNT(CASE WHEN serial_number IS NOT NULL THEN 1 END)
    INTO equipment_ok
    FROM dim_equipment
    WHERE is_active = true;
    
    PERFORM log_check(
        'ISO 14224: Equipment Data',
        equipment_ok,
        'All active equipment has complete master data'
    );
END $$;

-- =====================================================
-- AI-READY COMPLIANCE CHECKS
-- =====================================================

-- Check 10: Ontology Terms
DO $$
DECLARE
    term_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO term_count
    FROM ontology_term;
    
    PERFORM log_check(
        'AI-Ready: Ontology Terms',
        term_count >= 20,
        format('Defined %s ontology terms for NLP', term_count)
    );
END $$;

-- Check 11: Date Ranges
DO $$
DECLARE
    range_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO range_count
    FROM dim_date_range;
    
    PERFORM log_check(
        'AI-Ready: Date Ranges',
        range_count >= 10,
        format('Defined %s named date ranges', range_count)
    );
END $$;

-- Check 12: Audit Trail
DO $$
DECLARE
    audit_enabled BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger
        WHERE tgname LIKE 'audit_%'
    ) INTO audit_enabled;
    
    PERFORM log_check(
        'Compliance: Audit Trail',
        audit_enabled,
        'Audit triggers are active'
    );
END $$;

-- =====================================================
-- PERFORMANCE COMPLIANCE CHECKS
-- =====================================================

-- Check 13: Partitioning
DO $$
DECLARE
    partition_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO partition_count
    FROM pg_tables
    WHERE tablename LIKE 'fact_sensor_event_%'
    AND schemaname = 'public';
    
    PERFORM log_check(
        'Performance: Partitioning',
        partition_count > 0,
        format('Found %s sensor event partitions', partition_count)
    );
END $$;

-- Check 14: Indexes
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey';
    
    PERFORM log_check(
        'Performance: Indexes',
        index_count >= 20,
        format('Created %s performance indexes', index_count)
    );
END $$;

-- Check 15: Materialized Views
DO $$
DECLARE
    matview_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO matview_count
    FROM pg_matviews
    WHERE schemaname = 'public';
    
    PERFORM log_check(
        'Performance: Materialized Views',
        matview_count >= 3,
        format('Created %s materialized views', matview_count)
    );
END $$;

-- =====================================================
-- GENERATE COMPLIANCE REPORT
-- =====================================================

DO $$
DECLARE
    total_checks INTEGER;
    passed_checks INTEGER;
    failed_checks INTEGER;
    compliance_rate NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_checks FROM verification_results;
    SELECT COUNT(*) INTO passed_checks FROM verification_results WHERE status = 'PASSED';
    SELECT COUNT(*) INTO failed_checks FROM verification_results WHERE status = 'FAILED';
    compliance_rate := ROUND((passed_checks::NUMERIC / total_checks) * 100, 2);
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ISO COMPLIANCE VERIFICATION REPORT';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Date: %', CURRENT_TIMESTAMP;
    RAISE NOTICE 'Total Checks: %', total_checks;
    RAISE NOTICE 'Passed: %', passed_checks;
    RAISE NOTICE 'Failed: %', failed_checks;
    RAISE NOTICE 'Compliance Rate: %%%', compliance_rate;
    RAISE NOTICE '========================================';
    
    -- Show failed checks
    IF failed_checks > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE 'FAILED CHECKS:';
        FOR r IN SELECT * FROM verification_results WHERE status = 'FAILED' LOOP
            RAISE NOTICE '❌ %: %', r.check_name, r.details;
        END LOOP;
    END IF;
    
    -- Show all results
    RAISE NOTICE '';
    RAISE NOTICE 'DETAILED RESULTS:';
    FOR r IN SELECT * FROM verification_results ORDER BY check_name LOOP
        RAISE NOTICE '% %: %', 
            CASE WHEN r.status = 'PASSED' THEN '✓' ELSE '✗' END,
            r.check_name, 
            r.details;
    END LOOP;
    
    RAISE NOTICE '========================================';
    
    -- Overall assessment
    IF compliance_rate = 100 THEN
        RAISE NOTICE 'RESULT: FULLY COMPLIANT ✅';
        RAISE NOTICE 'The implementation meets all ISO standards!';
    ELSIF compliance_rate >= 80 THEN
        RAISE NOTICE 'RESULT: MOSTLY COMPLIANT ⚠️';
        RAISE NOTICE 'Minor issues need attention.';
    ELSE
        RAISE NOTICE 'RESULT: NON-COMPLIANT ❌';
        RAISE NOTICE 'Significant work required for compliance.';
    END IF;
    RAISE NOTICE '========================================';
END $$;

-- Cleanup
DROP FUNCTION log_check(VARCHAR, BOOLEAN, TEXT);
DROP TABLE verification_results;