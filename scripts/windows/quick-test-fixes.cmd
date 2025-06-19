@echo off
echo === Quick Playwright Test Fixes ===
echo.

echo Applying immediate fixes to reduce test failures...
echo.

REM Fix 1: Update AlertBadge to include data-testid
echo Fixing AlertBadge component...
(
echo import React from 'react';
echo.
echo interface AlertBadgeProps {
echo   type: 'severity' ^| 'status';
echo   value: string;
echo   showLabel?: boolean;
echo   className?: string;
echo }
echo.
echo export default function AlertBadge^({ type, value, showLabel = true, className = '' }: AlertBadgeProps^) {
echo   const getColors = ^(^) =^> {
echo     if ^(type === 'severity'^) {
echo       switch ^(value^) {
echo         case 'critical': return 'bg-red-100 text-red-800';
echo         case 'high': return 'bg-orange-100 text-orange-800';
echo         case 'medium': return 'bg-yellow-100 text-yellow-800';
echo         case 'low': return 'bg-blue-100 text-blue-800';
echo         case 'info': return 'bg-gray-100 text-gray-800';
echo         default: return 'bg-gray-100 text-gray-800';
echo       }
echo     } else {
echo       switch ^(value^) {
echo         case 'active': return 'bg-red-100 text-red-800';
echo         case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
echo         case 'resolved': return 'bg-green-100 text-green-800';
echo         case 'muted': return 'bg-gray-100 text-gray-800';
echo         default: return 'bg-gray-100 text-gray-800';
echo       }
echo     }
echo   };
echo.
echo   return ^(
echo     ^<span 
echo       data-testid={`alert-${type}`}
echo       className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getColors^(^)} ${className}`}
echo     ^>
echo       {showLabel && value}
echo     ^</span^>
echo   ^);
echo }
) > src/components/alerts/AlertBadge.tsx

echo AlertBadge fixed!
echo.

REM Fix 2: Update alert details page to show details
echo Fixing alert details page...
(
echo 'use client';
echo.
echo import { useParams, useRouter } from 'next/navigation';
echo import { useState, useEffect } from 'react';
echo import Link from 'next/link';
echo import alertService from '@/services/alertService';
echo import { Alert } from '@/models/alert';
echo import AlertBadge from '@/components/alerts/AlertBadge';
echo import LoadingSpinner from '@/components/common/LoadingSpinner';
echo import ErrorAlert from '@/components/common/ErrorAlert';
echo.
echo export default function AlertDetailsPage^(^) {
echo   const params = useParams^(^);
echo   const router = useRouter^(^);
echo   const id = params.id as string;
echo   const [alert, setAlert] = useState^<Alert ^| null^>^(null^);
echo   const [loading, setLoading] = useState^(true^);
echo   const [error, setError] = useState^<string ^| null^>^(null^);
echo.
echo   useEffect^(^(^) =^> {
echo     fetchAlert^(^);
echo   }, [id]^);
echo.
echo   const fetchAlert = async ^(^) =^> {
echo     try {
echo       const data = await alertService.getAlert^(id^);
echo       setAlert^(data^);
echo     } catch ^(err^) {
echo       setError^('Failed to load alert details'^);
echo     } finally {
echo       setLoading^(false^);
echo     }
echo   };
echo.
echo   if ^(loading^) return ^<LoadingSpinner /^>;
echo   if ^(error^) return ^<ErrorAlert message={error} /^>;
echo   if ^(!alert^) return ^<ErrorAlert message="Alert not found" /^>;
echo.
echo   return ^(
echo     ^<div className="min-h-screen bg-gray-50"^>
echo       ^<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"^>
echo         ^<div className="mb-6"^>
echo           ^<Link href="/alerts" className="text-blue-600 hover:text-blue-800"^>
echo             ← Back to Alerts
echo           ^</Link^>
echo         ^</div^>
echo.
echo         ^<div className="bg-white shadow rounded-lg" data-testid="alert-details"^>
echo           ^<div className="p-6"^>
echo             ^<div className="flex justify-between items-start mb-6"^>
echo               ^<h1 className="text-2xl font-bold text-gray-900"^>{alert.title}^</h1^>
echo               ^<div className="flex space-x-2"^>
echo                 ^<AlertBadge type="severity" value={alert.severity} /^>
echo                 ^<AlertBadge type="status" value={alert.status} /^>
echo               ^</div^>
echo             ^</div^>
echo.
echo             ^<div className="grid grid-cols-1 md:grid-cols-2 gap-6"^>
echo               ^<div^>
echo                 ^<h3 className="text-sm font-medium text-gray-500"^>Equipment^</h3^>
echo                 ^<p className="mt-1 text-sm text-gray-900" data-testid="alert-equipment"^>
echo                   {alert.sourceName ^|^| 'Unknown'}
echo                 ^</p^>
echo               ^</div^>
echo.
echo               ^<div^>
echo                 ^<h3 className="text-sm font-medium text-gray-500"^>Timestamp^</h3^>
echo                 ^<p className="mt-1 text-sm text-gray-900" data-testid="alert-timestamp"^>
echo                   {new Date^(alert.createdAt^).toLocaleString^(^)}
echo                 ^</p^>
echo               ^</div^>
echo.
echo               ^<div className="md:col-span-2"^>
echo                 ^<h3 className="text-sm font-medium text-gray-500"^>Description^</h3^>
echo                 ^<p className="mt-1 text-sm text-gray-900" data-testid="alert-description"^>
echo                   {alert.description}
echo                 ^</p^>
echo               ^</div^>
echo             ^</div^>
echo           ^</div^>
echo         ^</div^>
echo       ^</div^>
echo     ^</div^>
echo   ^);
echo }
) > src/app/alerts/[id]/page.tsx

echo Alert details page fixed!
echo.

echo === All quick fixes applied! ===
echo.
echo Run tests again with: npm run test:e2e
echo.
pause