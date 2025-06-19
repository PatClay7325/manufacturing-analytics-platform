@echo off
echo === Force Killing Stubborn PostgreSQL Process ===
echo.

echo [1] Killing process 7992 with admin privileges...
echo.

REM Try multiple methods to kill the process
taskkill /F /PID 7992
if %errorlevel% neq 0 (
    echo Standard kill failed, trying with system privileges...
    
    REM Try with PowerShell
    powershell -Command "Stop-Process -Id 7992 -Force -ErrorAction SilentlyContinue"
    
    REM Try with wmic
    wmic process where ProcessId=7992 delete
)

echo.
echo [2] Checking if process is gone...
tasklist /fi "pid eq 7992" 2>nul | findstr 7992
if %errorlevel% equ 0 (
    echo.
    echo ERROR: Process 7992 is still running!
    echo.
    echo This process appears to be a Windows service.
    echo Let's find and stop the service...
    
    echo.
    echo [3] Finding the service name...
    for /f "tokens=2" %%i in ('sc queryex state^= all ^| findstr -B 1 "PID.*7992" ^| findstr "SERVICE_NAME"') do (
        echo Found service: %%i
        echo Stopping service...
        net stop "%%i"
        sc stop "%%i"
    )
) else (
    echo SUCCESS: Process 7992 has been terminated!
)

echo.
echo [4] Final port check...
netstat -ano | findstr :5432 | findstr LISTENING

echo.
pause