@echo off
echo ======================================
echo Seeding Sample Manufacturing Data
echo ======================================
echo.

echo This will add sample metrics to test the AI chat
echo.

npx prisma db push
if %errorlevel% neq 0 (
    echo Failed to push database schema
    pause
    exit /b 1
)

echo.
echo Seeding manufacturing metrics...
npx tsx scripts/seed-comprehensive-metrics.ts
if %errorlevel% neq 0 (
    echo Failed to seed metrics. Trying simple seed...
    npx tsx scripts/seed-simple.ts
)

echo.
echo ======================================
echo ✓ Sample data seeded successfully!
echo ======================================
echo.
echo You can now ask the AI questions like:
echo - What is my current OEE?
echo - How many units have we produced today?
echo - Which machines are down?
echo - Show me quality metrics for this shift
echo - What are my active alerts?
echo.
pause