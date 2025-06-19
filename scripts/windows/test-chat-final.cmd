@echo off
echo === TESTING CHAT WITH REAL DATA ===
echo.

echo [1] Testing OEE question...
curl -X POST http://localhost:3000/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"sessionId\": \"test\", \"messages\": [{\"role\": \"user\", \"content\": \"What is my OEE?\"}]}"

echo.
echo.
echo The chat should now show actual OEE values from your metrics!
echo.
pause