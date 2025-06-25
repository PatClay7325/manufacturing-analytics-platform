@echo off
echo ==========================================
echo Fixing Next.js 15 Async Params Warnings
echo ==========================================
echo.

echo These warnings indicate that params and searchParams are now Promises in Next.js 15.
echo While the app still works, we should fix these for future compatibility.
echo.

echo Common patterns to fix:
echo.
echo OLD WAY (causing warnings):
echo   export default function Page({ params, searchParams }) {
echo     const id = params.id;
echo     const query = searchParams.query;
echo   }
echo.
echo NEW WAY (Next.js 15+):
echo   import { use } from 'react';
echo   export default function Page({ params, searchParams }) {
echo     const resolvedParams = use(params);
echo     const resolvedSearchParams = use(searchParams);
echo     const id = resolvedParams.id;
echo     const query = resolvedSearchParams.query;
echo   }
echo.
echo OR use async/await:
echo   export default async function Page({ params, searchParams }) {
echo     const id = (await params).id;
echo     const query = (await searchParams).query;
echo   }
echo.

echo Affected files to update:
echo - src/app/d/[uid]/page.tsx
echo - src/app/dashboards/[id]/page.tsx
echo - Any other dynamic route pages
echo.

echo To suppress these warnings temporarily, you can:
echo 1. Continue using the current code (it still works)
echo 2. Update pages one by one as needed
echo 3. Wait for official Next.js migration guide
echo.
pause