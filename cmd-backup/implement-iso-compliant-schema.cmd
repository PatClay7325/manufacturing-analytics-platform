@echo off
echo ===============================================
echo ISO-COMPLIANT SCHEMA IMPLEMENTATION
echo ===============================================
echo.
echo This script will:
echo 1. Backup existing data
echo 2. Clean legacy schema
echo 3. Implement ISO-compliant schema
echo 4. Populate with sample data
echo 5. Set up automated jobs
echo.
echo WARNING: This will DELETE all existing data!
echo Press Ctrl+C to cancel or
pause

echo.
echo Step 1: Creating backup...
docker exec manufacturing-timescaledb pg_dump -U postgres -d manufacturing > backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
echo Backup created: backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql

echo.
echo Step 2: Cleaning legacy schema...
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < scripts/cleanup-legacy-schema.sql

echo.
echo Step 3: Creating ISO-compliant schema...
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < scripts/iso-compliant-schema.sql

echo.
echo Step 4: Populating dimension tables...
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < scripts/populate-dimensions.sql

echo.
echo Step 5: Populating fact tables with sample data...
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < scripts/populate-fact-data.sql

echo.
echo Step 6: Setting up automated jobs...
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < scripts/schedule-automated-jobs.sql

echo.
echo Step 7: Creating Superset views...
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < scripts/create-superset-views.sql

echo.
echo Step 8: Updating Prisma schema...
copy /Y prisma\schema-iso-compliant.prisma prisma\schema.prisma
echo Prisma schema updated.

echo.
echo Step 9: Generating Prisma client...
call npx prisma generate

echo.
echo ===============================================
echo ISO-COMPLIANT IMPLEMENTATION COMPLETE!
echo ===============================================
echo.
echo Database now contains:
echo - ISO 22400 compliant OEE calculations
echo - ISO 9001 quality management
echo - ISO 14224 reliability metrics
echo - AI-ready synonym mapping
echo - Automated maintenance jobs
echo - Sample manufacturing data
echo.
echo Next steps:
echo 1. Restart your application
echo 2. Create dashboards in Superset
echo 3. Test AI agent queries
echo.
pause