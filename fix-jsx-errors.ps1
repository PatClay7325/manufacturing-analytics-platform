#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "JSX Syntax Error Fixer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will scan all React files for JSX syntax errors" -ForegroundColor Yellow
Write-Host "and automatically fix them." -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting JSX error detection and fixing..." -ForegroundColor Green
Write-Host ""

try {
    # Run the JSX syntax fixer test
    & npx vitest run src/__tests__/syntax/jsx-syntax-fixer.test.ts --reporter=verbose
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "JSX Error Fixing Complete" -ForegroundColor Cyan  
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Review the changes above" -ForegroundColor White
    Write-Host "2. Run 'npm run build' to verify fixes" -ForegroundColor White
    Write-Host "3. Commit the fixed files" -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "Error running JSX fixer: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you have Node.js and npm installed." -ForegroundColor Yellow
    Write-Host "Try running 'npm install' first if you haven't already." -ForegroundColor Yellow
}

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")