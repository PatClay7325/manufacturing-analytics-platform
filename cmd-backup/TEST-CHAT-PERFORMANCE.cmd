@echo off
echo ========================================
echo Chat Performance Test Suite
echo ========================================
echo.

:: Test different chat endpoints
echo Testing chat endpoints...
echo.

:: Test 1: Fast endpoint
echo [1/4] Testing /api/chat/fast
echo ------------------------------
curl -X POST http://localhost:3000/api/chat/fast ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}]}" ^
  -w "\nTime: %%{time_total}s\n" ^
  -s -o nul

echo.

:: Test 2: Conversational endpoint with database
echo [2/4] Testing /api/chat/conversational (with DB access)
echo -------------------------------------------------------
curl -X POST http://localhost:3000/api/chat/conversational ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"What equipment is currently running?\"}]}" ^
  -w "\nTime: %%{time_total}s\n" ^
  -s

echo.

:: Test 3: Complex query
echo [3/4] Testing complex database query
echo ------------------------------------
curl -X POST http://localhost:3000/api/chat/conversational ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Show me the OEE metrics for today with production output\"}]}" ^
  -w "\nTime: %%{time_total}s\n" ^
  -s

echo.

:: Test 4: Manufacturing agent
echo [4/4] Testing /api/chat/manufacturing-agent
echo ------------------------------------------
curl -X POST http://localhost:3000/api/chat/manufacturing-agent ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Analyze current production efficiency\"}]}" ^
  -w "\nTime: %%{time_total}s\n" ^
  -s -o nul

echo.
echo ========================================
echo Performance Test Complete
echo ========================================
echo.
echo Expected performance targets:
echo - Fast endpoint: ^<1 second
echo - Conversational (DB): ^<3 seconds
echo - Complex queries: ^<5 seconds
echo.
pause