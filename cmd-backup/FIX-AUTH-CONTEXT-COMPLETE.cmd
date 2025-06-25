@echo off
echo ==========================================
echo Complete Auth Context Fix
echo ==========================================
echo.

echo This script will ensure the auth context is properly configured.
echo.

echo Step 1: Killing any existing Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo Step 2: Clearing Next.js cache...
rmdir /s /q .next 2>nul
rmdir /s /q node_modules\.cache 2>nul

echo.
echo Step 3: Installing dependencies (in case any are missing)...
call npm install

echo.
echo Step 4: Starting the development server...
echo.
echo IMPORTANT: The server will start in a new window.
echo Wait for it to fully compile before testing.
echo.
echo Once the server is running, test these URLs:
echo.
echo 1. http://localhost:3000/test-context-hierarchy
echo    - This should show "Auth context is available!"
echo.
echo 2. http://localhost:3000/Analytics-dashboard
echo    - This should now load without auth errors
echo.
echo 3. http://localhost:3000/test-auth-fixed
echo    - This shows the mock user details
echo.

start cmd /k "npm run dev"

echo.
echo Waiting for server to start...
timeout /t 10

echo.
echo Opening test page in browser...
start http://localhost:3000/test-context-hierarchy

echo.
echo If you still see errors:
echo 1. Make sure you're using Chrome or Edge
echo 2. Open DevTools (F12) and disable cache
echo 3. Check the Console tab for any errors
echo.
pause