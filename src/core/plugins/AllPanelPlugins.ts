/**
 * All Panel Plugins Registration
 * Comprehensive registration of all available React chart panels
 */

import { pluginRegistry, PanelPlugin } from './SimplePluginSystem';

// Import all panel components
import { SimpleTimeSeriesPanel } from '@/components/panels/SimpleTimeSeriesPanel';
import { ParetoChartPanel } from '@/components/panels/ParetoChartPanel';
import { CandlestickChartPanel } from '@/components/panels/CandlestickChartPanel';
import { WaterfallChart } from '@/components/panels/WaterfallChart';
import { LineChartWithReferenceLines } from '@/components/panels/LineChartWithReferenceLines';
import { StackedAreaChart } from '@/components/panels/StackedAreaChart';
import { PercentAreaChart } from '@/components/panels/PercentAreaChart';
import { AreaChartFillByValue } from '@/components/panels/AreaChartFillByValue';
import { StackedBarChart } from '@/components/panels/StackedBarChart';
import { PositiveAndNegativeBarChart } from '@/components/panels/PositiveAndNegativeBarChart';
import { CustomActiveShapePieChart } from '@/components/panels/CustomActiveShapePieChart';
import { SimpleRadarChart } from '@/components/panels/SimpleRadarChart';

// Panel plugin definitions
const panelPlugins: PanelPlugin[] = [
  // Time Series Charts
  {
    meta: {
      id: 'timeseries',
      name: 'Time Series',
      type: 'panel',
      description: 'Time-based line chart with thresholds and annotations',
      version: '1.0.0',
      author: 'Manufacturing Analytics'
    },
    component: SimpleTimeSeriesPanel,
    defaults: {
      title: 'Time Series Chart',
      showGrid: true,
      showLegend: true,
      strokeWidth: 2,
      showDots: false
    }
  },

  {
    meta: {
      id: 'line-with-references',
      name: 'Line Chart with Reference Lines',
      type: 'panel',
      description: 'Line chart with control limits and reference areas for process monitoring',
      version: '1.0.0',
      author: 'Manufacturing Analytics'
    },
    component: LineChartWithReferenceLines,
    defaults: {
      title: 'Process Control Chart',
      showGrid: true,
      showLegend: true,
      showZeroLine: true,
      referenceLines: [],
      referenceAreas: []
    }
  },

  // Quality and Analysis Charts
  {
    meta: {
      id: 'pareto',
      name: 'Pareto Chart',
      type: 'panel',
      description: '80/20 analysis with bar and line combination for quality analysis',
      version: '1.0.0',
      author: 'Manufacturing Analytics'
    },
    component: ParetoChartPanel,
    defaults: {
      title: 'Pareto Analysis',
      barColor: '#8884d8',
      lineColor: '#ff7300',
      show80Line: true,
      sortDescending: true
    }
  },

  {
    meta: {
      id: 'waterfall',
      name: 'Waterfall Chart',
      type: 'panel',
      description: 'Waterfall analysis for cost variance and cumulative impact visualization',
      version: '1.0.0',
      author: 'Manufacturing Analytics'
    },
    component: WaterfallChart,
    defaults: {
      title: 'Waterfall Analysis',
      startColor: '#2196f3',
      positiveColor: '#4caf50',
      negativeColor: '#f44336',
      totalColor: '#ff9800',
      showConnectors: true,
      show80Line: true
    }
  },

  // Financial/Process Data Charts
  {
    meta: {
      id: 'candlestick',
      name: 'Candlestick Chart',
      type: 'panel',
      description: 'OHLC data visualization for process parameter analysis',
      version: '1.0.0',
      author: 'Manufacturing Analytics'
    },
    component: CandlestickChartPanel,
    defaults: {
      title: 'Process Parameter Analysis',
      bullishColor: '#4caf50',
      bearishColor: '#f44336',
      wickColor: '#666666',
      candleWidth: 8
    }
  },

  // Area Charts
  {
    meta: {
      id: 'stacked-area',
      name: 'Stacked Area Chart',
      type: 'panel',
      description: 'Stacked area chart for composition and trends over time',
      version: '1.0.0',
      author: 'Manufacturing Analytics'
    },
    component: StackedAreaChart,
    defaults: {
      title: 'Stacked Area Chart',
      showGrid: true,
      showLegend: true,
      series: []
    }
  },

  {
    meta: {
      id: 'percent-area',
      name: 'Percent Area Chart',
      type: 'panel',
      description: 'Percentage composition over time - perfect for OEE breakdown',
      version: '1.0.0',
      author: 'Manufacturing Analytics'
    },
    component: PercentAreaChart,
    defaults: {
      title: 'Percent Area Chart',
      showGrid: true,
      showLegend: true,
      series: []
    }
  },

  {
    meta: {
      id: 'area-fill-by-value',
      name: 'Area Chart with Value-based Fill',
      type: 'panel',
      description: 'Area chart with dynamic coloring based on value thresholds',
      version: '1.0.0',
      author: 'Manufacturing Analytics'
    },
    component: AreaChartFillByValue,
    defaults: {
      title: 'Value-Based Fill Chart',
      showGrid: true,
      showLegend: true,
      thresholds: []
    }
  },

  // Bar Charts
  {
    meta: {
      id: 'stacked-bar',
      name: 'Stacked Bar Chart',
      type: 'panel',
      description: 'Stacked bar chart for comparing composition across categories',
      version: '1.0.0',
      author: 'Manufacturing Analytics'
    },
    component: StackedBarChart,
    defaults: {
      title: 'Stacked Bar Chart',
      showGrid: true,
      showLegend: true,
      layout: 'vertical',
      series: []
    }
  },

  {
    meta: {
      id: 'positive-negative-bar',
      name: 'Positive/Negative Bar Chart',
      type: 'panel',
      description: 'Variance analysis with positive and negative values',
      version: '1.0.0',
      author: 'Manufacturing Analytics'
    },
    component: PositiveAndNegativeBarChart,
    defaults: {
      title: 'Variance Analysis',
      positiveColor: '#4caf50',
      negativeColor: '#f44336',
      neutralColor: '#9e9e9e',
      showZeroLine: true,
      layout: 'vertical'
    }
  },

  // Pie Charts
  {
    meta: {
      id: 'interactive-pie',
      name: 'Interactive Pie Chart',
      type: 'panel',
      description: 'Interactive pie chart with custom active slice styling',
      version: '1.0.0',
      author: 'Manufacturing Analytics'
    },
    component: CustomActiveShapePieChart,
    defaults: {
      title: 'Interactive Pie Chart',
      showLegend: true,
      innerRadius: 40,
      outerRadius: 80,
      activeOuterRadius: 90,
      colors: ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0']
    }
  },

  // Radar Charts
  {
    meta: {
      id: 'radar',
      name: 'Radar Chart',
      type: 'panel',
      description: 'Multi-dimensional performance analysis and equipment health monitoring',
      version: '1.0.0',
      author: 'Manufacturing Analytics'
    },
    component: SimpleRadarChart,
    defaults: {
      title: 'Radar Chart',
      showLegend: true,
      gridType: 'polygon',
      tickCount: 5,
      angleAxisTick: true,
      radiusAxisTick: false,
      series: []
    }
  }
];

