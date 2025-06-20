'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardEditor from '@/components/dashboard/DashboardEditor';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { dashboardEngine } from '@/core/dashboard/DashboardEngine';
import { Dashboard } from '@/types/dashboard';

export default function EditDashboardPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [params?.id]);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      // For now, create a sample dashboard since we don't have backend yet
      const sampleDashboard = dashboardEngine?.createDashboard('Sample Manufacturing Dashboard');
      if (sampleDashboard) {
        sampleDashboard.uid = params?.id;
        sampleDashboard.panels = [
        {
          id: 1,
          type: 'timeseries',
          title: 'Production Rate',
          gridPos: { x: 0, y: 0, w: 12, h: 8 },
          targets: [],
          fieldConfig: {
            defaults: {
              unit: 'short',
              thresholds: {
                mode: 'absolute',
                steps: [
                  { value: 0, color: 'red' },
                  { value: 50, color: 'yellow' },
                  { value: 80, color: 'green' }
                ]
              }
            },
            overrides: []
          },
          options: {}
        },
        {
          id: 2,
          type: 'gauge',
          title: 'OEE',
          gridPos: { x: 12, y: 0, w: 6, h: 8 },
          targets: [],
          fieldConfig: {
            defaults: {
              unit: 'percent',
              min: 0,
              max: 100,
              thresholds: {
                mode: 'absolute',
                steps: [
                  { value: 0, color: 'red' },
                  { value: 65, color: 'yellow' },
                  { value: 85, color: 'green' }
                ]
              }
            },
            overrides: []
          },
          options: {
            orientation: 'auto',
            showThresholdLabels: true,
            showThresholdMarkers: true
          }
        },
        {
          id: 3,
          type: 'stat',
          title: 'Units Produced',
          gridPos: { x: 18, y: 0, w: 6, h: 4 },
          targets: [],
          fieldConfig: {
            defaults: {
              unit: 'short',
              decimals: 0
            },
            overrides: []
          },
          options: {
            colorMode: 'value',
            graphMode: 'area',
            textMode: 'value'
          }
        },
        {
          id: 4,
          type: 'stat',
          title: 'Quality Rate',
          gridPos: { x: 18, y: 4, w: 6, h: 4 },
          targets: [],
          fieldConfig: {
            defaults: {
              unit: 'percent',
              decimals: 1,
              thresholds: {
                mode: 'absolute',
                steps: [
                  { value: 0, color: 'red' },
                  { value: 95, color: 'yellow' },
                  { value: 99, color: 'green' }
                ]
              }
            },
            overrides: []
          },
          options: {
            colorMode: 'background',
            graphMode: 'none',
            textMode: 'value'
          }
        }
      ];
      
      setDashboard(sampleDashboard);
    }
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedDashboard: Dashboard) => {
    setIsSaving(true);
    try {
      // TODO: Implement actual save to backend
      console.log('Saving dashboard:', updatedDashboard);
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate to view mode
      router?.push(`/dashboards/${updatedDashboard?.uid}`);
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router?.push('/dashboards');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-600 mb-4">{error || 'Dashboard not found'}</p>
          <button
            onClick={() => router?.push('/dashboards')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Back to Dashboards
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardEditor
      dashboard={dashboard}
      onSave={handleSave}
      onCancel={handleCancel}
      isSaving={isSaving}
      isNew={false}
    />
  );
}