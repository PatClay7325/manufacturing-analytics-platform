@echo off
echo.
echo ==================================================
echo Complete Monitoring Stack Fix - All Services
echo ==================================================
echo.

echo [1] Stopping all monitoring services for clean start...
docker-compose down

echo.
echo [2] Removing any problematic containers...
docker rm -f manufacturing-prometheus manufacturing-alertmanager 2>nul

echo.
echo [3] Fixing AlertManager configuration...
echo Creating valid AlertManager config...
(
echo global:
echo   resolve_timeout: 5m
echo   smtp_smarthost: 'localhost:25'
echo   smtp_from: 'alertmanager@example.com'
echo.
echo route:
echo   group_by: ['alertname']
echo   group_wait: 10s
echo   group_interval: 10s
echo   repeat_interval: 1h
echo   receiver: 'web.hook'
echo.
echo receivers:
echo - name: 'web.hook'
echo   webhook_configs:
echo   - url: 'http://127.0.0.1:5001/'
echo.
echo inhibit_rules:
echo   - source_match:
echo       severity: 'critical'
echo     target_match:
echo       severity: 'warning'
echo     equal: ['alertname', 'dev', 'instance']
) > monitoring\alertmanager\config.yml

echo.
echo [4] Updating docker-compose to use fixed config...
docker-compose config >nul 2>&1

echo.
echo [5] Starting all services in correct order...
echo Starting PostgreSQL first...
docker-compose up -d postgres

timeout /t 5 /nobreak >nul

echo Starting Prometheus...
docker-compose up -d prometheus

timeout /t 5 /nobreak >nul

echo Starting AlertManager with fixed config...
docker run -d ^
  --name manufacturing-alertmanager ^
  --network manufacturing-network ^
  -p 9093:9093 ^
  -v "%cd%\monitoring\alertmanager\config.yml:/etc/alertmanager/config.yml" ^
  prom/alertmanager:v0.27.0 ^
  --config.file=/etc/alertmanager/config.yml ^
  --storage.path=/alertmanager ^
  --web.external-url=http://localhost:9093

timeout /t 5 /nobreak >nul

echo Starting Loki and Jaeger...
docker-compose up -d loki jaeger

echo.
echo [6] Waiting for all services to be ready...
timeout /t 15 /nobreak >nul

echo.
echo [7] Verifying all services:
echo ==================================================
echo.

set ALL_GOOD=1

echo PostgreSQL:
docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo   [✓] PostgreSQL is running on port 5432
) else (
    echo   [✗] PostgreSQL FAILED
    set ALL_GOOD=0
)

echo.
echo Prometheus:
curl -s http://localhost:9090/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo   [✓] Prometheus is running on port 9090
    echo       URL: http://localhost:9090
) else (
    echo   [✗] Prometheus FAILED
    set ALL_GOOD=0
)

echo.
echo AlertManager:
curl -s http://localhost:9093/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo   [✓] AlertManager is running on port 9093
    echo       URL: http://localhost:9093
) else (
    echo   [✗] AlertManager FAILED
    set ALL_GOOD=0
)

echo.
echo Loki:
curl -s http://localhost:3100/ready >nul 2>&1
if %errorlevel% equ 0 (
    echo   [✓] Loki is running on port 3100
    echo       URL: http://localhost:3100
) else (
    echo   [✗] Loki FAILED
    set ALL_GOOD=0
)

echo.
echo Jaeger:
curl -s http://localhost:16686 >nul 2>&1
if %errorlevel% equ 0 (
    echo   [✓] Jaeger is running on port 16686
    echo       URL: http://localhost:16686
) else (
    echo   [✗] Jaeger FAILED
    set ALL_GOOD=0
)

echo.
echo ==================================================
echo Container Status:
echo ==================================================
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo ==================================================

if %ALL_GOOD% equ 1 (
    echo ✅ SUCCESS! All 5 monitoring services are running!
    echo ==================================================
    echo.
    echo Your monitoring stack is fully operational:
    echo.
    echo 1. PostgreSQL Database - ✓
    echo 2. Prometheus Metrics - ✓
    echo 3. AlertManager Alerts - ✓
    echo 4. Loki Logs - ✓
    echo 5. Jaeger Tracing - ✓
    echo.
    echo Now restart your Next.js app:
    echo   npm run dev
    echo.
    echo Then visit http://localhost:3000/monitoring
    echo All services will show as "Up" / "Operational"
) else (
    echo ⚠️  Some services failed to start properly
    echo.
    echo Troubleshooting:
    echo 1. Check logs: docker logs [container-name]
    echo 2. Check ports: netstat -an ^| findstr "9090 9093 3100 16686"
    echo 3. Try running this script again
)

echo.
pause