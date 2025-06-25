'use client';

import React, { useState } from 'react';
import { SimpleSupersetDashboard } from '@/components/analytics/SimpleSupersetDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AnalyticsDemoPage() {
  const [dashboardId, setDashboardId] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);

  const handleShowDashboard = () => {
    if (dashboardId) {
      setShowDashboard(true);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard Demo</h1>
        <p className="text-muted-foreground mt-2">
          Test your Apache Superset dashboard integration
        </p>
      </div>

      {!showDashboard ? (
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Setup</CardTitle>
            <CardDescription>
              Follow these steps to display your manufacturing dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>First Time Setup:</strong> You need to create a dashboard in Superset first.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Step 1: Create Sample Data</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Run this command to create sample manufacturing data:
                </p>
                <code className="block p-2 bg-muted rounded text-sm">
                  setup-sample-dashboards.cmd
                </code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Step 2: Create Dashboard in Superset</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Open <a href="http://localhost:8088" target="_blank" rel="noopener noreferrer" className="text-primary underline">Superset</a> (admin/admin)</li>
                  <li>Go to Data → Datasets → + Dataset</li>
                  <li>Select "Manufacturing TimescaleDB" and add the views</li>
                  <li>Create charts from the datasets</li>
                  <li>Create a new dashboard and add your charts</li>
                  <li>Note the dashboard ID from the URL</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Step 3: Enter Dashboard ID</h3>
                <div className="space-y-2">
                  <Label htmlFor="dashboardId">Dashboard ID</Label>
                  <Input
                    id="dashboardId"
                    type="text"
                    placeholder="e.g., 1"
                    value={dashboardId}
                    onChange={(e) => setDashboardId(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Find this in the Superset URL: /superset/dashboard/<strong>[ID]</strong>/
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleShowDashboard}
                disabled={!dashboardId}
                className="w-full"
              >
                Show Dashboard
              </Button>
            </div>

            <Alert variant="default" className="border-blue-200">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <strong>Tip:</strong> If you see a "Request Header Fields Too Large" error, 
                open this page in incognito/private mode or clear your cookies.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Manufacturing Dashboard</h2>
            <Button
              variant="outline"
              onClick={() => setShowDashboard(false)}
            >
              Change Dashboard
            </Button>
          </div>

          <SimpleSupersetDashboard
            dashboardId={dashboardId}
            title="Manufacturing Analytics"
            height={800}
          />

          <Card>
            <CardHeader>
              <CardTitle>Integration Successful!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Your dashboard is now embedded in the Next.js application. 
                To use this in your app, add this component:
              </p>
              <pre className="p-4 bg-muted rounded overflow-x-auto">
                <code>{`<SimpleSupersetDashboard
  dashboardId="${dashboardId}"
  title="Your Dashboard Title"
  height={800}
/>`}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}