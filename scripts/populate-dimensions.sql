-- =====================================================
-- POPULATE DIMENSION TABLES
-- This script populates all dimension tables with 
-- comprehensive data for development and testing
-- =====================================================

-- Populate DIM_DATE (5 years of dates)
INSERT INTO dim_date (date_id, date, year, quarter, month, week, day_of_year, 
                     day_of_month, day_of_week, day_name, month_name, is_weekend,
                     fiscal_year, fiscal_quarter, fiscal_period)
SELECT 
    TO_CHAR(d::date, 'YYYYMMDD')::INTEGER as date_id,
    d::date as date,
    EXTRACT(YEAR FROM d) as year,
    EXTRACT(QUARTER FROM d) as quarter,
    EXTRACT(MONTH FROM d) as month,
    EXTRACT(WEEK FROM d) as week,
    EXTRACT(DOY FROM d) as day_of_year,
    EXTRACT(DAY FROM d) as day_of_month,
    EXTRACT(ISODOW FROM d) as day_of_week,
    TO_CHAR(d, 'Day') as day_name,
    TO_CHAR(d, 'Month') as month_name,
    EXTRACT(ISODOW FROM d) IN (6, 7) as is_weekend,
    CASE WHEN EXTRACT(MONTH FROM d) >= 4 THEN EXTRACT(YEAR FROM d) ELSE EXTRACT(YEAR FROM d) - 1 END as fiscal_year,
    CASE 
        WHEN EXTRACT(MONTH FROM d) IN (4,5,6) THEN 1
        WHEN EXTRACT(MONTH FROM d) IN (7,8,9) THEN 2
        WHEN EXTRACT(MONTH FROM d) IN (10,11,12) THEN 3
        ELSE 4
    END as fiscal_quarter,
    CASE 
        WHEN EXTRACT(MONTH FROM d) < 4 THEN EXTRACT(MONTH FROM d) + 9
        ELSE EXTRACT(MONTH FROM d) - 3
    END as fiscal_period
FROM generate_series(
    CURRENT_DATE - INTERVAL '2 years',
    CURRENT_DATE + INTERVAL '3 years',
    '1 day'::interval
) d
ON CONFLICT (date_id) DO NOTHING;

-- Populate DIM_TIME (every minute of the day)
INSERT INTO dim_time (time_id, time, hour, minute, hour_24, hour_12, am_pm, time_string)
SELECT 
    h * 100 + m as time_id,
    (h::text || ':' || LPAD(m::text, 2, '0'))::time as time,
    h as hour,
    m as minute,
    LPAD(h::text, 2, '0') as hour_24,
    LPAD(CASE WHEN h = 0 THEN 12 WHEN h > 12 THEN h - 12 ELSE h END::text, 2, '0') as hour_12,
    CASE WHEN h < 12 THEN 'AM' ELSE 'PM' END as am_pm,
    h::text || ':' || LPAD(m::text, 2, '0') || ':00' as time_string
FROM generate_series(0, 23) h
CROSS JOIN generate_series(0, 59) m
ON CONFLICT (time_id) DO NOTHING;

-- Populate DIM_SHIFT
INSERT INTO dim_shift (shift_name, shift_code, start_time, end_time, break_minutes)
VALUES
    ('Morning Shift', 'SHIFT-A', '06:00:00', '14:00:00', 30),
    ('Afternoon Shift', 'SHIFT-B', '14:00:00', '22:00:00', 30),
    ('Night Shift', 'SHIFT-C', '22:00:00', '06:00:00', 30),
    ('Day Shift', 'SHIFT-D', '08:00:00', '17:00:00', 60),
    ('Weekend Morning', 'SHIFT-WA', '06:00:00', '18:00:00', 60),
    ('Weekend Night', 'SHIFT-WB', '18:00:00', '06:00:00', 60)
ON CONFLICT (shift_code) DO NOTHING;

