@echo off
echo === Checking All PostgreSQL Services ===
echo.

echo [1] Windows Services using port 5432...
echo.
powershell -Command "Get-Process | Where-Object {$_.ProcessName -like '*postgres*'} | Format-Table -AutoSize"

echo.
echo [2] Finding process using port 5432...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5432 ^| findstr LISTENING') do (
    echo Process ID using port 5432: %%a
    echo Process details:
    tasklist /fi "pid eq %%a" /v
    echo.
    echo To stop this process, run: taskkill /F /PID %%a
)

echo.
echo [3] Docker containers...
docker ps -a --filter "publish=5432"

echo.
echo [4] WSL PostgreSQL check...
wsl -e bash -c "sudo lsof -i :5432 2>/dev/null || echo 'No PostgreSQL running in WSL'"

echo.
pause