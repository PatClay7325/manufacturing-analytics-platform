@echo off
echo ========================================
echo Full Chat Performance Test
echo ========================================
echo.

:: Start development server in background
echo Starting development server...
start /B npm run dev

:: Wait for server to start
echo Waiting for server to start...
timeout /t 10 /nobreak >nul

:: Test 1: Simple query
echo.
echo [TEST 1] Simple Query: "Hello"
echo --------------------------------
curl -X POST http://localhost:3000/api/chat/fast ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}]}" ^
  -w "\nResponse Time: %%{time_total}s\n" ^
  -s | findstr /C:"content" | head -5

:: Test 2: Database query
echo.
echo [TEST 2] Database Query: "List all equipment"
echo ---------------------------------------------
curl -X POST http://localhost:3000/api/chat/conversational ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"List all equipment\"}]}" ^
  -w "\nResponse Time: %%{time_total}s\n" ^
  -s | findstr /C:"content" | head -10

:: Test 3: Complex query
echo.
echo [TEST 3] Complex Query: "Show me OEE metrics for today"
echo ------------------------------------------------------
curl -X POST http://localhost:3000/api/chat/conversational ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Show me OEE metrics for today\"}]}" ^
  -w "\nResponse Time: %%{time_total}s\n" ^
  -s | findstr /C:"content" | head -10

:: Test 4: Natural language query
echo.
echo [TEST 4] Natural Query: "Are there any active alerts?"
echo -----------------------------------------------------
curl -X POST http://localhost:3000/api/chat/conversational ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Are there any active alerts?\"}]}" ^
  -w "\nResponse Time: %%{time_total}s\n" ^
  -s | findstr /C:"content" | head -10

echo.
echo ========================================
echo Performance Summary
echo ========================================
echo.
echo Expected performance:
echo - Fast endpoint: ^<1 second
echo - Database queries: 2-3 seconds
echo - Complex queries: 3-5 seconds
echo.
echo To view full chat UI: http://localhost:3000/fast-chat
echo.
pause