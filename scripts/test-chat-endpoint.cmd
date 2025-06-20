@echo off
echo ======================================
echo Testing Manufacturing Chat Endpoint
echo ======================================
echo.

echo Testing chat API with OEE query...
curl -X POST http://localhost:3000/api/chat/manufacturing-agent ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Show me the current OEE metrics\"}], \"sessionId\": \"test-session\"}"

echo.
echo.
echo ======================================
echo If you see streaming data above, the Manufacturing Engineering Agent is working!
echo ======================================
pause