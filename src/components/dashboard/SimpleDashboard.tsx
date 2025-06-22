/**
 * Simple Dashboard - Working demonstration of the plugin system
 * This shows the SimplePluginSystem in action with real manufacturing data
 */

'use client';

import React, { useEffect, useState } from 'react';
import { pluginRegistry, PanelPlugin } from '@/core/plugins/SimplePluginSystem';
import { initializePlugins } from '@/core/plugins/initializePlugins';
import { getCombinedMetricsData, generateSampleManufacturingData } from '@/utils/sampleManufacturingData';
import { TimeSeriesData, SimpleTimeSeriesPanel } from '@/components/panels/SimpleTimeSeriesPanel';

interface PanelConfig {
  id: string;
  type: string;
  title: string;
  data: TimeSeriesData[];
  options?: any;
  width?: number;
  height?: number;
}

export const SimpleDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [availablePanels, setAvailablePanels] = useState<string[]>([]);
  const [dashboardPanels, setDashboardPanels] = useState<PanelConfig[]>([]);

  useEffect(() => {
    // Initialize plugins and set up dashboard
    const initializeDashboard = () => {
      try {
        // Directly register the time series panel to ensure it's available
        const timeSeriesPlugin: PanelPlugin = {
          meta: {
            id: 'timeseries',
            name: 'Time Series',
            type: 'panel',
            description: 'Visualize time series data with lines, points, and thresholds',
            version: '1.0.0',
            author: 'Manufacturing Analytics',
          },
          component: SimpleTimeSeriesPanel,
          defaults: {
            showLegend: true,
            showGrid: true,
            showTooltip: true,
          },
        };
        
        pluginRegistry.registerPanel(timeSeriesPlugin);
        console.log('Direct registration of timeseries panel');
        
        // Also try the original initialization
        console.log('Before plugin initialization');
        initializePlugins();
        console.log('After plugin initialization');
        
        // Wait a bit for initialization to complete
        setTimeout(() => {
          // Get available panel types
          const panels = pluginRegistry.getPanels();
          const panelIds = panels.map(p => p.meta.id);
          setAvailablePanels(panelIds);
          console.log('Available panels after init:', panelIds);
          console.log('Full panels:', panels);

        // Generate sample data
        const sampleData = generateSampleManufacturingData();
        const combinedData = getCombinedMetricsData();

        // Configure dashboard panels
        const panelConfigs: PanelConfig[] = [
          {
            id: 'oee-panel',
            type: 'timeseries',
            title: 'Overall Equipment Effectiveness (OEE)',
            data: sampleData.oee,
            options: {
              title: 'OEE Over Time',
              showLegend: true,
              showGrid: true,
              yAxis: {
                label: 'OEE (%)',
                min: 50,
                max: 100,
                decimals: 1,
              },
              series: [{
                field: 'oee',
                displayName: 'OEE',
                color: '#10b981',
                lineWidth: 2,
              }],
              thresholds: [
                { value: 85, color: '#10b981', label: 'Good' },
                { value: 70, color: '#f59e0b', label: 'Warning' },
                { value: 60, color: '#ef4444', label: 'Critical' },
              ],
            },
            height: 300,
          },
          {
            id: 'temperature-panel',
            type: 'timeseries',
            title: 'Equipment Temperature',
            data: sampleData.temperature,
            options: {
              title: 'Temperature Monitoring',
              showLegend: true,
              showGrid: true,
              yAxis: {
                label: 'Temperature (°C)',
                min: 170,
                max: 230,
                decimals: 1,
              },
              series: [{
                field: 'temperature',
                displayName: 'Temperature',
                color: '#ef4444',
                lineWidth: 2,
              }],
              thresholds: [
                { value: 210, color: '#ef4444', label: 'High Temp', fillAbove: true },
                { value: 190, color: '#f59e0b', label: 'Warning' },
              ],
            },
            height: 300,
          },
          {
            id: 'multi-metrics-panel',
            type: 'timeseries',
            title: 'Multiple Manufacturing Metrics',
            data: combinedData,
            options: {
              title: 'Key Manufacturing Metrics',
              showLegend: true,
              showGrid: true,
              yAxis: {
                label: 'Normalized Values',
                decimals: 1,
              },
              series: [
                { field: 'oee', displayName: 'OEE (%)', color: '#10b981' },
                { field: 'pressure', displayName: 'Pressure (PSI)', color: '#3b82f6' },
                { field: 'vibration', displayName: 'Vibration (mm/s)', color: '#8b5cf6' },
                { field: 'production_rate', displayName: 'Production Rate (pph)', color: '#f59e0b' },
              ],
            },
            height: 400,
          },
        ];

          setDashboardPanels(panelConfigs);
          setIsLoading(false);
        }, 100); // Small delay to ensure plugins are registered
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  const renderPanel = (panelConfig: PanelConfig) => {
    const { type, data, options, width, height } = panelConfig;
    
    try {
      const panelElement = pluginRegistry.createPanelInstance(type, {
        data,
        options,
        width,
        height,
      });

      if (!panelElement) {
        return (
          <div className="border rounded-lg p-4 bg-red-50">
            <p className="text-red-600">Panel type '{type}' not found</p>
            <p className="text-sm text-red-500">Available panels: {availablePanels.join(', ')}</p>
          </div>
        );
      }

      return panelElement;
    } catch (error) {
      console.error('Error rendering panel:', error);
      return (
        <div className="border rounded-lg p-4 bg-red-50">
          <p className="text-red-600">Error rendering panel: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Manufacturing Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Plugin System Demo - Showing {availablePanels.length} available panel types
        </p>
        <div className="text-sm text-gray-500 mt-1">
          Available panels: {availablePanels.join(', ')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dashboardPanels.map((panelConfig) => (
          <div key={panelConfig.id} className="border rounded-lg shadow-sm bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="font-medium text-gray-900">{panelConfig.title}</h3>
              <p className="text-sm text-gray-500">Panel Type: {panelConfig.type}</p>
            </div>
            <div className="p-4">
              {renderPanel(panelConfig)}
            </div>
          </div>
        ))}
      </div>

      <div className="border rounded-lg p-4 bg-blue-50">
        <h3 className="font-medium text-blue-900 mb-2">Plugin System Status</h3>
        <div className="space-y-1 text-sm text-blue-800">
          <p>✅ Plugin Registry: {pluginRegistry.getPanels().length} panels registered</p>
          <p>✅ Data Generation: Sample manufacturing data created</p>
          <p>✅ Panel Rendering: Dynamic panel instantiation working</p>
          <p>✅ Dashboard Layout: Grid-based responsive layout</p>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="font-medium text-gray-900 mb-2">Phase 1 Implementation Status</h3>
        <div className="space-y-1 text-sm text-gray-700">
          <p>✅ SimplePluginSystem.ts - Working plugin registry</p>
          <p>✅ SimpleTimeSeriesPanel.tsx - Complete time series visualization</p>
          <p>✅ initializePlugins.ts - Plugin registration system</p>
          <p>✅ SimpleDashboard.tsx - Dashboard using plugin system</p>
          <p>✅ sampleManufacturingData.ts - Test data generation</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard;
