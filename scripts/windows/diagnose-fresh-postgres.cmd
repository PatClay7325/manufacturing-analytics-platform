@echo off
echo Diagnosing the fresh PostgreSQL container...

echo.
echo === Check if container is running ===
docker ps | findstr manufacturing-postgres

echo.
echo === Test connection from inside container ===
docker exec manufacturing-postgres psql -U postgres -l

echo.
echo === Check pg_hba.conf ===
docker exec manufacturing-postgres cat /var/lib/postgresql/data/pg_hba.conf | findstr -v "^#" | findstr .

echo.
echo === Test with docker exec ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT version();"

echo.
echo === Check what's in .env ===
type .env | findstr DATABASE_URL

echo.
echo === Force trust authentication ===
docker exec manufacturing-postgres sh -c "echo 'host all all 0.0.0.0/0 trust' >> /var/lib/postgresql/data/pg_hba.conf"
docker exec manufacturing-postgres psql -U postgres -c "SELECT pg_reload_conf();"

echo.
echo === Wait and retry ===
timeout /t 3 /nobreak
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public
npx prisma db push