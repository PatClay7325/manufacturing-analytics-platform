import React, { useMemo } from 'react';
import { 
  PanelPlugin, 
  PanelPluginBuilder,
  PanelProps,
  FieldType,
  Field,
  DataFrame,
  FieldColorModeId,
  ThresholdsMode,
  GraphDrawStyle,
  LineInterpolation,
  BarAlignment,
  AxisPlacement,
  ScaleDistribution,
  StackingMode,
  GraphGradientMode,
  LegendDisplayMode,
  TooltipDisplayMode,
} from '../GrafanaPanelPlugin';

// Panel Options
export interface TimeSeriesOptions {
  // Graph styles
  drawStyle: GraphDrawStyle;
  lineInterpolation: LineInterpolation;
  lineWidth: number;
  fillOpacity: number;
  gradientMode: GraphGradientMode;
  spanNulls: boolean | number;
  insertNulls?: number;
  showPoints: PointsMode;
  pointSize: number;
  stacking: {
    mode: StackingMode;
    group?: string;
  };
  barAlignment: BarAlignment;
  barWidthFactor: number;
  barMaxWidth: number;
  
  // Legend
  legend: {
    displayMode: LegendDisplayMode;
    placement: 'bottom' | 'right' | 'top';
    showLegend: boolean;
    asTable?: boolean;
    isVisible?: boolean;
    sortBy?: string;
    sortDesc?: boolean;
    width?: number;
    calcs: string[];
  };
  
  // Tooltip
  tooltip: {
    mode: TooltipDisplayMode;
    sort: 'none' | 'asc' | 'desc';
  };
  
  // Thresholds
  thresholds: {
    stylesEnabled: boolean;
    thresholdsStyle: {
      mode: GraphThresholdsStyleMode;
    };
  };
}

// Field Options
export interface TimeSeriesFieldOptions {
  lineStyle?: {
    fill?: 'solid' | 'dash' | 'dot' | 'square';
    dash?: number[];
  };
  lineWidth?: number;
  fillOpacity?: number;
  gradientMode?: GraphGradientMode;
  hideFrom?: {
    tooltip?: boolean;
    viz?: boolean;
    legend?: boolean;
  };
  insertNulls?: boolean | number;
  spanNulls?: boolean | number;
  pointSize?: number;
  axisPlacement?: AxisPlacement;
  axisLabel?: string;
  axisWidth?: number;
  axisSoftMin?: number;
  axisSoftMax?: number;
  axisCenteredZero?: boolean;
  scaleDistribution?: {
    type: ScaleDistribution;
    log?: number;
  };
  showPoints?: PointsMode;
  drawStyle?: GraphDrawStyle;
  lineInterpolation?: LineInterpolation;
  barAlignment?: BarAlignment;
  transform?: GraphTransform;
  thresholdsStyle?: {
    mode: GraphThresholdsStyleMode;
  };
}

// Supporting types
export enum GraphDrawStyle {
  Line = 'line',
  Bars = 'bars',
  Points = 'points',
}

export enum LineInterpolation {
  Linear = 'linear',
  Smooth = 'smooth',
  StepBefore = 'stepBefore',
  StepAfter = 'stepAfter',
}

export enum BarAlignment {
  Before = -1,
  Center = 0,
  After = 1,
}

export enum AxisPlacement {
  Auto = 'auto',
  Top = 'top',
  Right = 'right',
  Bottom = 'bottom',
  Left = 'left',
  Hidden = 'hidden',
}

export enum ScaleDistribution {
  Linear = 'linear',
  Log = 'log',
  Ordinal = 'ordinal',
  Symlog = 'symlog',
}

export enum StackingMode {
  None = 'none',
  Normal = 'normal',
  Percent = 'percent',
}

export enum GraphGradientMode {
  None = 'none',
  Opacity = 'opacity',
  Hue = 'hue',
  Scheme = 'scheme',
}

export enum LegendDisplayMode {
  List = 'list',
  Table = 'table',
  Hidden = 'hidden',
}

export enum TooltipDisplayMode {
  Single = 'single',
  Multi = 'multi',
  None = 'none',
}

export enum PointsMode {
  Auto = 'auto',
  Never = 'never',
  Always = 'always',
}

export enum GraphThresholdsStyleMode {
  Off = 'off',
  Line = 'line',
  Dashed = 'dashed',
  Area = 'area',
  LineAndArea = 'line+area',
  Series = 'series',
}

export enum GraphTransform {
  Constant = 'constant',
  NegativeY = 'negative-Y',
}

// Time Series Panel Component
const TimeSeriesPanel: React.FC<PanelProps<TimeSeriesOptions>> = ({
  data,
  timeRange,
  timeZone,
  options,
  fieldConfig,
  width,
  height,
  onOptionsChange,
  onFieldConfigChange,
  onChangeTimeRange,
}) => {
  // Process data for visualization
  const processedData = useMemo(() => {
    return processGraphData(data, fieldConfig, options);
  }, [data, fieldConfig, options]);

  // Render the visualization
  return (
    <div style={{ width, height, position: 'relative' }}>
      {/* This would be replaced with actual graph rendering library like uPlot */}
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Time Series Visualization</h3>
        <p>Series: {processedData.series.length}</p>
        <p>Time Range: {timeRange.from.toString()} - {timeRange.to.toString()}</p>
        <p>Draw Style: {options.drawStyle}</p>
      </div>
    </div>
  );
};

