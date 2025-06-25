/**
 * Grafana Dashboard Editor Component
 * 
 * Provides interface for creating and editing Grafana dashboards
 * within the manufacturing analytics platform.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Eye, Settings, Plus, Trash2 } from 'lucide-react';

interface Panel {
  id: number;
  title: string;
  type: string;
  targets: any[];
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

interface Dashboard {
  id?: number;
  uid?: string;
  title: string;
  description: string;
  tags: string[];
  panels: Panel[];
  time: {
    from: string;
    to: string;
  };
  refresh: string;
  templating: {
    list: any[];
  };
}

interface GrafanaDashboardEditorProps {
  dashboardUid?: string;
  onSave?: (dashboard: Dashboard) => void;
  onPreview?: (dashboard: Dashboard) => void;
}

export default function GrafanaDashboardEditor({
  dashboardUid,
  onSave,
  onPreview
}: GrafanaDashboardEditorProps) {
  const [dashboard, setDashboard] = useState<Dashboard>({
    title: 'New Manufacturing Dashboard',
    description: '',
    tags: ['manufacturing', 'analytics'],
    panels: [],
    time: { from: 'now-1h', to: 'now' },
    refresh: '5s',
    templating: { list: [] }
  });

  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load existing dashboard if uid provided
  useEffect(() => {
    if (dashboardUid) {
      loadDashboard(dashboardUid);
    }
  }, [dashboardUid]);

  const loadDashboard = async (uid: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/grafana-proxy/api/dashboards/uid/${uid}`);
      if (response.ok) {
        const data = await response.json();
        setDashboard(data.dashboard);
      } else {
        setError('Failed to load dashboard');
      }
    } catch (err) {
      setError('Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const method = dashboard.uid ? 'PUT' : 'POST';
      const url = dashboard.uid 
        ? `/api/grafana-proxy/api/dashboards/uid/${dashboard.uid}`
        : '/api/grafana-proxy/api/dashboards/db';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dashboard,
          message: `Updated dashboard: ${dashboard.title}`,
          overwrite: true
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess('Dashboard saved successfully!');
        onSave?.(dashboard);
        if (result.uid && !dashboard.uid) {
          setDashboard(prev => ({ ...prev, uid: result.uid }));
        }
      } else {
        setError('Failed to save dashboard');
      }
    } catch (err) {
      setError('Error saving dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    onPreview?.(dashboard);
  };

  const addPanel = () => {
    const newPanel: Panel = {
      id: Date.now(),
      title: 'New Panel',
      type: 'timeseries',
      targets: [],
      gridPos: { x: 0, y: 0, w: 12, h: 8 }
    };

    setDashboard(prev => ({
      ...prev,
      panels: [...prev.panels, newPanel]
    }));
  };

  const removePanel = (panelId: number) => {
    setDashboard(prev => ({
      ...prev,
      panels: prev.panels.filter(panel => panel.id !== panelId)
    }));
  };

  const updatePanel = (panelId: number, updates: Partial<Panel>) => {
    setDashboard(prev => ({
      ...prev,
      panels: prev.panels.map(panel => 
        panel.id === panelId ? { ...panel, ...updates } : panel
      )
    }));
  };

  const handleInputChange = (field: keyof Dashboard, value: any) => {
    setDashboard(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {dashboardUid ? 'Edit Dashboard' : 'Create Dashboard'}
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={handlePreview}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Dashboard
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="panels">Panels</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={dashboard.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter dashboard title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={dashboard.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter dashboard description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <Input
                  value={dashboard.tags.join(', ')}
                  onChange={(e) => handleInputChange('tags', e.target.value.split(', ').filter(Boolean))}
                  placeholder="manufacturing, analytics, oee"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="panels" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Dashboard Panels</h3>
            <Button onClick={addPanel} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Panel
            </Button>
          </div>

          {dashboard.panels.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No panels added yet</p>
                <Button onClick={addPanel}>Add Your First Panel</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {dashboard.panels.map((panel) => (
                <Card key={panel.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">{panel.title}</CardTitle>
                    <Button
                      onClick={() => removePanel(panel.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Panel Title</label>
                        <Input
                          value={panel.title}
                          onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Panel Type</label>
                        <select
                          value={panel.type}
                          onChange={(e) => updatePanel(panel.id, { type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="timeseries">Time Series</option>
                          <option value="stat">Stat</option>
                          <option value="gauge">Gauge</option>
                          <option value="table">Table</option>
                          <option value="logs">Logs</option>
                          <option value="jaeger">Jaeger</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Variables allow you to create dynamic dashboards that can filter data.
              </p>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Variable
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">From</label>
                  <Input
                    value={dashboard.time.from}
                    onChange={(e) => handleInputChange('time', { ...dashboard.time, from: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">To</label>
                  <Input
                    value={dashboard.time.to}
                    onChange={(e) => handleInputChange('time', { ...dashboard.time, to: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Auto Refresh</label>
                <select
                  value={dashboard.refresh}
                  onChange={(e) => handleInputChange('refresh', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Off</option>
                  <option value="5s">5 seconds</option>
                  <option value="10s">10 seconds</option>
                  <option value="30s">30 seconds</option>
                  <option value="1m">1 minute</option>
                  <option value="5m">5 minutes</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}