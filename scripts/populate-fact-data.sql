-- =====================================================
-- POPULATE FACT TABLES WITH SAMPLE DATA
-- This script generates realistic manufacturing data
-- for development, testing, and dashboard creation
-- =====================================================

-- Set random seed for reproducible data
SELECT setseed(0.42);

-- Function to generate realistic production data
CREATE OR REPLACE FUNCTION generate_production_data(
    start_date DATE,
    end_date DATE,
    records_per_day INTEGER DEFAULT 100
) RETURNS void AS $$
DECLARE
    curr_date DATE;
    curr_shift_id INTEGER;
    curr_equipment_id INTEGER;
    curr_product_id INTEGER;
    curr_production_id BIGINT;
    planned_time INTEGER;
    operating_time INTEGER;
    target_parts INTEGER;
    actual_parts INTEGER;
    good_parts INTEGER;
    standard_cycle NUMERIC;
    actual_cycle NUMERIC;
    downtime_chance NUMERIC;
    quality_issue_chance NUMERIC;
    scrap_chance NUMERIC;
BEGIN
    curr_date := start_date;
    
    WHILE curr_date <= end_date LOOP
        FOR i IN 1..records_per_day LOOP
            -- Select random shift (weighted towards day shifts)
            curr_shift_id := CASE 
                WHEN random() < 0.4 THEN 1  -- Morning
                WHEN random() < 0.7 THEN 2  -- Afternoon
                WHEN random() < 0.85 THEN 3 -- Night
                ELSE 4 -- Day shift
            END;
            
            -- Select random equipment (weighted by type)
            curr_equipment_id := CASE
                WHEN random() < 0.3 THEN floor(random() * 3 + 1)::INTEGER    -- CNC machines
                WHEN random() < 0.5 THEN floor(random() * 2 + 4)::INTEGER    -- Injection molding
                WHEN random() < 0.7 THEN floor(random() * 2 + 6)::INTEGER    -- Assembly
                ELSE 8 -- Packaging
            END;
            
            -- Select appropriate product for equipment type
            curr_product_id := CASE
                WHEN curr_equipment_id <= 3 THEN floor(random() * 3 + 1)::INTEGER      -- Machined parts
                WHEN curr_equipment_id <= 5 THEN floor(random() * 2 + 4)::INTEGER      -- Molded parts
                WHEN curr_equipment_id <= 7 THEN floor(random() * 2 + 6)::INTEGER      -- Assemblies
                ELSE floor(random() * 2 + 8)::INTEGER -- Packaged products
            END;
            
            -- Generate production metrics
            planned_time := 3600 + floor(random() * 3600)::INTEGER; -- 1-2 hours
            operating_time := planned_time - floor(random() * 600)::INTEGER; -- 0-10 min setup
            
            -- Get standard cycle time
            SELECT standard_cycle_time INTO standard_cycle 
            FROM dim_product WHERE product_id = curr_product_id;
            
            -- Calculate production based on cycle time
            target_parts := floor(operating_time / standard_cycle)::INTEGER;
            
            -- Add variability (80-110% of target)
            actual_parts := floor(target_parts * (0.8 + random() * 0.3))::INTEGER;
            
            -- Quality rate (typically 95-99.5%)
            good_parts := floor(actual_parts * (0.95 + random() * 0.045))::INTEGER;
            
            -- Actual cycle time varies ±5% from standard
            actual_cycle := standard_cycle * (0.95 + random() * 0.1);
            
            -- Insert production record
            INSERT INTO fact_production (
                date_id, time_id, shift_id, equipment_id, product_id,
                operator_id, work_order, batch_number,
                planned_production_time, operating_time, 
                total_parts_produced, good_parts,
                cycle_time_actual, cycle_time_standard, speed_rate
            ) VALUES (
                TO_CHAR(curr_date, 'YYYYMMDD')::INTEGER,
                floor(random() * 480 + 360)::INTEGER, -- 6 AM to 2 PM for day shifts
                curr_shift_id,
                curr_equipment_id,
                curr_product_id,
                'OP-' || LPAD(floor(random() * 50 + 1)::TEXT, 3, '0'),
                'WO-' || TO_CHAR(curr_date, 'YYYYMMDD') || '-' || LPAD(i::TEXT, 3, '0'),
                'BATCH-' || TO_CHAR(curr_date, 'YYYYMMDD') || '-' || LPAD(i::TEXT, 3, '0'),
                planned_time,
                operating_time,
                actual_parts,
                good_parts,
                actual_cycle,
                standard_cycle,
                CASE WHEN actual_cycle > 0 THEN standard_cycle / actual_cycle * 100 ELSE 0 END
            ) RETURNING production_id INTO curr_production_id;
            
            -- Generate downtime events (20% chance)
            downtime_chance := random();
            IF downtime_chance < 0.2 THEN
                INSERT INTO fact_downtime (
                    production_id, equipment_id, date_id,
                    time_start_id, time_end_id, reason_id,
                    downtime_duration, operator_id, comments
                ) VALUES (
                    curr_production_id,
                    curr_equipment_id,
                    TO_CHAR(curr_date, 'YYYYMMDD')::INTEGER,
                    floor(random() * 480 + 360)::INTEGER,
                    floor(random() * 480 + 360)::INTEGER,
                    CASE 
                        WHEN downtime_chance < 0.05 THEN floor(random() * 6 + 7)::INTEGER  -- Equipment failure
                        WHEN downtime_chance < 0.10 THEN floor(random() * 3 + 13)::INTEGER -- Process issues
                        WHEN downtime_chance < 0.15 THEN floor(random() * 3 + 16)::INTEGER -- External
                        ELSE floor(random() * 3 + 19)::INTEGER -- Minor stops
                    END,
                    floor(random() * 1800 + 300)::INTEGER, -- 5-30 minutes
                    'OP-' || LPAD(floor(random() * 50 + 1)::TEXT, 3, '0'),
                    CASE WHEN random() < 0.3 THEN 'See maintenance log for details' ELSE NULL END
                );
            END IF;
            
            -- Generate quality inspections (80% of production has inspection)
            quality_issue_chance := random();
            IF quality_issue_chance < 0.8 THEN
                INSERT INTO fact_quality (
                    production_id, date_id, time_id,
                    equipment_id, product_id, inspection_type,
                    sample_size, defects_found, defect_details,
                    inspector_id
                ) VALUES (
                    curr_production_id,
                    TO_CHAR(curr_date, 'YYYYMMDD')::INTEGER,
                    floor(random() * 480 + 360)::INTEGER,
                    curr_equipment_id,
                    curr_product_id,
                    CASE WHEN random() < 0.7 THEN 'In-Process' ELSE 'Final' END,
                    CASE WHEN random() < 0.5 THEN 10 ELSE floor(random() * 20 + 5)::INTEGER END,
                    CASE 
                        WHEN quality_issue_chance < 0.05 THEN floor(random() * 3 + 1)::INTEGER
                        ELSE 0
                    END,
                    CASE 
                        WHEN quality_issue_chance < 0.05 THEN 
                            json_build_array(
                                json_build_object(
                                    'defect_type', floor(random() * 10 + 1)::INTEGER,
                                    'count', floor(random() * 3 + 1)::INTEGER
                                )
                            )::jsonb
                        ELSE '[]'::jsonb
                    END,
                    'QC-' || LPAD(floor(random() * 10 + 1)::TEXT, 3, '0')
                );
            END IF;
            
            -- Generate scrap records (5% chance)
            scrap_chance := random();
            IF scrap_chance < 0.05 THEN
                INSERT INTO fact_scrap (
                    production_id, date_id, time_id,
                    equipment_id, product_id, defect_type_id,
                    scrap_quantity, scrap_weight, scrap_cost,
                    can_rework, operator_id
                ) VALUES (
                    curr_production_id,
                    TO_CHAR(curr_date, 'YYYYMMDD')::INTEGER,
                    floor(random() * 480 + 360)::INTEGER,
                    curr_equipment_id,
                    curr_product_id,
                    floor(random() * 15 + 1)::INTEGER,
                    actual_parts - good_parts,
                    (actual_parts - good_parts) * (0.1 + random() * 2), -- Weight varies by product
                    (actual_parts - good_parts) * (5 + random() * 20), -- Cost $5-25 per unit
                    random() < 0.3, -- 30% can be reworked
                    'OP-' || LPAD(floor(random() * 50 + 1)::TEXT, 3, '0')
                );
            END IF;
        END LOOP;
        
        curr_date := curr_date + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate production data for the last 90 days
