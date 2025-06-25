/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Panel Type Definitions
 * 
 * Comprehensive panel types and visualization options
 */

// ============================================================================
// CORE PANEL TYPES
// ============================================================================

export type PanelType = 
  // Basic visualizations
  | 'stat'
  | 'gauge'
  | 'bargauge'
  | 'table'
  | 'text'
  | 'row'
  
  // Graph visualizations
  | 'timeseries'
  | 'graph'
  | 'histogram'
  | 'heatmap'
  | 'status-history'
  | 'state-timeline'
  
  // Chart visualizations
  | 'piechart'
  | 'barchart'
  | 'candlestick'
  | 'scatter'
  | 'bubble'
  
  // Advanced visualizations
  | 'flamegraph'
  | 'node-graph'
  | 'geomap'
  | 'worldmap'
  | 'traces'
  | 'logs'
  
  // Manufacturing-specific
  | 'oee-display'
  | 'production-line'
  | 'equipment-status'
  | 'quality-control'
  | 'maintenance-schedule'
  | 'energy-consumption'
  | 'process-flow'
  | 'control-chart'
  | 'pareto-chart'
  | 'fishbone-diagram';

// ============================================================================
// PANEL OPTIONS BY TYPE
// ============================================================================

export interface StatPanelOptions {
  reduceOptions: ReduceDataOptions;
  orientation: VizOrientation;
  textMode: BigValueTextMode;
  colorMode: BigValueColorMode;
  graphMode: BigValueGraphMode;
  justifyMode: BigValueJustifyMode;
  displayMode: 'basic' | 'lcd' | 'list';
  text?: VizTextDisplayOptions;
}

export interface GaugePanelOptions {
  reduceOptions: ReduceDataOptions;
  showThresholdLabels: boolean;
  showThresholdMarkers: boolean;
  text?: VizTextDisplayOptions;
  minVizWidth: number;
  minVizHeight: number;
}

export interface BarGaugePanelOptions {
  reduceOptions: ReduceDataOptions;
  orientation: VizOrientation;
  displayMode: BarGaugeDisplayMode;
  showUnfilled: boolean;
  minVizWidth: number;
  minVizHeight: number;
  text?: VizTextDisplayOptions;
}

export interface TablePanelOptions {
  frameIndex: number;
  showHeader: boolean;
  showTypeIcons: boolean;
  sortBy?: TableSortByFieldState[];
  footer?: TableFooterOptions;
}

export interface TextPanelOptions {
  mode: 'markdown' | 'html' | 'text';
  content: string;
  code?: {
    language: string;
    showLineNumbers: boolean;
    showMiniMap: boolean;
  };
}

export interface TimeSeriesPanelOptions {
  tooltip: VizTooltipOptions;
  legend: VizLegendOptions;
}

export interface HeatmapPanelOptions {
  calculate: boolean;
  calculation: HeatmapCalculationOptions;
  cellGap: number;
  cellRadius: number;
  cellValues: HeatmapCellOptions;
  color: HeatmapColorOptions;
  exemplars: ExemplarsOptions;
  filterValues: HeatmapFilterValuesOptions;
  rowsFrame: HeatmapRowsFrame;
  showValue: VisibilityMode;
  tooltip: HeatmapTooltipOptions;
  yAxis: HeatmapYAxisConfig;
}

export interface PieChartPanelOptions {
  reduceOptions: ReduceDataOptions;
  pieType: PieChartType;
  tooltip: VizTooltipOptions;
  legend: VizLegendOptions;
  displayLabels: string[];
}

// ============================================================================
// MANUFACTURING-SPECIFIC PANEL OPTIONS
// ============================================================================

export interface OEEDisplayOptions {
  showOverallOEE: boolean;
  showAvailability: boolean;
  showPerformance: boolean;
  showQuality: boolean;
  timeRange: OEETimeRange;
  targets: OEETarget[];
  alertThresholds: OEEThresholds;
  displayMode: 'gauge' | 'bar' | 'number';
}

export interface ProductionLinePanelOptions {
  lineId: string;
  stations: ProductionStation[];
  flowDirection: 'horizontal' | 'vertical';
  showThroughput: boolean;
  showBottlenecks: boolean;
  realTimeUpdates: boolean;
  alertOnIssues: boolean;
}