-- Populate DIM_EQUIPMENT
INSERT INTO dim_equipment (equipment_code, equipment_name, equipment_type, manufacturer, 
                          model, serial_number, commission_date, location_code, 
                          department, cost_center, nominal_speed, nominal_speed_unit, attributes)
VALUES
    -- CNC Machines
    ('CNC-001', 'CNC Milling Machine 1', 'CNC Mill', 'Haas', 'VF-2SS', 'HAS2023001', '2023-01-15', 'PROD-A1', 'Machining', 'CC-100', 120, 'parts/hour', 
     '{"spindle_speed": 12000, "axis_count": 3, "tool_capacity": 20, "coolant_type": "flood"}'::jsonb),
    ('CNC-002', 'CNC Milling Machine 2', 'CNC Mill', 'Haas', 'VF-4SS', 'HAS2023002', '2023-02-20', 'PROD-A2', 'Machining', 'CC-100', 100, 'parts/hour',
     '{"spindle_speed": 12000, "axis_count": 3, "tool_capacity": 30, "coolant_type": "flood"}'::jsonb),
    ('CNC-003', 'CNC Turning Center 1', 'CNC Lathe', 'Mazak', 'QT-250', 'MAZ2023001', '2023-03-10', 'PROD-A3', 'Machining', 'CC-100', 80, 'parts/hour',
     '{"spindle_speed": 4000, "turret_positions": 12, "bar_feeder": true}'::jsonb),
    
    -- Injection Molding
    ('INJ-001', 'Injection Mold Machine 1', 'Injection Mold', 'Engel', 'Victory 120', 'ENG2022001', '2022-11-01', 'PROD-B1', 'Molding', 'CC-200', 600, 'parts/hour',
     '{"clamp_force": 120, "shot_size": 150, "material_types": ["PP", "PE", "ABS"]}'::jsonb),
    ('INJ-002', 'Injection Mold Machine 2', 'Injection Mold', 'Engel', 'Victory 200', 'ENG2022002', '2022-11-15', 'PROD-B2', 'Molding', 'CC-200', 500, 'parts/hour',
     '{"clamp_force": 200, "shot_size": 250, "material_types": ["PP", "PE", "ABS", "PC"]}'::jsonb),
    
    -- Assembly Lines
    ('ASM-001', 'Assembly Line 1', 'Assembly', 'Custom', 'AL-1000', 'CST2023001', '2023-01-01', 'PROD-C1', 'Assembly', 'CC-300', 240, 'units/hour',
     '{"stations": 8, "conveyor_speed": 10, "automation_level": "semi-auto"}'::jsonb),
    ('ASM-002', 'Assembly Line 2', 'Assembly', 'Custom', 'AL-2000', 'CST2023002', '2023-01-01', 'PROD-C2', 'Assembly', 'CC-300', 300, 'units/hour',
     '{"stations": 12, "conveyor_speed": 15, "automation_level": "full-auto"}'::jsonb),
    
    -- Packaging
    ('PKG-001', 'Packaging Line 1', 'Packaging', 'Bosch', 'PL-500', 'BSH2023001', '2023-04-01', 'PROD-D1', 'Packaging', 'CC-400', 1200, 'units/hour',
     '{"packaging_types": ["box", "shrink"], "label_printer": true, "case_packer": true}'::jsonb),
    
    -- Quality Equipment
    ('QC-001', 'CMM Machine', 'Quality', 'Zeiss', 'Contura G2', 'ZEI2023001', '2023-05-01', 'QC-LAB', 'Quality', 'CC-500', 10, 'parts/hour',
     '{"measurement_accuracy": 0.001, "probe_type": "scanning", "software": "Calypso"}'::jsonb),
    ('QC-002', 'Vision System', 'Quality', 'Keyence', 'IM-8000', 'KEY2023001', '2023-05-15', 'PROD-C1', 'Quality', 'CC-500', 600, 'parts/hour',
     '{"resolution": 0.01, "measurement_types": ["dimension", "presence", "color"]}'::jsonb)
ON CONFLICT (equipment_code) DO NOTHING;

