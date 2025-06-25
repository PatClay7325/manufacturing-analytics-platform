/**
 * Skeleton Loader Components for Dashboard Elements
 * Implements Phase 1.3: Loading States
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

// Base skeleton component
export function Skeleton({ className = '', animate = true }: SkeletonProps) {
  return (
    <div
      className={`
        bg-gray-200 dark:bg-gray-700 rounded
        ${animate ? 'animate-pulse' : ''}
        ${className}
      `}
    />
  );
}

// KPI Card Skeleton
export function KPICardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

// Chart Skeleton
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between w-8">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
        
        {/* Chart area */}
        <div className="ml-10 h-full relative">
          {/* Bars/Lines */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around h-full px-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton
                key={i}
                className="w-8 mx-1"
                style={{ height: `${Math.random() * 70 + 30}%` }}
              />
            ))}
          </div>
          
          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around mt-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-3 w-12" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Radial Chart Skeleton
export function RadialChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <Skeleton className="h-6 w-48 mb-4 mx-auto" />
      <div className="relative w-full h-64 flex items-center justify-center">
        <div className="relative">
          {/* Outer ring */}
          <Skeleton className="absolute inset-0 w-48 h-48 rounded-full" />
          {/* Inner ring */}
          <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded-full" />
          <Skeleton className="absolute inset-8 w-32 h-32 rounded-full" />
          {/* Center */}
          <div className="absolute inset-12 bg-white dark:bg-gray-800 rounded-full" />
        </div>
      </div>
      {/* Labels */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-3 w-16 mx-auto mb-1" />
            <Skeleton className="h-6 w-12 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Alert Feed Skeleton
export function AlertFeedSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Dashboard Grid Skeleton
export function DashboardGridSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[...Array(8)].map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
      
      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      
      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RadialChartSkeleton />
        <ChartSkeleton height={200} />
      </div>
      
      {/* Alert Feed */}
      <AlertFeedSkeleton />
    </div>
  );
}

// Loading overlay for sections
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}