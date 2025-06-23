/**
 * AnalyticsPlatform Plugin SDK
 * Complete SDK for developing panels, data sources, and app plugins
 */

export * from '../types';
export * from './PanelPlugin';
export * from './DataSourcePlugin';
export * from './AppPlugin';
export * from './ui';
export * from './data';
export * from './runtime';

// Re-export commonly used types
export type {
  PanelProps,
  PanelPlugin,
  DataSourceApi,
  DataSourcePlugin,
  AppPlugin,
  TimeRange,
  DataFrame,
  FieldType,
  LoadingState,
  DataQuery,
  DataQueryRequest,
  DataQueryResponse
} from '../types';

// Version info
export const SDK_VERSION = '1.0.0';

// Helper to create plugin exports
export function createPlugin<T>(plugin: T): { plugin: T } {
  return { plugin };
}