// Data processing function
function processGraphData(
  data: PanelData,
  fieldConfig: FieldConfigSource,
  options: TimeSeriesOptions
): ProcessedGraphData {
  const series: GraphSeries[] = [];
  
  data.series.forEach((frame: DataFrame) => {
    const timeField = frame.fields.find(f => f.type === FieldType.time);
    if (!timeField) return;
    
    frame.fields.forEach((field: Field) => {
      if (field.type === FieldType.number) {
        series.push({
          name: field.name,
          time: timeField.values,
          values: field.values,
          color: getFieldColor(field, fieldConfig),
          drawStyle: getFieldDrawStyle(field, options),
          lineWidth: getFieldLineWidth(field, options),
          fillOpacity: getFieldFillOpacity(field, options),
        });
      }
    });
  });
  
  return { series };
}

interface ProcessedGraphData {
  series: GraphSeries[];
}

interface GraphSeries {
  name: string;
  time: number[];
  values: number[];
  color: string;
  drawStyle: GraphDrawStyle;
  lineWidth: number;
  fillOpacity: number;
}

interface PanelData {
  series: DataFrame[];
  state: LoadingState;
  timeRange: TimeRange;
}

interface LoadingState {
  state: 'NotStarted' | 'Loading' | 'Streaming' | 'Done' | 'Error';
}

interface TimeRange {
  from: Date;
  to: Date;
  raw: {
    from: string | Date;
    to: string | Date;
  };
}

interface FieldConfigSource {
  defaults: FieldConfig;
  overrides: ConfigOverrideRule[];
}

interface FieldConfig {
  unit?: string;
  decimals?: number;
  displayName?: string;
  min?: number;
  max?: number;
  color?: {
    mode: FieldColorModeId;
    fixedColor?: string;
  };
  thresholds?: {
    mode: ThresholdsMode;
    steps: Array<{
      value: number;
      color: string;
    }>;
  };
  custom?: TimeSeriesFieldOptions;
}

interface ConfigOverrideRule {
  matcher: {
    id: string;
    options?: any;
  };
  properties: Array<{
    id: string;
    value: any;
  }>;
}

// Helper functions
function getFieldColor(field: Field, fieldConfig: FieldConfigSource): string {
  const config = field.config || fieldConfig.defaults;
  if (config.color?.mode === 'fixed' && config.color.fixedColor) {
    return config.color.fixedColor;
  }
  // Default color palette would be applied here
  return '#73BF69';
}

function getFieldDrawStyle(field: Field, options: TimeSeriesOptions): GraphDrawStyle {
  const custom = field.config?.custom as TimeSeriesFieldOptions;
  return custom?.drawStyle || options.drawStyle;
}

function getFieldLineWidth(field: Field, options: TimeSeriesOptions): number {
  const custom = field.config?.custom as TimeSeriesFieldOptions;
  return custom?.lineWidth || options.lineWidth;
}

function getFieldFillOpacity(field: Field, options: TimeSeriesOptions): number {
  const custom = field.config?.custom as TimeSeriesFieldOptions;
  return custom?.fillOpacity || options.fillOpacity;
}

