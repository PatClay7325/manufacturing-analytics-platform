@echo off
echo Fixing PostgreSQL authentication...

echo.
echo === Method 1: Update pg_hba.conf to allow trust authentication from host ===
echo Creating new pg_hba.conf...
docker exec manufacturing-postgres cp /var/lib/postgresql/data/pg_hba.conf /var/lib/postgresql/data/pg_hba.conf.backup

echo Updating authentication method...
docker exec manufacturing-postgres sh -c "sed -i 's/host all all all scram-sha-256/host all all all trust/g' /var/lib/postgresql/data/pg_hba.conf"

echo Reloading PostgreSQL configuration...
docker exec manufacturing-postgres psql -U postgres -c "SELECT pg_reload_conf();"

echo Waiting for PostgreSQL to reload...
timeout /t 3 /nobreak

echo.
echo === Method 2: Set password explicitly ===
docker exec manufacturing-postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';"

echo.
echo === Testing connection after fix ===
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_db?schema=public
npx prisma db push

echo.
echo === If still failing, try with Docker network ===
echo Getting container IP...
for /f "tokens=1" %%i in ('docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" manufacturing-postgres') do set CONTAINER_IP=%%i
echo Container IP: %CONTAINER_IP%

echo Testing with container IP...
set DATABASE_URL=postgresql://postgres:postgres@%CONTAINER_IP%:5432/manufacturing_db?schema=public
npx prisma db push