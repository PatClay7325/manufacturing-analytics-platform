@echo off
echo === Testing Docker IP Connection ===
echo.

echo [1] Current Docker container IP...
for /f "tokens=*" %%i in ('docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" manufacturing-postgres') do set DOCKER_IP=%%i
echo Docker IP: %DOCKER_IP%

echo.
echo [2] Testing connection to Docker IP directly...
echo Testing with telnet (if available)...
telnet %DOCKER_IP% 5432 2>nul
if %errorlevel% neq 0 (
    echo Telnet not available or connection failed
)

echo.
echo [3] Testing with PowerShell Test-NetConnection...
powershell -Command "Test-NetConnection -ComputerName %DOCKER_IP% -Port 5432"

echo.
echo [4] Testing PostgreSQL connection through Docker network...
docker run --rm -it --network bridge postgres:15-alpine psql -h %DOCKER_IP% -U postgres -d manufacturing -c "SELECT 1 as test;"

echo.
echo [5] Let's try with Prisma using the Docker IP...
set DATABASE_URL=postgresql://postgres:postgres@%DOCKER_IP%:5432/manufacturing
set DIRECT_URL=postgresql://postgres:postgres@%DOCKER_IP%:5432/manufacturing
echo.
echo Environment variables set to:
echo DATABASE_URL=%DATABASE_URL%
echo.

echo [6] Running Prisma db push...
npx prisma db push

echo.
pause