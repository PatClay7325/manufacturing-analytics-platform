/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Panel Registry - Central registry for all panel types and their configurations
 * 
 * Original implementation for managing visualization components
 */

import { PanelType } from '@/types/panel';
import { Panel, FieldConfig, TimeRange } from '@/types/dashboard';
import { DataFrame } from '@/types/datasource';

// ============================================================================
// PANEL PLUGIN INTERFACE
// ============================================================================

export interface PanelPlugin<TOptions = any> {
  id: PanelType;
  name: string;
  description: string;
  category: PanelCategory;
  component: React.ComponentType<PanelProps<TOptions>>;
  defaults: TOptions;
  fieldConfigDefaults?: Partial<FieldConfig>;
  configEditor?: React.ComponentType<PanelConfigEditorProps<TOptions>>;
  suggestedVisualization?: VisualizationSuggestion;
  manufacturing?: ManufacturingPanelConfig;
  meta: PanelPluginMeta;
}

export interface PanelProps<TOptions = any> {
  id: number;
  data: DataFrame[];
  timeRange: TimeRange;
  timeZone: string;
  options: TOptions;
  fieldConfig: FieldConfig;
  transparent: boolean;
  width: number;
  height: number;
  onOptionsChange: (options: TOptions) => void;
  onFieldConfigChange: (fieldConfig: FieldConfig) => void;
  onChangeTimeRange: (timeRange: TimeRange) => void;
  renderCounter: number;
  eventBus: EventBus;
}

export interface PanelConfigEditorProps<TOptions = any> {
  panel: Panel;
  options: TOptions;
  onOptionsChange: (options: TOptions) => void;
  data: DataFrame[];
}

export type PanelCategory = 
  | 'visualization'
  | 'graph'
  | 'chart'
  | 'table'
  | 'text'
  | 'manufacturing'
  | 'quality'
  | 'maintenance'
  | 'energy'
  | 'advanced';

export interface VisualizationSuggestion {
  name: string;
  description: string;
  icon: string;
  score: number;
  dataRequirements: DataRequirement[];
}

export interface DataRequirement {
  fieldType: 'time' | 'number' | 'string' | 'boolean';
  required: boolean;
  multiple: boolean;
  description: string;
}

export interface ManufacturingPanelConfig {
  equipmentTypes?: string[];
  processes?: string[];
  qualityMetrics?: boolean;
  oeIntegration?: boolean;
  maintenanceSchedule?: boolean;
  energyMonitoring?: boolean;
}

export interface PanelPluginMeta {
  info: {
    author: string;
    description: string;
    version: string;
    keywords: string[];
  };
  dependencies?: string[];
  screenshots?: string[];
  documentation?: string;
}

export interface EventBus {
  emit: (event: string, payload?: any) => void;
  subscribe: (event: string, handler: (payload?: any) => void) => () => void;
}

// ============================================================================
// PANEL REGISTRY CLASS
// ============================================================================

export class PanelRegistry {
  private plugins: Map<PanelType, PanelPlugin> = new Map();
  private categoryIndex: Map<PanelCategory, PanelType[]> = new Map();
  
  constructor() {
    this.initializeCorePanels();
  }

