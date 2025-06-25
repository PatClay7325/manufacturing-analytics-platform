'use client';

import React, { useMemo } from 'react';
import { Dashboard, Panel } from '@/types/dashboard';
import TimeSeriesPanel from './panels/TimeSeriesPanel';
import StatPanel from './panels/StatPanel';
import GaugePanel from './panels/GaugePanel';
import BarChartPanel from './panels/BarChartPanel';
import TablePanel from './panels/TablePanel';
import HeatmapPanel from './panels/HeatmapPanel';
import TextPanel from './panels/TextPanel';

interface DashboardViewerProps {
  dashboard: Dashboard;
  isEditing?: boolean;
  onPanelClick?: (panel: Panel) => void;
}

function DashboardViewer({
  dashboard,
  isEditing = false,
  onPanelClick
}: DashboardViewerProps) {
  // Calculate grid layout
  const gridLayout = useMemo(() => {
    const panels = dashboard.panels || [];
    const gridRows: Panel[][] = [];
    
    // Sort panels by position
    const sortedPanels = [...panels].sort((a, b) => {
      if (a.gridPos.y !== b.gridPos.y) {
        return a.gridPos.y - b.gridPos.y;
      }
      return a.gridPos.x - b.gridPos.x;
    });

    // Group panels by rows
    sortedPanels.forEach(panel => {
      const rowIndex = Math.floor(panel.gridPos.y / 8); // Assuming 8 units per row
      if (!gridRows[rowIndex]) {
        gridRows[rowIndex] = [];
      }
      gridRows[rowIndex].push(panel);
    });

    return gridRows;
  }, [dashboard.panels]);

  // Render panel based on type
  const renderPanel = (panel: Panel) => {
    const commonProps = {
      panel,
      height: `${panel.gridPos.h * 30}px`,
      width: '100%',
      data: [] // This would come from actual data queries
    };

    switch (panel.type) {
      case 'timeseries':
        return <TimeSeriesPanel {...commonProps} />;
      case 'stat':
        return <StatPanel {...commonProps} />;
      case 'gauge':
        return <GaugePanel {...commonProps} />;
      case 'barchart':
      case 'bar':
        return <BarChartPanel {...commonProps} />;
      case 'table':
        return <TablePanel {...commonProps} />;
      case 'heatmap':
        return <HeatmapPanel {...commonProps} />;
      case 'text':
        return <TextPanel {...commonProps} />;
      default:
        return (
          <div className="bg-gray-100 rounded p-4 h-full flex items-center justify-center">
            <p className="text-gray-600">Panel type "{panel.type}" not supported</p>
          </div>
        );
    }
  };

  if (!dashboard.panels || dashboard.panels.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600 mb-4">This dashboard has no panels yet.</p>
        {isEditing && (
          <p className="text-sm text-gray-500">Click "Add Panel" to get started.</p>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      {/* CSS Grid Layout */}
      <div 
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(24, 1fr)',
          gridAutoRows: '30px'
        }}
      >
        {dashboard.panels.map((panel) => (
          <div
            key={panel.id}
            className={`bg-white rounded-lg shadow ${isEditing ? 'cursor-move hover:shadow-lg' : ''}`}
            style={{
              gridColumn: `${panel.gridPos.x + 1} / span ${panel.gridPos.w}`,
              gridRow: `${panel.gridPos.y + 1} / span ${panel.gridPos.h}`
            }}
            onClick={() => onPanelClick?.(panel)}
          >
            {/* Panel Header */}
            <div className="border-b border-gray-200 px-4 py-2">
              <h3 className="text-sm font-medium text-gray-900">{panel.title}</h3>
            </div>
            
            {/* Panel Content */}
            <div className="p-4" style={{ height: `calc(100% - 40px)` }}>
              {renderPanel(panel)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardViewer;
export { DashboardViewer };