/**
 * Initialize Plugins - Register all built-in plugins
 * This is the actual working implementation
 */

import React from 'react';
import { pluginRegistry, PanelPlugin } from './SimplePluginSystem';
import { SimpleTimeSeriesPanel } from '@/components/panels/SimpleTimeSeriesPanel';
import StatPanel from '@/components/panels/StatPanel';
import TablePanel from '@/components/panels/TablePanel';

// Import existing components if they exist, otherwise use placeholders
const createPlaceholderComponent = (name: string) => {
  return function PlaceholderPanel({ data, options }: any) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">{name} Panel</h3>
          <p className="text-muted-foreground">Panel implementation pending</p>
          {data && <p className="text-sm mt-2">Data points: {Array.isArray(data) ? data.length : 0}</p>}
        </div>
      </div>
    );
  };
};

export function initializePlugins(): void {
  console.log('Initializing plugins...');
  console.log('SimpleTimeSeriesPanel available:', !!SimpleTimeSeriesPanel);

  // Register Time Series Panel
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
  try {
    pluginRegistry.registerPanel(timeSeriesPlugin);
    console.log('Time series panel registered successfully');
  } catch (error) {
    console.error('Failed to register time series panel:', error);
  }

  // Register Stat Panel
  const statPlugin: PanelPlugin = {
    meta: {
      id: 'stat',
      name: 'Stat',
      type: 'panel',
      description: 'Display single statistics with optional sparklines',
      version: '1.0.0',
      author: 'Manufacturing Analytics',
    },
    component: StatPanel || createPlaceholderComponent('Stat'),
    defaults: {
      reduceOptions: {
        calcs: ['lastNotNull'],
      },
    },
  };
  pluginRegistry.registerPanel(statPlugin);

  // Register Table Panel
  const tablePlugin: PanelPlugin = {
    meta: {
      id: 'table',
      name: 'Table',
      type: 'panel',
      description: 'Display data in a table format',
      version: '1.0.0',
      author: 'Manufacturing Analytics',
    },
    component: TablePanel || createPlaceholderComponent('Table'),
    defaults: {
      showHeader: true,
      sortable: true,
    },
  };
  pluginRegistry.registerPanel(tablePlugin);

  // Register Gauge Panel
  const gaugePlugin: PanelPlugin = {
    meta: {
      id: 'gauge',
      name: 'Gauge',
      type: 'panel',
      description: 'Display values on a gauge',
      version: '1.0.0',
      author: 'Manufacturing Analytics',
    },
    component: createPlaceholderComponent('Gauge'),
    defaults: {
      showThresholdLabels: false,
      showThresholdMarkers: true,
    },
  };
  pluginRegistry.registerPanel(gaugePlugin);

  // Register Text Panel
  const textPlugin: PanelPlugin = {
    meta: {
      id: 'text',
      name: 'Text',
      type: 'panel',
      description: 'Display markdown or HTML',
      version: '1.0.0',
      author: 'Manufacturing Analytics',
    },
    component: createPlaceholderComponent('Text'),
    defaults: {
      mode: 'markdown',
      content: '# Text Panel\n\nAdd your content here...',
    },
  };
  pluginRegistry.registerPanel(textPlugin);

  console.log(`Initialized ${pluginRegistry.getPanels().length} panel plugins`);
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlugins);
  } else {
    initializePlugins();
  }
}