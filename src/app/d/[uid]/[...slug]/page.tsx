/**
 * Dashboard by UID Route - Grafana-compatible dashboard routing
 * /d/{uid}/{slug} route pattern
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardViewer } from '@/components/dashboard/DashboardViewer';
import { useUrlParams } from '@/hooks/useUrlParams';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AlertCircle } from 'lucide-react';

interface Dashboard {
  uid: string;
  title: string;
  panels: any[];
  variables?: any[];
  time?: {
    from: string;
    to: string;
  };
  refresh?: string;
  schemaVersion: number;
  version: number;
}

export default function DashboardByUidPage() {
  const params = useParams();
  const uid = params.uid as string;
  const { params: urlParams } = useUrlParams();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (uid) {
      fetchDashboard(uid);
    }
  }, [uid]);

  const fetchDashboard = async (dashboardUid: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/dashboards/uid/${dashboardUid}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Dashboard not found');
        } else {
          setError('Failed to load dashboard');
        }
        return;
      }

      const data = await response.json();
      setDashboard(data.dashboard);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Apply kiosk mode class to dashboard viewer
  const viewerClassName = urlParams.kiosk ? `kiosk-mode kiosk-mode-${urlParams.kiosk}` : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Dashboard Error</h1>
        <p className="text-muted-foreground">{error || 'Dashboard could not be loaded'}</p>
      </div>
    );
  }

  return (
    <div className={viewerClassName}>
      <DashboardViewer
        dashboard={dashboard}
        timeRange={{
          from: urlParams.from || dashboard.time?.from || 'now-6h',
          to: urlParams.to || dashboard.time?.to || 'now',
        }}
        refresh={urlParams.refresh || dashboard.refresh}
        variables={urlParams.variables}
        editMode={urlParams.editview !== undefined}
        viewPanel={urlParams.viewPanel}
        editPanel={urlParams.editPanel}
        kiosk={urlParams.kiosk}
      />
    </div>
  );
}