# ISO 22400 OEE Calculation Guide

## Overview

This guide documents the OEE (Overall Equipment Effectiveness) calculation methodology implemented in the Manufacturing Analytics Platform, following ISO 22400 standards.

## Table of Contents
- [Core Concepts](#core-concepts)
- [Time Model](#time-model)
- [OEE Components](#oee-components)
- [Calculation Formulas](#calculation-formulas)
- [Six Big Losses](#six-big-losses)
- [Implementation Details](#implementation-details)
- [Examples](#examples)

## Core Concepts

### ISO 22400 Definition
ISO 22400 defines OEE as a composite metric that measures the effectiveness of manufacturing equipment by combining three key factors:
- **Availability**: The percentage of scheduled time that equipment is available for production
- **Performance**: The speed at which the equipment runs as a percentage of designed speed
- **Quality**: The percentage of good parts produced out of total parts produced

### OEE Formula
```
OEE = Availability × Performance × Quality
```

## Time Model

### Time Categories (ISO 22400)

```
Calendar Time (24/7/365)
│
├── Scheduled Time
│   ├── Planned Production Time
│   │   ├── Operating Time
│   │   │   ├── Net Operating Time
│   │   │   │   └── Fully Productive Time
│   │   │   └── Performance Loss
│   │   └── Availability Loss
│   └── Planned Downtime
└── Non-Scheduled Time
```

### Time Definitions

1. **Calendar Time**: Total time in the period (24 hours × days)
2. **Scheduled Time**: Time when production is scheduled
3. **Planned Production Time**: Scheduled time minus planned stops (breaks, meetings)
4. **Operating Time**: Time equipment is actually running
5. **Net Operating Time**: Operating time at standard speed
6. **Fully Productive Time**: Net operating time producing good parts

## OEE Components

### 1. Availability

**Formula:**
```
Availability = Operating Time / Planned Production Time
```

**Losses Tracked:**
- Equipment failures (breakdowns)
- Setup and adjustments (changeovers)

**Implementation:**
```typescript
const availability = timeComponents.operatingTime / timeComponents.plannedProductionTime;
```

### 2. Performance

**Formula:**
```
Performance = (Total Count × Ideal Cycle Time) / Operating Time
```

Or alternatively:
```
Performance = Actual Production Rate / Ideal Production Rate
```

**Losses Tracked:**
- Idling and minor stops
- Reduced speed operation

**Implementation:**
```typescript
const theoreticalOutput = (operatingTimeMinutes * 60) / theoreticalCycleTimeSeconds;
const performance = Math.min(productionData.totalProduced / theoreticalOutput, 1);
```

### 3. Quality

**Formula:**
```
Quality = Good Count / Total Count
```

**Losses Tracked:**
- Process defects
- Reduced yield (startup losses)

**Implementation:**
```typescript
const quality = productionData.goodProduced / productionData.totalProduced;
```

## Calculation Formulas

### Complete OEE Calculation

```typescript
// 1. Calculate time components
plannedProductionTime = shiftDuration - plannedBreaks;
operatingTime = sum(productionStatesDuration);
availabilityLoss = unplannedDowntime;

// 2. Calculate availability
availability = operatingTime / plannedProductionTime;

// 3. Calculate performance
idealCycleTime = equipment.theoreticalCycleTime;
theoreticalOutput = operatingTime / idealCycleTime;
performance = min(actualOutput / theoreticalOutput, 1.0);

// 4. Calculate quality
quality = goodParts / totalParts;

// 5. Calculate OEE
oee = availability * performance * quality;
```

### TEEP (Total Effective Equipment Performance)

TEEP includes utilization in the calculation:
```
TEEP = OEE × Utilization
Utilization = Planned Production Time / Calendar Time
```

## Six Big Losses

ISO 22400 categorizes equipment losses into six categories:

### Availability Losses
1. **Equipment Failure**
   - Unplanned stops due to equipment breakdown
   - Tracked in `equipment_states` as state='DOWN'
   
2. **Setup & Adjustment**
   - Time lost during changeovers
   - Tracked in `equipment_states` as state='IDLE' with reason='CHANGEOVER'

### Performance Losses
3. **Idling & Minor Stops**
   - Brief stops (typically under 5 minutes)
   - Calculated from production gaps
   
4. **Reduced Speed**
   - Running below optimal speed
   - Calculated as: `(idealCycleTime - actualCycleTime) × totalCount`

### Quality Losses
5. **Process Defects**
   - Defects during steady-state production
   - Tracked in `quality_events` as eventType='DEFECT'
   
6. **Reduced Yield**
   - Losses during startup/warmup
   - Tracked in `quality_events` with specific defectCategory

## Implementation Details

### Database Schema

The optimized schema tracks OEE data across multiple tables:

1. **equipment_states**: Tracks equipment status changes
2. **production_counts**: Records production quantities
3. **quality_events**: Captures quality issues
4. **oee_calculations**: Stores pre-calculated OEE values

### Real-time Calculation

```typescript
// Service: oee-calculation-service.ts
async calculateOEE(
  equipmentId: string,
  startTime: Date,
  endTime: Date,
  shiftInstanceId?: string
): Promise<OEECalculation>
```

### Continuous Aggregates

TimescaleDB continuous aggregates provide pre-calculated metrics:

```sql
-- Hourly OEE by equipment
CREATE MATERIALIZED VIEW oee_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS hour,
    equipmentId,
    AVG(oee) as avg_oee,
    AVG(availability) as avg_availability,
    AVG(performance) as avg_performance,
    AVG(quality) as avg_quality
FROM oee_calculations
GROUP BY hour, equipmentId;
```

## Examples

### Example 1: Basic OEE Calculation

**Scenario:**
- 8-hour shift (480 minutes)
- 30 minutes planned break
- 60 minutes breakdown
- Produced 350 parts (theoretical: 450)
- 330 good parts

**Calculation:**
```
Planned Production Time = 480 - 30 = 450 minutes
Operating Time = 450 - 60 = 390 minutes
Availability = 390 / 450 = 0.867 (86.7%)

Theoretical Output = 450 parts
Performance = 350 / 450 = 0.778 (77.8%)

Quality = 330 / 350 = 0.943 (94.3%)

OEE = 0.867 × 0.778 × 0.943 = 0.636 (63.6%)
```

### Example 2: Multi-shift OEE

**Scenario:**
- 3 shifts × 8 hours = 24 hours
- Different performance per shift

**Calculation:**
```typescript
const shiftOEEs = await Promise.all(
  shifts.map(shift => 
    oeeCalculationService.calculateOEE(
      equipmentId,
      shift.startTime,
      shift.endTime,
      shift.id
    )
  )
);

const dailyOEE = {
  availability: average(shiftOEEs.map(s => s.availability)),
  performance: average(shiftOEEs.map(s => s.performance)),
  quality: average(shiftOEEs.map(s => s.quality)),
  oee: average(shiftOEEs.map(s => s.oee))
};
```

## Best Practices

1. **Data Collection Frequency**
   - Equipment states: Real-time (on state change)
   - Production counts: Every cycle or batch
   - Quality events: As they occur

2. **Calculation Frequency**
   - Real-time: For current shift monitoring
   - Hourly: For trend analysis
   - Daily: For reporting

3. **Data Validation**
   - Ensure no negative time values
   - Cap performance at 100%
   - Validate count relationships (good ≤ total)

4. **Performance Optimization**
   - Use TimescaleDB continuous aggregates
   - Index on equipment_id and timestamp
   - Compress older data

## Troubleshooting

### Common Issues

1. **OEE > 100%**
   - Check theoretical cycle time setting
   - Verify production count accuracy

2. **Very Low Performance**
   - Validate cycle time configuration
   - Check for missing production counts

3. **Availability Calculation Issues**
   - Ensure all states are categorized correctly
   - Verify shift boundaries

### Validation Queries

```sql
-- Check for gaps in equipment states
SELECT 
  equipmentId,
  COUNT(*) as gap_count
FROM (
  SELECT 
    equipmentId,
    startTime,
    LAG(endTime) OVER (PARTITION BY equipmentId ORDER BY startTime) as prev_end
  FROM equipment_states
) t
WHERE startTime > prev_end + INTERVAL '1 minute'
GROUP BY equipmentId;

-- Verify OEE components are in valid range
SELECT 
  COUNT(*) as invalid_records
FROM oee_calculations
WHERE availability > 1 
   OR performance > 1 
   OR quality > 1 
   OR oee > 1;
```

## References

- ISO 22400-2:2014 - Key performance indicators for manufacturing operations management
- SEMI E10 - Specification for Definition and Measurement of Equipment Reliability
- OEE Industry Standard (Seiichi Nakajima)