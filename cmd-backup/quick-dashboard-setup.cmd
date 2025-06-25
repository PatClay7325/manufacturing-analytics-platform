@echo off
echo ===============================================
echo Quick Dashboard Setup for Apache Superset
echo ===============================================
echo.

echo Creating sample data in TimescaleDB...
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing -c "
-- Quick sample data
CREATE TABLE IF NOT EXISTS production_summary (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    total_production INTEGER,
    defect_count INTEGER,
    oee_percentage DECIMAL(5,2)
);

INSERT INTO production_summary (timestamp, total_production, defect_count, oee_percentage)
SELECT 
    NOW() - (interval '1 hour' * generate_series(0, 23)),
    (random() * 100 + 200)::int,
    (random() * 10)::int,
    (random() * 20 + 70)::decimal(5,2)
FROM generate_series(1, 24);

SELECT COUNT(*) as row_count FROM production_summary;
"

echo.
echo Sample data created successfully!
echo.
echo ===============================================
echo Next Steps:
echo ===============================================
echo.
echo 1. Open http://localhost:3000/analytics/demo
echo    (Use incognito mode to avoid cookie issues)
echo.
echo 2. The demo page will guide you through:
echo    - Creating datasets in Superset
echo    - Building charts
echo    - Creating a dashboard
echo    - Getting the dashboard ID
echo.
echo 3. Once you have a dashboard ID, enter it in the demo page
echo.
echo ===============================================
echo Quick Superset Access:
echo ===============================================
echo URL: http://localhost:8088
echo Username: admin
echo Password: admin
echo.
echo Database is already connected as "Manufacturing TimescaleDB"
echo.
pause