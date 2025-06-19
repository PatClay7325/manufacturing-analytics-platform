@echo off
:: This script must be run as Administrator
:: Right-click and select "Run as administrator"

echo === PostgreSQL Service Removal (ADMIN) ===
echo.

if not "%1"=="am_admin" (
    powershell -Command "Start-Process -Verb RunAs -FilePath '%0' -ArgumentList 'am_admin'"
    exit /b
)

echo Running with Administrator privileges...
echo.

echo [1] Stopping all PostgreSQL services...
net stop postgresql-x64-16 2>nul
net stop postgresql-x64-15 2>nul
net stop postgresql-x64-14 2>nul
net stop postgresql-x64-13 2>nul
net stop postgresql-x64-12 2>nul
net stop postgresql 2>nul

echo.
echo [2] Force stopping via service control...
sc stop postgresql-x64-16 2>nul
sc stop postgresql-x64-15 2>nul
sc stop postgresql-x64-14 2>nul
sc stop postgresql-x64-13 2>nul
sc stop postgresql-x64-12 2>nul

echo.
echo [3] Killing all postgres.exe processes...
taskkill /F /IM postgres.exe 2>nul

echo.
echo [4] Disabling PostgreSQL services from auto-start...
sc config postgresql-x64-16 start= disabled 2>nul
sc config postgresql-x64-15 start= disabled 2>nul
sc config postgresql-x64-14 start= disabled 2>nul
sc config postgresql-x64-13 start= disabled 2>nul
sc config postgresql-x64-12 start= disabled 2>nul

echo.
echo [5] Checking if port 5432 is free...
netstat -ano | findstr :5432
if %errorlevel% equ 0 (
    echo.
    echo Port 5432 may still be in use. Restart may be required.
) else (
    echo.
    echo SUCCESS: Port 5432 is now free!
)

echo.
echo === Complete! ===
echo.
echo PostgreSQL Windows services have been stopped and disabled.
echo You can now use Docker PostgreSQL on port 5432.
echo.
pause