#!/usr/bin/env node

/**
 * Create ISO 22400 OEE Metrics View
 * Executes SQL statements separately for Prisma compatibility
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createOEEView() {
  console.log('🔧 Creating ISO 22400 OEE Metrics View...');
  
  try {
    // Drop existing view if it exists
    await prisma.$executeRawUnsafe('DROP VIEW IF EXISTS vw_iso22400_oee_metrics CASCADE');
    
    // Create the view
    const createViewSQL = `
CREATE VIEW vw_iso22400_oee_metrics AS
WITH daily_metrics AS (
  SELECT 
    pm."equipmentId" AS equipment_id,
    date_trunc('day', pm."timestamp") AS period_date,
    
    -- Time measurements (convert minutes to hours for consistency)
    SUM(COALESCE(pm."plannedProductionTime", 0)) / 60.0 AS planned_production_time_hours,
    SUM(COALESCE(pm."downtimeMinutes", 0) + COALESCE(pm."changeoverTimeMinutes", 0)) / 60.0 AS downtime_hours,
    SUM(COALESCE(pm."plannedDowntime", 0) + COALESCE(pm."unplannedDowntime", 0)) / 60.0 AS legacy_downtime_hours,
    
    -- Production counts
    SUM(COALESCE(pm."totalPartsProduced", pm."totalParts", 0)) AS total_count,
    SUM(COALESCE(pm."goodParts", 0)) AS good_count,
    SUM(COALESCE(pm."rejectParts", pm."rejectedParts", 0)) AS scrap_count,
    SUM(COALESCE(pm."reworkParts", 0)) AS rework_count,
    
    -- Cycle times (weighted average by production count)
    CASE 
      WHEN SUM(COALESCE(pm."totalPartsProduced", pm."totalParts", 0)) > 0 
      THEN SUM(COALESCE(pm."cycleTimeSeconds", pm."idealCycleTime", 0) * COALESCE(pm."totalPartsProduced", pm."totalParts", 1)) 
           / NULLIF(SUM(COALESCE(pm."totalPartsProduced", pm."totalParts", 0)), 0)
      ELSE AVG(COALESCE(pm."cycleTimeSeconds", pm."idealCycleTime", 0))
    END AS ideal_cycle_time_seconds,
    
    -- Direct OEE components if available (for validation)
    AVG(pm."availability") AS recorded_availability,
    AVG(pm."performance") AS recorded_performance,
    AVG(pm."quality") AS recorded_quality,
    AVG(pm."oeeScore") AS recorded_oee,
    
    -- Additional context
    STRING_AGG(DISTINCT pm."machineName", ', ') AS machine_names,
    STRING_AGG(DISTINCT pm."shift", ', ') AS shifts,
    COUNT(*) AS record_count
    
  FROM "PerformanceMetric" pm
  WHERE pm."equipmentId" IS NOT NULL
    AND pm."timestamp" IS NOT NULL
  GROUP BY pm."equipmentId", date_trunc('day', pm."timestamp")
)
SELECT 
  dm.equipment_id,
  dm.period_date,
  
  -- Time calculations (in hours)
  dm.planned_production_time_hours,
  GREATEST(dm.downtime_hours, dm.legacy_downtime_hours) AS downtime,
  GREATEST(dm.planned_production_time_hours - GREATEST(dm.downtime_hours, dm.legacy_downtime_hours), 0) AS operating_time,
  
  -- Production counts
  dm.total_count,
  dm.good_count,
  dm.scrap_count,
  dm.ideal_cycle_time_seconds AS ideal_cycle_time,
  
  -- ISO 22400 OEE Calculations
  -- Availability Rate = Operating Time / Planned Production Time
  CASE 
    WHEN dm.planned_production_time_hours > 0 
    THEN LEAST(
      (dm.planned_production_time_hours - GREATEST(dm.downtime_hours, dm.legacy_downtime_hours)) 
      / NULLIF(dm.planned_production_time_hours, 0), 
      1.0
    )
    ELSE 0
  END AS availability_rate,
  
  -- Performance Rate = (Ideal Cycle Time × Total Count) / Operating Time
  CASE 
    WHEN (dm.planned_production_time_hours - GREATEST(dm.downtime_hours, dm.legacy_downtime_hours)) > 0 
         AND dm.total_count > 0 
         AND dm.ideal_cycle_time_seconds > 0
    THEN LEAST(
      (dm.ideal_cycle_time_seconds * dm.total_count / 3600.0) -- Convert seconds to hours
      / NULLIF(dm.planned_production_time_hours - GREATEST(dm.downtime_hours, dm.legacy_downtime_hours), 0),
      1.0
    )
    ELSE 0
  END AS performance_rate,
  
  -- Quality Rate = Good Count / Total Count
  CASE 
    WHEN dm.total_count > 0 
    THEN LEAST(dm.good_count::FLOAT / NULLIF(dm.total_count, 0), 1.0)
    ELSE 0
  END AS quality_rate,
  
  -- OEE = Availability × Performance × Quality
  ROUND(
    CASE 
      WHEN dm.planned_production_time_hours > 0 AND dm.total_count > 0
      THEN 
        -- Availability
        LEAST(
          (dm.planned_production_time_hours - GREATEST(dm.downtime_hours, dm.legacy_downtime_hours)) 
          / NULLIF(dm.planned_production_time_hours, 0), 
          1.0
        ) *
        -- Performance
        CASE 
          WHEN (dm.planned_production_time_hours - GREATEST(dm.downtime_hours, dm.legacy_downtime_hours)) > 0 
               AND dm.ideal_cycle_time_seconds > 0
          THEN LEAST(
            (dm.ideal_cycle_time_seconds * dm.total_count / 3600.0)
            / NULLIF(dm.planned_production_time_hours - GREATEST(dm.downtime_hours, dm.legacy_downtime_hours), 0),
            1.0
          )
          ELSE 0
        END *
        -- Quality
        LEAST(dm.good_count::FLOAT / NULLIF(dm.total_count, 0), 1.0)
      ELSE 0
    END::NUMERIC, 
    4
  ) AS oee,
  
  -- Validation fields
  dm.recorded_availability,
  dm.recorded_performance,
  dm.recorded_quality,
  dm.recorded_oee,
  dm.machine_names,
  dm.shifts,
  dm.record_count
  
FROM daily_metrics dm
ORDER BY dm.period_date DESC, dm.equipment_id`;
    
    await prisma.$executeRawUnsafe(createViewSQL);
    
    console.log('✅ View created successfully!');
    
    // Create indexes
    console.log('📑 Creating indexes...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_performance_metric_equipment_timestamp 
      ON "PerformanceMetric" ("equipmentId", "timestamp")
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_performance_metric_date_equipment 
      ON "PerformanceMetric" (date_trunc('day', "timestamp"), "equipmentId")
    `);
    
    // Add comment
    await prisma.$executeRawUnsafe(`
      COMMENT ON VIEW vw_iso22400_oee_metrics IS 
      'ISO 22400 compliant OEE (Overall Equipment Effectiveness) metrics view.
      Aggregates performance data per equipment per day with calculations for:
      - Availability Rate = Operating Time / Planned Production Time
      - Performance Rate = (Ideal Cycle Time × Total Count) / Operating Time  
      - Quality Rate = Good Count / Total Count
      - OEE = Availability × Performance × Quality
      All rates are between 0 and 1 (0-100%)'
    `);
    
    console.log('✅ Indexes and comments added!');
    
  } catch (error) {
    console.error('❌ Error creating view:', error);
    throw error;
  }
}

async function testView() {
  console.log('\n📊 Testing the view...');
  
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        equipment_id,
        period_date,
        ROUND(oee::numeric * 100, 1) as oee_percentage,
        ROUND(availability_rate::numeric * 100, 1) as availability_percentage,
        ROUND(performance_rate::numeric * 100, 1) as performance_percentage,
        ROUND(quality_rate::numeric * 100, 1) as quality_percentage
      FROM vw_iso22400_oee_metrics
      LIMIT 5
    `;
    
    if ((result as any[]).length > 0) {
      console.log('\n✅ View is working! Sample data:');
      console.table(result);
    } else {
      console.log('\n⚠️  View created but no data found. You may need to seed PerformanceMetric data.');
    }
    
  } catch (error) {
    console.error('❌ Error testing view:', error);
  }
}

async function main() {
  try {
    await createOEEView();
    await testView();
    
    console.log('\n✅ ISO 22400 OEE View is ready!');
    console.log('\n📝 You can now query it with:');
    console.log('   SELECT * FROM vw_iso22400_oee_metrics LIMIT 10;');
    
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();