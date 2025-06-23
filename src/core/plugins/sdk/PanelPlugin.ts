/**
 * Panel Plugin SDK
 * Helpers for creating Analytics-compatible panel plugins
 */

import { ComponentType } from 'react';
import {
  PanelPlugin as PanelPluginType,
  PanelPluginMeta,
  PanelProps,
  PanelEditorProps,
  PluginType,
  PluginState,
  PluginSignature,
  OptionEditorConfig,
  LoadingState
} from '../types';

export class PanelPluginBuilder<TOptions = any> {
  private plugin: Partial<PanelPluginType<TOptions>> = {};

  constructor(panel: ComponentType<PanelProps<TOptions>>) {
    this.plugin.panel = panel;
  }

  setId(id: string): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as PanelPluginMeta;
    }
    this.plugin.meta.id = id;
    this.plugin.meta.type = PluginType.Panel;
    return this;
  }

  setName(name: string): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as PanelPluginMeta;
    }
    this.plugin.meta.name = name;
    return this;
  }

  setDescription(description: string): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as PanelPluginMeta;
    }
    if (!this.plugin.meta.info) {
      this.plugin.meta.info = {} as any;
    }
    this.plugin.meta.info.description = description;
    return this;
  }

  setEditor(editor: ComponentType<PanelEditorProps<TOptions>>): this {
    this.plugin.editor = editor;
    return this;
  }

  setDefaults(defaults: TOptions): this {
    this.plugin.defaults = defaults;
    return this;
  }

  setSort(sort: number): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as PanelPluginMeta;
    }
    this.plugin.meta.sort = sort;
    return this;
  }

  setState(state: PluginState): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as PanelPluginMeta;
    }
    this.plugin.meta.state = state;
    return this;
  }

  setSkipDataQuery(skip: boolean): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as PanelPluginMeta;
    }
    this.plugin.meta.skipDataQuery = skip;
    return this;
  }

  hideFromList(hide: boolean = true): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as PanelPluginMeta;
    }
    this.plugin.meta.hideFromList = hide;
    return this;
  }

  addOption<TValue = any>(option: OptionEditorConfig<TOptions, TValue>): this {
    if (!this.plugin.optionEditors) {
      this.plugin.optionEditors = [];
    }
    this.plugin.optionEditors.push(option);
    return this;
  }

  addNumberOption(config: {
    path: string;
    name: string;
    description?: string;
    defaultValue?: number;
    settings?: {
      min?: number;
      max?: number;
      step?: number;
      placeholder?: string;
    };
    showIf?: (options: TOptions) => boolean;
    category?: string[];
  }): this {
    return this.addOption({
      ...config,
      editor: NumberOptionEditor as any,
    });
  }

  addTextOption(config: {
    path: string;
    name: string;
    description?: string;
    defaultValue?: string;
    settings?: {
      placeholder?: string;
      maxLength?: number;
      rows?: number;
    };
    showIf?: (options: TOptions) => boolean;
    category?: string[];
  }): this {
    return this.addOption({
      ...config,
      editor: TextOptionEditor as any,
    });
  }

  addBooleanOption(config: {
    path: string;
    name: string;
    description?: string;
    defaultValue?: boolean;
    showIf?: (options: TOptions) => boolean;
    category?: string[];
  }): this {
    return this.addOption({
      ...config,
      editor: BooleanOptionEditor as any,
    });
  }

  addSelectOption<T = any>(config: {
    path: string;
    name: string;
    description?: string;
    defaultValue?: T;
    settings: {
      options: Array<{ label: string; value: T; description?: string }>;
    };
    showIf?: (options: TOptions) => boolean;
    category?: string[];
  }): this {
    return this.addOption({
      ...config,
      editor: SelectOptionEditor as any,
    });
  }

  addColorOption(config: {
    path: string;
    name: string;
    description?: string;
    defaultValue?: string;
    settings?: {
      allowTransparent?: boolean;
      theme?: 'light' | 'dark';
    };
    showIf?: (options: TOptions) => boolean;
    category?: string[];
  }): this {
    return this.addOption({
      ...config,
      editor: ColorOptionEditor as any,
    });
  }

  addUnitOption(config: {
    path: string;
    name: string;
    description?: string;
    defaultValue?: string;
    showIf?: (options: TOptions) => boolean;
    category?: string[];
  }): this {
    return this.addOption({
      ...config,
      editor: UnitOptionEditor as any,
    });
  }

  build(): PanelPluginType<TOptions> {
    // Ensure required fields
    if (!this.plugin.meta?.id) {
      throw new Error('Panel plugin must have an ID');
    }

    if (!this.plugin.meta.name) {
      throw new Error('Panel plugin must have a name');
    }

    if (!this.plugin.panel) {
      throw new Error('Panel plugin must have a panel component');
    }

    // Set defaults
    if (!this.plugin.meta.type) {
      this.plugin.meta.type = PluginType.Panel;
    }

    if (!this.plugin.meta.info) {
      this.plugin.meta.info = {
        author: { name: 'Manufacturing AnalyticsPlatform' },
        description: this.plugin.meta.name,
        logos: {
          small: 'public/img/icn-panel.svg',
          large: 'public/img/icn-panel.svg'
        },
        version: '1.0.0',
        updated: new Date().toISOString()
      };
    }

    if (!this.plugin.meta.signature) {
      this.plugin.meta.signature = PluginSignature.Internal;
    }

    if (!this.plugin.meta.module) {
      this.plugin.meta.module = `app/plugins/panel/${this.plugin.meta.id}/module`;
    }

    if (!this.plugin.meta.baseUrl) {
      this.plugin.meta.baseUrl = `public/app/plugins/panel/${this.plugin.meta.id}`;
    }

    return this.plugin as PanelPluginType<TOptions>;
  }
}

// Option Editor Components (these would be actual React components)
const NumberOptionEditor: ComponentType<any> = (() => null) as any;
const TextOptionEditor: ComponentType<any> = (() => null) as any;
const BooleanOptionEditor: ComponentType<any> = (() => null) as any;
const SelectOptionEditor: ComponentType<any> = (() => null) as any;
const ColorOptionEditor: ComponentType<any> = (() => null) as any;
const UnitOptionEditor: ComponentType<any> = (() => null) as any;

// Helper function to create panel plugins
export function createPanelPlugin<TOptions = any>(
  panel: ComponentType<PanelProps<TOptions>>
): PanelPluginBuilder<TOptions> {
  return new PanelPluginBuilder(panel);
}

// Standard panel helpers
export const standardFieldConfig = {
  displayName: {
    path: 'displayName',
    name: 'Display name',
    description: 'Change the field or series name',
    category: ['Display'],
  },
  unit: {
    path: 'unit',
    name: 'Unit',
    description: 'Value units',
    category: ['Display'],
  },
  decimals: {
    path: 'decimals',
    name: 'Decimals',
    description: 'Number of decimal places to show',
    category: ['Display'],
  },
  min: {
    path: 'min',
    name: 'Min',
    description: 'Minimum expected value',
    category: ['Scale'],
  },
  max: {
    path: 'max',
    name: 'Max',
    description: 'Maximum expected value',
    category: ['Scale'],
  },
};

// Panel data helpers
export function isPanelDataEmpty(data: PanelProps['data']): boolean {
  return !data.series || data.series.length === 0;
}

export function isPanelDataLoading(data: PanelProps['data']): boolean {
  return data.state === LoadingState.Loading;
}

export function isPanelDataError(data: PanelProps['data']): boolean {
  return data.state === LoadingState.Error;
}