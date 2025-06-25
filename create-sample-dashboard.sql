-- Sample Manufacturing Dashboard Queries
-- Use these in Apache Superset SQL Lab to create datasets for your dashboards

-- 1. Production Overview Dataset
CREATE OR REPLACE VIEW production_overview AS
SELECT 
  date_trunc('hour', timestamp) as time,
  COUNT(DISTINCT equipment_id) as active_machines,
  SUM(units_produced) as units_produced,
  SUM(units_defective) as defects,
  ROUND(AVG(oee_score) * 100, 1) as avg_oee,
  ROUND((1 - (SUM(units_defective)::float / NULLIF(SUM(units_produced), 0))) * 100, 1) as quality_rate
FROM production_metrics
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY time
ORDER BY time DESC;

-- 2. Equipment Performance Dataset
CREATE OR REPLACE VIEW equipment_performance AS
SELECT 
  e.equipment_id,
  e.equipment_name,
  e.status,
  e.equipment_type,
  ROUND(AVG(m.availability) * 100, 1) as availability,
  ROUND(AVG(m.performance) * 100, 1) as performance,
  ROUND(AVG(m.quality) * 100, 1) as quality,
  ROUND(AVG(m.oee_score) * 100, 1) as oee,
  MAX(m.timestamp) as last_updated
FROM equipment e
LEFT JOIN equipment_metrics m ON e.equipment_id = m.equipment_id
WHERE m.timestamp > NOW() - INTERVAL '24 hours'
GROUP BY e.equipment_id, e.equipment_name, e.status, e.equipment_type;

-- 3. Quality Analysis Dataset
CREATE OR REPLACE VIEW quality_analysis AS
SELECT 
  date_trunc('day', timestamp) as date,
  product_type,
  defect_type,
  COUNT(*) as defect_count,
  SUM(defect_cost) as total_cost
FROM quality_inspections
WHERE quality_check = 'FAIL'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY date, product_type, defect_type
ORDER BY date DESC, defect_count DESC;

-- 4. Production Efficiency Trends
CREATE OR REPLACE VIEW production_efficiency_trends AS
SELECT 
  date_trunc('day', timestamp) as date,
  product_type,
  SUM(units_produced) as total_produced,
  SUM(units_defective) as total_defects,
  ROUND(AVG(cycle_time), 2) as avg_cycle_time,
  ROUND(AVG(efficiency_score) * 100, 1) as efficiency_pct
FROM production_data
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY date, product_type
ORDER BY date DESC;

-- 5. Real-time KPI Summary
CREATE OR REPLACE VIEW realtime_kpi_summary AS
WITH latest_metrics AS (
  SELECT 
    MAX(oee_score) as best_oee,
    MIN(oee_score) as worst_oee,
    AVG(oee_score) as avg_oee,
    SUM(units_produced) as total_production,
    SUM(units_defective) as total_defects
  FROM production_metrics
  WHERE timestamp > NOW() - INTERVAL '1 hour'
)
SELECT 
  ROUND(avg_oee * 100, 1) as current_oee,
  ROUND(best_oee * 100, 1) as best_oee,
  ROUND(worst_oee * 100, 1) as worst_oee,
  total_production,
  total_defects,
  ROUND((1 - (total_defects::float / NULLIF(total_production, 0))) * 100, 1) as quality_rate,
  (SELECT COUNT(DISTINCT equipment_id) FROM equipment WHERE status = 'Running') as active_equipment,
  (SELECT COUNT(*) FROM alerts WHERE status = 'active') as active_alerts
FROM latest_metrics;

-- 6. Downtime Analysis
CREATE OR REPLACE VIEW downtime_analysis AS
SELECT 
  equipment_id,
  equipment_name,
  downtime_reason,
  COUNT(*) as occurrences,
  SUM(duration_minutes) as total_downtime_minutes,
  ROUND(AVG(duration_minutes), 1) as avg_downtime_minutes,
  SUM(cost_impact) as total_cost_impact
FROM equipment_downtime
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY equipment_id, equipment_name, downtime_reason
ORDER BY total_downtime_minutes DESC;

-- Sample data to test dashboards (only run if you need test data)
-- INSERT INTO production_metrics (timestamp, equipment_id, units_produced, units_defective, oee_score, availability, performance, quality)
-- SELECT 
--   NOW() - (interval '1 hour' * generate_series(0, 168)), -- Last 7 days of hourly data
--   'EQ-' || (random() * 10 + 1)::int,
--   (random() * 100 + 50)::int,
--   (random() * 5)::int,
--   random() * 0.3 + 0.6, -- OEE between 60-90%
--   random() * 0.2 + 0.8, -- Availability 80-100%
--   random() * 0.2 + 0.7, -- Performance 70-90%
--   random() * 0.1 + 0.9  -- Quality 90-100%
-- FROM generate_series(1, 168);

-- Instructions for Superset:
-- 1. Go to SQL Lab in Superset
-- 2. Select the Manufacturing TimescaleDB database
-- 3. Run each CREATE VIEW statement
-- 4. Go to Data -> Datasets
-- 5. Add each view as a new dataset
-- 6. Create charts from these datasets
-- 7. Combine charts into dashboards