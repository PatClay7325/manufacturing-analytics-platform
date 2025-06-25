@echo off
echo ===============================================
echo FIX AUTHENTICATION SETUP
echo Manufacturing Analytics Platform
echo ===============================================
echo.

:: Set required environment variables
echo Setting up environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set JWT_SECRET=your-secret-key-for-development
set NEXTAUTH_SECRET=your-nextauth-secret-for-development
set NODE_ENV=development

:: Create .env.local if it doesn't exist
if not exist ".env.local" (
    echo Creating .env.local file...
    (
        echo # Database
        echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing"
        echo.
        echo # Authentication
        echo JWT_SECRET="your-secret-key-for-development"
        echo NEXTAUTH_SECRET="your-nextauth-secret-for-development"
        echo NEXTAUTH_URL="http://localhost:3000"
        echo.
        echo # Ollama for AI Chat
        echo OLLAMA_BASE_URL="http://localhost:11434"
        echo OLLAMA_MODEL="gemma2:2b"
        echo.
        echo # API
        echo NEXT_PUBLIC_API_URL="http://localhost:3000/api"
    ) > .env.local
    echo .env.local file created!
) else (
    echo .env.local already exists
)

echo.
echo Checking database connection...

:: Check if PostgreSQL is accessible
psql -U postgres -h localhost -p 5432 -c "SELECT 1" >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: PostgreSQL is not running or not accessible
    echo.
    echo Please ensure PostgreSQL is running. You can use Docker:
    echo.
    echo docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=manufacturing postgres:15
    echo.
    echo Or if you have PostgreSQL installed locally, ensure it's running
    echo and accessible with user 'postgres' and password 'postgres'
    echo.
    pause
    exit /b 1
)

echo Database is accessible!
echo.

:: Setup Prisma
echo Setting up database schema...
call npx prisma generate
if errorlevel 1 (
    echo ERROR: Failed to generate Prisma client
    pause
    exit /b 1
)

call npx prisma db push --accept-data-loss
if errorlevel 1 (
    echo ERROR: Failed to push database schema
    pause
    exit /b 1
)

echo.
echo Creating test users...
call npx tsx scripts/seed-users.ts
if errorlevel 1 (
    echo ERROR: Failed to create test users
    echo.
    echo Trying alternative approach...
    call npx tsx -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcrypt');
    const prisma = new PrismaClient();
    
    async function createAdmin() {
      const passwordHash = await bcrypt.hash('admin123', 10);
      const user = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          department: 'IT',
          passwordHash: passwordHash,
        }
      });
      console.log('Admin user created:', user.email);
      await prisma.$disconnect();
    }
    
    createAdmin().catch(console.error);
    "
)

echo.
echo ===============================================
echo AUTHENTICATION SETUP COMPLETE!
echo ===============================================
echo.
echo You can now login with:
echo.
echo Email: admin@example.com
echo Password: admin123
echo.
echo Make sure the development server is running:
echo npm run dev
echo.
echo Then go to: http://localhost:3000/login
echo.
echo ===============================================
echo.
echo Troubleshooting:
echo - If login still fails, restart the dev server
echo - Check browser console for errors
echo - Ensure cookies are enabled
echo - Try incognito/private browsing mode
echo.
pause