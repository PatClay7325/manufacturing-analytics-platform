'use client';

import React from 'react';
import { SimpleSupersetDashboard } from '@/components/analytics/SimpleSupersetDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsPage() {
  // Example dashboard IDs - replace with your actual dashboard IDs
  const dashboards = {
    production: '1', // Replace with actual dashboard ID
    quality: '2',    // Replace with actual dashboard ID
    equipment: '3',  // Replace with actual dashboard ID
    overview: '4'    // Replace with actual dashboard ID
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manufacturing Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Real-time insights and KPIs from your manufacturing operations
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Manufacturing Overview</CardTitle>
                <CardDescription>
                  High-level metrics across all production lines
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleSupersetDashboard
                  dashboardId={dashboards.overview}
                  height={800}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="production">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Production Metrics</CardTitle>
                <CardDescription>
                  Real-time production volume, efficiency, and throughput
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleSupersetDashboard
                  dashboardId={dashboards.production}
                  height={800}
                  filters={{
                    time_range: 'Last 24 hours'
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Analytics</CardTitle>
                <CardDescription>
                  Defect rates, quality trends, and inspection results
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleSupersetDashboard
                  dashboardId={dashboards.quality}
                  height={800}
                  filters={{
                    time_range: 'Last 7 days'
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipment">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Performance</CardTitle>
                <CardDescription>
                  OEE, availability, and maintenance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleSupersetDashboard
                  dashboardId={dashboards.equipment}
                  height={800}
                  filters={{
                    time_range: 'Last 24 hours'
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}