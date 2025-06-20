'use client';

import React, { Suspense, lazy, useMemo } from 'react';
import { Panel } from '@/types/dashboard';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Lazy load panel components for better performance
const TimeSeriesPanel = lazy(() => import('./panels/TimeSeriesPanel'));
const StatPanel = lazy(() => import('./panels/StatPanel'));
const GaugePanel = lazy(() => import('./panels/GaugePanel'));
const TablePanel = lazy(() => import('./panels/TablePanel'));
const BarChartPanel = lazy(() => import('./panels/BarChartPanel'));
const PieChartPanel = lazy(() => import('./panels/PieChartPanel'));
const HeatmapPanel = lazy(() => import('./panels/HeatmapPanel'));
const TextPanel = lazy(() => import('./panels/TextPanel'));
const AlertListPanel = lazy(() => import('./panels/AlertListPanel'));
const LogsPanel = lazy(() => import('./panels/LogsPanel'));
const NodeGraphPanel = lazy(() => import('./panels/NodeGraphPanel'));
const StateTimelinePanel = lazy(() => import('./panels/StateTimelinePanel'));
const HistogramPanel = lazy(() => import('./panels/HistogramPanel'));
const CanvasPanel = lazy(() => import('./panels/CanvasPanel'));
const DashboardListPanel = lazy(() => import('./panels/DashboardListPanel'));
const NewsPanel = lazy(() => import('./panels/NewsPanel'));

interface PanelRendererProps {
  panel?: Panel;
  height?: string | number;
  width?: string | number;
  data?: any;
  timeRange?: any;
  onError?: (error?: Error) => void;
}

export default function PanelRenderer({
  panel,
  height = '100%',
  width = '100%',
  data,
  timeRange,
  onError
}: PanelRendererProps) {
  // Select the appropriate panel component based on type
  const PanelComponent = useMemo(() => {
    switch (panel?.type) {
      case 'timeseries':
      case 'graph': // Legacy support
        return TimeSeriesPanel;
      case 'stat':
      case 'singlestat': // Legacy support
        return StatPanel;
      case 'gauge':
        return GaugePanel;
      case 'table':
        return TablePanel;
      case 'barchart':
      case 'bar':
        return BarChartPanel;
      case 'piechart':
      case 'pie':
        return PieChartPanel;
      case 'heatmap':
        return HeatmapPanel;
      case 'text':
      case 'markdown':
        return TextPanel;
      case 'alertlist':
        return AlertListPanel;
      case 'logs':
        return LogsPanel;
      case 'nodeGraph':
      case 'node-graph':
        return NodeGraphPanel;
      case 'state-timeline':
        return StateTimelinePanel;
      case 'histogram':
        return HistogramPanel;
      case 'canvas':
        return CanvasPanel;
      case 'dashlist':
        return DashboardListPanel;
      case 'news':
        return NewsPanel;
      default:
        return null;
    }
  }, [panel?.type]);

  // Error boundary wrapper
  const renderPanel = () => {
    if (!PanelComponent) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-800 rounded">
          <div className="text-center">
            <p className="text-gray-400 mb-2">Unknown panel type: {panel?.type}</p>
            <p className="text-sm text-gray-500">Please select a valid visualization</p>
          </div>
        </div>
      );
    }

    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        }
      >
        <ErrorBoundary onError={onError}>
          <PanelComponent
            panel={panel}
            data={data}
            timeRange={timeRange}
            height={height}
            width={width}
          />
        </ErrorBoundary>
      </Suspense>
    );
  };

  return (
    <div style={{ height, width }} className="panel-renderer">
      {renderPanel()}
    </div>
  );
}

// Simple error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Panel render error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-800 rounded p-4">
          <div className="text-center">
            <p className="text-red-400 mb-2">Error rendering panel</p>
            <p className="text-sm text-gray-500">{this.state.error?.message}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}