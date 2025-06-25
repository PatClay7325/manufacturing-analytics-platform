import { ComponentType } from 'react';
import { 
  DataFrame, 
  FieldConfig, 
  FieldConfigSource,
  PanelModel,
  DataQueryRequest,
  DataQueryResponse,
  TimeRange,
  ScopedVars,
  LoadingState,
  EventBus,
  DataSourceApi,
  AbsoluteTimeRange,
  DataQuery,
  VariableModel,
  SelectableValue,
  FieldType,
  ConfigOverrideRule,
  ThresholdsConfig,
  ValueMapping,
  DataLink,
  FieldColorConfigSettings,
} from '../datasources/GrafanaDataSourcePlugin';

// ============================================================================
// PANEL PLUGIN CORE
// ============================================================================

export interface PanelPlugin<TOptions = any, TFieldOptions = any> {
  id: string;
  name: string;
  meta: PanelPluginMeta;
  
  // Components
  panel: ComponentType<PanelProps<TOptions>>;
  editor?: ComponentType<PanelEditorProps<TOptions>>;
  
  // Configuration
  defaults: TOptions;
  fieldConfigDefaults: FieldConfigSource<TFieldOptions>;
  
  // Options builder
  optionEditors?: PanelOptionEditorsBuilder<TOptions>;
  fieldConfigRegistry?: FieldConfigOptionsRegistry<TFieldOptions>;
  
  // Data requirements
  dataSupport?: PanelDataSupport;
  
  // Migration
  onPanelMigration?: (panel: PanelModel<TOptions>) => Partial<TOptions>;
  onFieldConfigChange?: (config: FieldConfig<TFieldOptions>, previousConfig?: FieldConfig<TFieldOptions>) => FieldConfig<TFieldOptions>;
  
  // Suggestions
  suggestionsSupplier?: PanelSuggestionsSupplier<TOptions>;
  
  // Custom components
  components?: {
    OptionsEditor?: ComponentType<PanelEditorProps<TOptions>>;
    FieldConfigEditor?: ComponentType<FieldConfigEditorProps<TFieldOptions>>;
  };
}

export interface PanelPluginMeta {
  id: string;
  name: string;
  type: PluginType;
  info: PluginMetaInfo;
  module: string;
  baseUrl: string;
  state?: PluginState;
  signature?: PluginSignatureStatus;
  dependencies?: PluginDependencies;
  live?: boolean;
  includes?: PluginInclude[];
  skipDataQuery?: boolean;
  hideFromList?: boolean;
  sort?: number;
}

export interface PanelProps<TOptions = any> {
  id: number;
  data: PanelData;
  timeRange: TimeRange;
  timeZone: string;
  options: TOptions;
  fieldConfig: FieldConfigSource;
  transparent: boolean;
  width: number;
  height: number;
  title: string;
  renderCounter: number;
  replaceVariables: InterpolateFunction;
  onOptionsChange: (options: TOptions) => void;
  onFieldConfigChange: (config: FieldConfigSource) => void;
  onChangeTimeRange: (timeRange: AbsoluteTimeRange) => void;
  eventBus: EventBus;
}

export interface PanelEditorProps<TOptions = any> {
  options: TOptions;
  onOptionsChange: (options: TOptions) => void;
  data?: PanelData;
  fieldConfig: FieldConfigSource;
  onFieldConfigChange: (config: FieldConfigSource) => void;
}

export interface PanelData {
  state: LoadingState;
  series: DataFrame[];
  request?: DataQueryRequest;
  timeRange: TimeRange;
  error?: DataQueryError;
  errors?: DataQueryError[];
  annotations?: DataFrame[];
  structureRev?: number;
}

export interface DataQueryError {
  data?: any;
  message?: string;
  status?: number;
  statusText?: string;
  refId?: string;
}

// ============================================================================
// FIELD CONFIGURATION
// ============================================================================

export interface FieldConfigEditorProps<TFieldOptions = any> {
  config: FieldConfig<TFieldOptions>;
  onChange: (config: FieldConfig<TFieldOptions>) => void;
  data?: DataFrame[];
}

