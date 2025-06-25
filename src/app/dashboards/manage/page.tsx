'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Eye, Edit, Download } from 'lucide-react';
import Link from 'next/link';
import { SimpleSupersetDashboard } from '@/components/analytics/SimpleSupersetDashboard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Dashboard {
  id: string;
  dashboard_title: string;
  slug: string;
  published: boolean;
  changed_on: string;
  changed_by_name: string;
}

export default function DashboardManagementPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchDashboards();
  }, []);

  const fetchDashboards = async () => {
    try {
      const response = await fetch('/api/superset/dashboards');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboards');
      }
      const data = await response.json();
      setDashboards(data.dashboards || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboards');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
    setPreviewOpen(true);
  };

  const handleExport = async (dashboardId: string) => {
    // In a real implementation, this would call the export endpoint
    console.log('Exporting dashboard:', dashboardId);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your Apache Superset dashboards
          </p>
        </div>
        <Button asChild>
          <a href="http://localhost:8088/dashboard/new" target="_blank" rel="noopener noreferrer">
            <Plus className="mr-2 h-4 w-4" />
            Create Dashboard
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((dashboard) => (
          <Card key={dashboard.id}>
            <CardHeader>
              <CardTitle className="text-lg">{dashboard.dashboard_title}</CardTitle>
              <CardDescription>
                Last modified: {new Date(dashboard.changed_on).toLocaleDateString()}
                {dashboard.changed_by_name && ` by ${dashboard.changed_by_name}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(dashboard)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a 
                    href={`http://localhost:8088/superset/dashboard/${dashboard.id}/`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(dashboard.id)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {dashboards.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No dashboards found</p>
            <Button asChild>
              <a href="http://localhost:8088/dashboard/new" target="_blank" rel="noopener noreferrer">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Dashboard
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedDashboard?.dashboard_title}</DialogTitle>
            <DialogDescription>
              Dashboard preview in embedded mode
            </DialogDescription>
          </DialogHeader>
          {selectedDashboard && (
            <SimpleSupersetDashboard
              dashboardId={selectedDashboard.id}
              height="100%"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}