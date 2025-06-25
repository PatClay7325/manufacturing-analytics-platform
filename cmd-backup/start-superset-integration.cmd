@echo off
echo ===============================================
echo Starting Manufacturing Analytics Platform
echo with Apache Superset Integration
echo ===============================================
echo.

echo Step 1: Starting Docker services...
docker-compose up -d

echo.
echo Step 2: Waiting for services to be healthy...
timeout /t 10 /nobreak > nul

echo.
echo Step 3: Checking service status...
docker ps --format "table {{.Names}}\t{{.Status}}" | findstr "manufacturing"

echo.
echo ===============================================
echo Services should be available at:
echo ===============================================
echo.
echo Manufacturing App:     http://localhost:3000
echo Apache Superset:       http://localhost:8088
echo    Username: admin
echo    Password: admin
echo.
echo Analytics Dashboard:   http://localhost:3000/analytics
echo Dashboard Management:  http://localhost:3000/dashboards/manage
echo.
echo ===============================================
echo Quick Test Commands:
echo ===============================================
echo.
echo 1. Test Superset connection:
echo    docker exec manufacturing-superset curl -s http://localhost:8088/health
echo.
echo 2. Check TimescaleDB connection:
echo    docker exec manufacturing-timescaledb psql -U postgres -d manufacturing -c "SELECT NOW();"
echo.
echo 3. View logs:
echo    docker-compose logs -f superset
echo.
echo ===============================================
pause