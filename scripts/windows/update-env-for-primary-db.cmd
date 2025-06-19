@echo off
echo Updating environment files to use the primary manufacturing-postgres database...

echo.
echo === Getting database password from docker-compose ===
echo Checking docker-compose.yml for the correct password...
findstr -A 5 -B 5 "POSTGRES_PASSWORD" docker-compose.yml

echo.
echo Please enter the POSTGRES_PASSWORD from your docker-compose.yml:
set /p DB_PASSWORD=Password: 

echo.
echo === Updating .env.test ===
echo # Test Environment Configuration > .env.test.new
echo DATABASE_URL="postgresql://postgres:%DB_PASSWORD%@localhost:5432/manufacturing?schema=public" >> .env.test.new
echo DIRECT_DATABASE_URL="postgresql://postgres:%DB_PASSWORD%@localhost:5432/manufacturing?schema=public" >> .env.test.new
echo. >> .env.test.new
echo # API Configuration >> .env.test.new
echo NEXT_PUBLIC_API_URL=http://localhost:3000/api >> .env.test.new
echo NEXT_PUBLIC_WS_URL=ws://localhost:3000 >> .env.test.new
echo. >> .env.test.new
echo # Authentication >> .env.test.new
echo NEXTAUTH_URL=http://localhost:3000 >> .env.test.new
echo NEXTAUTH_SECRET=test-secret-key >> .env.test.new
echo. >> .env.test.new
echo # External Services >> .env.test.new
echo OLLAMA_API_URL=http://localhost:11434 >> .env.test.new
echo. >> .env.test.new
echo # Test Settings >> .env.test.new
echo NODE_ENV=test >> .env.test.new
echo LOG_LEVEL=error >> .env.test.new

echo.
echo Backup old .env.test and replace with new one...
copy .env.test .env.test.backup 2>nul
copy .env.test.new .env.test
del .env.test.new

echo.
echo Updated! Your .env.test now points to the primary manufacturing database.
echo Database: manufacturing (not manufacturing_test)
echo Host: localhost:5432 via manufacturing-postgres container