export interface FieldConfigOptionsRegistry<TFieldOptions = any> {
  standardOptions: StandardFieldConfigEditorRegistry;
  customOptions?: CustomFieldConfigRegistry<TFieldOptions>;
}

export interface StandardFieldConfigEditorRegistry {
  unit?: boolean;
  decimals?: boolean;
  displayName?: boolean;
  color?: boolean;
  min?: boolean;
  max?: boolean;
  thresholds?: boolean;
  mappings?: boolean;
  links?: boolean;
  noValue?: boolean;
}

export interface CustomFieldConfigRegistry<TFieldOptions = any> {
  addCustomFieldConfig<TValue>(config: CustomFieldConfig<TFieldOptions, TValue>): void;
  getCustomFieldConfigs(): CustomFieldConfig<TFieldOptions, any>[];
}

export interface CustomFieldConfig<TFieldOptions = any, TValue = any> {
  id: string;
  path: string;
  name: string;
  description?: string;
  category?: string[];
  defaultValue?: TValue;
  editor: ComponentType<CustomFieldConfigEditorProps<TValue>>;
  override?: ComponentType<CustomFieldConfigEditorProps<TValue>>;
  shouldApply?: (field: Field) => boolean;
  process?: (value: TValue, context: FieldConfigProcessorContext) => TValue;
}

export interface CustomFieldConfigEditorProps<TValue = any> {
  value: TValue;
  onChange: (value: TValue) => void;
  context: FieldConfigEditorContext;
}

export interface FieldConfigEditorContext {
  data?: DataFrame[];
  field?: Field;
  dataFrameIndex?: number;
  fieldIndex?: number;
}

export interface FieldConfigProcessorContext {
  field: Field;
  data: DataFrame[];
  dataFrameIndex: number;
  fieldIndex: number;
  theme: GrafanaTheme;
  timeZone: string;
  scopedVars: ScopedVars;
}

export interface Field<T = any> {
  name: string;
  type: FieldType;
  config: FieldConfig;
  values: T[];
  labels?: Record<string, string>;
  state?: FieldState;
}

export interface FieldState {
  displayName?: string;
  scopedVars?: ScopedVars;
  seriesIndex?: number;
}

// ============================================================================
// PANEL OPTIONS BUILDER
// ============================================================================

export interface PanelOptionEditorsBuilder<TOptions = any> {
  addRadio<TValue = any>(config: PanelOptionEditorConfig<TOptions, TValue, RadioFieldConfigSettings<TValue>>): this;
  addSelect<TValue = any>(config: PanelOptionEditorConfig<TOptions, TValue, SelectFieldConfigSettings<TValue>>): this;
  addTextInput(config: PanelOptionEditorConfig<TOptions, string, StringFieldConfigSettings>): this;
  addNumberInput(config: PanelOptionEditorConfig<TOptions, number, NumberFieldConfigSettings>): this;
  addBooleanSwitch(config: PanelOptionEditorConfig<TOptions, boolean, BooleanFieldConfigSettings>): this;
  addSlider(config: PanelOptionEditorConfig<TOptions, number, SliderFieldConfigSettings>): this;
  addColorPicker(config: PanelOptionEditorConfig<TOptions, string, ColorFieldConfigSettings>): this;
  addCustomEditor<TValue = any>(config: PanelOptionEditorConfig<TOptions, TValue, CustomFieldConfigSettings<TValue>>): this;
  addNestedOptions<TNestedOptions>(config: NestedPanelOptionConfig<TOptions, TNestedOptions>): this;
}

export interface PanelOptionEditorConfig<TOptions = any, TValue = any, TSettings = any> {
  path: string;
  name: string;
  description?: string;
  category?: string[];
  defaultValue?: TValue;
  settings?: TSettings;
  showIf?: ShowIfConfig<TOptions>;
  editor?: ComponentType<PanelOptionEditorProps<TValue>>;
}

