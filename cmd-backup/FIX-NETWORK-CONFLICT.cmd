@echo off
echo.
echo ==================================================
echo Fixing Docker Network Conflict
echo ==================================================
echo.

echo [1] Current Docker networks:
docker network ls

echo.
echo [2] Stopping old factory containers...
docker stop factory-manufacturingPlatform factory-metrics-simulator factory-node-exporter factory-prometheus manufacturing-ollama 2>nul

echo.
echo [3] Removing old containers...
docker rm factory-manufacturingPlatform factory-metrics-simulator factory-node-exporter factory-prometheus 2>nul

echo.
echo [4] Removing conflicting networks...
docker network rm manufacturing-network 2>nul
docker network rm factory_default 2>nul

echo.
echo [5] Pruning unused networks...
docker network prune -f

echo.
echo [6] Creating fresh network and starting services...
docker-compose down
timeout /t 2 /nobreak >nul
docker-compose up -d postgres prometheus alertmanager loki jaeger

echo.
echo [7] Waiting for services to start...
timeout /t 10 /nobreak >nul

echo.
echo [8] Final status:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo [9] Testing PostgreSQL connection...
docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL is accessible!
) else (
    echo [WARN] PostgreSQL may still be starting...
)

echo.
echo ==================================================
echo Network conflict resolved!
echo ==================================================
echo.
echo The old factory containers have been stopped.
echo Your manufacturing platform services should now be running.
echo.
echo Please restart your Next.js dev server:
echo 1. Press Ctrl+C to stop it
echo 2. Run: npm run dev
echo.
pause