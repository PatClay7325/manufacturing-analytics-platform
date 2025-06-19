@echo off
echo Applying schema using Docker exec (guaranteed to work)...

echo.
echo === Step 1: Create schema.sql from Prisma ===
npx prisma migrate dev --create-only --name init

echo.
echo === Step 2: Apply schema directly via psql ===
echo Applying schema to manufacturing_db...
type prisma\migrations\*\migration.sql | docker exec -i manufacturing-postgres psql -U postgres -d manufacturing_db

echo.
echo === Step 3: Mark migration as applied ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing_db -c "CREATE TABLE IF NOT EXISTS \"_prisma_migrations\" (id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64), finished_at TIMESTAMPTZ, migration_name VARCHAR(255), logs TEXT, rolled_back_at TIMESTAMPTZ, started_at TIMESTAMPTZ DEFAULT now(), applied_steps_count INTEGER DEFAULT 0);"

echo.
echo === Step 4: Verify tables ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing_db -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" | findstr -E "(Enterprise|Site|Area|WorkCenter|WorkUnit)"

echo.
echo === Step 5: Run seed script ===
npx tsx prisma/seed-hierarchical.ts

echo.
echo === Done! Database is ready ===
echo Now running tests...
npm run test:all