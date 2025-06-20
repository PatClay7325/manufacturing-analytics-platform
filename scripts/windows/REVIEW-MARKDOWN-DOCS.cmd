@echo off
echo ================================================================================
echo    Review All Markdown Documentation
echo ================================================================================
echo.
echo This script will analyze all .md files for:
echo   - Remaining Grafana references
echo   - Generic "Analytics" references that need context
echo   - Files that need to be renamed
echo   - Documentation that needs updating
echo.

cd /d "%~dp0..\.."

echo Running documentation review...
echo.

call npx tsx scripts/review-markdown-docs.ts

echo.
echo ================================================================================
echo.
echo If issues were found, a cleanup script has been generated.
echo You can run it with:
echo   - Preview mode: npx tsx scripts/cleanup-markdown-docs.ts --dry-run
echo   - Apply changes: npx tsx scripts/cleanup-markdown-docs.ts
echo.
pause