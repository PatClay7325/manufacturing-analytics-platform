@echo off
echo === Environment Cleanup - Following Industry SOP ===
echo.
echo This script will establish a clean, standardized environment setup
echo following best practices for Node.js/Next.js applications.
echo.

echo [Step 1] Backing up all existing environment files...
mkdir env-backup 2>nul
for %%f in (.env*) do (
    echo Backing up %%f
    copy %%f env-backup\ >nul
)

echo.
echo [Step 2] Removing redundant/conflicting environment files...
REM Keep only the essential files per Next.js best practices
del .env.test.alt-port 2>nul
del .env.test.backup 2>nul
del .env.backup 2>nul
del .env.override 2>nul

echo.
echo [Step 3] Creating standardized environment structure...
echo Following Next.js environment precedence:
echo   - .env (shared/default settings)
echo   - .env.local (local overrides - git ignored)
echo   - .env.development (dev specific)
echo   - .env.production (prod specific)
echo   - .env.test (test specific)
echo.

pause