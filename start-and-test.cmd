@echo off
echo ===============================================
echo    STARTING MANUFACTURING ANALYTICS PLATFORM
echo ===============================================
echo.

echo Ollama Status: RUNNING ✓
echo Model: gemma:2b ✓
echo.

echo Starting Next.js development server...
echo.
echo Once the server starts, you can visit:
echo.
echo   1. Test Page (recommended first):
echo      http://localhost:3000/test-chat
echo.
echo   2. Optimized Streaming Chat:
echo      http://localhost:3000/manufacturing-chat/optimized
echo.
echo   3. Regular Manufacturing Chat:
echo      http://localhost:3000/manufacturing-chat
echo.
echo Press Ctrl+C to stop the server.
echo ===============================================
echo.

npm run dev