@echo off
echo ===============================================
echo Testing Chat System with Authentication
echo ===============================================
echo.

echo Testing with dev authentication token...
echo.

REM Test the chat endpoint with dev auth
curl -X POST http://localhost:3000/api/chat ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer dev-token" ^
  -H "Cookie: auth-token=dev-token" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"What is the current OEE for CNC Machine 1?\"}], \"stream\": false}"

echo.
echo.
echo Testing streaming chat endpoint...
echo.

curl -X POST http://localhost:3000/api/chat/stream ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer dev-token" ^
  -H "Cookie: auth-token=dev-token" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Show me production metrics for the last hour\"}], \"stream\": true}"

echo.
echo.
pause