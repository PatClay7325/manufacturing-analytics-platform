@echo off
echo === TEST ENHANCED CHAT WITH LIVE DATA ===
echo.

echo [1] Testing chat with OEE question...
curl -X POST http://localhost:3000/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"sessionId\": \"test-session\", \"messages\": [{\"role\": \"user\", \"content\": \"What is my OEE?\"}]}"

echo.
echo.
echo [2] Testing chat with equipment status...
curl -X POST http://localhost:3000/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"sessionId\": \"test-session\", \"messages\": [{\"role\": \"user\", \"content\": \"Show me all my equipment status\"}]}"

echo.
echo.
echo [3] Testing chat with alerts...
curl -X POST http://localhost:3000/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"sessionId\": \"test-session\", \"messages\": [{\"role\": \"user\", \"content\": \"What alerts are active?\"}]}"

echo.
echo.
echo The chat should now provide specific answers with your actual data!
echo.
pause