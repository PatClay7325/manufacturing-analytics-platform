@echo off
echo === Testing Connection String ===
echo.

echo [1] Test connection with psql directly...
set PGPASSWORD=postgres
psql -h localhost -U postgres -d manufacturing -c "SELECT 1 as test;" 2>nul
if %errorlevel% equ 0 (
    echo SUCCESS: Direct psql connection works!
) else (
    echo FAILED: Direct psql connection failed
    echo Installing PostgreSQL client tools may be needed
)

echo.
echo [2] Test connection through Docker...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT current_user, current_database();"
if %errorlevel% equ 0 (
    echo SUCCESS: Docker connection works!
) else (
    echo FAILED: Docker connection failed
)

echo.
echo [3] Test with Node.js pg library...
echo const { Client } = require('pg'); > test-db.js
echo const client = new Client({ >> test-db.js
echo   connectionString: 'postgresql://postgres:postgres@localhost:5432/manufacturing' >> test-db.js
echo }); >> test-db.js
echo client.connect().then(() =^> { >> test-db.js
echo   console.log('SUCCESS: Node.js pg connection works!'); >> test-db.js
echo   client.end(); >> test-db.js
echo }).catch(err =^> { >> test-db.js
echo   console.error('FAILED:', err.message); >> test-db.js
echo }); >> test-db.js

node test-db.js
del test-db.js

echo.
echo [4] Check if there's a firewall or network issue...
netstat -an | findstr :5432

echo.
pause