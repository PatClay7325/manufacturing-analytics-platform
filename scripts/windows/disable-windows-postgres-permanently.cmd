@echo off
echo === Disabling Windows PostgreSQL Services Permanently ===
echo.
echo This will disable Windows PostgreSQL services from starting automatically.
echo.

echo [1] Finding PostgreSQL services...
echo.
sc query state= all | findstr -i "DISPLAY_NAME.*PostgreSQL"

echo.
echo [2] Disabling PostgreSQL services from auto-start...
echo.

REM Common PostgreSQL service names
sc config "postgresql-x64-16" start= disabled 2>nul
sc config "postgresql-x64-15" start= disabled 2>nul
sc config "postgresql-x64-14" start= disabled 2>nul
sc config "postgresql-x64-13" start= disabled 2>nul
sc config "postgresql-x64-12" start= disabled 2>nul
sc config "PostgreSQL" start= disabled 2>nul

REM Find and disable any other PostgreSQL services
for /f "tokens=2" %%i in ('sc query state^= all ^| findstr "SERVICE_NAME.*postgres"') do (
    echo Disabling service: %%i
    sc config "%%i" start= disabled 2>nul
)

echo.
echo [3] PostgreSQL services have been disabled.
echo They won't start automatically on Windows startup.
echo.
echo To re-enable them later, use:
echo sc config "service-name" start= auto
echo.
pause