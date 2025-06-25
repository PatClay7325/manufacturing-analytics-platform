@echo off
echo.
echo ==================================================
echo Fixing Prometheus Service
echo ==================================================
echo.

echo [1] Checking if Prometheus container exists:
docker ps -a | findstr prometheus

echo.
echo [2] Checking Prometheus logs:
docker logs manufacturing-prometheus --tail 20 2>&1

echo.
echo [3] Checking if port 9090 is in use:
netstat -an | findstr :9090

echo.
echo [4] Checking Prometheus configuration:
if exist "docker\prometheus\prometheus.yml" (
    echo Prometheus config exists at docker\prometheus\prometheus.yml
) else (
    echo WARNING: Prometheus config not found!
    echo Creating basic Prometheus config...
    mkdir docker\prometheus 2>nul
    (
        echo global:
        echo   scrape_interval: 15s
        echo   evaluation_interval: 15s
        echo.
        echo alerting:
        echo   alertmanagers:
        echo     - static_configs:
        echo         - targets:
        echo             - alertmanager:9093
        echo.
        echo scrape_configs:
        echo   - job_name: 'prometheus'
        echo     static_configs:
        echo       - targets: ['localhost:9090']
    ) > docker\prometheus\prometheus.yml
)

echo.
echo [5] Restarting Prometheus with proper config:
docker stop manufacturing-prometheus 2>nul
docker rm manufacturing-prometheus 2>nul

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
echo [6] Waiting for Prometheus to start...
timeout /t 10 /nobreak >nul

echo.
echo [7] Testing Prometheus:
curl -s http://localhost:9090/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Prometheus is now running!
    echo.
    echo You can access it at: http://localhost:9090
) else (
    echo [CHECKING] Prometheus may still be starting...
    timeout /t 5 /nobreak >nul
    curl -s http://localhost:9090/-/healthy >nul 2>&1
    if %errorlevel% equ 0 (
        echo [SUCCESS] Prometheus is now running!
    ) else (
        echo [ERROR] Prometheus still not accessible
        echo.
        echo Checking latest logs:
        docker logs manufacturing-prometheus --tail 10
    )
)

echo.
echo ==================================================
echo Final Status of All Services:
echo ==================================================
echo.

set /a SERVICES_UP=0

echo PostgreSQL (5432):
docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo   [✓] Running
    set /a SERVICES_UP+=1
) else (
    echo   [✗] Not running
)

echo.
echo Prometheus (9090):
curl -s http://localhost:9090/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo   [✓] Running - http://localhost:9090
    set /a SERVICES_UP+=1
) else (
    echo   [✗] Not running
)

echo.
echo AlertManager (9093):
curl -s http://localhost:9093/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo   [✓] Running - http://localhost:9093
    set /a SERVICES_UP+=1
) else (
    echo   [✗] Not running
)

echo.
echo Loki (3100):
curl -s http://localhost:3100/ready >nul 2>&1
if %errorlevel% equ 0 (
    echo   [✓] Running - http://localhost:3100
    set /a SERVICES_UP+=1
) else (
    echo   [✗] Not running
)

echo.
echo Jaeger (16686):
curl -s http://localhost:16686 >nul 2>&1
if %errorlevel% equ 0 (
    echo   [✓] Running - http://localhost:16686
    set /a SERVICES_UP+=1
) else (
    echo   [✗] Not running
)

echo.
echo ==================================================
echo Status: %SERVICES_UP%/5 services running
echo ==================================================

if %SERVICES_UP% equ 5 (
    echo.
    echo ✅ ALL SERVICES ARE NOW RUNNING!
    echo.
    echo You can now:
    echo 1. Restart your Next.js app: npm run dev
    echo 2. Visit http://localhost:3000/monitoring
    echo 3. All services will show as "Up" / "Operational"
) else (
    echo.
    echo Some services are still having issues.
    echo Run 'docker ps' to see container status.
)

echo.
pause