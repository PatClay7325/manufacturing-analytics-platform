/**
 * AnalyticsPlatform Variable System - Dynamic Dashboard Variables
 * Adapted from @analyticsPlatform/scenes variable system for Next.js manufacturing analyticsPlatform
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronDownIcon, XMarkIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Core Variable Types
export enum VariableType {
  Query = 'query',
  Custom = 'custom', 
  Constant = 'constant',
  DataSource = 'datasource',
  Interval = 'interval',
  TextBox = 'textbox',
  Adhoc = 'adhoc'
}

export interface VariableOption {
  text: string;
  value: any;
  selected?: boolean;
}

export interface BaseVariable {
  name: string;
  type: VariableType;
  label?: string;
  description?: string;
  hide?: VariableHide;
  skipUrlSync?: boolean;
  multi?: boolean;
  includeAll?: boolean;
  allValue?: string;
  current: {
    text: string | string[];
    value: any;
  };
  options: VariableOption[];
  query?: string;
  regex?: string;
  sort?: VariableSort;
  refresh?: VariableRefresh;
  datasource?: {
    type: string;
    uid: string;
  };
  rootStateKey?: string;
}

export enum VariableHide {
  DontHide = 0,
  HideLabel = 1,
  HideVariable = 2
}

export enum VariableSort {
  Disabled = 0,
  AlphabeticalAsc = 1,
  AlphabeticalDesc = 2,
  NumericalAsc = 3,
  NumericalDesc = 4,
  AlphabeticalCaseInsensitiveAsc = 5,
  AlphabeticalCaseInsensitiveDesc = 6
}

export enum VariableRefresh {
  Never = 0,
  OnDashboardLoad = 1,
  OnTimeRangeChanged = 2
}

export interface QueryVariable extends BaseVariable {
  type: VariableType.Query;
  query: string;
  datasource: {
    type: string;
    uid: string;
  };
  definition?: string;
  useTags?: boolean;
  tagsQuery?: string;
  tagValuesQuery?: string;
}

export interface CustomVariable extends BaseVariable {
  type: VariableType.Custom;
  query: string; // comma-separated values
}

export interface ConstantVariable extends BaseVariable {
  type: VariableType.Constant;
  query: string; // constant value
}

export interface DataSourceVariable extends BaseVariable {
  type: VariableType.DataSource;
  query: string; // datasource type
}

export interface IntervalVariable extends BaseVariable {
  type: VariableType.Interval;
  query: string; // interval values
  auto?: boolean;
  auto_count?: number;
  auto_min?: string;
}

export interface TextBoxVariable extends BaseVariable {
  type: VariableType.TextBox;
  query: string; // default value
}

export interface AdhocVariable extends BaseVariable {
  type: VariableType.Adhoc;
  datasource: {
    type: string;
    uid: string;
  };
  filters: AdhocFilter[];
}

export interface AdhocFilter {
  key: string;
  operator: string;
  value: string;
}

export type Variable = QueryVariable | CustomVariable | ConstantVariable | DataSourceVariable | IntervalVariable | TextBoxVariable | AdhocVariable;

export interface VariableSystemProps {
  variables: Variable[];
  onVariableChange?: (name: string, value: any) => void;
  onVariablesUpdate?: (variables: Variable[]) => void;
  isEditing?: boolean;
  className?: string;
}

export function VariableSystem({
  variables,
  onVariableChange,
  onVariablesUpdate,
  isEditing = false,
  className
}: VariableSystemProps) {
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [isCreatingVariable, setIsCreatingVariable] = useState(false);

  // Filter visible variables
  const visibleVariables = useMemo(() => {
    return variables.filter(variable => variable.hide !== VariableHide.HideVariable);
  }, [variables]);

  const handleVariableUpdate = useCallback((updatedVariable: Variable) => {
    const newVariables = variables.map(v => 
      v.name === updatedVariable.name ? updatedVariable : v
    );
    onVariablesUpdate?.(newVariables);
    setEditingVariable(null);
  }, [variables, onVariablesUpdate]);

  const handleVariableAdd = useCallback((newVariable: Variable) => {
    onVariablesUpdate?.([...variables, newVariable]);
    setIsCreatingVariable(false);
  }, [variables, onVariablesUpdate]);

  const handleVariableDelete = useCallback((name: string) => {
    const newVariables = variables.filter(v => v.name !== name);
    onVariablesUpdate?.(newVariables);
  }, [variables, onVariablesUpdate]);

  if (visibleVariables.length === 0 && !isEditing) {
    return null;
  }

  return (
    <div className={clsx("bg-gray-50 border-b border-gray-200", className)}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-wrap">
            {visibleVariables.map((variable) => (
              <VariableControl
                key={variable.name}
                variable={variable}
                onValueChange={onVariableChange}
                onEdit={isEditing ? () => setEditingVariable(variable) : undefined}
                onDelete={isEditing ? () => handleVariableDelete(variable.name) : undefined}
              />
            ))}
          </div>
          
          {isEditing && (
            <button
              onClick={() => setIsCreatingVariable(true)}
              className="flex items-center px-3 py-1 text-sm text-primary-600 hover:text-primary-700 focus:outline-none"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Variable
            </button>
          )}
        </div>
      </div>

      {/* Variable Editor Modal */}
      {(editingVariable || isCreatingVariable) && (
        <VariableEditor
          variable={editingVariable}
          onSave={editingVariable ? handleVariableUpdate : handleVariableAdd}
          onCancel={() => {
            setEditingVariable(null);
            setIsCreatingVariable(false);
          }}
        />
      )}
    </div>
  );
}

