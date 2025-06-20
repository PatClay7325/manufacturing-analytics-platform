/**
 * Lazy Panel Loader - Dynamic imports and code splitting for panel components
 * Improves initial load time by loading panels only when needed
 */

import React, { Suspense, ComponentType, lazy, useCallback, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Loading states and error handling
interface PanelLoadingProps {
  panelType: string;
  size?: 'small' | 'medium' | 'large';
}

const PanelLoadingSpinner: React.FC<PanelLoadingProps> = ({ panelType, size = 'medium' }) => {
  const dimensions = {
    small: 'h-32',
    medium: 'h-48',
    large: 'h-64'
  };

  return (
    <div className={`flex items-center justify-center ${dimensions[size]} animate-pulse`}>
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading {panelType}...</p>
      </div>
    </div>
  );
};

const PanelErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void; panelType: string }> = ({ 
  error, 
  resetErrorBoundary, 
  panelType 
}) => (
  <div className="flex items-center justify-center h-48 border-2 border-red-200 rounded-lg bg-red-50">
    <div className="text-center p-4">
      <div className="text-red-600 mb-2">
        <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-red-800 mb-1">Panel Load Error</h3>
      <p className="text-sm text-red-600 mb-3">Failed to load {panelType} panel</p>
      <p className="text-xs text-red-500 mb-3">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>
  </div>
);

// Lazy panel imports with retry mechanism
const createLazyPanel = (importFn: () => Promise<{ default: ComponentType<any> }>, panelName: string) => {
  return lazy(() =>
    importFn().catch(error => {
      console.error(`Failed to load ${panelName} panel:`, error);
      
      // Retry mechanism
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          importFn()
            .then(resolve)
            .catch(reject);
        }, 1000);
      });
    })
  );
};

// Lazy-loaded panel components
export const LazyPanels = {
  // Time Series Charts
  TimeSeriesPanel: createLazyPanel(
    () => import('@/components/panels/SimpleTimeSeriesPanel').then(m => ({ default: m.SimpleTimeSeriesPanel })),
    'Time Series'
  ),

  LineChartWithReferenceLines: createLazyPanel(
    () => import('@/components/panels/LineChartWithReferenceLines').then(m => ({ default: m.LineChartWithReferenceLines })),
    'Line Chart with Reference Lines'
  ),

  // Quality and Analysis Charts  
  ParetoChart: createLazyPanel(
    () => import('@/components/panels/ParetoChartPanel').then(m => ({ default: m.ParetoChartPanel })),
    'Pareto Chart'
  ),

  WaterfallChart: createLazyPanel(
    () => import('@/components/panels/WaterfallChart').then(m => ({ default: m.WaterfallChart })),
    'Waterfall Chart'
  ),

  // Financial/Process Data Charts
  CandlestickChart: createLazyPanel(
    () => import('@/components/panels/CandlestickChartPanel').then(m => ({ default: m.CandlestickChartPanel })),
    'Candlestick Chart'
  ),

  // Area Charts
  StackedAreaChart: createLazyPanel(
    () => import('@/components/panels/StackedAreaChart').then(m => ({ default: m.StackedAreaChart })),
    'Stacked Area Chart'
  ),

  PercentAreaChart: createLazyPanel(
    () => import('@/components/panels/PercentAreaChart').then(m => ({ default: m.PercentAreaChart })),
    'Percent Area Chart'
  ),

  AreaChartFillByValue: createLazyPanel(
    () => import('@/components/panels/AreaChartFillByValue').then(m => ({ default: m.AreaChartFillByValue })),
    'Area Chart with Fill by Value'
  ),

  // Bar Charts
  StackedBarChart: createLazyPanel(
    () => import('@/components/panels/StackedBarChart').then(m => ({ default: m.StackedBarChart })),
    'Stacked Bar Chart'
  ),

  PositiveAndNegativeBarChart: createLazyPanel(
    () => import('@/components/panels/PositiveAndNegativeBarChart').then(m => ({ default: m.PositiveAndNegativeBarChart })),
    'Positive/Negative Bar Chart'
  ),

  // Pie Charts
  CustomActiveShapePieChart: createLazyPanel(
    () => import('@/components/panels/CustomActiveShapePieChart').then(m => ({ default: m.CustomActiveShapePieChart })),
    'Interactive Pie Chart'
  ),

  // Radar Charts
  SimpleRadarChart: createLazyPanel(
    () => import('@/components/panels/SimpleRadarChart').then(m => ({ default: m.SimpleRadarChart })),
    'Radar Chart'
  ),

  // Legacy panels
  StatPanel: createLazyPanel(
    () => import('@/components/panels/StatPanel'),
    'Stat Panel'
  ),

  TablePanel: createLazyPanel(
    () => import('@/components/panels/TablePanel'),
    'Table Panel'
  )
};

// Panel type to lazy component mapping
export const LAZY_PANEL_MAP: Record<string, ComponentType<any>> = {
  'timeseries': LazyPanels.TimeSeriesPanel,
  'line-with-references': LazyPanels.LineChartWithReferenceLines,
  'pareto': LazyPanels.ParetoChart,
  'waterfall': LazyPanels.WaterfallChart,
  'candlestick': LazyPanels.CandlestickChart,
  'stacked-area': LazyPanels.StackedAreaChart,
  'percent-area': LazyPanels.PercentAreaChart,
  'area-fill-by-value': LazyPanels.AreaChartFillByValue,
  'stacked-bar': LazyPanels.StackedBarChart,
  'positive-negative-bar': LazyPanels.PositiveAndNegativeBarChart,
  'interactive-pie': LazyPanels.CustomActiveShapePieChart,
  'radar': LazyPanels.SimpleRadarChart,
  'stat': LazyPanels.StatPanel,
  'table': LazyPanels.TablePanel
};

