@echo off
echo ===============================================
echo    TEST GEMMA:2B CHAT INTEGRATION
echo ===============================================
echo.

echo [1] Compiling TypeScript test...
npx tsx scripts/test-gemma-chat.ts

echo.
echo ===============================================
echo    TEST COMPLETE
echo ===============================================
echo.

pause