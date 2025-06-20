/**
 * Public Dashboard Page - View publicly shared dashboards
 * /public/dashboards/:uid route
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Shield, Globe, AlertCircle, Home } from 'lucide-react';
import Link from 'next/link';
import { DashboardViewer } from '@/components/dashboard/DashboardViewer';
import { TimeRangePicker } from '@/components/dashboard/TimeRangePicker';
import { RefreshPicker } from '@/components/dashboard/RefreshPicker';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Dashboard } from '@/types/dashboard';

export default function PublicDashboardPage() {
  const params = useParams();
  const uid = params.uid as string;
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState({ from: 'now-1h', to: 'now' });
  const [refreshInterval, setRefreshInterval] = useState<string>('');

  useEffect(() => {
    fetchPublicDashboard();
  }, [uid]);

  const fetchPublicDashboard = async () => {
    try {
      const response = await fetch(`/api/public/dashboards/${uid}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Dashboard not found or not publicly shared');
        } else if (response.status === 403) {
          setError('This dashboard is not available for public viewing');
        } else {
          setError('Failed to load dashboard');
        }
        return;
      }

      const data = await response.json();
      setDashboard(data);
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Dashboard Unavailable</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Public header */}
      <header className="border-b bg-card">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary rounded flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">M</span>
                </div>
                <span className="font-semibold hidden sm:inline">Manufacturing Analytics</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Public Dashboard</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <TimeRangePicker
                value={timeRange}
                onChange={setTimeRange}
              />
              <RefreshPicker
                value={refreshInterval}
                onChange={setRefreshInterval}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard info bar */}
      <div className="border-b bg-muted/50 px-4 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{dashboard.title}</h1>
            {dashboard.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {dashboard.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Read-only access</span>
          </div>
        </div>
      </div>

      {/* Dashboard viewer */}
      <div className="flex-1 overflow-hidden">
        <DashboardViewer
          dashboard={dashboard}
          timeRange={timeRange}
          refreshInterval={refreshInterval}
          isPublic={true}
          readOnly={true}
        />
      </div>

      {/* Footer */}
      <footer className="border-t bg-card px-4 py-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Shared by {dashboard.createdBy || 'Unknown'} • 
            Last updated {new Date(dashboard.updated).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}