// Lazy Panel Wrapper Component
interface LazyPanelWrapperProps {
  panelType: string;
  panelProps: any;
  loadingSize?: 'small' | 'medium' | 'large';
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (error: Error) => void;
}

export const LazyPanelWrapper: React.FC<LazyPanelWrapperProps> = ({
  panelType,
  panelProps,
  loadingSize = 'medium',
  onLoadStart,
  onLoadComplete,
  onLoadError
}) => {
  const LazyComponent = LAZY_PANEL_MAP[panelType];

  const handleLoadStart = useCallback(() => {
    console.log(`🔄 Loading panel: ${panelType}`);
    onLoadStart?.();
  }, [panelType, onLoadStart]);

  const handleLoadComplete = useCallback(() => {
    console.log(`✅ Panel loaded: ${panelType}`);
    onLoadComplete?.();
  }, [panelType, onLoadComplete]);

  const handleLoadError = useCallback((error: Error, errorInfo: any) => {
    console.error(`❌ Panel load error: ${panelType}`, error, errorInfo);
    onLoadError?.(error);
  }, [panelType, onLoadError]);

  const LoadingComponent = useMemo(() => 
    <PanelLoadingSpinner panelType={panelType} size={loadingSize} />,
    [panelType, loadingSize]
  );

  const ErrorFallback = useCallback((props: any) => 
    <PanelErrorFallback {...props} panelType={panelType} />,
    [panelType]
  );

  if (!LazyComponent) {
    return (
      <div className="flex items-center justify-center h-48 border-2 border-yellow-200 rounded-lg bg-yellow-50">
        <div className="text-center p-4">
          <div className="text-yellow-600 mb-2">⚠️</div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-1">Unknown Panel Type</h3>
          <p className="text-sm text-yellow-600">Panel type "{panelType}" not found</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleLoadError}
      onReset={handleLoadStart}
    >
      <Suspense fallback={LoadingComponent}>
        <LazyComponent {...panelProps} />
      </Suspense>
    </ErrorBoundary>
  );
};

// Preloading utilities
export class PanelPreloader {
  private static preloadedPanels = new Set<string>();
  private static preloadPromises = new Map<string, Promise<void>>();

  /**
   * Preload a specific panel type
   */
  static async preload(panelType: string): Promise<void> {
    if (this.preloadedPanels.has(panelType)) {
      return Promise.resolve();
    }

    if (this.preloadPromises.has(panelType)) {
      return this.preloadPromises.get(panelType)!;
    }

    const LazyComponent = LAZY_PANEL_MAP[panelType];
    if (!LazyComponent) {
      console.warn(`Cannot preload unknown panel type: ${panelType}`);
      return Promise.resolve();
    }

    const preloadPromise = new Promise<void>((resolve, reject) => {
      // Trigger lazy loading
      import(`@/components/panels/${this.getPanelFileName(panelType)}`)
        .then(() => {
          this.preloadedPanels.add(panelType);
          console.log(`📦 Preloaded panel: ${panelType}`);
          resolve();
        })
        .catch(error => {
          console.error(`Failed to preload panel ${panelType}:`, error);
          reject(error);
        });
    });

    this.preloadPromises.set(panelType, preloadPromise);
    return preloadPromise;
  }

  /**
   * Preload multiple panel types
   */
  static async preloadBatch(panelTypes: string[]): Promise<void> {
    const promises = panelTypes.map(type => this.preload(type));
    await Promise.allSettled(promises);
  }

  /**
   * Preload commonly used panels
   */
  static async preloadCommon(): Promise<void> {
    const commonPanels = ['timeseries', 'stat', 'table', 'pareto', 'interactive-pie'];
    await this.preloadBatch(commonPanels);
  }

  /**
   * Check if a panel is preloaded
   */
  static isPreloaded(panelType: string): boolean {
    return this.preloadedPanels.has(panelType);
  }

  /**
   * Get preload statistics
   */
  static getStats(): { preloaded: string[]; pending: string[]; total: number } {
    return {
      preloaded: Array.from(this.preloadedPanels),
      pending: Array.from(this.preloadPromises.keys()).filter(type => !this.preloadedPanels.has(type)),
      total: Object.keys(LAZY_PANEL_MAP).length
    };
  }

  private static getPanelFileName(panelType: string): string {
    const fileNameMap: Record<string, string> = {
      'timeseries': 'SimpleTimeSeriesPanel',
      'line-with-references': 'LineChartWithReferenceLines',
      'pareto': 'ParetoChartPanel',
      'waterfall': 'WaterfallChart',
      'candlestick': 'CandlestickChartPanel',
      'stacked-area': 'StackedAreaChart',
      'percent-area': 'PercentAreaChart',
      'area-fill-by-value': 'AreaChartFillByValue',
      'stacked-bar': 'StackedBarChart',
      'positive-negative-bar': 'PositiveAndNegativeBarChart',
      'interactive-pie': 'CustomActiveShapePieChart',
      'radar': 'SimpleRadarChart',
      'stat': 'StatPanel',
      'table': 'TablePanel'
    };

    return fileNameMap[panelType] || panelType;
  }
}

export default LazyPanelWrapper;