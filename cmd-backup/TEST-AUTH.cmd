@echo off
echo ===============================================
echo TEST AUTHENTICATION
echo ===============================================
echo.

:: Test login with curl
echo Testing login endpoint...
echo.

curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"admin123\",\"remember\":true}" ^
  -w "\n\nHTTP Status: %%{http_code}\n"

echo.
echo ===============================================
echo.
echo If you see a successful response with a token,
echo authentication is working correctly.
echo.
echo If you see an error, run FIX-AUTH-SETUP.cmd first
echo.
pause