// Plugin Definition
export const timeSeriesPanelPlugin = new PanelPluginBuilder<TimeSeriesOptions, TimeSeriesFieldOptions>(TimeSeriesPanel)
  .setId('timeseries')
  .setName('Time series')
  .setMeta({
    id: 'timeseries',
    name: 'Time series',
    type: 'panel',
    info: {
      author: {
        name: 'Manufacturing Analytics Platform',
        url: 'https://github.com/manufacturing-analytics',
      },
      description: 'Grafana-compliant time series visualization with manufacturing enhancements',
      links: [],
      logos: {
        small: 'public/plugins/timeseries/img/icn-timeseries-panel.svg',
        large: 'public/plugins/timeseries/img/icn-timeseries-panel.svg',
      },
      screenshots: [],
      version: '1.0.0',
      updated: '2024-01-01',
      keywords: ['timeseries', 'graph', 'chart', 'line', 'bar', 'manufacturing'],
    },
    module: 'core:panel/timeseries',
    baseUrl: 'public/plugins/timeseries',
  })
  .setDefaults({
    drawStyle: GraphDrawStyle.Line,
    lineInterpolation: LineInterpolation.Linear,
    lineWidth: 1,
    fillOpacity: 0,
    gradientMode: GraphGradientMode.None,
    spanNulls: false,
    insertNulls: undefined,
    showPoints: PointsMode.Auto,
    pointSize: 5,
    stacking: {
      mode: StackingMode.None,
    },
    barAlignment: BarAlignment.Center,
    barWidthFactor: 0.6,
    barMaxWidth: 50,
    legend: {
      displayMode: LegendDisplayMode.List,
      placement: 'bottom',
      showLegend: true,
      calcs: [],
    },
    tooltip: {
      mode: TooltipDisplayMode.Single,
      sort: 'none',
    },
    thresholds: {
      stylesEnabled: false,
      thresholdsStyle: {
        mode: GraphThresholdsStyleMode.Off,
      },
    },
  })
  .setFieldConfigDefaults({
    defaults: {
      unit: 'short',
      custom: {
        drawStyle: GraphDrawStyle.Line,
        lineInterpolation: LineInterpolation.Linear,
        barAlignment: BarAlignment.Center,
        lineWidth: 1,
        fillOpacity: 0,
        gradientMode: GraphGradientMode.None,
        spanNulls: false,
        insertNulls: false,
        showPoints: PointsMode.Auto,
        pointSize: 5,
        axisPlacement: AxisPlacement.Auto,
        axisCenteredZero: false,
        scaleDistribution: {
          type: ScaleDistribution.Linear,
        },
        hideFrom: {
          tooltip: false,
          viz: false,
          legend: false,
        },
      },
    },
    overrides: [],
  })
  .setDataSupport({
    annotations: true,
    alertStates: true,
    transformations: true,
    errorHandling: {
      showErrorIndicator: true,
      showErrorDetails: true,
    },
  })
  .useOptionEditors((builder) => {
    builder
      .addRadio({
        path: 'drawStyle',
        name: 'Style',
        description: 'How to display the data',
        defaultValue: GraphDrawStyle.Line,
        settings: {
          options: [
            { label: 'Lines', value: GraphDrawStyle.Line },
            { label: 'Bars', value: GraphDrawStyle.Bars },
            { label: 'Points', value: GraphDrawStyle.Points },
          ],
        },
      })
      .addSelect({
        path: 'lineInterpolation',
        name: 'Line interpolation',
        description: 'How to interpolate between points',
        defaultValue: LineInterpolation.Linear,
        settings: {
          options: [
            { label: 'Linear', value: LineInterpolation.Linear },
            { label: 'Smooth', value: LineInterpolation.Smooth },
            { label: 'Step before', value: LineInterpolation.StepBefore },
            { label: 'Step after', value: LineInterpolation.StepAfter },
          ],
        },
        showIf: { path: 'drawStyle', value: GraphDrawStyle.Line },
      })
      .addSlider({
        path: 'lineWidth',
        name: 'Line width',
        defaultValue: 1,
        settings: {
          min: 0.1,
          max: 10,
          step: 0.1,
        },
        showIf: { path: 'drawStyle', value: GraphDrawStyle.Line },
      })
      .addSlider({
        path: 'fillOpacity',
        name: 'Fill opacity',
        defaultValue: 0,
        settings: {
          min: 0,
          max: 100,
          step: 1,
        },
      })
      .addRadio({
        path: 'showPoints',
        name: 'Show points',
        defaultValue: PointsMode.Auto,
        settings: {
          options: [
            { label: 'Auto', value: PointsMode.Auto },
            { label: 'Always', value: PointsMode.Always },
            { label: 'Never', value: PointsMode.Never },
          ],
        },
      })
      .addSlider({
        path: 'pointSize',
        name: 'Point size',
        defaultValue: 5,
        settings: {
          min: 1,
          max: 20,
          step: 1,
        },
        showIf: { path: 'showPoints', values: [PointsMode.Auto, PointsMode.Always] },
      });
  })
  .useFieldConfig((registry) => {
    registry.standardOptions = {
      unit: true,
      decimals: true,
      displayName: true,
      color: true,
      min: true,
      max: true,
      thresholds: true,
      mappings: true,
      links: true,
      noValue: true,
    };
    
    registry.customOptions?.addCustomFieldConfig({
      id: 'drawStyle',
      path: 'drawStyle',
      name: 'Draw style',
      category: ['Graph styles'],
      defaultValue: GraphDrawStyle.Line,
      editor: DrawStyleEditor,
    });
    
    registry.customOptions?.addCustomFieldConfig({
      id: 'lineWidth',
      path: 'lineWidth',
      name: 'Line width',
      category: ['Graph styles'],
      defaultValue: 1,
      editor: LineWidthEditor,
      shouldApply: (field) => field.type === FieldType.number,
    });
  })
  .build();

// Custom field editors (simplified implementations)
const DrawStyleEditor: React.FC<any> = ({ value, onChange }) => {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value={GraphDrawStyle.Line}>Line</option>
      <option value={GraphDrawStyle.Bars}>Bars</option>
      <option value={GraphDrawStyle.Points}>Points</option>
    </select>
  );
};

const LineWidthEditor: React.FC<any> = ({ value, onChange }) => {
  return (
    <input
      type="range"
      min="0.1"
      max="10"
      step="0.1"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  );
};