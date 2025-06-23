@echo off
echo ========================================
echo    Start Server and Run Tests
echo ========================================
echo.

echo 🔧 Installing dependencies...
npm install

echo.
echo 🎯 Starting development server...
start "Development Server" cmd /k "npm run dev"

echo.
echo ⏳ Waiting for server to start (20 seconds)...
timeout /t 20 /nobreak

echo.
echo 🧪 Opening browser for manual testing...
start http://localhost:3000

echo.
echo 📋 Testing key pages manually...
echo.
echo 1. Home page: http://localhost:3000
echo 2. Dashboard: http://localhost:3000/dashboard  
echo 3. manufacturingPlatform Dashboard: http://localhost:3000/manufacturingPlatform-dashboard
echo 4. Equipment: http://localhost:3000/equipment
echo 5. Alerts: http://localhost:3000/alerts
echo 6. Manufacturing Chat: http://localhost:3000/manufacturing-chat
echo 7. Explore: http://localhost:3000/explore
echo 8. Documentation: http://localhost:3000/documentation
echo.

echo 🔍 Running automated page checks...
call QUICK-PAGE-CHECK-WINDOWS.cmd

echo.
echo ✅ Server is running and tests are complete!
echo The browser should now be open for manual verification.
echo.
pause