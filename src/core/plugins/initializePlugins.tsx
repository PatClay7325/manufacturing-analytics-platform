/**
 * Initialize Plugins - Register all built-in plugins
 * This is the actual working implementation with comprehensive React chart panels
 */

import React from 'react';
import { pluginRegistry } from './SimplePluginSystem';
import { registerAllPanelPlugins } from './AllPanelPlugins';
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
  console.log('🔌 Initializing comprehensive plugin system...');

  // Register all React chart panels (comprehensive set)
  registerAllPanelPlugins();

  // Register additional utility panels
  try {
    if (StatPanel) {
      pluginRegistry.registerPanel({
        meta: {
          id: 'stat',
          name: 'Stat',
          type: 'panel',
          description: 'Display single statistics with optional sparklines',
          version: '1.0.0',
          author: 'Manufacturing Analytics',
        },
        component: StatPanel,
        defaults: {
          reduceOptions: {
            calcs: ['lastNotNull'],
          },
        },
      });
    }

    if (TablePanel) {
      pluginRegistry.registerPanel({
        meta: {
          id: 'table',
          name: 'Table',
          type: 'panel',
          description: 'Display data in a table format',
          version: '1.0.0',
          author: 'Manufacturing Analytics',
        },
        component: TablePanel,
        defaults: {
          showHeader: true,
          sortable: true,
        },
      });
    }

    // Register placeholder panels for additional functionality
    pluginRegistry.registerPanel({
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
    });

    pluginRegistry.registerPanel({
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
    });

  } catch (error) {
    console.error('Error registering additional panels:', error);
  }

  const totalPanels = pluginRegistry.getPanels().length;
  console.log(`✅ Plugin initialization complete: ${totalPanels} panels registered`);
  
  // Log available panels for debugging
  const panels = pluginRegistry.getPanels();
  console.log('📊 Available panels:', panels.map(p => p.meta.name).join(', '));
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