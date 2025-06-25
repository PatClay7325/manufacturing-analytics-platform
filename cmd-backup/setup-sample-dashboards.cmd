@echo off
echo ===============================================
echo Setting up Sample Manufacturing Dashboards
echo ===============================================
echo.

echo Step 1: Creating database views for dashboards...
echo.

REM Execute SQL to create views
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing << EOF
-- Create sample data if tables don't exist
CREATE TABLE IF NOT EXISTS production_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    equipment_id VARCHAR(50),
    units_produced INTEGER,
    units_defective INTEGER,
    oee_score DECIMAL(3,2),
    availability DECIMAL(3,2),
    performance DECIMAL(3,2),
    quality DECIMAL(3,2)
);

CREATE TABLE IF NOT EXISTS equipment (
    equipment_id VARCHAR(50) PRIMARY KEY,
    equipment_name VARCHAR(100),
    equipment_type VARCHAR(50),
    status VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS equipment_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    equipment_id VARCHAR(50),
    availability DECIMAL(3,2),
    performance DECIMAL(3,2),
    quality DECIMAL(3,2),
    oee_score DECIMAL(3,2)
);

-- Insert sample equipment if not exists
INSERT INTO equipment (equipment_id, equipment_name, equipment_type, status) 
VALUES 
    ('EQ-001', 'CNC Machine 1', 'CNC', 'Running'),
    ('EQ-002', 'CNC Machine 2', 'CNC', 'Running'),
    ('EQ-003', 'Assembly Line 1', 'Assembly', 'Running'),
    ('EQ-004', 'Packaging Unit 1', 'Packaging', 'Maintenance')
ON CONFLICT (equipment_id) DO NOTHING;

-- Insert sample production data for the last 24 hours
INSERT INTO production_metrics (timestamp, equipment_id, units_produced, units_defective, oee_score, availability, performance, quality)
SELECT 
    NOW() - (interval '1 hour' * generate_series(0, 23)),
    'EQ-' || LPAD((1 + random() * 3)::int::text, 3, '0'),
    (random() * 100 + 50)::int,
    (random() * 5)::int,
    0.6 + random() * 0.3,
    0.8 + random() * 0.2,
    0.7 + random() * 0.2,
    0.9 + random() * 0.1
FROM generate_series(1, 96); -- 24 hours * 4 equipment

-- Insert equipment metrics
INSERT INTO equipment_metrics (timestamp, equipment_id, availability, performance, quality, oee_score)
SELECT 
    NOW() - (interval '1 hour' * generate_series(0, 23)),
    equipment_id,
    0.8 + random() * 0.2,
    0.7 + random() * 0.2,
    0.9 + random() * 0.1,
    0.6 + random() * 0.3
FROM equipment
CROSS JOIN generate_series(1, 24);

-- Create view for production overview
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

-- Create view for equipment performance
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

-- Create realtime KPI view
CREATE OR REPLACE VIEW realtime_kpis AS
SELECT 
    ROUND(AVG(oee_score) * 100, 1) as current_oee,
    SUM(units_produced) as total_production,
    SUM(units_defective) as total_defects,
    COUNT(DISTINCT equipment_id) as active_equipment,
    ROUND((1 - (SUM(units_defective)::float / NULLIF(SUM(units_produced), 0))) * 100, 1) as quality_rate
FROM production_metrics
WHERE timestamp > NOW() - INTERVAL '1 hour';

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
EOF

echo.
echo Step 2: Accessing Superset to create dashboards...
echo.
echo Please follow these steps:
echo.
echo 1. Open http://localhost:8088 in incognito/private mode
echo 2. Login with username: admin, password: admin
echo.
echo 3. Create datasets from the views:
echo    a. Go to Data -^> Datasets -^> + Dataset
echo    b. Database: Manufacturing TimescaleDB
echo    c. Schema: public
echo    d. Add these tables as datasets:
echo       - production_overview
echo       - equipment_performance
echo       - realtime_kpis
echo.
echo 4. Create charts:
echo    a. Go to Charts -^> + Chart
echo    b. Choose your dataset
echo    c. Select visualization type:
echo       - Time-series for production trends
echo       - Big Number for KPIs
echo       - Table for equipment status
echo.
echo 5. Create a dashboard:
echo    a. Go to Dashboards -^> + Dashboard
echo    b. Name it "Manufacturing Overview"
echo    c. Drag and drop your charts
echo    d. Save the dashboard
echo.
echo 6. Get the dashboard ID:
echo    - Look at the URL when viewing the dashboard
echo    - It will be like: /superset/dashboard/1/
echo    - The number (1 in this example) is your dashboard ID
echo.
echo 7. Update your Next.js app with the dashboard ID
echo.
pause