// Variable Control Component
interface VariableControlProps {
  variable: Variable;
  onValueChange?: (name: string, value: any) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function VariableControl({ variable, onValueChange, onEdit, onDelete }: VariableControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleValueChange = useCallback((value: any) => {
    const newCurrent = {
      text: Array.isArray(value) ? value.map(v => v.text) : value.text,
      value: Array.isArray(value) ? value.map(v => v.value) : value.value
    };
    
    onValueChange?.(variable.name, newCurrent);
    setIsOpen(false);
  }, [variable.name, onValueChange]);

  // Don't render if hidden
  if (variable.hide === VariableHide.HideVariable) {
    return null;
  }

  const showLabel = variable.hide !== VariableHide.HideLabel && variable.label;
  const currentText = Array.isArray(variable.current.text) 
    ? variable.current.text.join(', ') 
    : variable.current.text;

  return (
    <div className="relative flex items-center space-x-2">
      {/* Label */}
      {showLabel && (
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
          {variable.label}:
        </label>
      )}

      {/* Variable Control */}
      <div className="relative">
        {variable.type === VariableType.TextBox ? (
          <TextBoxControl
            variable={variable as TextBoxVariable}
            onValueChange={handleValueChange}
          />
        ) : variable.type === VariableType.Adhoc ? (
          <AdhocControl
            variable={variable as AdhocVariable}
            onValueChange={handleValueChange}
          />
        ) : (
          <DropdownControl
            variable={variable}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            onValueChange={handleValueChange}
          />
        )}
      </div>

      {/* Edit Actions */}
      {(onEdit || onDelete) && (
        <div className="flex items-center space-x-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-gray-600 rounded focus:outline-none"
              title="Edit variable"
            >
              <PencilIcon className="w-3 h-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600 rounded focus:outline-none"
              title="Delete variable"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Dropdown Control Component
interface DropdownControlProps {
  variable: Variable;
  isOpen: boolean;
  onToggle: () => void;
  onValueChange: (value: any) => void;
}

function DropdownControl({ variable, isOpen, onToggle, onValueChange }: DropdownControlProps) {
  const currentText = Array.isArray(variable.current.text) 
    ? variable.current.text.join(', ') 
    : variable.current.text;

  const handleOptionSelect = useCallback((option: VariableOption) => {
    if (variable.multi) {
      // Multi-select logic
      const currentValues = Array.isArray(variable.current.value) 
        ? variable.current.value 
        : [variable.current.value];
      
      const isSelected = currentValues.includes(option.value);
      let newValues;
      
      if (isSelected) {
        newValues = currentValues.filter((v: any) => v !== option.value);
      } else {
        newValues = [...currentValues, option.value];
      }
      
      const newOptions = variable.options.map(opt => ({
        ...opt,
        selected: newValues.includes(opt.value)
      }));
      
      onValueChange(newOptions.filter(opt => opt.selected));
    } else {
      // Single select
      onValueChange(option);
    }
  }, [variable, onValueChange]);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center justify-between min-w-[120px] px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span className="truncate">{currentText}</span>
        <ChevronDownIcon className={clsx(
          "w-4 h-4 ml-2 transition-transform",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={onToggle} />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] max-h-60 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg z-50">
            {variable.includeAll && (
              <button
                onClick={() => handleOptionSelect({ text: 'All', value: '$__all' })}
                className={clsx(
                  "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none",
                  variable.current.value === '$__all' && "bg-primary-50 text-primary-700"
                )}
              >
                All
              </button>
            )}
            
            {variable.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(option)}
                className={clsx(
                  "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none flex items-center justify-between",
                  (variable.multi ? option.selected : variable.current.value === option.value) && 
                  "bg-primary-50 text-primary-700"
                )}
              >
                <span className="truncate">{option.text}</span>
                {variable.multi && option.selected && (
                  <span className="text-primary-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// TextBox Control Component
interface TextBoxControlProps {
  variable: TextBoxVariable;
  onValueChange: (value: any) => void;
}

function TextBoxControl({ variable, onValueChange }: TextBoxControlProps) {
  const [value, setValue] = useState(variable.current.text as string);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onValueChange({ text: value, value });
  }, [value, onValueChange]);

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onValueChange({ text: value, value })}
        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        placeholder={variable.label || variable.name}
      />
    </form>
  );
}

// Adhoc Control Component
interface AdhocControlProps {
  variable: AdhocVariable;
  onValueChange: (value: any) => void;
}

function AdhocControl({ variable, onValueChange }: AdhocControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  const addFilter = useCallback(() => {
    const newFilter: AdhocFilter = { key: '', operator: '=', value: '' };
    const newFilters = [...variable.filters, newFilter];
    onValueChange({ ...variable, filters: newFilters });
  }, [variable, onValueChange]);

  const updateFilter = useCallback((index: number, updates: Partial<AdhocFilter>) => {
    const newFilters = variable.filters.map((filter, i) => 
      i === index ? { ...filter, ...updates } : filter
    );
    onValueChange({ ...variable, filters: newFilters });
  }, [variable, onValueChange]);

  const removeFilter = useCallback((index: number) => {
    const newFilters = variable.filters.filter((_, i) => i !== index);
    onValueChange({ ...variable, filters: newFilters });
  }, [variable, onValueChange]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span>Filters ({variable.filters.length})</span>
        <ChevronDownIcon className="w-4 h-4 ml-2" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-96 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-4">
            <div className="space-y-3">
              {variable.filters.map((filter, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={filter.key}
                    onChange={(e) => updateFilter(index, { key: e.target.value })}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Key"
                  />
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, { operator: e.target.value })}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value="=~">=~</option>
                    <option value="!~">!~</option>
                  </select>
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Value"
                  />
                  <button
                    onClick={() => removeFilter(index)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded focus:outline-none"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <button
                onClick={addFilter}
                className="w-full py-2 text-sm text-primary-600 border border-primary-300 border-dashed rounded hover:bg-primary-50 focus:outline-none"
              >
                + Add Filter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Variable Editor Component
interface VariableEditorProps {
  variable?: Variable | null;
  onSave: (variable: Variable) => void;
  onCancel: () => void;
}

function VariableEditor({ variable, onSave, onCancel }: VariableEditorProps) {
  const [formData, setFormData] = useState<Partial<Variable>>({
    name: variable?.name || '',
    type: variable?.type || VariableType.Query,
    label: variable?.label || '',
    description: variable?.description || '',
    hide: variable?.hide || VariableHide.DontHide,
    multi: variable?.multi || false,
    includeAll: variable?.includeAll || false,
    query: variable?.query || '',
    sort: variable?.sort || VariableSort.Disabled,
    refresh: variable?.refresh || VariableRefresh.OnDashboardLoad,
    regex: variable?.regex || '',
    allValue: variable?.allValue || '',
    current: variable?.current || { text: '', value: '' },
    options: variable?.options || [],
    datasource: variable?.datasource,
    ...variable
  });

  const handleSave = useCallback(() => {
    if (!formData.name || !formData.type) return;
    
    onSave(formData as Variable);
  }, [formData, onSave]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {variable ? 'Edit Variable' : 'Create Variable'}
          </h3>
        </div>
        
        <div className="px-6 py-4 space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="variable_name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as VariableType })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={VariableType.Query}>Query</option>
                <option value={VariableType.Custom}>Custom</option>
                <option value={VariableType.Constant}>Constant</option>
                <option value={VariableType.DataSource}>Data source</option>
                <option value={VariableType.Interval}>Interval</option>
                <option value={VariableType.TextBox}>Text box</option>
                <option value={VariableType.Adhoc}>Ad hoc filters</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Display name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hide</label>
              <select
                value={formData.hide}
                onChange={(e) => setFormData({ ...formData, hide: parseInt(e.target.value) as VariableHide })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={VariableHide.DontHide}>Don't hide</option>
                <option value={VariableHide.HideLabel}>Hide label</option>
                <option value={VariableHide.HideVariable}>Hide variable</option>
              </select>
            </div>
          </div>

          {/* Query */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.type === VariableType.Query ? 'Query' : 
               formData.type === VariableType.Custom ? 'Values (comma separated)' :
               formData.type === VariableType.Constant ? 'Value' :
               'Configuration'}
            </label>
            <textarea
              value={formData.query}
              onChange={(e) => setFormData({ ...formData, query: e.target.value })}
              className="w-full h-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={getQueryPlaceholder(formData.type)}
            />
          </div>

          {/* Options */}
          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.multi}
                onChange={(e) => setFormData({ ...formData, multi: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Multi-value</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.includeAll}
                onChange={(e) => setFormData({ ...formData, includeAll: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Include All option</span>
            </label>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort</label>
              <select
                value={formData.sort}
                onChange={(e) => setFormData({ ...formData, sort: parseInt(e.target.value) as VariableSort })}
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={VariableSort.Disabled}>Disabled</option>
                <option value={VariableSort.AlphabeticalAsc}>Alphabetical (asc)</option>
                <option value={VariableSort.AlphabeticalDesc}>Alphabetical (desc)</option>
                <option value={VariableSort.NumericalAsc}>Numerical (asc)</option>
                <option value={VariableSort.NumericalDesc}>Numerical (desc)</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {variable ? 'Update' : 'Create'} Variable
          </button>
        </div>
      </div>
    </div>
  );
}

function getQueryPlaceholder(type?: VariableType): string {
  switch (type) {
    case VariableType.Query:
      return 'label_values(metric_name, label_name)';
    case VariableType.Custom:
      return 'value1, value2, value3';
    case VariableType.Constant:
      return 'constant_value';
    case VariableType.DataSource:
      return 'prometheus';
    case VariableType.Interval:
      return '1m,5m,10m,30m,1h,6h,12h,1d,7d,14d,30d';
    case VariableType.TextBox:
      return 'default_value';
    default:
      return '';
  }
}