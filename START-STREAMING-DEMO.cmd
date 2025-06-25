@echo off
echo ====================================
echo Starting Manufacturing Stream Demo
echo ====================================
echo.
echo This will generate real-time manufacturing data
echo to test the streaming functionality.
echo.
echo Press Ctrl+C to stop the demo.
echo.
echo Starting in 3 seconds...
timeout /t 3 /nobreak >nul

echo.
echo Running demo stream generator...
npx tsx scripts/demo-real-time-stream.ts