SELECT generate_production_data(
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE,
    50 -- Records per day per shift
);

-- Generate sensor events for key equipment (last 7 days)
INSERT INTO fact_sensor_event (equipment_id, event_ts, parameter, value, unit_id, quality_flag)
SELECT 
    equipment_id,
    ts,
    parameter,
    CASE 
        WHEN parameter = 'Temperature' THEN 20 + random() * 60  -- 20-80°C
        WHEN parameter = 'Pressure' THEN 1 + random() * 9       -- 1-10 bar
        WHEN parameter = 'Vibration' THEN random() * 10         -- 0-10 mm/s
        WHEN parameter = 'Current' THEN 10 + random() * 90      -- 10-100 A
        WHEN parameter = 'Speed' THEN 1000 + random() * 3000    -- 1000-4000 RPM
    END as value,
    CASE 
        WHEN parameter = 'Temperature' THEN (SELECT unit_id FROM dim_unit_of_measure WHERE unit_code = 'C')
        WHEN parameter = 'Pressure' THEN (SELECT unit_id FROM dim_unit_of_measure WHERE unit_code = 'bar')
        WHEN parameter = 'Vibration' THEN (SELECT unit_id FROM dim_unit_of_measure WHERE unit_code = 'mm/s')
        WHEN parameter = 'Current' THEN (SELECT unit_id FROM dim_unit_of_measure WHERE unit_code = 'A')
        WHEN parameter = 'Speed' THEN (SELECT unit_id FROM dim_unit_of_measure WHERE unit_code = 'rpm')
    END as unit_id,
    CASE WHEN random() < 0.95 THEN 'GOOD' ELSE 'SUSPECT' END as quality_flag
