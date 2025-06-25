@echo off
echo ======================================
echo Manufacturing Agent Pipeline Verification
echo ======================================
echo.

echo 1. Checking Pipeline Status...
curl -s http://localhost:3000/api/agents/manufacturing-engineering/pipeline | findstr "operational"
if %ERRORLEVEL% EQU 0 (
    echo    [PASS] Pipeline is operational
) else (
    echo    [FAIL] Pipeline not responding
)
echo.

echo 2. Testing OEE Data Endpoint...
curl -s http://localhost:3000/api/data/oee | findstr "summary"
if %ERRORLEVEL% EQU 0 (
    echo    [PASS] OEE data endpoint working
) else (
    echo    [FAIL] OEE data endpoint failed
)
echo.

echo 3. Testing Downtime Data Endpoint...
curl -s http://localhost:3000/api/data/downtime | findstr "paretoAnalysis"
if %ERRORLEVEL% EQU 0 (
    echo    [PASS] Downtime data endpoint working
) else (
    echo    [FAIL] Downtime data endpoint failed
)
echo.

echo 4. Testing Root Cause Data Endpoint...
curl -s http://localhost:3000/api/data/root-cause | findstr "fishboneData"
if %ERRORLEVEL% EQU 0 (
    echo    [PASS] Root cause data endpoint working
) else (
    echo    [FAIL] Root cause data endpoint failed
)
echo.

echo 5. Testing Pipeline Execution...
echo.
echo Sending test query to pipeline...
curl -X POST http://localhost:3000/api/agents/manufacturing-engineering/pipeline ^
  -H "Content-Type: application/json" ^
  -d "{\"query\": \"Show me current OEE metrics\", \"parameters\": {\"sessionId\": \"test\"}}"
echo.
echo.

echo ======================================
echo Pipeline Features:
echo ======================================
echo.
echo Multi-Agent System Components:
echo - DataCollectorAgent: Aggregates manufacturing data
echo - QualityAnalyzerAgent: Analyzes quality metrics
echo - PerformanceOptimizerAgent: OEE and performance analysis
echo - MaintenancePredictorAgent: Predictive maintenance
echo - RootCauseAnalyzerAgent: Fishbone analysis
echo - VisualizationGeneratorAgent: Creates charts
echo - ReportGeneratorAgent: Generates reports
echo.
echo Access the chat UI at: http://localhost:3000/ai-chat
echo Toggle between "Legacy Mode" and "Pipeline Mode" using the button
echo.
echo To test the pipeline:
echo   npx tsx scripts/test-pipeline.ts
echo.
pause