# ISO 22400 OEE Metrics View Documentation

## Overview

The `vw_iso22400_oee_metrics` view provides ISO 22400-compliant OEE (Overall Equipment Effectiveness) calculations aggregated by equipment and day.

## View Schema

```sql
vw_iso22400_oee_metrics
├── equipment_id (STRING)                  -- Equipment identifier
├── period_date (DATE)                     -- Date of aggregation
├── planned_production_time_hours (FLOAT)  -- Total planned production time
├── downtime (FLOAT)                       -- Total downtime in hours
├── operating_time (FLOAT)                 -- Actual operating time in hours
├── total_count (INTEGER)                  -- Total parts produced
├── good_count (INTEGER)                   -- Good parts produced
├── scrap_count (INTEGER)                  -- Scrapped parts
├── ideal_cycle_time (FLOAT)               -- Average ideal cycle time in seconds
├── availability_rate (FLOAT)              -- 0-1 (multiply by 100 for %)
├── performance_rate (FLOAT)               -- 0-1 (multiply by 100 for %)
├── quality_rate (FLOAT)                   -- 0-1 (multiply by 100 for %)
├── oee (FLOAT)                           -- 0-1 (multiply by 100 for %)
├── recorded_availability (FLOAT)          -- For validation against raw data
├── recorded_performance (FLOAT)           -- For validation against raw data
├── recorded_quality (FLOAT)               -- For validation against raw data
├── recorded_oee (FLOAT)                   -- For validation against raw data
├── machine_names (STRING)                 -- Comma-separated machine names
├── shifts (STRING)                        -- Comma-separated shift identifiers
└── record_count (INTEGER)                 -- Number of records aggregated
```

## ISO 22400 Calculations

### 1. Availability Rate
```
Availability = Operating Time / Planned Production Time

Where:
- Operating Time = Planned Production Time - Downtime
- Downtime = Unplanned stops + Changeover time
```

### 2. Performance Rate
```
Performance = (Ideal Cycle Time × Total Count) / Operating Time

Where:
- Ideal Cycle Time = Theoretical fastest time to produce one unit
- Total Count = Total parts produced (good + bad)
```

### 3. Quality Rate
```
Quality = Good Count / Total Count

Where:
- Good Count = Parts that meet quality standards
- Total Count = All parts produced
```

### 4. OEE (Overall Equipment Effectiveness)
```
OEE = Availability × Performance × Quality
```

## Data Source Mapping

The view aggregates data from the `PerformanceMetric` table:

| View Column | Source Column(s) | Notes |
|-------------|------------------|-------|
| planned_production_time_hours | plannedProductionTime / 60 | Convert minutes to hours |
| downtime | downtimeMinutes + changeoverTimeMinutes | Combined downtime sources |
| total_count | totalPartsProduced or totalParts | Uses available field |
| good_count | goodParts | Quality parts |
| scrap_count | rejectParts or rejectedParts | Defective parts |
| ideal_cycle_time | cycleTimeSeconds or idealCycleTime | Weighted average |

## Usage Examples

### 1. Daily OEE by Equipment
```sql
SELECT 
  equipment_id,
  period_date,
  ROUND(oee * 100, 1) as oee_percentage
FROM vw_iso22400_oee_metrics
WHERE period_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY period_date DESC, equipment_id;
```

### 2. Equipment Performance Ranking
```sql
SELECT 
  equipment_id,
  COUNT(*) as days_tracked,
  ROUND(AVG(oee) * 100, 1) as avg_oee_percentage,
  ROUND(AVG(availability_rate) * 100, 1) as avg_availability,
  ROUND(AVG(performance_rate) * 100, 1) as avg_performance,
  ROUND(AVG(quality_rate) * 100, 1) as avg_quality
FROM vw_iso22400_oee_metrics
WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY equipment_id
ORDER BY avg_oee_percentage DESC;
```

### 3. Trend Analysis
```sql
SELECT 
  DATE_TRUNC('week', period_date) as week,
  ROUND(AVG(oee) * 100, 1) as weekly_avg_oee,
  ROUND(MIN(oee) * 100, 1) as weekly_min_oee,
  ROUND(MAX(oee) * 100, 1) as weekly_max_oee
FROM vw_iso22400_oee_metrics
WHERE period_date >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY DATE_TRUNC('week', period_date)
ORDER BY week DESC;
```

### 4. Problem Identification
```sql
-- Find equipment with low OEE components
SELECT 
  equipment_id,
  period_date,
  CASE 
    WHEN availability_rate < 0.7 THEN 'Low Availability'
    WHEN performance_rate < 0.7 THEN 'Low Performance'
    WHEN quality_rate < 0.95 THEN 'Quality Issues'
    ELSE 'Multiple Issues'
  END as primary_issue,
  ROUND(oee * 100, 1) as oee_percentage
FROM vw_iso22400_oee_metrics
WHERE oee < 0.6  -- OEE below 60%
  AND period_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY oee ASC
LIMIT 20;
```

## Performance Considerations

1. **Indexes**: The view uses indexes on `equipmentId` and `timestamp` for optimal performance
2. **Aggregation**: Data is pre-aggregated by day to reduce computation
3. **Materialized View**: For large datasets, consider creating a materialized view:

```sql
CREATE MATERIALIZED VIEW mv_iso22400_oee_metrics AS
SELECT * FROM vw_iso22400_oee_metrics;

-- Refresh periodically
REFRESH MATERIALIZED VIEW mv_iso22400_oee_metrics;
```

## Validation

The view includes validation columns (`recorded_*`) that show the OEE values from the raw data for comparison with calculated values.

## Compliance Notes

This implementation follows ISO 22400-2:2014 standards for:
- Key performance indicators (KPIs) for manufacturing operations management
- OEE calculation methodology
- Time element definitions
- Quality metrics

## Testing

Run the test script to verify the view:
```bash
npx tsx scripts/test-iso22400-oee-view.ts
```

Or test directly with psql:
```bash
psql $DATABASE_URL -c "SELECT * FROM vw_iso22400_oee_metrics LIMIT 10;"
```