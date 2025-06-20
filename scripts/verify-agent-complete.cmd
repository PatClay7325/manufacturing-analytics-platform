@echo off
echo ======================================
echo Manufacturing Engineering Agent Verification
echo ======================================
echo.

echo 1. Checking Agent Status...
curl -s http://localhost:3000/api/agents/manufacturing-engineering/status | findstr "operational"
if %ERRORLEVEL% EQU 0 (
    echo    [PASS] Agent is operational
) else (
    echo    [FAIL] Agent not operational - run seed-agent-metrics.ts
)
echo.

echo 2. Testing Agent Health...
curl -s http://localhost:3000/api/agents/manufacturing-engineering/health | findstr "healthy"
if %ERRORLEVEL% EQU 0 (
    echo    [PASS] Agent is healthy
) else (
    echo    [FAIL] Agent health check failed
)
echo.

echo 3. Checking Database Metrics...
for /f "tokens=*" %%i in ('npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); p.performanceMetric.count().then(c=>{console.log(c);process.exit(0)}).catch(()=>process.exit(1))"') do set METRICS=%%i
if %METRICS% GTR 0 (
    echo    [PASS] Found %METRICS% performance metrics
) else (
    echo    [FAIL] No metrics found - run npx tsx scripts/seed-agent-metrics.ts
)
echo.

echo ======================================
echo Summary:
echo ======================================
echo.
echo The Manufacturing Engineering Agent is now your primary chat interface.
echo.
echo Key Features:
echo - ISO 22400, 14224, and 9001 compliant analysis
echo - Real-time OEE and performance monitoring
echo - Downtime Pareto analysis
echo - Quality metrics tracking
echo - Predictive maintenance insights
echo - Root cause analysis with fishbone diagrams
echo.
echo Access at: http://localhost:3000/ai-chat
echo.
echo If any checks failed, run:
echo   npx tsx scripts/seed-agent-metrics.ts
echo.
pause