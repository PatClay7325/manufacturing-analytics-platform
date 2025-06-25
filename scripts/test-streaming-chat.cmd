@echo off
echo ===============================================
echo Testing Streaming Chat with Authentication
echo ===============================================
echo.

echo Testing streaming chat endpoint with dev auth...
echo.

REM Use curl with streaming support
curl -N -X POST http://localhost:3000/api/chat/stream ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer dev-token" ^
  -H "Cookie: auth-token=dev-token" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"What is the current status of Work Center CNC-001?\"}], \"stream\": true}"

echo.
echo.
pause