export interface PanelOptionEditorProps<TValue = any> {
  value: TValue;
  onChange: (value: TValue) => void;
  context: PanelEditorContext;
}

export interface PanelEditorContext {
  data?: PanelData;
  options?: any;
}

export interface ShowIfConfig<TOptions = any> {
  path: string;
  value?: any;
  values?: any[];
  test?: (currentValue: any, options: TOptions) => boolean;
}

export interface RadioFieldConfigSettings<TValue = any> {
  options: Array<SelectableValue<TValue>>;
}

export interface SelectFieldConfigSettings<TValue = any> {
  options: Array<SelectableValue<TValue>>;
  multi?: boolean;
  allowCustomValue?: boolean;
  getOptions?: (query: string) => Promise<Array<SelectableValue<TValue>>>;
}

export interface StringFieldConfigSettings {
  placeholder?: string;
  maxLength?: number;
  expandTemplateVars?: boolean;
}

export interface NumberFieldConfigSettings {
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
}

export interface BooleanFieldConfigSettings {
  label?: string;
}

export interface SliderFieldConfigSettings {
  min: number;
  max: number;
  step?: number;
  marks?: SliderMarks;
}

export interface SliderMarks {
  [key: number]: string | { label: string; style?: React.CSSProperties };
}

export interface ColorFieldConfigSettings {
  allowAlpha?: boolean;
  allowClear?: boolean;
  disableNamedColors?: boolean;
}

export interface CustomFieldConfigSettings<TValue = any> {
  component: ComponentType<CustomFieldConfigEditorProps<TValue>>;
}

export interface NestedPanelOptionConfig<TOptions = any, TNestedOptions = any> {
  path: string;
  category?: string[];
  build: (builder: PanelOptionEditorsBuilder<TNestedOptions>) => void;
}

// ============================================================================
// PANEL DATA SUPPORT
// ============================================================================

export interface PanelDataSupport {
  annotations?: boolean;
  alertStates?: boolean;
  transformations?: boolean;
  errorHandling?: PanelErrorHandling;
  dataLimits?: PanelDataLimits;
}

export interface PanelErrorHandling {
  showErrorIndicator?: boolean;
  showErrorDetails?: boolean;
  customErrorDisplay?: ComponentType<{ error: DataQueryError }>;
}

export interface PanelDataLimits {
  maxDataPoints?: number;
  maxSeriesLength?: number;
  maxNumberOfSeries?: number;
}

// ============================================================================
// PANEL SUGGESTIONS
// ============================================================================

export interface PanelSuggestionsSupplier<TOptions = any> {
  getSuggestionsForData(data: PanelData): PanelSuggestion<TOptions>[];
}

