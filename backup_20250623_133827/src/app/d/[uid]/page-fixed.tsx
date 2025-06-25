/**
 * Analytics Dashboard View - Main dashboard viewer route
 * Route: /d/[uid] - Matches Analytics's dashboard URL pattern
 * Fixed for Next.js 15 async params
 */

'use client';

import React from 'react';

import { use } from 'react';
import { 
  AnalyticsPlatform, 
  createManufacturingDashboard,
  defaultAnalyticsConfig 
} from '@/core/analytics';

interface DashboardPageProps {
  params: Promise<{ uid: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function DashboardPage({ params, searchParams }: DashboardPageProps) {
  // Unwrap the promises using React.use()
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams || Promise.resolve({}));
  
  // Create a sample dashboard based on the UID
  const dashboard = createManufacturingDashboard({
    title: `Dashboard ${resolvedParams.uid}`,
    dataSources: defaultAnalyticsConfig.dataSources,
    variables: defaultAnalyticsConfig.variables,
    timeRange: { 
      from: resolvedSearchParams?.from as string || 'now-1h', 
      to: resolvedSearchParams?.to as string || 'now' 
    }
  });

  // Mock data query handler
  const handleDataQuery = async (targets: any[]): Promise<any> => {
    // Simulate data fetching delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate mock time series data
    const now = Date.now();
    const timePoints = Array.from({ length: 100 }, (_, i) => now - (99 - i) * 60000);
    
    return {
      series: targets.map((target, index) => ({
        name: `Series ${target.refId}`,
        fields: [
          {
            name: 'time',
            type: 'time' as any,
            values: timePoints,
            config: {}
          },
          {
            name: 'value',
            type: 'number' as any,
            values: timePoints.map(() => 
              Math.sin(Date.now() / 10000 + index) * 50 + 50 + Math.random() * 20
            ),
            config: {
              unit: 'percent',
              displayName: target.expr || `Metric ${target.refId}`
            }
          }
        ]
      }))
    };
  };

  return (
    <AnalyticsPlatform
      config={{
        ...defaultAnalyticsConfig,
        appTitle: 'Manufacturing Analytics',
        theme: 'dark',
        featureToggles: {
          ...defaultAnalyticsConfig.featureToggles,
          publicDashboards: true
        }
      }}
      initialDashboard={dashboard}
      onDataQuery={handleDataQuery}
    />
  );
}