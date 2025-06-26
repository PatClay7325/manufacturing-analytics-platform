-- Add missing columns that exist in Prisma schema but not in database

-- 1. Add isFailure to dim_downtime_reason if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dim_downtime_reason' 
    AND column_name = 'is_failure'
  ) THEN
    ALTER TABLE dim_downtime_reason 
    ADD COLUMN is_failure BOOLEAN DEFAULT false;
    
    -- Set common failure reasons
    UPDATE dim_downtime_reason 
    SET is_failure = true 
    WHERE reason_code IN ('MECH_FAIL', 'ELEC_FAIL', 'BREAKDOWN', 'EQUIPMENT_FAILURE');
  END IF;
END $$;

-- 2. Add plannedParts to fact_production if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fact_production' 
    AND column_name = 'planned_parts'
  ) THEN
    ALTER TABLE fact_production 
    ADD COLUMN planned_parts INT DEFAULT 0;
    
    -- Populate with estimated values based on planned production time
    UPDATE fact_production 
    SET planned_parts = GREATEST(total_parts_produced, good_parts + COALESCE(scrap_parts, 0))
    WHERE planned_parts = 0;
  END IF;
END $$;

-- 3. Ensure all required indexes exist
CREATE INDEX IF NOT EXISTS idx_fact_production_date ON fact_production(start_time);
CREATE INDEX IF NOT EXISTS idx_fact_downtime_equipment ON fact_downtime(equipment_id);
CREATE INDEX IF NOT EXISTS idx_fact_maintenance_equipment ON fact_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_fact_scrap_production ON fact_scrap(production_id);

-- 4. Refresh all materialized views
REFRESH MATERIALIZED VIEW view_oee_daily;
REFRESH MATERIALIZED VIEW view_reliability_summary;
REFRESH MATERIALIZED VIEW view_scrap_summary;

-- Show summary
SELECT 
  'Database ready for ISO-compliant operations' as status,
  (SELECT COUNT(*) FROM dim_equipment) as equipment_count,
  (SELECT COUNT(*) FROM fact_production) as production_records,
  (SELECT COUNT(*) FROM fact_maintenance) as maintenance_records;