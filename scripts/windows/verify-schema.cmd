@echo off
echo Verifying the hierarchical Prisma schema in manufacturing-postgres...

echo.
echo === Testing database connection ===
docker exec manufacturing-postgres pg_isready -U postgres

echo.
echo === Listing databases ===
docker exec manufacturing-postgres psql -U postgres -c "\l"

echo.
echo === Checking if manufacturing database has hierarchical schema ===
echo Looking for key hierarchical tables (Enterprise, Site, Area, WorkCenter, WorkUnit)...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "\dt" | findstr -E "(Enterprise|Site|Area|WorkCenter|WorkUnit)"

echo.
echo === Verifying WorkUnit table structure (should replace old Equipment table) ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "\d WorkUnit"

echo.
echo === Checking for legacy Equipment table (should not exist) ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "\d Equipment" 2>nul || echo "Equipment table not found (this is correct for hierarchical schema)"

echo.
echo === Current table count ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT count(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';"