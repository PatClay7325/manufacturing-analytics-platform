/**
 * Initialize Built-in Plugins
 * Registers all built-in panel, datasource, and app plugins
 */

import { getPluginRegistry } from './PluginRegistry';
import { createPanelPlugin } from './sdk/PanelPlugin';
import { createDataSourcePlugin } from './sdk/DataSourcePlugin';
import { PluginType, PluginState, PluginSignature } from './types';

// Import panel components
import TimeSeriesPanel from '@/components/panels/TimeSeriesPanel';
import StatPanel from '@/components/panels/StatPanel';
import TablePanel from '@/components/panels/TablePanel';
import { GaugePanel } from '@/components/dashboard/panels/GaugePanel';
import { BarChartPanel } from '@/components/dashboard/panels/BarChartPanel';
import { PieChartPanel } from '@/components/dashboard/panels/PieChartPanel';
import { TextPanel } from '@/components/dashboard/panels/TextPanel';
import { HeatmapPanel } from '@/components/dashboard/panels/HeatmapPanel';
import { HistogramPanel } from '@/components/dashboard/panels/HistogramPanel';
import { NewsPanel } from '@/components/dashboard/panels/NewsPanel';
import { DashboardListPanel } from '@/components/dashboard/panels/DashboardListPanel';
import { StateTimelinePanel } from '@/components/dashboard/panels/StateTimelinePanel';
import { AlertListPanel } from '@/components/dashboard/panels/AlertListPanel';
import LogsPanel from '@/components/panels/LogsPanel';
import CanvasPanel from '@/components/panels/CanvasPanel';
import GeomapPanel from '@/components/panels/GeomapPanel';
import NodeGraphPanel from '@/components/panels/NodeGraphPanel';
import CandlestickPanel from '@/components/panels/CandlestickPanel';
import StatusHistoryPanel from '@/components/panels/StatusHistoryPanel';
import AnnotationsListPanel from '@/components/panels/AnnotationsListPanel';
import WorldmapPanel from '@/components/panels/WorldmapPanel';
import GettingStartedPanel from '@/components/panels/GettingStartedPanel';
import WelcomePanel from '@/components/panels/WelcomePanel';
import PluginListPanel from '@/components/panels/PluginListPanel';
import BoomTablePanel from '@/components/panels/BoomTablePanel';

// Import data source plugins
import { PrometheusDataSource } from './datasources/prometheus/PrometheusDataSource';

