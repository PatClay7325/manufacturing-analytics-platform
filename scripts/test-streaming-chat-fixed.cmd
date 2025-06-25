@echo off
echo ===============================================
echo Testing Streaming Chat with Authentication
echo ===============================================
echo.

echo Checking server connection...
curl -s -o nul -w "Server responding: %%{http_code}\n" http://127.0.0.1:3000 2>nul || (
    echo ERROR: Cannot connect to server on port 3000
    echo Please start the server with: npm run dev
    pause
    exit /b 1
)

echo.
echo Testing streaming with manufacturing context...
echo Press Ctrl+C to stop streaming
echo.

curl -N -X POST http://127.0.0.1:3000/api/chat/stream ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer dev-token" ^
  -H "Cookie: auth-token=dev-token" ^
  -H "Accept: text/event-stream" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Analyze the performance of our work centers and suggest improvements\"}], \"stream\": true}"

echo.
echo.
pause