-- Populate DIM_PRODUCT
INSERT INTO dim_product (product_code, product_name, product_family, product_group, 
                        standard_cycle_time, cycle_time_unit, weight_per_unit, weight_unit, quality_specs)
VALUES
    -- Machined Parts
    ('PART-001', 'Precision Shaft A', 'Shafts', 'Machined', 120, 'seconds', 0.850, 'kg',
     '{"diameter_tolerance": 0.01, "length_tolerance": 0.05, "surface_finish": 1.6}'::jsonb),
    ('PART-002', 'Precision Shaft B', 'Shafts', 'Machined', 150, 'seconds', 1.200, 'kg',
     '{"diameter_tolerance": 0.01, "length_tolerance": 0.05, "surface_finish": 0.8}'::jsonb),
    ('PART-003', 'Housing Component', 'Housings', 'Machined', 300, 'seconds', 2.500, 'kg',
     '{"flatness": 0.05, "bore_tolerance": 0.02, "surface_finish": 3.2}'::jsonb),
    
    -- Molded Parts
    ('MOLD-001', 'Plastic Cover A', 'Covers', 'Molded', 45, 'seconds', 0.120, 'kg',
     '{"color": "black", "material": "ABS", "shrinkage": 0.005}'::jsonb),
    ('MOLD-002', 'Plastic Housing B', 'Housings', 'Molded', 60, 'seconds', 0.250, 'kg',
     '{"color": "gray", "material": "PC", "shrinkage": 0.007}'::jsonb),
    
    -- Assemblies
    ('ASSY-001', 'Motor Assembly X1', 'Motors', 'Assembly', 600, 'seconds', 5.500, 'kg',
     '{"torque_spec": 50, "voltage": 24, "rpm": 3000}'::jsonb),
    ('ASSY-002', 'Pump Assembly Y1', 'Pumps', 'Assembly', 900, 'seconds', 8.200, 'kg',
     '{"flow_rate": 100, "pressure": 10, "seal_type": "mechanical"}'::jsonb),
    
    -- Packaged Products
    ('PACK-001', 'Retail Package A', 'Retail', 'Packaged', 30, 'seconds', 6.000, 'kg',
     '{"box_dimensions": "300x200x150", "label_requirements": ["barcode", "qr"], "pallet_quantity": 48}'::jsonb),
    ('PACK-002', 'Bulk Package B', 'Bulk', 'Packaged', 45, 'seconds', 25.000, 'kg',
     '{"box_dimensions": "600x400x400", "label_requirements": ["barcode"], "pallet_quantity": 12}'::jsonb)
ON CONFLICT (product_code) DO NOTHING;

-- Populate DIM_UNIT_OF_MEASURE
INSERT INTO dim_unit_of_measure (unit_code, unit_name, unit_type, base_unit_code, conversion_factor)
VALUES
    -- Time units
    ('s', 'Second', 'time', 's', 1),
    ('min', 'Minute', 'time', 's', 60),
    ('h', 'Hour', 'time', 's', 3600),
    
    -- Weight units
    ('g', 'Gram', 'weight', 'g', 1),
    ('kg', 'Kilogram', 'weight', 'g', 1000),
    ('lb', 'Pound', 'weight', 'g', 453.592),
    
    -- Count units
    ('pcs', 'Pieces', 'count', 'pcs', 1),
    ('dozen', 'Dozen', 'count', 'pcs', 12),
    ('gross', 'Gross', 'count', 'pcs', 144),
    
    -- Temperature units
    ('C', 'Celsius', 'temperature', 'C', 1),
    ('F', 'Fahrenheit', 'temperature', 'C', 1), -- Requires conversion formula
    
    -- Pressure units
    ('Pa', 'Pascal', 'pressure', 'Pa', 1),
    ('kPa', 'Kilopascal', 'pressure', 'Pa', 1000),
    ('bar', 'Bar', 'pressure', 'Pa', 100000),
    ('psi', 'PSI', 'pressure', 'Pa', 6894.76),
    
    -- Speed units
    ('rpm', 'RPM', 'speed', 'rpm', 1),
    ('parts/hour', 'Parts per Hour', 'rate', 'parts/hour', 1),
    ('units/hour', 'Units per Hour', 'rate', 'units/hour', 1)
