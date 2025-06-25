@echo off
echo ===============================================
echo Setting up Sample Manufacturing Dashboards
echo ===============================================
echo.

echo Step 1: Creating database views for dashboards...
echo.

REM Create a temporary SQL file
echo -- Create sample data if tables don't exist > temp_dashboard_setup.sql
echo CREATE TABLE IF NOT EXISTS production_metrics ( >> temp_dashboard_setup.sql
echo     id SERIAL PRIMARY KEY, >> temp_dashboard_setup.sql
echo     timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(), >> temp_dashboard_setup.sql
echo     equipment_id VARCHAR(50), >> temp_dashboard_setup.sql
echo     units_produced INTEGER, >> temp_dashboard_setup.sql
echo     units_defective INTEGER, >> temp_dashboard_setup.sql
echo     oee_score DECIMAL(3,2), >> temp_dashboard_setup.sql
echo     availability DECIMAL(3,2), >> temp_dashboard_setup.sql
echo     performance DECIMAL(3,2), >> temp_dashboard_setup.sql
echo     quality DECIMAL(3,2) >> temp_dashboard_setup.sql
echo ); >> temp_dashboard_setup.sql
echo. >> temp_dashboard_setup.sql
echo CREATE TABLE IF NOT EXISTS equipment ( >> temp_dashboard_setup.sql
echo     equipment_id VARCHAR(50) PRIMARY KEY, >> temp_dashboard_setup.sql
echo     equipment_name VARCHAR(100), >> temp_dashboard_setup.sql
echo     equipment_type VARCHAR(50), >> temp_dashboard_setup.sql
echo     status VARCHAR(20) >> temp_dashboard_setup.sql
echo ); >> temp_dashboard_setup.sql
echo. >> temp_dashboard_setup.sql
echo CREATE TABLE IF NOT EXISTS equipment_metrics ( >> temp_dashboard_setup.sql
echo     id SERIAL PRIMARY KEY, >> temp_dashboard_setup.sql
echo     timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(), >> temp_dashboard_setup.sql
echo     equipment_id VARCHAR(50), >> temp_dashboard_setup.sql
echo     availability DECIMAL(3,2), >> temp_dashboard_setup.sql
echo     performance DECIMAL(3,2), >> temp_dashboard_setup.sql
echo     quality DECIMAL(3,2), >> temp_dashboard_setup.sql
echo     oee_score DECIMAL(3,2) >> temp_dashboard_setup.sql
echo ); >> temp_dashboard_setup.sql
echo. >> temp_dashboard_setup.sql
echo -- Insert sample equipment if not exists >> temp_dashboard_setup.sql
echo INSERT INTO equipment (equipment_id, equipment_name, equipment_type, status) >> temp_dashboard_setup.sql
echo VALUES >> temp_dashboard_setup.sql
echo     ('EQ-001', 'CNC Machine 1', 'CNC', 'Running'), >> temp_dashboard_setup.sql
echo     ('EQ-002', 'CNC Machine 2', 'CNC', 'Running'), >> temp_dashboard_setup.sql
echo     ('EQ-003', 'Assembly Line 1', 'Assembly', 'Running'), >> temp_dashboard_setup.sql
echo     ('EQ-004', 'Packaging Unit 1', 'Packaging', 'Maintenance') >> temp_dashboard_setup.sql
echo ON CONFLICT (equipment_id) DO NOTHING; >> temp_dashboard_setup.sql
echo. >> temp_dashboard_setup.sql
echo -- Insert sample production data for the last 24 hours >> temp_dashboard_setup.sql
echo INSERT INTO production_metrics (timestamp, equipment_id, units_produced, units_defective, oee_score, availability, performance, quality) >> temp_dashboard_setup.sql
echo SELECT >> temp_dashboard_setup.sql
echo     NOW() - (interval '1 hour' * generate_series(0, 23)), >> temp_dashboard_setup.sql
echo     'EQ-' ^|^| LPAD((1 + random() * 3)::int::text, 3, '0'), >> temp_dashboard_setup.sql
echo     (random() * 100 + 50)::int, >> temp_dashboard_setup.sql
echo     (random() * 5)::int, >> temp_dashboard_setup.sql
echo     0.6 + random() * 0.3, >> temp_dashboard_setup.sql
echo     0.8 + random() * 0.2, >> temp_dashboard_setup.sql
echo     0.7 + random() * 0.2, >> temp_dashboard_setup.sql
echo     0.9 + random() * 0.1 >> temp_dashboard_setup.sql
echo FROM generate_series(1, 96); -- 24 hours * 4 equipment >> temp_dashboard_setup.sql
echo. >> temp_dashboard_setup.sql
echo -- Create view for production overview >> temp_dashboard_setup.sql
echo CREATE OR REPLACE VIEW production_overview AS >> temp_dashboard_setup.sql
echo SELECT >> temp_dashboard_setup.sql
echo     date_trunc('hour', timestamp) as time, >> temp_dashboard_setup.sql
echo     COUNT(DISTINCT equipment_id) as active_machines, >> temp_dashboard_setup.sql
echo     SUM(units_produced) as units_produced, >> temp_dashboard_setup.sql
echo     SUM(units_defective) as defects, >> temp_dashboard_setup.sql
echo     ROUND(AVG(oee_score) * 100, 1) as avg_oee, >> temp_dashboard_setup.sql
echo     ROUND((1 - (SUM(units_defective)::float / NULLIF(SUM(units_produced), 0))) * 100, 1) as quality_rate >> temp_dashboard_setup.sql
echo FROM production_metrics >> temp_dashboard_setup.sql
echo WHERE timestamp ^> NOW() - INTERVAL '7 days' >> temp_dashboard_setup.sql
echo GROUP BY time >> temp_dashboard_setup.sql
echo ORDER BY time DESC; >> temp_dashboard_setup.sql
echo. >> temp_dashboard_setup.sql
echo -- Create view for equipment performance >> temp_dashboard_setup.sql
echo CREATE OR REPLACE VIEW equipment_performance AS >> temp_dashboard_setup.sql
echo SELECT >> temp_dashboard_setup.sql
echo     e.equipment_id, >> temp_dashboard_setup.sql
echo     e.equipment_name, >> temp_dashboard_setup.sql
echo     e.status, >> temp_dashboard_setup.sql
echo     e.equipment_type, >> temp_dashboard_setup.sql
echo     ROUND(AVG(m.availability) * 100, 1) as availability, >> temp_dashboard_setup.sql
echo     ROUND(AVG(m.performance) * 100, 1) as performance, >> temp_dashboard_setup.sql
echo     ROUND(AVG(m.quality) * 100, 1) as quality, >> temp_dashboard_setup.sql
echo     ROUND(AVG(m.oee_score) * 100, 1) as oee, >> temp_dashboard_setup.sql
echo     MAX(m.timestamp) as last_updated >> temp_dashboard_setup.sql
echo FROM equipment e >> temp_dashboard_setup.sql
echo LEFT JOIN equipment_metrics m ON e.equipment_id = m.equipment_id >> temp_dashboard_setup.sql
echo WHERE m.timestamp ^> NOW() - INTERVAL '24 hours' >> temp_dashboard_setup.sql
echo GROUP BY e.equipment_id, e.equipment_name, e.status, e.equipment_type; >> temp_dashboard_setup.sql
echo. >> temp_dashboard_setup.sql
echo -- Create realtime KPI view >> temp_dashboard_setup.sql
echo CREATE OR REPLACE VIEW realtime_kpis AS >> temp_dashboard_setup.sql
echo SELECT >> temp_dashboard_setup.sql
echo     ROUND(AVG(oee_score) * 100, 1) as current_oee, >> temp_dashboard_setup.sql
echo     SUM(units_produced) as total_production, >> temp_dashboard_setup.sql
echo     SUM(units_defective) as total_defects, >> temp_dashboard_setup.sql
echo     COUNT(DISTINCT equipment_id) as active_equipment, >> temp_dashboard_setup.sql
echo     ROUND((1 - (SUM(units_defective)::float / NULLIF(SUM(units_produced), 0))) * 100, 1) as quality_rate >> temp_dashboard_setup.sql
echo FROM production_metrics >> temp_dashboard_setup.sql
echo WHERE timestamp ^> NOW() - INTERVAL '1 hour'; >> temp_dashboard_setup.sql
echo. >> temp_dashboard_setup.sql
echo GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres; >> temp_dashboard_setup.sql
echo GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres; >> temp_dashboard_setup.sql

REM Execute the SQL file
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < temp_dashboard_setup.sql

REM Clean up
del temp_dashboard_setup.sql

echo.
echo Step 2: Sample dashboards data has been created!
echo.
echo The following views are now available:
echo - production_overview: Hourly production metrics
echo - equipment_performance: Equipment OEE and status
echo - realtime_kpis: Current KPI values
echo.
echo You can now:
echo 1. Navigate to your dashboards page
echo 2. Use these views to create visualizations
echo 3. The development auto-login will give you full access
echo.
pause