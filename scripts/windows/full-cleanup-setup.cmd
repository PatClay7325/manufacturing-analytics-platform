@echo off
echo === Full Environment Cleanup and Setup (Industry SOP) ===
echo.
echo This will clean up your environment and set it up following best practices.
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo [Phase 1: Cleanup]
echo =================
call cleanup-env-setup.cmd

echo.
echo [Phase 2: Environment Setup]
echo ===========================
call setup-env-sop.cmd

echo.
echo [Phase 3: Database Setup]
echo ========================
call setup-database-sop.cmd

echo.
echo [Phase 4: Verification]
echo =====================
echo Verifying setup...
echo.

echo Database connection test:
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT version();" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Database connection successful
) else (
    echo ✗ Database connection failed
)

echo.
echo Environment files present:
if exist .env echo ✓ .env found
if exist .env.local echo ✓ .env.local found
if exist .env.test echo ✓ .env.test found
if exist .env.example echo ✓ .env.example found

echo.
echo === Setup Complete! ===
echo.
echo Your environment is now configured following industry standards.
echo.
echo Next steps:
echo 1. Review README-ENVIRONMENT-SETUP.md for documentation
echo 2. Run: npm run test:e2e
echo.
pause