export interface PanelSuggestion<TOptions = any> {
  name: string;
  description?: string;
  options?: Partial<TOptions>;
  fieldConfig?: FieldConfigSource;
  previewImageUrl?: string;
  score?: number;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export type InterpolateFunction = (value: string, scopedVars?: ScopedVars, format?: string) => string;

export interface GrafanaTheme {
  name: string;
  isDark: boolean;
  isLight: boolean;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  shape: ThemeShape;
  visualization: ThemeVisualization;
  components: ThemeComponents;
}

export interface ThemeColors {
  mode: 'dark' | 'light';
  primary: ThemeColorDefinition;
  secondary: ThemeColorDefinition;
  info: ThemeColorDefinition;
  error: ThemeColorDefinition;
  success: ThemeColorDefinition;
  warning: ThemeColorDefinition;
  text: ThemeTextColors;
  background: ThemeBackgroundColors;
  border: ThemeBorderColors;
  action: ThemeActionColors;
  gradients: ThemeGradients;
}

export interface ThemeColorDefinition {
  main: string;
  shade: string;
  text: string;
  border: string;
  transparent: string;
}

export interface ThemeTextColors {
  primary: string;
  secondary: string;
  disabled: string;
  link: string;
  maxContrast: string;
}

export interface ThemeBackgroundColors {
  canvas: string;
  primary: string;
  secondary: string;
}

export interface ThemeBorderColors {
  weak: string;
  medium: string;
  strong: string;
}

export interface ThemeActionColors {
  hover: string;
  focus: string;
  selected: string;
  disabledBackground: string;
  disabledText: string;
}

export interface ThemeGradients {
  brandVertical: string;
  brandHorizontal: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  h1: ThemeTypographyVariant;
  h2: ThemeTypographyVariant;
  h3: ThemeTypographyVariant;
  h4: ThemeTypographyVariant;
  h5: ThemeTypographyVariant;
  h6: ThemeTypographyVariant;
  body: ThemeTypographyVariant;
  bodySmall: ThemeTypographyVariant;
  code: ThemeTypographyVariant;
}

export interface ThemeTypographyVariant {
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: string;
  fontFamily?: string;
}

export interface ThemeSpacing {
  gridSize: number;
  baseUnit: string;
  insetSquishMd: string;
}

export interface ThemeShape {
  borderRadius: string;
}

export interface ThemeVisualization {
  palette: string[];
  getColorByName: (name: string) => string;
  sharedColors: string[];
  hues: Record<string, string[]>;
  alpha: number;
}

export interface ThemeComponents {
  panel: {
    padding: number;
    headerHeight: number;
    background: string;
    border: string;
    boxShadow: string;
  };
  sidemenu: {
    width: number;
  };
  menuTabs: {
    height: number;
  };
  horizontalDrawer: {
    defaultHeight: number;
  };
}

export enum PluginType {
  panel = 'panel',
  datasource = 'datasource',
  app = 'app',
  renderer = 'renderer',
  secretsmanager = 'secretsmanager',
}

export enum PluginState {
  alpha = 'alpha',
  beta = 'beta',
  stable = 'stable',
  deprecated = 'deprecated',
}

export enum PluginSignatureStatus {
  internal = 'internal',
  valid = 'valid',
  invalid = 'invalid',
  modified = 'modified',
  unsigned = 'unsigned',
}

export interface PluginMetaInfo {
  author: {
    name: string;
    url?: string;
  };
  description: string;
  links: Array<{
    name: string;
    url: string;
  }>;
  logos: {
    small: string;
    large: string;
  };
  build?: {
    time?: number;
    repo?: string;
    branch?: string;
    hash?: string;
  };
  screenshots: Array<{
    name: string;
    path: string;
  }>;
  version: string;
  updated: string;
  keywords?: string[];
}

export interface PluginDependencies {
  grafanaVersion: string;
  plugins: PluginDependencyInfo[];
}

export interface PluginDependencyInfo {
  id: string;
  name: string;
  version: string;
  type: PluginType;
}

export interface PluginInclude {
  type: string;
  name: string;
  path?: string;
  component?: string;
  role?: string;
  addToNav?: boolean;
  defaultNav?: boolean;
}

// ============================================================================
// PANEL PLUGIN BUILDER
// ============================================================================

export class PanelPluginBuilder<TOptions = any, TFieldOptions = any> {
  private plugin: Partial<PanelPlugin<TOptions, TFieldOptions>> = {};
  private optionEditorsBuilder?: PanelOptionEditorsBuilder<TOptions>;
  private fieldConfigBuilder?: FieldConfigOptionsRegistry<TFieldOptions>;

  constructor(panel: ComponentType<PanelProps<TOptions>>) {
    this.plugin.panel = panel;
  }

  setId(id: string): this {
    this.plugin.id = id;
    return this;
  }

  setName(name: string): this {
    this.plugin.name = name;
    return this;
  }

  setMeta(meta: PanelPluginMeta): this {
    this.plugin.meta = meta;
    return this;
  }

  setDefaults(defaults: TOptions): this {
    this.plugin.defaults = defaults;
    return this;
  }

  setFieldConfigDefaults(defaults: FieldConfigSource<TFieldOptions>): this {
    this.plugin.fieldConfigDefaults = defaults;
    return this;
  }

  setEditor(editor: ComponentType<PanelEditorProps<TOptions>>): this {
    this.plugin.editor = editor;
    return this;
  }

