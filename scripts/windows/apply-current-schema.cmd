@echo off
echo Applying the current hierarchical Prisma schema to the manufacturing database...

echo.
echo === Current Environment ===
echo DATABASE_URL: %DATABASE_URL%
type .env.test | findstr DATABASE_URL

echo.
echo === Generating Prisma Client ===
npx prisma generate

echo.
echo === Applying Schema to Database ===
echo This will update the manufacturing database with the hierarchical schema...
npx prisma db push

echo.
echo === Verifying Schema Application ===
echo Checking for hierarchical tables...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "\dt" | findstr -E "(Enterprise|Site|Area|WorkCenter|WorkUnit|Alert|Metric)"

echo.
echo === Seeding Database with Hierarchical Data ===
echo Running the hierarchical seed script...
npm run prisma:seed

echo.
echo === Final Verification ===
echo Checking record counts in hierarchical tables...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Enterprise' as table_name, count(*) as count FROM \"Enterprise\" UNION ALL SELECT 'Site', count(*) FROM \"Site\" UNION ALL SELECT 'Area', count(*) FROM \"Area\" UNION ALL SELECT 'WorkCenter', count(*) FROM \"WorkCenter\" UNION ALL SELECT 'WorkUnit', count(*) FROM \"WorkUnit\";"

echo.
echo Schema application complete!