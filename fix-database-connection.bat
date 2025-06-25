@echo off
echo Fixing Database Connection for Manufacturing App...

REM First, let's check the database connection
echo.
echo Checking PostgreSQL container...
docker exec manufacturing-postgres pg_isready -U postgres

REM Update .env.local with correct credentials
echo.
echo Creating .env.local file with correct database URL...
(
echo # Database Configuration
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public"
echo.
echo # Redis Configuration  
echo REDIS_URL="redis://localhost:6379"
echo.
echo # NextAuth Configuration
echo NEXTAUTH_URL="http://localhost:3000"
echo NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
echo.
echo # Application Configuration
echo NODE_ENV="development"
echo APP_NAME="Manufacturing Analytics Platform"
) > .env.local

REM Create the manufacturing database if it doesn't exist
echo.
echo Creating manufacturing database...
docker exec -it manufacturing-postgres psql -U postgres -c "CREATE DATABASE manufacturing;" 2>nul || echo Database may already exist

REM Update the setup script with correct password
echo.
echo Creating corrected setup script...
(
echo const { PrismaClient } = require('@prisma/client');
echo const bcrypt = require('bcryptjs');
echo.
echo const prisma = new PrismaClient({
echo   datasources: {
echo     db: {
echo       url: 'postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public'
echo     }
echo   }
echo });
echo.
echo async function setupDatabase() {
echo   try {
echo     console.log('Setting up database...');
echo     
echo     // Test connection first
echo     await prisma.$connect();
echo     console.log('✓ Database connected successfully');
echo     
echo     // Create admin user
echo     const adminPassword = await bcrypt.hash('admin123', 10);
echo     const adminUser = await prisma.user.upsert({
echo       where: { email: 'admin@manufacturing.local' },
echo       update: {},
echo       create: {
echo         email: 'admin@manufacturing.local',
echo         name: 'Admin User',
echo         password: adminPassword,
echo         role: 'ADMIN',
echo         isActive: true,
echo       },
echo     });
echo     console.log('✓ Admin user created:', adminUser.email);
echo     
echo     // Create demo user
echo     const demoPassword = await bcrypt.hash('demo123', 10);
echo     const demoUser = await prisma.user.upsert({
echo       where: { email: 'demo@manufacturing.local' },
echo       update: {},
echo       create: {
echo         email: 'demo@manufacturing.local',
echo         name: 'Demo User',
echo         password: demoPassword,
echo         role: 'USER',
echo         isActive: true,
echo       },
echo     });
echo     console.log('✓ Demo user created:', demoUser.email);
echo     
echo     // Create operator user
echo     const operatorPassword = await bcrypt.hash('operator123', 10);
echo     const operatorUser = await prisma.user.upsert({
echo       where: { email: 'operator@manufacturing.local' },
echo       update: {},
echo       create: {
echo         email: 'operator@manufacturing.local',
echo         name: 'Operator User',
echo         password: operatorPassword,
echo         role: 'OPERATOR',
echo         isActive: true,
echo       },
echo     });
echo     console.log('✓ Operator user created:', operatorUser.email);
echo     
echo     console.log('\nDatabase setup complete!');
echo     console.log('\nAvailable logins:');
echo     console.log('  Admin:    admin@manufacturing.local / admin123');
echo     console.log('  Demo:     demo@manufacturing.local / demo123');
echo     console.log('  Operator: operator@manufacturing.local / operator123');
echo     
echo   } catch (error) {
echo     console.error('Error setting up database:', error);
echo   } finally {
echo     await prisma.$disconnect();
echo   }
echo }
echo.
echo setupDatabase();
) > scripts\setup-database-fixed.js

REM Create test connection script
echo.
echo Creating test connection script...
(
echo const { PrismaClient } = require('@prisma/client');
echo.
echo const prisma = new PrismaClient({
echo   datasources: {
echo     db: {
echo       url: 'postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public'
echo     }
echo   }
echo });
echo.
echo async function testConnection() {
echo   try {
echo     await prisma.$connect();
echo     console.log('✓ Database connection successful!');
echo     
echo     const userCount = await prisma.user.count();
echo     console.log(`✓ Found ${userCount} users in database`);
echo     
echo     const users = await prisma.user.findMany({
echo       select: { email: true, role: true }
echo     });
echo     
echo     console.log('\nExisting users:');
echo     users.forEach(user =^> {
echo       console.log(`  - ${user.email} (${user.role})`);
echo     });
echo     
echo   } catch (error) {
echo     console.error('✗ Database connection failed:', error.message);
echo   } finally {
echo     await prisma.$disconnect();
echo   }
echo }
echo.
echo testConnection();
) > scripts\test-connection.js

REM Update prisma schema if needed
echo.
echo Updating DATABASE_URL in .env file...
(
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public"
) > .env

REM Generate Prisma client
echo.
echo Generating Prisma client...
call npx prisma generate

REM Push schema to database
echo.
echo Pushing schema to database...
call npx prisma db push

REM Run the setup script
echo.
echo Creating default users...
call node scripts\setup-database-fixed.js

REM Test the connection
echo.
echo Testing connection...
call node scripts\test-connection.js

echo.
echo ========================================
echo Database Connection Fixed!
echo ========================================
echo.
echo Default Login Credentials:
echo   Admin:    admin@manufacturing.local / admin123
echo   Demo:     demo@manufacturing.local / demo123
echo   Operator: operator@manufacturing.local / operator123
echo.
echo Next Steps:
echo 1. Restart your Next.js app (Ctrl+C then npm run dev)
echo 2. Go to http://localhost:3000/login
echo 3. Login with one of the credentials above
echo.
pause