export interface EquipmentStatusOptions {
  equipmentIds: string[];
  statusCategories: EquipmentStatusCategory[];
  groupBy: 'type' | 'department' | 'line' | 'location';
  showMaintenance: boolean;
  showAlerts: boolean;
  refreshInterval: number;
}

export interface QualityControlOptions {
  metrics: QualityMetric[];
  controlLimits: ControlLimits;
  showTrends: boolean;
  showSpecLimits: boolean;
  alertOnExcursions: boolean;
  samplingInterval: number;
}

export interface MaintenanceScheduleOptions {
  scheduleType: 'preventive' | 'predictive' | 'all';
  timeHorizon: number; // days
  showOverdue: boolean;
  showUpcoming: boolean;
  priorityFilter: MaintenancePriority[];
  groupBy: 'equipment' | 'date' | 'priority';
}

export interface EnergyConsumptionOptions {
  meters: EnergyMeter[];
  timeGranularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
  showCost: boolean;
  showTrends: boolean;
  showTargets: boolean;
  energyTypes: EnergyType[];
}

export interface ProcessFlowOptions {
  processSteps: ProcessStep[];
  showMaterials: boolean;
  showParameters: boolean;
  showAlerts: boolean;
  flowDirection: 'leftToRight' | 'topToBottom' | 'auto';
  nodeStyle: 'box' | 'circle' | 'rounded';
}

export interface ControlChartOptions {
  chartType: 'xbar-r' | 'xbar-s' | 'i-mr' | 'p' | 'np' | 'c' | 'u';
  subgroupSize: number;
  controlLimits: ControlLimits;
  showRules: boolean;
  rulesEnabled: WesternElectricRules[];
  showCapability: boolean;
}

export interface ParetoChartOptions {
  valueField: string;
  categoryField: string;
  showCumulative: boolean;
  show80Line: boolean;
  sortOrder: 'desc' | 'asc';
  maxCategories: number;
}

