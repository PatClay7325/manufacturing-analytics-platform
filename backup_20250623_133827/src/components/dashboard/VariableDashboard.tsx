/**
 * Variable Dashboard - Demonstrates AnalyticsPlatform template variable system
 * Shows how variables integrate with dashboards for dynamic content
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { pluginRegistry, PanelPlugin } from '@/core/plugins/SimplePluginSystem';
import { initializePlugins } from '@/core/plugins/initializePlugins';
import { SimpleTimeSeriesPanel } from '@/components/panels/SimpleTimeSeriesPanel';
import { VariablePicker } from '@/components/variables/VariablePicker';
import { variableService } from '@/core/variables/VariableService';
import { 
  VariableModel, 
  VariableType, 
  VariableHide, 
  VariableOption,
  VariableRefresh,
  VariableSort,
} from '@/core/variables/types';
import { dataSourceManager } from '@/core/datasources/DataSourceManager';
import { getCombinedMetricsData, generateSampleManufacturingData } from '@/utils/sampleManufacturingData';

interface DashboardVariable {
  variable: VariableModel;
  component: React.ReactNode;
}

export const VariableDashboard: React.FC = () => {
  const [variables, setVariables] = useState<VariableModel[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Initialize dashboard with variables
  useEffect(() => {
    const initialize = async () => {
      try {
        // Register plugins
        const timeSeriesPlugin: PanelPlugin = {
          meta: {
            id: 'timeseries',
            name: 'Time Series',
            type: 'panel',
            description: 'Time series visualization with variable support',
            version: '1.0.0',
            author: 'Manufacturing Analytics',
          },
          component: SimpleTimeSeriesPanel,
          defaults: { showLegend: true, showGrid: true, showTooltip: true },
        };
        
        pluginRegistry.registerPanel(timeSeriesPlugin);
        initializePlugins();

        // Create manufacturing template variables
        await createManufacturingVariables();

        // Load initial data
        await refreshDashboardData();
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize variable dashboard:', error);
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Create manufacturing-specific template variables
  const createManufacturingVariables = async () => {
    console.log('Creating manufacturing template variables...');

    // 1. Data Source Variable
    const dataSourceVariable: VariableModel = {
      id: 'datasource',
      name: 'datasource',
      type: VariableType.DataSource,
      label: 'Data Source',
      description: 'Select the data source for metrics',
      hide: VariableHide.DontHide,
      current: { text: '', value: '' },
      options: [],
      refresh: VariableRefresh.Never,
    };

    // 2. Plant Variable (Custom)
    const plantVariable: VariableModel = {
      id: 'plant',
      name: 'plant',
      type: VariableType.Custom,
      label: 'Plant',
      description: 'Manufacturing plant location',
      hide: VariableHide.DontHide,
      query: 'North Plant:north,South Plant:south,East Plant:east,West Plant:west',
      current: { text: 'North Plant', value: 'north' },
      options: [],
      includeAll: true,
      allValue: 'all_plants',
      multi: false,
      sort: VariableSort.AlphabeticalAsc,
    };

    // 3. Production Line Variable (Query-based)
    const lineVariable: VariableModel = {
      id: 'line',
      name: 'line',
      type: VariableType.Query,
      label: 'Production Line',
      description: 'Select production line(s)',
      hide: VariableHide.DontHide,
      query: 'label_values(production_line)',
      datasource: 'prometheus-manufacturing',
      current: { text: '', value: '' },
      options: [],
      includeAll: true,
      allValue: '$__all',
      multi: true,
      refresh: VariableRefresh.OnDashboardLoad,
      sort: VariableSort.AlphabeticalAsc,
    };

    // 4. Equipment Variable (Dependent on line)
    const equipmentVariable: VariableModel = {
      id: 'equipment',
      name: 'equipment',
      type: VariableType.Query,
      label: 'Equipment',
      description: 'Select equipment for selected line(s)',
      hide: VariableHide.DontHide,
      query: 'label_values(equipment_metrics{line=~"$line"}, equipment)',
      datasource: 'prometheus-manufacturing',
      current: { text: '', value: '' },
      options: [],
      includeAll: true,
      allValue: '.*',
      multi: true,
      refresh: VariableRefresh.OnDashboardLoad,
      sort: VariableSort.AlphabeticalAsc,
    };

    // 5. Time Interval Variable
    const intervalVariable: VariableModel = {
      id: 'interval',
      name: 'interval',
      type: VariableType.Interval,
      label: 'Interval',
      description: 'Data collection interval',
      hide: VariableHide.DontHide,
      current: { text: '1m', value: '1m' },
      options: [],
      auto: true,
      auto_count: 30,
      auto_min: '10s',
    };

    // 6. Shift Variable (Custom)
    const shiftVariable: VariableModel = {
      id: 'shift',
      name: 'shift',
      type: VariableType.Custom,
      label: 'Shift',
      description: 'Work shift',
      hide: VariableHide.DontHide,
      query: 'Day Shift:day,Night Shift:night,Weekend:weekend',
      current: { text: 'Day Shift', value: 'day' },
      options: [],
      includeAll: false,
      multi: false,
    };

    // 7. Constant Variable (hidden)
    const versionVariable: VariableModel = {
      id: 'version',
      name: 'version',
      type: VariableType.Constant,
      label: 'Dashboard Version',
      hide: VariableHide.HideVariable,
      query: 'v2.1.0',
      current: { text: 'v2.1.0', value: 'v2.1.0' },
      options: [{ text: 'v2.1.0', value: 'v2.1.0' }],
    };

    // Add variables to service
    const variablesToAdd = [
      dataSourceVariable,
      plantVariable,
      lineVariable,
      equipmentVariable,
      intervalVariable,
      shiftVariable,
      versionVariable,
    ];

    for (const variable of variablesToAdd) {
      variableService.addVariable(variable);
    }

    // Refresh all variables to populate options
    await variableService.refreshAllVariables();

    // Update state
    const refreshedVariables = variableService.getAllVariables();
    setVariables(refreshedVariables);

    console.log(`Created ${variablesToAdd.length} template variables`);
  };

  // Handle variable changes
  const handleVariableChange = useCallback(async (variable: VariableModel, option: VariableOption) => {
    console.log(`Variable ${variable.name} changed to:`, option);
    
    try {
      await variableService.setVariableValue(variable.name, option);
      
      // Update local state
      const updatedVariables = variableService.getAllVariables();
      setVariables(updatedVariables);
      
      // Refresh dashboard data with new variable values
      await refreshDashboardData();
      
    } catch (error) {
      console.error('Failed to update variable:', error);
    }
  }, []);

  // Refresh dashboard data based on current variable values
  const refreshDashboardData = useCallback(async () => {
    try {
      console.log('Refreshing dashboard data with current variables...');
      
      // Get current variable values
      const currentVars = variableService.getAllVariables().reduce((acc, variable) => {
        acc[variable.name] = {
          text: variable.current.text,
          value: variable.current.value,
        };
        return acc;
      }, {} as any);

      console.log('Current variable values:', currentVars);

      // Generate data based on variable selection
      const baseData = generateSampleManufacturingData();
      
      // Apply variable filtering/transformation
      let filteredData = { ...baseData };
      
      // Example: Filter by plant
      if (currentVars.plant && currentVars.plant.value !== 'all_plants') {
        console.log(`Filtering data for plant: ${currentVars.plant.value}`);
        // In a real scenario, this would filter the actual data
        // For demo, we'll just modify the data slightly
        filteredData = {
          ...baseData,
          // Add plant-specific variations
          oee: baseData.oee.map(point => ({
            ...point,
            oee: point.oee + (currentVars.plant.value === 'north' ? 5 : 
                               currentVars.plant.value === 'south' ? -2 : 0)
          }))
        };
      }

      setDashboardData(filteredData);
      setLastRefresh(new Date());
      
      console.log('Dashboard data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
    }
  }, []);

  // Listen for variable changes
  useEffect(() => {
    const handleVariableChanged = () => {
      console.log('Variable changed - refreshing dashboard...');
      refreshDashboardData();
    };

    variableService.onVariableChanged(handleVariableChanged);
    return () => variableService.offVariableChanged(handleVariableChanged);
  }, [refreshDashboardData]);

  // Render panel with variable interpolation
  const renderVariableAwarePanel = (title: string, data: any[], description: string) => {
    if (!data || data.length === 0) {
      return (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-medium text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500">No data available for current variable selection</p>
        </div>
      );
    }

    try {
      // Interpolate title with variables
      const interpolatedTitle = variableService.replace(title);
      const interpolatedDescription = variableService.replace(description);
      
      const panelElement = pluginRegistry.createPanelInstance('timeseries', {
        data,
        options: {
          title: interpolatedTitle,
          showLegend: true,
          showGrid: true,
          showTooltip: true,
        },
        height: 300,
      });

      return (
        <div className="border rounded-lg shadow-sm bg-white">
          <div className="border-b px-4 py-3">
            <h3 className="font-medium text-gray-900">{interpolatedTitle}</h3>
            <p className="text-sm text-gray-500">{interpolatedDescription}</p>
          </div>
          <div className="p-4">
            {panelElement}
          </div>
        </div>
      );
    } catch (error) {
      return (
        <div className="border rounded-lg p-4 bg-red-50">
          <p className="text-red-600">Error rendering panel: {title}</p>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Initializing Variable Dashboard...</p>
          <p className="text-sm text-gray-500">Setting up template variables...</p>
        </div>
      </div>
    );
  }

  // Filter visible variables
  const visibleVariables = variables.filter(v => v.hide !== VariableHide.HideVariable);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Manufacturing Analytics - {variableService.replace('$plant Plant')}
              </h1>
              <p className="text-gray-600">
                Template Variables Demo - Shift: {variableService.replace('$shift')} | Version: {variableService.replace('$version')}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={refreshDashboardData}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Variable Controls */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex flex-wrap gap-4">
          {visibleVariables.map((variable) => (
            <div key={variable.name} className="min-w-48">
              <VariablePicker
                variable={variable}
                onSelectionChange={handleVariableChange}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {dashboardData && (
            <>
              {renderVariableAwarePanel(
                'OEE for $plant Plant - $line Lines',
                dashboardData.oee,
                'Overall Equipment Effectiveness filtered by plant: $plant'
              )}
              
              {renderVariableAwarePanel(
                'Temperature Monitoring - $equipment Equipment',
                dashboardData.temperature,
                'Equipment temperature for shift: $shift at interval: $interval'
              )}
              
              {renderVariableAwarePanel(
                'Production Rate - $line Line(s)',
                dashboardData.production,
                'Production metrics for selected equipment: $equipment'
              )}
              
              {renderVariableAwarePanel(
                'Pressure & Vibration - Plant $plant',
                getCombinedMetricsData(),
                'Combined metrics dashboard for $shift shift'
              )}
            </>
          )}
        </div>

        {/* Variable Information Panel */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Template Variable System Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {variables.map((variable) => (
              <div key={variable.name} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">${variable.name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    variable.type === 'query' ? 'bg-blue-100 text-blue-800' :
                    variable.type === 'custom' ? 'bg-green-100 text-green-800' :
                    variable.type === 'constant' ? 'bg-gray-100 text-gray-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {variable.type}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Current: {Array.isArray(variable.current.text) ? 
                    variable.current.text.join(', ') : 
                    variable.current.text}
                  </p>
                  <p>Options: {variable.options.length}</p>
                  {variable.multi && <p className="text-blue-600">Multi-select enabled</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-500 space-y-1">
            <p>✅ Template variable interpolation: Working</p>
            <p>✅ Variable dependency chain: Working</p>
            <p>✅ Multi-select variables: Supported</p>
            <p>✅ Query-based variables: Implemented</p>
            <p>✅ Dashboard refresh on change: Working</p>
            <p>• Last refresh: {lastRefresh.toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};