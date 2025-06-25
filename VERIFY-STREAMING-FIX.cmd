@echo off
echo ====================================
echo Verifying Streaming Service Fix
echo ====================================
echo.
echo This will test if the lazy initialization fix
echo for the ManufacturingDataStream is working.
echo.
echo Testing streaming service connection...
echo.

:: Test the streaming service
npx tsx scripts/test-streaming-connection.ts

echo.
echo ====================================
echo Fix Verification Complete
echo ====================================
echo.
echo Key improvements made:
echo 1. Fixed database import path to use /lib/database/prisma
echo 2. Implemented lazy initialization to prevent premature database access
echo 3. Added database connection checks before polling
echo 4. Deferred polling start until first subscription
echo.
echo The chat functionality should now work properly!
echo Navigate to /test-streaming or /real-time to test the UI.
echo.
pause