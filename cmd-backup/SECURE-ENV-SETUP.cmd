@echo off
echo ========================================
echo  SECURE ENVIRONMENT SETUP SCRIPT
echo ========================================
echo.

echo [WARNING] This will generate secure passwords and update your environment configuration.
echo [WARNING] Make sure to save these credentials in a secure password manager.
echo.
set /p confirm="Continue? (y/N): "
if /i not "%confirm%"=="y" goto :end

echo.
echo [1/4] Generating secure credentials...

:: Generate secure passwords (Windows compatible)
for /f %%i in ('powershell -command "[System.Web.Security.Membership]::GeneratePassword(32, 8)"') do set GRAFANA_ADMIN_PASSWORD=%%i
for /f %%i in ('powershell -command "[System.Web.Security.Membership]::GeneratePassword(64, 16)"') do set GRAFANA_SECRET_KEY=%%i  
for /f %%i in ('powershell -command "[System.Web.Security.Membership]::GeneratePassword(32, 8)"') do set REDIS_PASSWORD=%%i
for /f %%i in ('powershell -command "[System.Web.Security.Membership]::GeneratePassword(32, 8)"') do set POSTGRES_PASSWORD=%%i
for /f %%i in ('powershell -command "[System.Web.Security.Membership]::GeneratePassword(64, 16)"') do set NEXTAUTH_SECRET=%%i

echo.
echo [2/4] Creating secure .env.local file...
echo # SECURE PRODUCTION ENVIRONMENT VARIABLES > .env.local
echo # Generated on %date% %time% >> .env.local
echo # >> .env.local
echo # ⚠️  WARNING: Keep these credentials secure! >> .env.local
echo # >> .env.local
echo. >> .env.local
echo # Database Configuration >> .env.local
echo POSTGRES_PASSWORD=%POSTGRES_PASSWORD% >> .env.local
echo DATABASE_URL=postgresql://postgres:%POSTGRES_PASSWORD%@localhost:5432/manufacturing >> .env.local
echo. >> .env.local
echo # Grafana Configuration >> .env.local
echo GRAFANA_ADMIN_PASSWORD=%GRAFANA_ADMIN_PASSWORD% >> .env.local
echo GRAFANA_SECRET_KEY=%GRAFANA_SECRET_KEY% >> .env.local
echo GRAFANA_API_KEY=GENERATE_THIS_IN_GRAFANA_UI >> .env.local
echo. >> .env.local
echo # Next.js Configuration >> .env.local
echo NEXTAUTH_SECRET=%NEXTAUTH_SECRET% >> .env.local
echo. >> .env.local
echo # Redis Configuration >> .env.local
echo REDIS_PASSWORD=%REDIS_PASSWORD% >> .env.local
echo REDIS_URL=redis://:%REDIS_PASSWORD%@localhost:6379 >> .env.local

echo.
echo [3/4] Updating .gitignore for security...
echo. >> .gitignore
echo # Secure environment files >> .gitignore
echo .env.local >> .gitignore
echo .env.production >> .gitignore
echo .env.*.local >> .gitignore

echo.
echo [4/4] Creating credential backup...
echo ========================================= > CREDENTIALS-BACKUP.txt
echo  GENERATED CREDENTIALS - KEEP SECURE! >> CREDENTIALS-BACKUP.txt
echo ========================================= >> CREDENTIALS-BACKUP.txt
echo Generated: %date% %time% >> CREDENTIALS-BACKUP.txt
echo. >> CREDENTIALS-BACKUP.txt
echo Grafana Admin Password: %GRAFANA_ADMIN_PASSWORD% >> CREDENTIALS-BACKUP.txt
echo Grafana Secret Key: %GRAFANA_SECRET_KEY% >> CREDENTIALS-BACKUP.txt
echo PostgreSQL Password: %POSTGRES_PASSWORD% >> CREDENTIALS-BACKUP.txt
echo Redis Password: %REDIS_PASSWORD% >> CREDENTIALS-BACKUP.txt
echo NextAuth Secret: %NEXTAUTH_SECRET% >> CREDENTIALS-BACKUP.txt
echo. >> CREDENTIALS-BACKUP.txt
echo NEXT STEPS: >> CREDENTIALS-BACKUP.txt
echo 1. Generate Grafana API key in UI and update GRAFANA_API_KEY >> CREDENTIALS-BACKUP.txt
echo 2. Store these credentials in your password manager >> CREDENTIALS-BACKUP.txt
echo 3. Delete this file after saving credentials securely >> CREDENTIALS-BACKUP.txt
echo ========================================= >> CREDENTIALS-BACKUP.txt

echo.
echo ========================================
echo  SECURE SETUP COMPLETE
echo ========================================
echo.
echo ✅ Generated secure passwords for all services
echo ✅ Created .env.local with secure configuration
echo ✅ Updated .gitignore to prevent credential exposure
echo ✅ Created credentials backup file
echo.
echo 🔒 IMPORTANT SECURITY NOTES:
echo   1. Save the credentials from CREDENTIALS-BACKUP.txt in your password manager
echo   2. Delete CREDENTIALS-BACKUP.txt after saving credentials
echo   3. Generate a Grafana API key in the UI and update GRAFANA_API_KEY
echo   4. Never commit .env.local to version control
echo.
echo 📋 Next Steps:
echo   1. Run: npm run dev
echo   2. Go to http://localhost:3000/grafana
echo   3. Login with admin / %GRAFANA_ADMIN_PASSWORD%
echo   4. Generate API key and update .env.local
echo.

:end
pause