export function initializeBuiltInPlugins(): void {
  const registry = getPluginRegistry();

  // Register Time Series Panel
  registry.registerPanel(
    createPanelPlugin()
      .setMeta({
        id: 'timeseries',
        name: 'Time series',
        description: 'Time series visualization with support for multiple series, annotations, and thresholds',
        type: PluginType.Panel,
        info: {
          author: { name: 'Manufacturing Analytics' },
          description: 'Time series panel for displaying metrics over time',
          links: [],
          logos: { small: '/img/icn-timeseries-panel.svg', large: '/img/icn-timeseries-panel.svg' },
          version: '1.0.0',
          updated: new Date().toISOString(),
        },
        state: PluginState.Stable,
        signature: PluginSignature.Valid,
      })
      .setPanelComponent(TimeSeriesPanel)
      .build()
  );

  // Register Stat Panel
  registry.registerPanel(
    createPanelPlugin()
      .setMeta({
        id: 'stat',
        name: 'Stat',
        description: 'Big single stat values with sparklines',
        type: PluginType.Panel,
        info: {
          author: { name: 'Manufacturing Analytics' },
          description: 'Shows a single large stat value',
          links: [],
          logos: { small: '/img/icn-stat-panel.svg', large: '/img/icn-stat-panel.svg' },
          version: '1.0.0',
          updated: new Date().toISOString(),
        },
        state: PluginState.Stable,
        signature: PluginSignature.Valid,
      })
      .setPanelComponent(StatPanel)
      .build()
  );

  // Register Table Panel
  registry.registerPanel(
    createPanelPlugin()
      .setMeta({
        id: 'table',
        name: 'Table',
        description: 'Display data in a table with sorting, filtering, and pagination',
        type: PluginType.Panel,
        info: {
          author: { name: 'Manufacturing Analytics' },
          description: 'Table panel with advanced features',
          links: [],
          logos: { small: '/img/icn-table-panel.svg', large: '/img/icn-table-panel.svg' },
          version: '1.0.0',
          updated: new Date().toISOString(),
        },
        state: PluginState.Stable,
        signature: PluginSignature.Valid,
      })
      .setPanelComponent(TablePanel)
      .build()
  );

  // Register Gauge Panel
  registry.registerPanel(
    createPanelPlugin()
      .setMeta({
        id: 'gauge',
        name: 'Gauge',
        description: 'Circular or arc gauge visualization',
        type: PluginType.Panel,
        info: {
          author: { name: 'Manufacturing Analytics' },
          description: 'Gauge panel for showing metrics within thresholds',
          links: [],
          logos: { small: '/img/icn-gauge-panel.svg', large: '/img/icn-gauge-panel.svg' },
          version: '1.0.0',
          updated: new Date().toISOString(),
        },
        state: PluginState.Stable,
        signature: PluginSignature.Valid,
      })
      .setPanelComponent(GaugePanel)
      .build()
  );

  // Register Bar Chart Panel
  registry.registerPanel(
    createPanelPlugin()
      .setMeta({
        id: 'barchart',
        name: 'Bar chart',
        description: 'Bar chart visualization with grouping and stacking',
        type: PluginType.Panel,
        info: {
          author: { name: 'Manufacturing Analytics' },
          description: 'Bar chart panel for categorical data',
          links: [],
          logos: { small: '/img/icn-barchart-panel.svg', large: '/img/icn-barchart-panel.svg' },
          version: '1.0.0',
          updated: new Date().toISOString(),
        },
        state: PluginState.Stable,
        signature: PluginSignature.Valid,
      })
      .setPanelComponent(BarChartPanel)
      .build()
  );

  // Register Pie Chart Panel
  registry.registerPanel(
    createPanelPlugin()
      .setMeta({
        id: 'piechart',
        name: 'Pie chart',
        description: 'Pie chart visualization with drill-down',
        type: PluginType.Panel,
        info: {
          author: { name: 'Manufacturing Analytics' },
          description: 'Pie chart panel for showing proportions',
          links: [],
          logos: { small: '/img/icn-piechart-panel.svg', large: '/img/icn-piechart-panel.svg' },
          version: '1.0.0',
          updated: new Date().toISOString(),
        },
        state: PluginState.Stable,
        signature: PluginSignature.Valid,
      })
      .setPanelComponent(PieChartPanel)
      .build()
  );

  // Register Text Panel
  registry.registerPanel(
    createPanelPlugin()
      .setMeta({
        id: 'text',
        name: 'Text',
        description: 'Markdown and HTML text panel',
        type: PluginType.Panel,
        info: {
          author: { name: 'Manufacturing Analytics' },
          description: 'Text panel with markdown support',
          links: [],
          logos: { small: '/img/icn-text-panel.svg', large: '/img/icn-text-panel.svg' },
          version: '1.0.0',
          updated: new Date().toISOString(),
        },
        state: PluginState.Stable,
        signature: PluginSignature.Valid,
      })
      .setPanelComponent(TextPanel)
      .build()
  );

  // Register Logs Panel
  registry.registerPanel(
    createPanelPlugin()
      .setMeta({
        id: 'logs',
        name: 'Logs',
        description: 'Display and search log data',
        type: PluginType.Panel,
        info: {
          author: { name: 'Manufacturing Analytics' },
          description: 'Logs panel with filtering and live tail',
          links: [],
          logos: { small: '/img/icn-logs-panel.svg', large: '/img/icn-logs-panel.svg' },
          version: '1.0.0',
          updated: new Date().toISOString(),
        },
        state: PluginState.Stable,
        signature: PluginSignature.Valid,
      })
      .setPanelComponent(LogsPanel)
      .build()
  );

  // Register Canvas Panel
  registry.registerPanel(
    createPanelPlugin()
      .setMeta({
        id: 'canvas',
        name: 'Canvas',
        description: 'Custom layouts with drag-and-drop elements',
        type: PluginType.Panel,
        info: {
          author: { name: 'Manufacturing Analytics' },
          description: 'Canvas panel for SCADA-like visualizations',
          links: [],
          logos: { small: '/img/icn-canvas-panel.svg', large: '/img/icn-canvas-panel.svg' },
          version: '1.0.0',
          updated: new Date().toISOString(),
        },
        state: PluginState.Beta,
        signature: PluginSignature.Valid,
      })
      .setPanelComponent(CanvasPanel)
      .build()
  );

  // Register Geomap Panel
  registry.registerPanel(
    createPanelPlugin()
      .setMeta({
        id: 'geomap',
        name: 'Geomap',
        description: 'Map visualization for geographic data',
        type: PluginType.Panel,
        info: {
          author: { name: 'Manufacturing Analytics' },
          description: 'Geographic map panel with multiple layers',
          links: [],
          logos: { small: '/img/icn-geomap-panel.svg', large: '/img/icn-geomap-panel.svg' },
          version: '1.0.0',
          updated: new Date().toISOString(),
        },
        state: PluginState.Stable,
        signature: PluginSignature.Valid,
      })
      .setPanelComponent(GeomapPanel)
      .build()
  );

  // Register Node Graph Panel
  registry.registerPanel(
    createPanelPlugin()
      .setMeta({
        id: 'nodeGraph',
        name: 'Node Graph',
        description: 'Display process flows and dependencies',
        type: PluginType.Panel,
        info: {
          author: { name: 'Manufacturing Analytics' },
          description: 'Node graph panel for relationship visualization',
          links: [],
          logos: { small: '/img/icn-node-graph-panel.svg', large: '/img/icn-node-graph-panel.svg' },
          version: '1.0.0',
          updated: new Date().toISOString(),
        },
        state: PluginState.Beta,
        signature: PluginSignature.Valid,
      })
      .setPanelComponent(NodeGraphPanel)
      .build()
  );

  // Register additional panels
  const additionalPanels = [
    { id: 'heatmap', name: 'Heatmap', component: HeatmapPanel },
    { id: 'histogram', name: 'Histogram', component: HistogramPanel },
    { id: 'news', name: 'News', component: NewsPanel },
    { id: 'dashlist', name: 'Dashboard list', component: DashboardListPanel },
    { id: 'state-timeline', name: 'State timeline', component: StateTimelinePanel },
    { id: 'alertlist', name: 'Alert list', component: AlertListPanel },
    { id: 'candlestick', name: 'Candlestick', component: CandlestickPanel },
    { id: 'status-history', name: 'Status history', component: StatusHistoryPanel },
    { id: 'annotationslist', name: 'Annotations list', component: AnnotationsListPanel },
    { id: 'worldmap', name: 'Worldmap', component: WorldmapPanel },
    { id: 'getting-started', name: 'Getting started', component: GettingStartedPanel },
    { id: 'welcome', name: 'Welcome', component: WelcomePanel },
    { id: 'pluginlist', name: 'Plugin list', component: PluginListPanel },
    { id: 'boom-table', name: 'Boom Table', component: BoomTablePanel },
  ];

  additionalPanels.forEach(({ id, name, component }) => {
    registry.registerPanel(
      createPanelPlugin()
        .setMeta({
          id,
          name,
          description: `${name} visualization panel`,
          type: PluginType.Panel,
          info: {
            author: { name: 'Manufacturing Analytics' },
            description: `${name} panel`,
            links: [],
            logos: { small: `/img/icn-${id}-panel.svg`, large: `/img/icn-${id}-panel.svg` },
            version: '1.0.0',
            updated: new Date().toISOString(),
          },
          state: PluginState.Stable,
          signature: PluginSignature.Valid,
        })
        .setPanelComponent(component)
        .build()
    );
  });

  // Register Prometheus Data Source
  registry.registerDataSource(
    createDataSourcePlugin()
      .setMeta({
        id: 'prometheus',
        name: 'Prometheus',
        description: 'Prometheus monitoring system and time series database',
        type: PluginType.DataSource,
        info: {
          author: { name: 'Manufacturing Analytics' },
          description: 'Prometheus data source with full PromQL support',
          links: [],
          logos: { small: '/img/prometheus_logo.svg', large: '/img/prometheus_logo.svg' },
          version: '1.0.0',
          updated: new Date().toISOString(),
        },
        state: PluginState.Stable,
        signature: PluginSignature.Valid,
        metrics: true,
        logs: false,
        annotations: true,
        alerting: true,
        streaming: false,
      })
      .setDataSourceClass(PrometheusDataSource)
      .build()
  );

  console.log('Built-in plugins initialized successfully');
}

// Auto-initialize on import
initializeBuiltInPlugins();