FROM 
    (SELECT equipment_id FROM dim_equipment WHERE equipment_type IN ('CNC Mill', 'CNC Lathe', 'Injection Mold')) e
    CROSS JOIN generate_series(
        CURRENT_TIMESTAMP - INTERVAL '7 days',
        CURRENT_TIMESTAMP,
        INTERVAL '5 minutes'
    ) ts
    CROSS JOIN (VALUES ('Temperature'), ('Pressure'), ('Vibration'), ('Current'), ('Speed')) p(parameter)
WHERE random() < 0.8; -- 80% data density

-- Refresh materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY view_oee_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY view_reliability_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY view_scrap_summary;

-- Generate summary statistics
DO $$
DECLARE
    production_count BIGINT;
    downtime_count BIGINT;
    quality_count BIGINT;
    scrap_count BIGINT;
    sensor_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO production_count FROM fact_production;
    SELECT COUNT(*) INTO downtime_count FROM fact_downtime;
    SELECT COUNT(*) INTO quality_count FROM fact_quality;
    SELECT COUNT(*) INTO scrap_count FROM fact_scrap;
    SELECT COUNT(*) INTO sensor_count FROM fact_sensor_event;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fact Data Population Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Production Records: %', production_count;
    RAISE NOTICE 'Downtime Events: %', downtime_count;
    RAISE NOTICE 'Quality Inspections: %', quality_count;
    RAISE NOTICE 'Scrap Records: %', scrap_count;
    RAISE NOTICE 'Sensor Events: %', sensor_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Materialized views refreshed';
    RAISE NOTICE 'Database ready for use!';
    RAISE NOTICE '========================================';
END $$;

-- Clean up temporary function
DROP FUNCTION IF EXISTS generate_production_data(DATE, DATE, INTEGER);