@echo off
echo ================================================================================
echo    Remove All Grafana References from Manufacturing Analytics Platform
echo ================================================================================
echo.
echo This script will comprehensively remove all Grafana references and replace
echo them with appropriate Manufacturing Analytics Platform branding.
echo.
echo Changes include:
echo   - Component names (GrafanaPanel → AnalyticsPanel, etc.)
echo   - UI text and labels
echo   - Route paths (/grafana-dashboard → /analytics-dashboard)
echo   - Environment variables
echo   - Configuration files
echo   - Comments and documentation
echo.
echo ================================================================================
echo.

cd /d "%~dp0..\.."

:menu
echo Choose an option:
echo   1. Preview changes (dry run)
echo   2. Apply all changes
echo   3. Exit
echo.
set /p option="Enter your choice (1-3): "

if "%option%"=="1" (
    echo.
    echo Running in preview mode...
    echo ================================================================================
    call npx tsx scripts/remove-grafana-references.ts --dry-run
    echo.
    echo ================================================================================
    echo This was a preview. No files were modified.
    echo.
    goto menu
) else if "%option%"=="2" (
    echo.
    echo ⚠️  WARNING: This will modify multiple files in your codebase.
    echo.
    set /p confirm="Are you sure you want to proceed? (yes/no): "
    
    if /i "%confirm%"=="yes" (
        echo.
        echo Removing all Grafana references...
        echo ================================================================================
        call npx tsx scripts/remove-grafana-references.ts
        echo.
        echo ================================================================================
        echo.
        echo Next steps:
        echo   1. Review the changes using git diff
        echo   2. Run 'npm run dev' to ensure everything works
        echo   3. Update any documentation as needed
        echo   4. Commit the changes
        echo.
    ) else (
        echo.
        echo Operation cancelled.
        goto menu
    )
) else if "%option%"=="3" (
    echo.
    echo Exiting without changes.
) else (
    echo.
    echo Invalid option. Please try again.
    echo.
    goto menu
)

pause