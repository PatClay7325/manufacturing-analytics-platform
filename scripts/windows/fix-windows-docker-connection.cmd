@echo off
echo === Fixing Windows Docker PostgreSQL Connection ===
echo.

echo [1] Getting Docker container IP address...
for /f "tokens=*" %%i in ('docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" manufacturing-postgres') do set DOCKER_IP=%%i
echo Docker container IP: %DOCKER_IP%

echo.
echo [2] Creating .env with Docker IP...
(
echo # Database Configuration - Using Docker IP for Windows
echo DATABASE_URL=postgresql://postgres:postgres@%DOCKER_IP%:5432/manufacturing
echo DIRECT_URL=postgresql://postgres:postgres@%DOCKER_IP%:5432/manufacturing
echo.
echo # Application Configuration
echo NODE_ENV=development
echo PORT=3000
echo.
echo # Public API URLs
echo NEXT_PUBLIC_API_URL=http://localhost:3000/api
echo NEXT_PUBLIC_WS_URL=ws://localhost:3000
) > .env

echo.
echo [3] Alternative: Using host.docker.internal...
echo If the above doesn't work, trying host.docker.internal
(
echo # Database Configuration - Using host.docker.internal
echo DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/manufacturing
echo DIRECT_URL=postgresql://postgres:postgres@host.docker.internal:5432/manufacturing
echo.
echo # Application Configuration
echo NODE_ENV=development
echo PORT=3000
echo.
echo # Public API URLs
echo NEXT_PUBLIC_API_URL=http://localhost:3000/api
echo NEXT_PUBLIC_WS_URL=ws://localhost:3000
) > .env.docker

echo.
echo [4] Testing with Docker IP...
npx prisma db push

echo.
echo If that failed, trying alternative approaches...
pause