export interface FishboneDiagramOptions {
  problemStatement: string;
  categories: FishboneCategory[];
  showSubCauses: boolean;
  layoutStyle: 'classic' | 'modern';
  colorScheme: string;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface ReduceDataOptions {
  calcs: string[];
  fields?: string;
  limit?: number;
  values: boolean;
}

export type VizOrientation = 'auto' | 'horizontal' | 'vertical';

export type BigValueTextMode = 'auto' | 'value' | 'value_and_name' | 'name' | 'none';

export type BigValueColorMode = 'value' | 'background' | 'background_solid' | 'none';

export type BigValueGraphMode = 'area' | 'line' | 'none';

export type BigValueJustifyMode = 'auto' | 'center';

export type BarGaugeDisplayMode = 'basic' | 'lcd' | 'gradient';

export interface VizTextDisplayOptions {
  titleSize?: number;
  valueSize?: number;
}

export interface TableSortByFieldState {
  displayName: string;
  desc?: boolean;
}

export interface TableFooterOptions {
  show: boolean;
  reducer: string[];
  fields?: string;
  enablePagination: boolean;
  countRows: boolean;
}

export interface VizTooltipOptions {
  mode: TooltipDisplayMode;
  sort: SortOrder;
}

export interface VizLegendOptions {
  displayMode: LegendDisplayMode;
  placement: LegendPlacement;
  showLegend: boolean;
  asTable?: boolean;
  isVisible?: boolean;
  sortBy?: string;
  sortDesc?: boolean;
  width?: number;
  calcs: string[];
}

export type TooltipDisplayMode = 'single' | 'multi' | 'none';

export type SortOrder = 'asc' | 'desc' | 'none';

export type LegendDisplayMode = 'list' | 'table' | 'hidden';

export type LegendPlacement = 'bottom' | 'right' | 'top';

export type PieChartType = 'pie' | 'donut';

export type VisibilityMode = 'auto' | 'never' | 'always';

// ============================================================================
// MANUFACTURING-SPECIFIC SUPPORTING TYPES
// ============================================================================

export interface OEETimeRange {
  period: 'shift' | 'day' | 'week' | 'month';
  rolling: boolean;
  customRange?: TimeRange;
}

export interface OEETarget {
  metric: 'oee' | 'availability' | 'performance' | 'quality';
  target: number;
  tolerance: number;
}

export interface OEEThresholds {
  availability: { good: number; warning: number; };
  performance: { good: number; warning: number; };
  quality: { good: number; warning: number; };
  oee: { good: number; warning: number; };
}

export interface ProductionStation {
  id: string;
  name: string;
  position: { x: number; y: number; };
  type: 'operation' | 'inspection' | 'storage' | 'delay';
  cycleTime: number;
  status: 'running' | 'idle' | 'down' | 'changeover';
}

export interface EquipmentStatusCategory {
  name: string;
  color: string;
  priority: number;
  includeInOEE: boolean;
}

export interface QualityMetric {
  name: string;
  target: number;
  upperLimit: number;
  lowerLimit: number;
  unit: string;
  criticalToQuality: boolean;
}

export interface ControlLimits {
  upperControlLimit: number;
  lowerControlLimit: number;
  upperSpecLimit?: number;
  lowerSpecLimit?: number;
  target?: number;
}

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';

export interface EnergyMeter {
  id: string;
  name: string;
  type: EnergyType;
  location: string;
  rate?: number; // cost per unit
}

export type EnergyType = 'electricity' | 'gas' | 'steam' | 'compressed-air' | 'water';

export interface ProcessStep {
  id: string;
  name: string;
  type: 'operation' | 'inspection' | 'storage' | 'delay' | 'transport';
  duration: number;
  resources: string[];
  inputs: ProcessInput[];
  outputs: ProcessOutput[];
}

export interface ProcessInput {
  material: string;
  quantity: number;
  unit: string;
}

export interface ProcessOutput {
  product: string;
  quantity: number;
  unit: string;
}

export type WesternElectricRules = 
  | 'rule1' // Point beyond control limit
  | 'rule2' // 9 points on same side of center
  | 'rule3' // 6 points steadily increasing/decreasing
  | 'rule4' // 14 points alternating up/down
  | 'rule5' // 2 of 3 points beyond 2 sigma
  | 'rule6' // 4 of 5 points beyond 1 sigma
  | 'rule7' // 15 points within 1 sigma
  | 'rule8'; // 8 points beyond 1 sigma on both sides

export interface FishboneCategory {
  name: string;
  causes: FishboneCause[];
  color?: string;
}

export interface FishboneCause {
  name: string;
  subCauses?: string[];
  severity?: 'low' | 'medium' | 'high';
}

// ============================================================================
// HEATMAP SPECIFIC TYPES
// ============================================================================

export interface HeatmapCalculationOptions {
  xBuckets: HeatmapCalculationBucketConfig;
  yBuckets: HeatmapCalculationBucketConfig;
}

export interface HeatmapCalculationBucketConfig {
  mode: HeatmapCalculationMode;
  value?: string;
  scale?: ScaleDistributionConfig;
}

export type HeatmapCalculationMode = 'size' | 'count';

export interface ScaleDistributionConfig {
  type: ScaleDistribution;
  log?: number;
}

export type ScaleDistribution = 'linear' | 'log';

export interface HeatmapCellOptions {
  unit?: string;
  decimals?: number;
}

export interface HeatmapColorOptions {
  mode: HeatmapColorMode;
  scale: HeatmapColorScale;
  exponent: number;
  scheme: string;
  fill: string;
  reverse: boolean;
  min?: number;
  max?: number;
}

export type HeatmapColorMode = 'opacity' | 'value';

export type HeatmapColorScale = 'linear' | 'exponential';

export interface ExemplarsOptions {
  color: string;
}

export interface HeatmapFilterValuesOptions {
  le: number;
  ge: number;
}

export interface HeatmapRowsFrame {
  layout: HeatmapRowsFrameLayout;
}

export type HeatmapRowsFrameLayout = 'auto' | 'le' | 'ge';

export interface HeatmapTooltipOptions {
  show: boolean;
  yHistogram: boolean;
}

export interface HeatmapYAxisConfig {
  axisPlacement: YAxisPlacement;
  axisLabel: string;
  axisWidth: number;
  reverse: boolean;
  unit: string;
  decimals?: number;
  min?: number;
  max?: number;
}

export type YAxisPlacement = 'left' | 'right' | 'hidden';