// Plugin categories for organization
export const PANEL_CATEGORIES = {
  TIMESERIES: 'Time Series',
  QUALITY: 'Quality & Analysis',
  FINANCIAL: 'Financial & Process',
  COMPOSITION: 'Composition & Distribution',
  COMPARISON: 'Comparison & Variance',
  MULTIDIMENSIONAL: 'Multi-dimensional'
} as const;

export const PANEL_CATEGORY_MAP = {
  'timeseries': PANEL_CATEGORIES.TIMESERIES,
  'line-with-references': PANEL_CATEGORIES.TIMESERIES,
  'pareto': PANEL_CATEGORIES.QUALITY,
  'waterfall': PANEL_CATEGORIES.QUALITY,
  'candlestick': PANEL_CATEGORIES.FINANCIAL,
  'stacked-area': PANEL_CATEGORIES.COMPOSITION,
  'percent-area': PANEL_CATEGORIES.COMPOSITION,
  'area-fill-by-value': PANEL_CATEGORIES.TIMESERIES,
  'stacked-bar': PANEL_CATEGORIES.COMPOSITION,
  'positive-negative-bar': PANEL_CATEGORIES.COMPARISON,
  'interactive-pie': PANEL_CATEGORIES.COMPOSITION,
  'radar': PANEL_CATEGORIES.MULTIDIMENSIONAL
} as const;

// Manufacturing use case mapping
export const MANUFACTURING_USE_CASES = {
  'timeseries': ['Equipment monitoring', 'Process parameters', 'Production rates'],
  'line-with-references': ['Process control', 'SPC charts', 'Control limits'],
  'pareto': ['Defect analysis', 'Downtime causes', 'Cost drivers'],
  'waterfall': ['Cost variance', 'OEE analysis', 'Performance gaps'],
  'candlestick': ['Process stability', 'Parameter ranges', 'Quality trends'],
  'stacked-area': ['Production breakdown', 'Energy consumption', 'Resource allocation'],
  'percent-area': ['OEE components', 'Time utilization', 'Quality distribution'],
  'area-fill-by-value': ['Temperature monitoring', 'Pressure tracking', 'Quality zones'],
  'stacked-bar': ['Shift performance', 'Equipment utilization', 'Cost breakdown'],
  'positive-negative-bar': ['Variance analysis', 'Target vs actual', 'Efficiency gaps'],
  'interactive-pie': ['Equipment status', 'Quality distribution', 'Production mix'],
  'radar': ['Equipment health', 'Performance metrics', 'Quality dimensions']
} as const;

// Registration function
export function registerAllPanelPlugins(): void {
  console.log('🔌 Registering all panel plugins...');
  
  panelPlugins.forEach(plugin => {
    try {
      pluginRegistry.registerPanel(plugin);
    } catch (error) {
      console.error(`Failed to register panel plugin ${plugin.meta.id}:`, error);
    }
  });

  console.log(`✅ Registered ${panelPlugins.length} panel plugins successfully`);
  
  // Log categories for debugging
  console.log('📊 Available panel categories:', Object.values(PANEL_CATEGORIES));
}

// Helper functions
export function getPanelsByCategory(category: string): PanelPlugin[] {
  const categoryPanels = Object.entries(PANEL_CATEGORY_MAP)
    .filter(([, cat]) => cat === category)
    .map(([id]) => id);
  
  return panelPlugins.filter(plugin => categoryPanels.includes(plugin.meta.id));
}

export function getPanelUseCases(panelId: string): string[] {
  return MANUFACTURING_USE_CASES[panelId as keyof typeof MANUFACTURING_USE_CASES] || [];
}

export function getAllPanelPlugins(): PanelPlugin[] {
  return panelPlugins;
}

export default {
  registerAllPanelPlugins,
  getPanelsByCategory,
  getPanelUseCases,
  getAllPanelPlugins,
  PANEL_CATEGORIES,
  PANEL_CATEGORY_MAP,
  MANUFACTURING_USE_CASES
};