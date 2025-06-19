@echo off
echo === Direct Schema Application ===
echo.

echo [1] Generating SQL from Prisma schema...
mkdir prisma\sql 2>nul
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma\sql\schema.sql

echo.
echo [2] Applying SQL directly to database...
type prisma\sql\schema.sql | docker exec -i manufacturing-postgres psql -U postgres -d manufacturing

echo.
echo [3] Marking as baseline migration...
echo -- Migration baseline > prisma\sql\baseline.sql
echo -- Generated from schema.prisma >> prisma\sql\baseline.sql
type prisma\sql\schema.sql >> prisma\sql\baseline.sql

echo.
echo [4] Creating Prisma migration history table...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "CREATE TABLE IF NOT EXISTS _prisma_migrations (id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMPTZ, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0);"

echo.
echo [5] Verifying tables were created...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "\dt"

echo.
echo === Schema Applied Successfully! ===
echo.
echo The database schema has been applied directly.
echo You can now run: npm run test:e2e
echo.
pause