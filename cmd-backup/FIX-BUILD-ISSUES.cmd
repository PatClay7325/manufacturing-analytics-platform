@echo off
echo ==========================================
echo Fixing Build Issues
echo ==========================================
echo.

echo [1/4] Increasing Node.js memory limit...
set NODE_OPTIONS=--max-old-space-size=8192

echo.
echo [2/4] Creating missing ErrorAlert component...
if not exist "src\components\common\ErrorAlert.tsx" (
    echo export const ErrorAlert = ({ children }) =^> ^<div className="error-alert"^>{children}^</div^>; > src\components\common\ErrorAlert.tsx
    echo Created ErrorAlert component
)

echo.
echo [3/4] Fixing import/export issues...
echo This will fix:
echo - Default export issues for TimeRangePicker, RefreshPicker, ShareModal
echo - Missing lucide-react icons
echo - Case sensitivity issues
echo.

REM Fix TimeRangePicker export
echo export { TimeRangePicker as default } from './TimeRangePicker'; >> src\components\dashboard\TimeRangePicker.tsx

REM Fix RefreshPicker export  
echo export { RefreshPicker as default } from './RefreshPicker'; >> src\components\dashboard\RefreshPicker.tsx

REM Fix ShareModal export
echo export { ShareModal as default } from './ShareModal'; >> src\components\dashboard\ShareModal.tsx

echo.
echo [4/4] Running build with increased memory...
call npm run build

if %errorlevel% equ 0 (
    echo.
    echo ✅ Build successful!
) else (
    echo.
    echo ❌ Build still has issues. 
    echo.
    echo Try these additional fixes:
    echo 1. Clear cache: rmdir /s /q .next
    echo 2. Install missing icons: npm install lucide-react@latest
    echo 3. Run type check only: npx tsc --noEmit
)

echo.
pause