@echo off
echo ========================================
echo  MANUFACTURING OBSERVABILITY STACK
echo  Complete Grafana + Loki + Jaeger Setup
echo ========================================
echo.

echo [INFO] Starting comprehensive observability stack...
echo.

echo [1/8] Validating environment variables...
if not exist ".env.local" (
    echo ❌ ERROR: .env.local file not found
    echo Please create .env.local with required variables
    echo See .env.example for template
    pause
    exit /b 1
)

echo [2/8] Checking Docker availability...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Docker not available
    echo Please install Docker Desktop and ensure it's running
    pause
    exit /b 1
) else (
    echo ✅ Docker is available
)

echo [3/8] Checking Docker Compose availability...
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Docker Compose not available
    echo Please install Docker Compose
    pause
    exit /b 1
) else (
    echo ✅ Docker Compose is available
)

echo [4/8] Creating required directories...
if not exist "grafana\provisioning\dashboards" mkdir grafana\provisioning\dashboards
if not exist "grafana\provisioning\datasources" mkdir grafana\provisioning\datasources
if not exist "loki" mkdir loki
if not exist "alertmanager" mkdir alertmanager
if not exist "prometheus\rules" mkdir prometheus\rules
echo ✅ Directories created

echo [5/8] Validating configuration files...
if not exist "grafana\provisioning\datasources\loki-jaeger.yml" (
    echo ❌ ERROR: Grafana datasource configuration missing
    echo Please ensure grafana/provisioning/datasources/loki-jaeger.yml exists
    pause
    exit /b 1
)

if not exist "grafana\dashboards\manufacturing-observability.json" (
    echo ❌ ERROR: Manufacturing dashboard missing
    echo Please ensure grafana/dashboards/manufacturing-observability.json exists
    pause
    exit /b 1
)

if not exist "loki\config.yaml" (
    echo ❌ ERROR: Loki configuration missing
    echo Please ensure loki/config.yaml exists
    pause
    exit /b 1
)

if not exist "alertmanager\config.yml" (
    echo ❌ ERROR: AlertManager configuration missing
    echo Please ensure alertmanager/config.yml exists
    pause
    exit /b 1
)

echo ✅ All configuration files found

echo [6/8] Building and starting observability stack...
echo.
echo Starting services in order:
echo 1. TimescaleDB (manufacturing data)
echo 2. Grafana Database (configuration storage)
echo 3. Redis (session management)
echo 4. Prometheus (metrics storage)
echo 5. Loki (log aggregation)
echo 6. Jaeger (distributed tracing)
echo 7. AlertManager (alert routing)
echo 8. Grafana OSS (visualization)
echo 9. Next.js Application (manufacturing platform)
echo.

docker-compose -f docker-compose.saas-compliant.yml up -d --build

if errorlevel 1 (
    echo ❌ ERROR: Failed to start services
    echo Check Docker logs for details:
    echo docker-compose -f docker-compose.saas-compliant.yml logs
    pause
    exit /b 1
)

echo [7/8] Waiting for services to be healthy...
echo This may take 2-3 minutes for all services to initialize...
echo.

timeout /t 30 /nobreak >nul

echo Checking service health...
docker-compose -f docker-compose.saas-compliant.yml ps

echo [8/8] Verifying service endpoints...
echo.
echo 🔍 Testing service availability...

echo Testing Grafana OSS...
curl -s -o nul -w "Grafana OSS: %%{http_code}\n" http://localhost:3000/api/health

echo Testing Prometheus...
curl -s -o nul -w "Prometheus: %%{http_code}\n" http://localhost:9090/-/healthy

echo Testing Loki...
curl -s -o nul -w "Loki: %%{http_code}\n" http://localhost:3100/ready

echo Testing Jaeger...
curl -s -o nul -w "Jaeger: %%{http_code}\n" http://localhost:16686/

echo Testing AlertManager...
curl -s -o nul -w "AlertManager: %%{http_code}\n" http://localhost:9093/-/healthy

echo Testing Manufacturing App...
curl -s -o nul -w "Manufacturing App: %%{http_code}\n" http://localhost:3001/api/health

echo.
echo ========================================
echo  OBSERVABILITY STACK STARTED
echo ========================================
echo.
echo 🎯 ACCESS POINTS:
echo   📊 Grafana OSS:          http://localhost:3000
echo   📈 Prometheus:           http://localhost:9090  
echo   📋 Loki Logs:           http://localhost:3100
echo   🔍 Jaeger Tracing:      http://localhost:16686
echo   🚨 AlertManager:        http://localhost:9093
echo   🏭 Manufacturing App:   http://localhost:3001
echo.
echo 🔐 DEFAULT CREDENTIALS:
echo   Grafana: admin / (set via GRAFANA_ADMIN_PASSWORD)
echo.
echo 📋 INTEGRATED FEATURES:
echo   ✅ Manufacturing OEE dashboards
echo   ✅ Equipment performance monitoring  
echo   ✅ Log aggregation from all services
echo   ✅ Distributed tracing for requests
echo   ✅ Real-time alerting on failures
echo   ✅ Cross-service observability
echo.
echo 📄 DASHBOARDS AVAILABLE:
echo   - Manufacturing Observability (pre-loaded)
echo   - Loki Log Analytics
echo   - Jaeger Service Map
echo   - Prometheus Metrics
echo.
echo ⚖️  LICENSE COMPLIANCE:
echo   ✅ Grafana OSS: Apache 2.0 (commercial use OK)
echo   ✅ Prometheus: Apache 2.0 (commercial use OK)
echo   ✅ Jaeger: Apache 2.0 (commercial use OK)
echo   ⚠️  Loki: AGPL v3 (see LOKI-AGPL-COMPLIANCE-ANALYSIS.md)
echo.
echo 🚀 NEXT STEPS:
echo   1. Open Grafana: http://localhost:3000
echo   2. Import additional dashboards
echo   3. Configure alert destinations
echo   4. Set up log parsing rules
echo   5. Create custom manufacturing dashboards
echo.
echo Stack is ready for production observability!
echo.
pause