  setDataSupport(support: PanelDataSupport): this {
    this.plugin.dataSupport = support;
    return this;
  }

  setMigrationHandler(handler: (panel: PanelModel<TOptions>) => Partial<TOptions>): this {
    this.plugin.onPanelMigration = handler;
    return this;
  }

  setSuggestionsSupplier(supplier: PanelSuggestionsSupplier<TOptions>): this {
    this.plugin.suggestionsSupplier = supplier;
    return this;
  }

  useOptionEditors(builderFn: (builder: PanelOptionEditorsBuilder<TOptions>) => void): this {
    this.optionEditorsBuilder = new PanelOptionEditorsBuilderImpl<TOptions>();
    builderFn(this.optionEditorsBuilder);
    this.plugin.optionEditors = this.optionEditorsBuilder;
    return this;
  }

  useFieldConfig(builderFn: (registry: FieldConfigOptionsRegistry<TFieldOptions>) => void): this {
    this.fieldConfigBuilder = {
      standardOptions: {},
      customOptions: new CustomFieldConfigRegistryImpl<TFieldOptions>(),
    };
    builderFn(this.fieldConfigBuilder);
    this.plugin.fieldConfigRegistry = this.fieldConfigBuilder;
    return this;
  }

  build(): PanelPlugin<TOptions, TFieldOptions> {
    if (!this.plugin.id || !this.plugin.name || !this.plugin.panel) {
      throw new Error('Panel plugin requires id, name, and panel component');
    }
    return this.plugin as PanelPlugin<TOptions, TFieldOptions>;
  }
}

// Implementation classes (would be more complete in real implementation)
class PanelOptionEditorsBuilderImpl<TOptions> implements PanelOptionEditorsBuilder<TOptions> {
  private editors: Array<PanelOptionEditorConfig<TOptions, any, any>> = [];

  addRadio<TValue = any>(config: PanelOptionEditorConfig<TOptions, TValue, RadioFieldConfigSettings<TValue>>): this {
    this.editors.push(config);
    return this;
  }

  addSelect<TValue = any>(config: PanelOptionEditorConfig<TOptions, TValue, SelectFieldConfigSettings<TValue>>): this {
    this.editors.push(config);
    return this;
  }

  addTextInput(config: PanelOptionEditorConfig<TOptions, string, StringFieldConfigSettings>): this {
    this.editors.push(config);
    return this;
  }

  addNumberInput(config: PanelOptionEditorConfig<TOptions, number, NumberFieldConfigSettings>): this {
    this.editors.push(config);
    return this;
  }

  addBooleanSwitch(config: PanelOptionEditorConfig<TOptions, boolean, BooleanFieldConfigSettings>): this {
    this.editors.push(config);
    return this;
  }

  addSlider(config: PanelOptionEditorConfig<TOptions, number, SliderFieldConfigSettings>): this {
    this.editors.push(config);
    return this;
  }

  addColorPicker(config: PanelOptionEditorConfig<TOptions, string, ColorFieldConfigSettings>): this {
    this.editors.push(config);
    return this;
  }

  addCustomEditor<TValue = any>(config: PanelOptionEditorConfig<TOptions, TValue, CustomFieldConfigSettings<TValue>>): this {
    this.editors.push(config);
    return this;
  }

  addNestedOptions<TNestedOptions>(config: NestedPanelOptionConfig<TOptions, TNestedOptions>): this {
    // Implementation would handle nested options
    return this;
  }
}

class CustomFieldConfigRegistryImpl<TFieldOptions> implements CustomFieldConfigRegistry<TFieldOptions> {
  private configs: Array<CustomFieldConfig<TFieldOptions, any>> = [];

  addCustomFieldConfig<TValue>(config: CustomFieldConfig<TFieldOptions, TValue>): void {
    this.configs.push(config);
  }

  getCustomFieldConfigs(): Array<CustomFieldConfig<TFieldOptions, any>> {
    return this.configs;
  }
}