ON CONFLICT (unit_code) DO NOTHING;

-- Populate DIM_QUALITY_DEFECT_TYPE
INSERT INTO dim_quality_defect_type (defect_code, defect_name, defect_category, severity_level, is_scrap, is_rework)
VALUES
    -- Dimensional defects
    ('DIM-001', 'Oversize', 'Dimensional', 3, false, true),
    ('DIM-002', 'Undersize', 'Dimensional', 3, true, false),
    ('DIM-003', 'Out of Tolerance', 'Dimensional', 2, false, true),
    
    -- Surface defects
    ('SRF-001', 'Scratch', 'Surface', 2, false, true),
    ('SRF-002', 'Dent', 'Surface', 3, false, true),
    ('SRF-003', 'Corrosion', 'Surface', 4, true, false),
    ('SRF-004', 'Poor Finish', 'Surface', 2, false, true),
    
    -- Material defects
    ('MAT-001', 'Crack', 'Material', 5, true, false),
    ('MAT-002', 'Porosity', 'Material', 4, true, false),
    ('MAT-003', 'Contamination', 'Material', 3, true, false),
    
    -- Assembly defects
    ('ASM-001', 'Missing Component', 'Assembly', 4, false, true),
    ('ASM-002', 'Wrong Component', 'Assembly', 4, false, true),
    ('ASM-003', 'Misalignment', 'Assembly', 3, false, true),
    
    -- Functional defects
    ('FNC-001', 'Does Not Function', 'Functional', 5, true, false),
    ('FNC-002', 'Intermittent Function', 'Functional', 4, false, true),
    
    -- Cosmetic defects
    ('COS-001', 'Color Variation', 'Cosmetic', 1, false, false),
    ('COS-002', 'Label Error', 'Cosmetic', 1, false, true)
ON CONFLICT (defect_code) DO NOTHING;

-- Populate DIM_DOWNTIME_REASON
INSERT INTO dim_downtime_reason (reason_code, reason_description, category_level_1, category_level_2, category_level_3, 
                                impacts_availability, impacts_performance, impacts_quality)
VALUES
    -- Planned Downtime
    ('PM-001', 'Preventive Maintenance', 'Planned', 'Maintenance', 'Scheduled', true, false, false),
    ('PM-002', 'Predictive Maintenance', 'Planned', 'Maintenance', 'Condition-Based', true, false, false),
    ('CL-001', 'Scheduled Cleaning', 'Planned', 'Cleaning', 'Routine', true, false, false),
    ('ST-001', 'Product Changeover', 'Planned', 'Setup', 'Changeover', true, false, false),
    ('ST-002', 'Tool Change', 'Planned', 'Setup', 'Tooling', true, false, false),
    ('TR-001', 'Operator Training', 'Planned', 'Training', 'Scheduled', true, false, false),
    
    -- Unplanned Downtime - Equipment Failure
    ('EF-001', 'Mechanical Failure', 'Unplanned', 'Equipment Failure', 'Mechanical', true, false, false),
    ('EF-002', 'Electrical Failure', 'Unplanned', 'Equipment Failure', 'Electrical', true, false, false),
    ('EF-003', 'Hydraulic Failure', 'Unplanned', 'Equipment Failure', 'Hydraulic', true, false, false),
    ('EF-004', 'Pneumatic Failure', 'Unplanned', 'Equipment Failure', 'Pneumatic', true, false, false),
    ('EF-005', 'Control System Failure', 'Unplanned', 'Equipment Failure', 'Controls', true, false, false),
    
    -- Unplanned Downtime - Process
    ('PR-001', 'Material Shortage', 'Unplanned', 'Process', 'Material', true, false, false),
    ('PR-002', 'Quality Issue', 'Unplanned', 'Process', 'Quality', false, false, true),
    ('PR-003', 'Process Parameter Drift', 'Unplanned', 'Process', 'Parameters', false, true, true),
    
    -- Unplanned Downtime - External
    ('EX-001', 'Power Outage', 'Unplanned', 'External', 'Utilities', true, false, false),
    ('EX-002', 'Compressed Air Loss', 'Unplanned', 'External', 'Utilities', true, false, false),
    ('EX-003', 'IT System Failure', 'Unplanned', 'External', 'IT', true, false, false),
    
    -- Minor Stops (affect performance)
    ('MS-001', 'Minor Jam', 'Unplanned', 'Minor Stop', 'Jam', false, true, false),
    ('MS-002', 'Sensor Blocked', 'Unplanned', 'Minor Stop', 'Sensor', false, true, false),
    ('MS-003', 'Speed Loss', 'Unplanned', 'Minor Stop', 'Speed', false, true, false)
