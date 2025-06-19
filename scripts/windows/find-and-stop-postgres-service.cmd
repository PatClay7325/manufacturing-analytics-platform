@echo off
echo === Finding and Stopping PostgreSQL Service ===
echo.
echo NOTE: This script needs to be run as Administrator!
echo.

echo [1] Finding which service is using PID 7992...
echo.

REM Find services and their PIDs
for /f "tokens=2,3" %%a in ('tasklist /svc /fi "PID eq 7992" ^| findstr 7992') do (
    echo Found service: %%b
    set SERVICE_NAME=%%b
)

echo.
echo [2] Getting service details...
sc queryex "%SERVICE_NAME%" 2>nul

echo.
echo [3] Listing all PostgreSQL-related services...
echo.
wmic service where "Name like '%%postgres%%'" get Name,State,ProcessId,StartMode

echo.
echo [4] Stopping PostgreSQL services...
echo.

REM Stop all PostgreSQL services
for /f "tokens=1" %%i in ('wmic service where "Name like ''%%postgres%%''" get Name ^| findstr -v "^Name"') do (
    echo Stopping service: %%i
    net stop "%%i" 2>nul
    sc stop "%%i" 2>nul
)

echo.
echo [5] If services won't stop, run this as Administrator:
echo.
echo Right-click on Command Prompt and select "Run as administrator"
echo Then run this script again.
echo.
echo Alternative commands to run as admin:
echo   net stop postgresql-x64-15
echo   sc delete postgresql-x64-15  (to remove service permanently)
echo.
pause