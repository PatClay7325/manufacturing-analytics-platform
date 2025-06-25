@echo off
echo Testing PostgreSQL/TimescaleDB Connection...
echo.

echo Connection Details:
echo Host: localhost (or 127.0.0.1)
echo Port: 5432
echo Database: manufacturing
echo Username: postgres
echo Password: postgres
echo.

echo Testing with psql from Docker...
docker exec manufacturing-timescaledb psql -U postgres -d manufacturing -c "SELECT version();"

echo.
echo If connecting from outside Docker:
echo - Make sure no other PostgreSQL is running on port 5432
echo - Try using 127.0.0.1 instead of localhost
echo - Check Windows Firewall settings
echo.

echo Testing port availability...
netstat -an | findstr :5432

pause