ON CONFLICT (reason_code) DO NOTHING;

-- Populate ONTOLOGY_TERM for AI understanding
INSERT INTO ontology_term (term, model_name, field_name, priority, examples)
VALUES
    -- Equipment related terms
    ('machine', 'dim_equipment', 'equipment_name', 10, ARRAY['equipment', 'asset', 'device']),
    ('equipment type', 'dim_equipment', 'equipment_type', 9, ARRAY['machine type', 'asset type']),
    ('serial number', 'dim_equipment', 'serial_number', 8, ARRAY['serial no', 'serial #']),
    
    -- Production terms
    ('production', 'fact_production', 'total_parts_produced', 10, ARRAY['output', 'parts made', 'units produced']),
    ('good parts', 'fact_production', 'good_parts', 9, ARRAY['good units', 'passed parts', 'ok parts']),
    ('cycle time', 'fact_production', 'cycle_time_actual', 8, ARRAY['takt time', 'process time']),
    
    -- OEE terms
    ('oee', 'view_oee_daily', 'oee', 10, ARRAY['overall equipment effectiveness', 'efficiency']),
    ('availability', 'view_oee_daily', 'availability', 9, ARRAY['uptime', 'available time']),
    ('performance', 'view_oee_daily', 'performance', 9, ARRAY['speed', 'rate']),
    ('quality', 'view_oee_daily', 'quality', 9, ARRAY['yield', 'first pass yield']),
    
    -- Downtime terms
    ('downtime', 'fact_downtime', 'downtime_duration', 10, ARRAY['stop time', 'idle time', 'breakdown']),
    ('downtime reason', 'dim_downtime_reason', 'reason_description', 9, ARRAY['stop reason', 'failure cause']),
    
    -- Reliability terms
    ('mtbf', 'view_reliability_summary', 'mtbf_hours', 10, ARRAY['mean time between failures', 'reliability']),
    ('mttr', 'view_reliability_summary', 'mttr_hours', 10, ARRAY['mean time to repair', 'repair time']),
    
    -- Quality terms
    ('defects', 'fact_quality', 'defects_found', 10, ARRAY['rejects', 'failures', 'bad parts']),
    ('scrap', 'fact_scrap', 'scrap_quantity', 10, ARRAY['waste', 'rejected parts']),
    ('defect type', 'dim_quality_defect_type', 'defect_name', 9, ARRAY['failure mode', 'defect category']),
    
    -- Time-related terms
    ('shift', 'dim_shift', 'shift_name', 8, ARRAY['work shift', 'production shift']),
    ('today', 'dim_date_range', 'name', 10, ARRAY['current day', 'this day']),
    ('yesterday', 'dim_date_range', 'name', 10, ARRAY['previous day', 'last day']),
    ('last week', 'dim_date_range', 'name', 10, ARRAY['previous week', 'past week']),
    ('last month', 'dim_date_range', 'name', 10, ARRAY['previous month', 'past month'])
ON CONFLICT (term) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Dimension tables populated successfully!';
    RAISE NOTICE 'Ready for fact data population';
    RAISE NOTICE '========================================';
END $$;