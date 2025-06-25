@echo off
echo Creating Manufacturing Dashboards in Apache Superset...
echo.

echo Step 1: Creating SQL Lab queries for manufacturing metrics...
echo.

REM Create a temporary SQL file with manufacturing queries
echo -- Manufacturing Analytics Queries > temp_queries.sql
echo. >> temp_queries.sql
echo -- 1. Real-time Production Overview >> temp_queries.sql
echo CREATE OR REPLACE VIEW production_overview AS >> temp_queries.sql
echo SELECT  >> temp_queries.sql
echo   date_trunc('hour', timestamp) as hour, >> temp_queries.sql
echo   COUNT(DISTINCT equipment_id) as active_equipment, >> temp_queries.sql
echo   SUM(units_produced) as total_production, >> temp_queries.sql
echo   AVG(oee_score) as avg_oee, >> temp_queries.sql
echo   SUM(units_defective) as total_defects >> temp_queries.sql
echo FROM production_metrics >> temp_queries.sql
echo WHERE timestamp > NOW() - INTERVAL '24 hours' >> temp_queries.sql
echo GROUP BY hour >> temp_queries.sql
echo ORDER BY hour DESC; >> temp_queries.sql
echo. >> temp_queries.sql
echo -- 2. Equipment Performance Matrix >> temp_queries.sql
echo CREATE OR REPLACE VIEW equipment_performance AS >> temp_queries.sql
echo SELECT  >> temp_queries.sql
echo   equipment_id, >> temp_queries.sql
echo   equipment_name, >> temp_queries.sql
echo   status, >> temp_queries.sql
echo   AVG(availability) * 100 as availability_pct, >> temp_queries.sql
echo   AVG(performance) * 100 as performance_pct, >> temp_queries.sql
echo   AVG(quality) * 100 as quality_pct, >> temp_queries.sql
echo   AVG(oee_score) * 100 as oee_pct >> temp_queries.sql
echo FROM equipment_metrics >> temp_queries.sql
echo WHERE timestamp > NOW() - INTERVAL '1 hour' >> temp_queries.sql
echo GROUP BY equipment_id, equipment_name, status; >> temp_queries.sql
echo. >> temp_queries.sql
echo -- 3. Quality Trends >> temp_queries.sql
echo CREATE OR REPLACE VIEW quality_trends AS >> temp_queries.sql
echo SELECT  >> temp_queries.sql
echo   date_trunc('day', timestamp) as day, >> temp_queries.sql
echo   product_type, >> temp_queries.sql
echo   COUNT(*) as total_units, >> temp_queries.sql
echo   SUM(CASE WHEN quality_check = 'PASS' THEN 1 ELSE 0 END) as passed_units, >> temp_queries.sql
echo   (SUM(CASE WHEN quality_check = 'PASS' THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 as pass_rate >> temp_queries.sql
echo FROM quality_inspections >> temp_queries.sql
echo WHERE timestamp > NOW() - INTERVAL '30 days' >> temp_queries.sql
echo GROUP BY day, product_type >> temp_queries.sql
echo ORDER BY day DESC; >> temp_queries.sql

echo Step 2: Instructions for creating dashboards in Superset UI...
echo.
echo 1. Open http://localhost:8088 in your browser
echo 2. Login with admin/admin
echo 3. Go to SQL Lab -^> SQL Editor
echo 4. Select the Manufacturing TimescaleDB database
echo 5. Copy and paste the queries from temp_queries.sql
echo 6. Save each query as a dataset
echo.
echo Step 3: Create visualizations from saved datasets...
echo.
echo For Production Overview:
echo - Create Time-series Chart for hourly production
echo - Create Big Number for current OEE
echo - Create Bar Chart for defects by hour
echo.
echo For Equipment Performance:
echo - Create Table showing all equipment metrics
echo - Create Gauge charts for OEE percentages
echo - Create Heatmap for equipment availability
echo.
echo For Quality Trends:
echo - Create Line Chart for pass rates over time
echo - Create Pie Chart for defects by product type
echo - Create Area Chart for production volumes
echo.
echo Step 4: Combine into dashboards...
echo.
echo 1. Go to Dashboards -^> + Dashboard
echo 2. Name it "Manufacturing Operations Dashboard"
echo 3. Drag and drop your charts
echo 4. Add filters for date range and equipment
echo 5. Save and share with your team
echo.
echo Note: The SQL queries have been saved to temp_queries.sql
echo.
pause