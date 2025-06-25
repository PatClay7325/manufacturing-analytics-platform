@echo off
echo ===============================================
echo Testing Chat System with Authentication
echo ===============================================
echo.

echo Checking if server is running on port 3000...
timeout /t 1 /nobreak > nul
curl -s -o nul -w "Server status: %%{http_code}\n" http://127.0.0.1:3000/api/health 2>nul || (
    echo ERROR: Server is not responding on port 3000
    echo Please ensure the development server is running with: npm run dev
    echo.
    pause
    exit /b 1
)

echo.
echo Testing regular chat endpoint with dev authentication...
echo.

curl -X POST http://127.0.0.1:3000/api/chat ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer dev-token" ^
  -H "Cookie: auth-token=dev-token" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"What is the current OEE for CNC Machine 1?\"}], \"stream\": false}" ^
  -w "\n\nHTTP Status: %%{http_code}\n"

echo.
echo ===============================================
echo.
echo Testing streaming chat endpoint...
echo.

curl -N -X POST http://127.0.0.1:3000/api/chat/stream ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer dev-token" ^
  -H "Cookie: auth-token=dev-token" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Show me production metrics for the last hour\"}], \"stream\": true}" ^
  -w "\n\nHTTP Status: %%{http_code}\n"

echo.
echo ===============================================
echo.
echo Testing without authentication (should fail)...
echo.

curl -X POST http://127.0.0.1:3000/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"This should fail\"}], \"stream\": false}" ^
  -w "\n\nHTTP Status: %%{http_code}\n"

echo.
echo.
pause