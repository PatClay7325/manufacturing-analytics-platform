'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dashboard } from '@/types/dashboard';
import DashboardViewerV2 from '@/components/dashboard/DashboardViewerV2';
import DashboardEditorV2 from '@/components/dashboard/DashboardEditorV2';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ArrowLeftIcon, PencilIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function ViewDashboardPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dashboardId, setDashboardId] = useState<string>('');

  useEffect(() => {
    params.then(p => {
      setDashboardId(p.id);
      loadDashboard(p.id);
    });
  }, [params]);

  const loadDashboard = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // For now, create a mock dashboard with variables
      const mockDashboard: Dashboard = {
        id: id,
        uid: id,
        title: 'Manufacturing KPIs Dashboard',
        description: 'Real-time monitoring of key manufacturing metrics',
        tags: ['manufacturing', 'production', 'oee'],
        panels: [
          {
            id: 1,
            title: 'OEE - $equipment',
            type: 'gauge',
            gridPos: { x: 0, y: 0, w: 6, h: 8 },
            targets: [
              {
                refId: 'A',
                metric: 'oee',
                query: 'SELECT oee FROM metrics WHERE equipment = "$equipment" AND time >= $__from AND time <= $__to'
              }
            ],
            fieldConfig: {
              defaults: {
                min: 0,
                max: 100,
                unit: 'percent',
                thresholds: {
                  mode: 'absolute',
                  steps: [
                    { value: 0, color: 'red' },
                    { value: 60, color: 'yellow' },
                    { value: 85, color: 'green' }
                  ]
                }
              },
              overrides: []
            },
            options: {
              showThresholdLabels: true,
              showThresholdMarkers: true
            },
            transparent: false,
            links: [],
            transformations: []
          },
          {
            id: 2,
            title: 'Production Trend - $equipment',
            type: 'timeseries',
            gridPos: { x: 6, y: 0, w: 18, h: 8 },
            targets: [
              {
                refId: 'A',
                metric: 'production_rate',
                query: 'SELECT rate FROM production WHERE equipment = "$equipment" AND time >= $__from AND time <= $__to'
              }
            ],
            fieldConfig: {
              defaults: {
                custom: {
                  lineWidth: 2,
                  fillOpacity: 10,
                  spanNulls: true
                }
              },
              overrides: []
            },
            options: {
              legend: {
                displayMode: 'list',
                placement: 'bottom'
              }
            },
            transparent: false,
            links: [],
            transformations: []
          },
          {
            id: 3,
            title: 'Quality Metrics by $line',
            type: 'barchart',
            gridPos: { x: 0, y: 8, w: 12, h: 8 },
            targets: [
              {
                refId: 'A',
                query: 'SELECT quality_score FROM quality WHERE line = "$line" GROUP BY product'
              }
            ],
            fieldConfig: {
              defaults: {},
              overrides: []
            },
            options: {},
            transparent: false,
            links: [],
            transformations: []
          },
          {
            id: 4,
            title: 'Equipment Status',
            type: 'table',
            gridPos: { x: 12, y: 8, w: 12, h: 8 },
            targets: [
              {
                refId: 'A',
                query: 'SELECT equipment, status, uptime FROM equipment_status WHERE line = "$line"'
              }
            ],
            fieldConfig: {
              defaults: {},
              overrides: []
            },
            options: {
              showHeader: true
            },
            transparent: false,
            links: [],
            transformations: []
          }
        ],
        templating: {
          list: [
            {
              name: 'equipment',
              type: 'custom',
              label: 'Equipment',
              query: 'Assembly Line 1, Assembly Line 2, Assembly Line 3, Packaging Unit A, Packaging Unit B',
              current: {
                text: 'Assembly Line 1',
                value: 'Assembly Line 1',
                selected: true
              },
              options: [],
              multi: false,
              includeAll: true,
              allValue: '*',
              hide: 0
            },
            {
              name: 'line',
              type: 'custom',
              label: 'Production Line',
              query: 'Line 1, Line 2, Line 3',
              current: {
                text: 'Line 1',
                value: 'Line 1',
                selected: true
              },
              options: [],
              multi: false,
              hide: 0
            },
            {
              name: 'interval',
              type: 'interval',
              label: 'Interval',
              query: '1m,5m,10m,30m,1h',
              current: {
                text: '5m',
                value: '5m',
                selected: true
              },
              options: [],
              hide: 0
            }
          ]
        },
        annotations: [],
        links: [],
        time: {
          from: 'now-6h',
          to: 'now',
          raw: {
            from: 'now-6h',
            to: 'now'
          }
        },
        timepicker: {
          refresh_intervals: ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'],
          time_options: ['5m', '15m', '1h', '6h', '12h', '24h', '2d', '7d', '30d']
        },
        refresh: '30s',
        schemaVersion: 30,
        version: 1,
        timezone: 'browser',
        fiscalYearStartMonth: 0,
        liveNow: false,
        weekStart: 'monday',
        style: 'dark',
        editable: true,
        hideControls: false,
        graphTooltip: 0,
        preload: false,
        meta: {
          canEdit: true,
          canSave: true,
          canStar: true
        }
      };
      
      setDashboard(mockDashboard);
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedDashboard: Dashboard) => {
    try {
      setIsSaving(true);
      
      // TODO: Implement actual save logic
      console.log('Saving dashboard:', updatedDashboard);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDashboard(updatedDashboard);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save dashboard:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg shadow p-8 max-w-md w-full text-center">
          <p className="text-red-400 mb-4">{error || 'Dashboard not found'}</p>
          <Link
            href="/dashboards"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboards
          </Link>
        </div>
      </div>
    );
  }

  // Edit mode
  if (isEditing) {
    return (
      <DashboardEditorV2
        dashboard={dashboard}
        onSave={handleSave}
        onCancel={handleCancelEdit}
        isSaving={isSaving}
        isNew={false}
      />
    );
  }

  // View mode
  return (
    <div className="min-h-screen bg-gray-900">
      <DashboardViewerV2
        dashboard={dashboard}
        onEdit={handleEdit}
      />
    </div>
  );
}
