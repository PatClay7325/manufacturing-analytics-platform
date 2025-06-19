@echo off
echo === SEEDING COMPREHENSIVE ISO METRICS ===
echo.
echo This will generate 90 days of ISO 22400, ISO 9001, and reliability metrics
echo for all work units in your manufacturing database.
echo.
echo Features:
echo - ISO 22400 KPIs (OEE, Availability, Performance, Quality, etc.)
echo - ISO 9001 Quality Metrics (Non-conformities, Process Control)
echo - Reliability Metrics (MTBF, MTTR, Equipment Availability)
echo - Realistic shift patterns and weekend variations
echo - Maintenance records with failure analysis
echo - KPI summaries at all hierarchy levels
echo.
echo Press any key to start seeding...
pause > nul

echo.
echo [1] Installing date-fns for date calculations...
npm install date-fns

echo.
echo [2] Compiling TypeScript...
npx tsc scripts/seed-comprehensive-metrics.ts --lib es2015,dom --module commonjs --target es2017 --esModuleInterop

echo.
echo [3] Running comprehensive metrics seeding...
echo This may take a few minutes for 90 days of data...
node scripts/seed-comprehensive-metrics.js

echo.
echo === METRICS SEEDING COMPLETE ===
echo.
echo Your database now contains:
echo - 90 days of hourly production metrics
echo - ISO 22400 compliant KPIs
echo - ISO 9001 quality metrics
echo - Equipment reliability data
echo - Maintenance records
echo - Updated KPI summaries at all levels
echo.
echo You can now test the chat with questions like:
echo - "What is my OEE?"
echo - "Show me equipment reliability metrics"
echo - "What are my ISO 22400 KPIs?"
echo - "Show quality metrics for the last week"
echo.
pause