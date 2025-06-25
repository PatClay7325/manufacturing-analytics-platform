@echo off
echo Setting up Manufacturing Database in Superset...
echo.

echo Creating database connection via Superset CLI...
docker exec manufacturing-superset superset set-database-uri --database_name "Manufacturing TimescaleDB" --uri "postgresql://postgres:postgres@timescaledb:5432/manufacturing"

echo.
echo Alternative: Manual Setup
echo 1. Open http://localhost:8088 in Incognito Mode
echo 2. Login with admin/admin
echo 3. Go to Data → Databases → + Database
echo 4. Select PostgreSQL
echo 5. Use this connection string:
echo    postgresql://postgres:postgres@timescaledb:5432/manufacturing
echo.
echo Note: Inside Docker, use 'timescaledb' as hostname, not 'localhost'
echo.

echo Testing connection from Superset container...
docker exec manufacturing-superset python -c "
from sqlalchemy import create_engine
engine = create_engine('postgresql://postgres:postgres@timescaledb:5432/manufacturing')
conn = engine.connect()
result = conn.execute('SELECT version()').fetchone()
print('Connection successful!')
print('PostgreSQL version:', result[0])
conn.close()
"

pause