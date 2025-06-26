@echo off
echo ========================================
echo Manufacturing Analytics Platform
echo RunPod Deployment Setup (Windows)
echo ========================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running or not installed.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo This script will help you deploy to RunPod.
echo.
echo What you'll need:
echo - A RunPod account (free at runpod.io)
echo - Your database connection details
echo - Docker Hub account (optional, but recommended)
echo.
pause

REM Get user inputs
set /p DOCKER_USERNAME="Enter your Docker Hub username (or press Enter to skip): "
set /p DB_HOST="Enter your database host (e.g., your-db.amazonaws.com): "
set /p DB_PASSWORD="Enter your database password: "

REM Set defaults
if "%DOCKER_USERNAME%"=="" set DOCKER_USERNAME=local
set IMAGE_NAME=manufacturing-analytics-platform
set IMAGE_TAG=latest

echo.
echo Building Docker image...
docker build -f runpod.Dockerfile -t %DOCKER_USERNAME%/%IMAGE_NAME%:%IMAGE_TAG% .

if not "%DOCKER_USERNAME%"=="local" (
    echo.
    echo Pushing to Docker Hub...
    docker login -u %DOCKER_USERNAME%
    docker push %DOCKER_USERNAME%/%IMAGE_NAME%:%IMAGE_TAG%
)

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Next steps to deploy on RunPod:
echo.
echo 1. Go to https://runpod.io/console/pods
echo 2. Click "Deploy" or "+ New Pod"
echo 3. Choose "Deploy Any Model"
echo 4. Use these settings:
echo    - Container Image: %DOCKER_USERNAME%/%IMAGE_NAME%:%IMAGE_TAG%
echo    - Container Disk: 20 GB
echo    - Expose HTTP Ports: 8080
echo.
echo 5. Add these environment variables:
echo    DATABASE_HOST = %DB_HOST%
echo    DATABASE_PORT = 5433
echo    DATABASE_USER = postgres
echo    DATABASE_PASSWORD = %DB_PASSWORD%
echo    DATABASE_NAME = manufacturing
echo    NODE_ENV = production
echo    NEXTAUTH_SECRET = [generate a secure secret]
echo    NEXTAUTH_URL = [your-runpod-url]
echo.
echo 6. Click "Deploy On-Demand"
echo.
echo Your app will be ready in a few minutes!
echo.
pause