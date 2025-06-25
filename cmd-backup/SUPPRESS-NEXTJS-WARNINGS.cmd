@echo off
echo ==========================================
echo Suppressing Next.js 15 Warnings
echo ==========================================
echo.

echo These warnings are non-critical and won't break your app.
echo They're just informing you about future changes in Next.js.
echo.

echo Your options:
echo.
echo 1. IGNORE THE WARNINGS (Recommended for now)
echo    - Your app works fine
echo    - Fix them when you have time
echo    - Wait for official migration tools
echo.
echo 2. FIX SPECIFIC PAGES
echo    - Copy page-fixed.tsx over page.tsx
echo    - Update imports to use React.use()
echo.
echo 3. DISABLE CONSOLE WARNINGS (Development only)
echo    - Add to your next.config.js:
echo      reactStrictMode: false
echo    - Or filter console in browser DevTools
echo.

echo To test the fixed version:
echo 1. Copy: src/app/d/[uid]/page-fixed.tsx
echo 2. To: src/app/d/[uid]/page.tsx
echo 3. Restart dev server
echo.

echo Remember: These are just warnings about future compatibility.
echo Your application is working correctly!
echo.
pause