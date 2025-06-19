@echo off
echo === Testing AI Chat Only ===
echo.

echo [1] Checking prerequisites...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Database is accessible' as status;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running!
    pause
    exit /b 1
)
echo PostgreSQL is running ✓

curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Dev server is not running!
    echo Please run start-dev-server.cmd first
    pause
    exit /b 1
)
echo Dev server is running ✓

echo.
echo [2] Checking AI service (Ollama)...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Ollama API is not responding on localhost:11434
    echo Chat tests may fail without AI service
    echo.
    echo To fix: Ensure Ollama is running with TinyOllama model
    echo.
)

echo.
echo [3] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo [4] Running AI chat test...
npx playwright test tests/e2e/ai-chat.spec.ts --grep "handles multiple conversation turns" --headed --reporter=list

echo.
echo === Test Complete ===
echo.
echo If test fails, check:
echo 1. Ollama is running (docker ps)
echo 2. TinyOllama model is available
echo 3. API endpoints are responding
echo.
pause