'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getPanelConfig } from '@/config/dashboard.config';
import { TimeSeriesChart } from '@/components/charts/ManufacturingCharts';
import { TablePanel } from '@/components/charts/ManufacturingCharts';
import StatPanel from '@/components/panels/StatPanel';
import { PieChart } from '@/components/charts/ManufacturingCharts';
import { HeatmapChart } from '@/components/charts/ManufacturingCharts';
import { GaugeChart } from '@/components/charts/ManufacturingCharts';

interface DashboardPanelProps {
  panelId?: string;
  timeRange?: { from?: string; to?: string };
  refreshInterval?: number;
  variables?: Record<string, string>;
  className?: string;
  height?: number;
}

export function DashboardPanel({
  panelId,
  timeRange,
  refreshInterval,
  variables = {},
  className = '',
  height = 400
}: DashboardPanelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const panelConfig = getPanelConfig(panelId);

  const fetchData = async () => {
    if (!panelConfig) {
      setError('Panel configuration not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Construct query parameters based on panel configuration
      const queryParams = new URLSearchParams({
        ...panelConfig?.query,
        from: timeRange.from,
        to: timeRange.to,
        ...variables
      });

      const response = await fetch(`/api/metrics/query?${queryParams}`);
      
      if (!response?.ok) {
        throw new Error(`Failed to fetch data: ${response?.statusText}`);
      }

      const result = await response?.json();
      setData(result);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err?.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and refresh interval
  useEffect(() => {
    fetchData();

    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [panelId, timeRange?.from, timeRange?.to, refreshInterval]);

  const renderPanel = () => {
    if (!panelConfig) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Panel configuration not found</p>
          </div>
        </div>
      );
    }

    if (loading && !data) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-primary-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">Loading data...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    // Render based on panel type
    switch (panelConfig?.type) {
      case 'timeseries':
        return (
          <TimeSeriesChart 
            data={(data?.data || [])} 
            lines={data?.lines || ['value']} 
          />
        );
      
      case 'gauge':
        return (
          <GaugeChart 
            value={data?.value || 0} 
            max={data?.max || 100}
            thresholds={data?.thresholds}
          />
        );
      
      case 'stat':
        return (
          <StatPanel 
            data={data ? [{
              fields: [{
                type: 'number',
                values: [data?.value || 0]
              }]
            }] : []}
            options={{
              reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
              orientation: 'auto',
              textMode: 'auto',
              colorMode: 'value',
              graphMode: 'none',
              justifyMode: 'auto'
            }}
            fieldConfig={{
              defaults: {
                displayName: panelConfig.title,
                unit: data.unit
              }
            }}
            width={400}
            height={300}
          />
        );
      
      case 'table':
        return (
          <TablePanel 
            data={(data?.rows || [])}
          />
        );
      
      case 'piechart':
        return (
          <PieChart 
            data={(data?.data || [])}
          />
        );
      
      case 'heatmap':
        return (
          <HeatmapChart 
            data={(data?.data || [])}
          />
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
              Unsupported panel type: {panelConfig?.type}
            </p>
          </div>
        );
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`} style={{ height }}>
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          {panelConfig?.title || 'Panel'}
        </h3>
        <div className="flex items-center space-x-2">
          {loading && (
            <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
          )}
          <span className="text-xs text-gray-500">
            {lastUpdate?.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Panel Content */}
      <div className="p-4 h-[calc(100%-3.5rem)]">
        {renderPanel()}
      </div>
    </div>
  );
}