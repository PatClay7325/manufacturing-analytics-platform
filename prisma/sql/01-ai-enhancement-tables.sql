-- =============================================================================
-- AI ENHANCEMENT TABLES FOR ISO-COMPLIANT SCHEMA
-- =============================================================================
-- Purpose: Add AI-ready tables for date ranges and ontology mapping
-- Author: Manufacturing Analytics Platform Team
-- Date: 2025-06-23
-- =============================================================================

-- 1. DimDateRange: Automated Calendar Population
CREATE TABLE IF NOT EXISTS dim_date_range (
  range_id     SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_dim_date_range_dates ON dim_date_range(start_date, end_date);

-- 2. OntologyTerm: Synonym Mapping for AI
CREATE TABLE IF NOT EXISTS ontology_term (
  term        TEXT PRIMARY KEY,
  model_name  TEXT NOT NULL,
  field_name  TEXT NOT NULL,
  priority    INT DEFAULT 0
);

-- Add composite index for lookups
CREATE INDEX IF NOT EXISTS idx_ontology_term_model_field ON ontology_term(model_name, field_name);

-- 3. Function to refresh date ranges (automated calendar)
CREATE OR REPLACE FUNCTION refresh_date_ranges() RETURNS void AS $$
BEGIN
  -- Clear existing ranges
  DELETE FROM dim_date_range;
  
  -- Insert standard ranges
  INSERT INTO dim_date_range(name, start_date, end_date)
  VALUES
    ('Today', CURRENT_DATE, CURRENT_DATE),
    ('Yesterday', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day'),
    ('This Week', date_trunc('week', CURRENT_DATE)::date, CURRENT_DATE),
    ('Last Week', date_trunc('week', CURRENT_DATE - INTERVAL '1 week')::date, 
                  date_trunc('week', CURRENT_DATE)::date - INTERVAL '1 day'),
    ('MTD', date_trunc('month', CURRENT_DATE)::date, CURRENT_DATE),
    ('Last Month', date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::date,
                   date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 day'),
    ('Last 7 days', CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE),
    ('Last 30 days', CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE),
    ('Last 90 days', CURRENT_DATE - INTERVAL '89 days', CURRENT_DATE),
    ('QTD', date_trunc('quarter', CURRENT_DATE)::date, CURRENT_DATE),
    ('YTD', date_trunc('year', CURRENT_DATE)::date, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- 4. Initial population of date ranges
SELECT refresh_date_ranges();

-- 5. Initial ontology terms for common manufacturing queries
INSERT INTO ontology_term(term, model_name, field_name, priority)
VALUES
  -- OEE related terms
  ('oee', 'ViewOeeDaily', 'oee', 10),
  ('overall equipment effectiveness', 'ViewOeeDaily', 'oee', 10),
  ('availability', 'ViewOeeDaily', 'availability', 9),
  ('performance', 'ViewOeeDaily', 'performance', 9),
  ('quality', 'ViewOeeDaily', 'quality', 9),
  
  -- Equipment terms
  ('equipment', 'DimEquipment', 'name', 8),
  ('machine', 'DimEquipment', 'name', 8),
  ('asset', 'DimEquipment', 'name', 7),
  ('work center', 'DimWorkCenter', 'name', 8),
  ('production line', 'DimWorkCenter', 'name', 8),
  
  -- Downtime terms
  ('downtime', 'FactDowntime', 'downtimeDuration', 9),
  ('downtime reason', 'DimDowntimeReason', 'description', 9),
  ('breakdown', 'DimDowntimeReason', 'description', 8),
  ('failure', 'DimDowntimeReason', 'description', 8),
  
  -- Production terms
  ('production', 'FactProduction', 'totalPartsProduced', 8),
  ('output', 'FactProduction', 'totalPartsProduced', 7),
  ('good parts', 'FactProduction', 'goodParts', 8),
  ('scrap', 'FactScrap', 'scrapQty', 8),
  ('defects', 'FactScrap', 'scrapQty', 8),
  
  -- Maintenance terms
  ('maintenance', 'FactMaintenance', 'maintenanceType', 8),
  ('mtbf', 'ViewReliabilitySummary', 'mtbf', 9),
  ('mttr', 'ViewReliabilitySummary', 'mttr', 9),
  ('mean time to repair', 'ViewReliabilitySummary', 'mttr', 9),
  ('mean time between failures', 'ViewReliabilitySummary', 'mtbf', 9),
  
  -- Time terms
  ('shift', 'DimShift', 'name', 7),
  ('operator', 'FactProduction', 'operatorId', 6),
  ('product', 'DimProduct', 'name', 7),
  ('part', 'DimProduct', 'name', 6)
ON CONFLICT (term) DO UPDATE 
SET model_name = EXCLUDED.model_name,
    field_name = EXCLUDED.field_name,
    priority = EXCLUDED.priority;

-- 6. Grant permissions (adjust as needed for your setup)
GRANT SELECT ON dim_date_range TO PUBLIC;
GRANT SELECT ON ontology_term TO PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_date_ranges() TO PUBLIC;