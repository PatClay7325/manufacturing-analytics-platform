@echo off
echo ======================================
echo Manufacturing Engineering Agent Test
echo ======================================
echo.

echo Testing the Manufacturing Engineering Agent API...
echo.

echo 1. Testing agent health check...
curl -s http://localhost:3000/api/agents/manufacturing-engineering/health
echo.
echo.

echo 2. Testing OEE analysis query...
curl -X POST http://localhost:3000/api/agents/manufacturing-engineering/execute ^
  -H "Content-Type: application/json" ^
  -d "{\"query\": \"Show me the current OEE metrics\"}"
echo.
echo.

echo ======================================
echo Test Complete!
echo ======================================
echo.
echo The Manufacturing Engineering Agent is now your primary chat agent.
echo.
echo Access it at: http://localhost:3000/ai-chat
echo.
echo Features:
echo - ISO-compliant analysis (ISO 22400, ISO 14224, ISO 9001)
echo - OEE analysis with component breakdown
echo - Downtime Pareto analysis
echo - Quality metrics and trends
echo - Maintenance effectiveness analysis
echo - Root cause analysis with fishbone diagrams
echo - Confidence scoring and ISO references
echo.
pause