  register<TOptions = any>(plugin: PanelPlugin<TOptions>): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Panel plugin ${plugin.id} is already registered`);
      return;
    }

    this.plugins.set(plugin.id, plugin);
    
    if (!this.categoryIndex.has(plugin.category)) {
      this.categoryIndex.set(plugin.category, []);
    }
    this.categoryIndex.get(plugin.category)!.push(plugin.id);
    
    console.log(`Registered panel plugin: ${plugin.id}`);
  }

  getPlugin(id: PanelType): PanelPlugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): PanelPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPluginsByCategory(category: PanelCategory): PanelPlugin[] {
    const ids = this.categoryIndex.get(category) || [];
    return ids.map(id => this.plugins.get(id)!).filter(Boolean);
  }

  getCategories(): PanelCategory[] {
    return Array.from(this.categoryIndex.keys());
  }

  searchPlugins(query: string): PanelPlugin[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllPlugins().filter(plugin =>
      plugin.name.toLowerCase().includes(lowercaseQuery) ||
      plugin.description.toLowerCase().includes(lowercaseQuery) ||
      plugin.meta.info.keywords.some(keyword => 
        keyword.toLowerCase().includes(lowercaseQuery)
      )
    );
  }

  getManufacturingPanels(): PanelPlugin[] {
    return this.getAllPlugins().filter(plugin => 
      plugin.category === 'manufacturing' || 
      plugin.category === 'quality' ||
      plugin.category === 'maintenance' ||
      plugin.category === 'energy' ||
      plugin.manufacturing
    );
  }

  suggestPanels(data: DataFrame[]): VisualizationSuggestion[] {
    const suggestions: VisualizationSuggestion[] = [];
    
    this.getAllPlugins().forEach(plugin => {
      if (plugin.suggestedVisualization) {
        const score = this.calculateSuggestionScore(plugin.suggestedVisualization, data);
        if (score > 0) {
          suggestions.push({
            ...plugin.suggestedVisualization,
            score
          });
        }
      }
    });
    
    return suggestions.sort((a, b) => b.score - a.score);
  }

  getDefaultOptions(panelType: PanelType): any {
    const plugin = this.getPlugin(panelType);
    return plugin ? plugin.defaults : {};
  }

  getDefaultFieldConfig(panelType: PanelType): Partial<FieldConfig> {
    const plugin = this.getPlugin(panelType);
    return plugin?.fieldConfigDefaults || {};
  }

  hasPlugin(panelType: PanelType): boolean {
    return this.plugins.has(panelType);
  }

  unregister(panelType: PanelType): boolean {
    const plugin = this.plugins.get(panelType);
    if (!plugin) {
      return false;
    }

    this.plugins.delete(panelType);
    
    const categoryPanels = this.categoryIndex.get(plugin.category);
    if (categoryPanels) {
      const index = categoryPanels.indexOf(panelType);
      if (index > -1) {
        categoryPanels.splice(index, 1);
      }
    }
    
    return true;
  }

  private initializeCorePanels(): void {
    // Core panels will register themselves during module initialization
  }

  private calculateSuggestionScore(
    suggestion: VisualizationSuggestion, 
    data: DataFrame[]
  ): number {
    if (!data.length) return 0;
    
    let score = suggestion.score;
    const frame = data[0];
    const hasTimeField = frame.fields.some(field => field.type === 'time');
    const hasNumberFields = frame.fields.some(field => field.type === 'number');
    const hasStringFields = frame.fields.some(field => field.type === 'string');
    
    suggestion.dataRequirements.forEach(requirement => {
      let requirementMet = false;
      
      switch (requirement.fieldType) {
        case 'time':
          requirementMet = hasTimeField;
          break;
        case 'number':
          requirementMet = hasNumberFields;
          break;
        case 'string':
          requirementMet = hasStringFields;
          break;
        case 'boolean':
          requirementMet = frame.fields.some(field => field.type === 'boolean');
          break;
      }
      
      if (requirement.required && !requirementMet) {
        score = 0;
      } else if (requirementMet) {
        score += 10;
      }
    });
    
    return Math.max(0, score);
  }
}

export interface CreatePanelOptions {
  type: PanelType;
  title: string;
  width?: number;
  height?: number;
  options?: any;
  fieldConfig?: Partial<FieldConfig>;
  targets?: any[];
}

export function createPanelDefinition(options: CreatePanelOptions): Omit<Panel, 'id' | 'gridPos'> {
  const registry = panelRegistry;
  const plugin = registry.getPlugin(options.type);
  
  if (!plugin) {
    throw new Error(`Unknown panel type: ${options.type}`);
  }
  
  return {
    title: options.title,
    type: options.type,
    targets: options.targets || [],
    fieldConfig: {
      defaults: {
        ...registry.getDefaultFieldConfig(options.type).defaults,
        ...options.fieldConfig
      },
      overrides: []
    },
    options: {
      ...registry.getDefaultOptions(options.type),
      ...options.options
    },
    transformations: [],
    transparent: false,
    datasource: undefined,
    links: [],
    pluginVersion: plugin.meta.info.version
  };
}

export const panelRegistry = new PanelRegistry();
export default PanelRegistry;