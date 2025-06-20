/**
 * Embed Dashboard Page - Embeddable version of dashboards
 * /embed/:uid route - for iframe embedding
 */

'use client';

import React from 'react';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { DashboardViewer } from '@/components/dashboard/DashboardViewer';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AlertCircle } from 'lucide-react';
import { Dashboard } from '@/types/dashboard';

export default function EmbedDashboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const uid = params.uid as string;
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get embed parameters
  const theme = searchParams.get('theme') || 'light';
  const hidePanelTitles = searchParams.get('hidePanelTitles') === 'true';
  const hideTimeControls = searchParams.get('hideTimeControls') === 'true';
  const from = searchParams.get('from') || 'now-1h';
  const to = searchParams.get('to') || 'now';
  const refresh = searchParams.get('refresh') || '';
  const panelId = searchParams.get('panelId');

  useEffect(() => {
    // Apply theme
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Add embed class for custom styling
    document.body.classList.add('embed-mode');
    
    fetchDashboard();

    return () => {
      document.body.classList.remove('embed-mode');
    };
  }, [uid, theme]);

  const fetchDashboard = async () => {
    try {
      // Try public endpoint first
      let response = await fetch(`/api/public/dashboards/${uid}`);
      
      // If not public, try authenticated endpoint
      if (!response.ok && response.status === 403) {
        response = await fetch(`/api/dashboards/${uid}`);
      }

      if (!response.ok) {
        setError('Dashboard not found or not accessible');
        return;
      }

      const data = await response.json();
      
      // If specific panel requested, filter dashboard
      if (panelId) {
        const panel = data.panels?.find((p: any) => p.id === parseInt(panelId));
        if (panel) {
          data.panels = [panel];
        }
      }

      setDashboard(data);
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="h-screen overflow-hidden bg-background">
      <style jsx global>{`
        .embed-mode {
          margin: 0;
          padding: 0;
        }
        
        .embed-mode .panel-header {
          display: ${hidePanelTitles ? 'none' : 'block'};
        }
        
        .embed-mode .time-controls {
          display: ${hideTimeControls ? 'none' : 'flex'};
        }
        
        /* Remove unnecessary UI elements in embed mode */
        .embed-mode .dashboard-header,
        .embed-mode .dashboard-toolbar,
        .embed-mode .panel-menu {
          display: none;
        }
        
        /* Adjust spacing for embed */
        .embed-mode .dashboard-grid {
          padding: 8px;
        }
        
        .embed-mode .panel-container {
          margin: 4px;
        }
      `}</style>

      <DashboardViewer
        dashboard={dashboard}
        timeRange={{ from, to }}
        refreshInterval={refresh}
        isEmbedded={true}
        readOnly={true}
        hidePanelTitles={hidePanelTitles}
        hideTimeControls={hideTimeControls}
      />
    </div>
  );
}