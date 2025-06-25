@echo off
echo.
echo ==================================================
echo Final Prometheus Fix - Removing Invalid Rules
echo ==================================================
echo.

echo [1] Stopping Prometheus...
docker stop manufacturing-prometheus 2>nul
docker rm manufacturing-prometheus 2>nul

echo.
echo [2] Backing up and removing problematic alert rules...
if exist "monitoring\prometheus\rules\manufacturing-alerts.yml" (
    move "monitoring\prometheus\rules\manufacturing-alerts.yml" "monitoring\prometheus\rules\manufacturing-alerts.yml.backup" >nul 2>&1
    echo Alert rules backed up to manufacturing-alerts.yml.backup
)

echo.
echo [3] Creating valid Prometheus alert rules...
mkdir monitoring\prometheus\rules 2>nul
(
echo groups:
echo   - name: basic_alerts
echo     interval: 30s
echo     rules:
echo       - alert: InstanceDown
echo         expr: up == 0
echo         for: 1m
echo         labels:
echo           severity: critical
echo         annotations:
echo           summary: "Instance {{ $labels.instance }} down"
echo           description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 1 minute."
echo.
echo       - alert: HighMemoryUsage
echo         expr: ^(1 - ^(node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes^)^) ^> 0.9
echo         for: 5m
echo         labels:
echo           severity: warning
echo         annotations:
echo           summary: "High memory usage detected"
echo           description: "Memory usage is above 90%% on {{ $labels.instance }}"
) > monitoring\prometheus\rules\basic-alerts.yml

echo.
echo [4] Starting Prometheus without problematic rules...
docker run -d ^
  --name manufacturing-prometheus ^
  --network manufacturing-network ^
  -p 9090:9090 ^
  -v "%cd%\docker\prometheus\prometheus.yml:/etc/prometheus/prometheus.yml" ^
  -v "%cd%\monitoring\prometheus\rules:/etc/prometheus/rules" ^
  prom/prometheus:latest ^
  --config.file=/etc/prometheus/prometheus.yml ^
  --storage.tsdb.path=/prometheus ^
  --web.console.libraries=/etc/prometheus/console_libraries ^
  --web.console.templates=/etc/prometheus/consoles ^
  --web.enable-lifecycle

echo.
echo [5] Waiting for Prometheus to start...
timeout /t 15 /nobreak >nul

echo.
echo [6] Checking Prometheus status...
curl -s http://localhost:9090/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Prometheus is now running!
) else (
    echo [CHECKING] Let's check the logs...
    docker logs manufacturing-prometheus --tail 20
    echo.
    echo [ALTERNATIVE] Starting Prometheus without any rules...
    docker stop manufacturing-prometheus 2>nul
    docker rm manufacturing-prometheus 2>nul
    
    docker run -d ^
      --name manufacturing-prometheus ^
      --network manufacturing-network ^
      -p 9090:9090 ^
      -v "%cd%\docker\prometheus\prometheus.yml:/etc/prometheus/prometheus.yml" ^
      prom/prometheus:latest ^
      --config.file=/etc/prometheus/prometheus.yml ^
      --storage.tsdb.path=/prometheus
    
    timeout /t 10 /nobreak >nul
)

echo.
echo ==================================================
echo FINAL STATUS CHECK - ALL SERVICES
echo ==================================================
echo.

set /a TOTAL=0

echo 1. PostgreSQL (Database):
docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ RUNNING - Port 5432
    set /a TOTAL+=1
) else (
    echo    ❌ NOT RUNNING
)

echo.
echo 2. Prometheus (Metrics):
curl -s http://localhost:9090/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ RUNNING - http://localhost:9090
    set /a TOTAL+=1
) else (
    echo    ❌ NOT RUNNING
)

echo.
echo 3. AlertManager (Alerts):
curl -s http://localhost:9093/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ RUNNING - http://localhost:9093
    set /a TOTAL+=1
) else (
    echo    ❌ NOT RUNNING
)

echo.
echo 4. Loki (Logs):
curl -s http://localhost:3100/ready >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ RUNNING - http://localhost:3100
    set /a TOTAL+=1
) else (
    echo    ❌ NOT RUNNING
)

echo.
echo 5. Jaeger (Tracing):
curl -s http://localhost:16686 >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ RUNNING - http://localhost:16686
    set /a TOTAL+=1
) else (
    echo    ❌ NOT RUNNING
)

echo.
echo ==================================================
echo RESULT: %TOTAL%/5 services are running
echo ==================================================

if %TOTAL% equ 5 (
    echo.
    echo 🎉 SUCCESS! ALL 5 MONITORING SERVICES ARE RUNNING!
    echo.
    echo Next steps:
    echo 1. Restart your Next.js app: npm run dev
    echo 2. Visit: http://localhost:3000/monitoring
    echo 3. All services will show as "Up" / "Operational"
    echo.
    echo The monitoring page will show:
    echo ✅ PostgreSQL Database - Operational
    echo ✅ Prometheus - Operational
    echo ✅ manufacturingPlatform - Operational
    echo ✅ AlertManager - Operational
    echo ✅ Loki - Operational
    echo ✅ Jaeger - Operational
) else (
    echo.
    echo Almost there! %TOTAL% out of 5 services are running.
    echo Check 'docker ps' for more details.
)

echo.
pause