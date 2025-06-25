@echo off
echo ===============================================
echo Running Chat E2E Tests with Vitest
echo ===============================================
echo.

echo Checking prerequisites...

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not available
    pause
    exit /b 1
)

echo ✅ Node.js and npm are available
echo.

echo Setting up environment variables...
set NODE_ENV=test
set NEXT_PUBLIC_DEV_AUTO_LOGIN=true
set TEST_MODE=e2e

echo ✅ Environment configured
echo.

echo Running comprehensive E2E tests for chat system...
echo.
echo This will test:
echo - ✅ Authentication and authorization
echo - ✅ Basic chat functionality
echo - ✅ Manufacturing-specific queries
echo - ✅ Streaming responses
echo - ✅ Conversation context
echo - ✅ Error handling
echo - ✅ Performance and reliability
echo.

REM Run the E2E tests with Vitest
npx vitest run --config vitest.e2e.config.ts tests/e2e/chat.e2e.test.ts

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===============================================
    echo ✅ ALL CHAT E2E TESTS PASSED!
    echo ===============================================
    echo.
    echo The chat system is fully functional with:
    echo - ✅ Complete authentication flow
    echo - ✅ Robust error handling
    echo - ✅ Manufacturing domain knowledge
    echo - ✅ Streaming capabilities
    echo - ✅ Context awareness
    echo - ✅ Performance within acceptable limits
    echo.
    echo 🚀 Chat system is production-ready!
) else (
    echo.
    echo ===============================================
    echo ❌ SOME TESTS FAILED
    echo ===============================================
    echo.
    echo Please review the test output above to identify issues.
    echo Common issues:
    echo - Server not running (start with: npm run dev)
    echo - Ollama not available (start with: ollama serve)
    echo - Database connection issues
    echo - Authentication configuration problems
    echo.
    echo Fix the issues and run the tests again.
)

echo.
pause