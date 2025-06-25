'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  TrashIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import {
  FieldMapping as FieldMappingType,
  ColumnMapping,
  FieldType,
  TransformFunction,
  ImportType,
  FieldValidation
} from '@/types/import-export';

interface FieldMappingProps {
  sourceHeaders: string[];
  importType: ImportType;
  initialMapping?: FieldMappingType;
  onMappingChange: (mapping: FieldMappingType) => void;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
}

// Predefined target fields based on import type
const TARGET_FIELDS: Record<ImportType, { field: string; type: FieldType; required: boolean; description: string }[]> = {
  'dashboard-config': [
    { field: 'uid', type: 'string', required: true, description: 'Unique dashboard identifier' },
    { field: 'title', type: 'string', required: true, description: 'Dashboard title' },
    { field: 'description', type: 'string', required: false, description: 'Dashboard description' },
    { field: 'tags', type: 'array', required: false, description: 'Dashboard tags (comma-separated)' },
    { field: 'folderId', type: 'string', required: false, description: 'Target folder ID' },
    { field: 'version', type: 'number', required: false, description: 'Dashboard version' },
  ],
  'dashboard-data': [
    { field: 'uid', type: 'string', required: true, description: 'Dashboard identifier' },
    { field: 'panelId', type: 'number', required: true, description: 'Panel ID' },
    { field: 'timestamp', type: 'date', required: true, description: 'Data timestamp' },
    { field: 'value', type: 'number', required: true, description: 'Metric value' },
    { field: 'metric', type: 'string', required: false, description: 'Metric name' },
    { field: 'labels', type: 'json', required: false, description: 'Metric labels (JSON)' },
  ],
  'panel-data': [
    { field: 'panelId', type: 'number', required: true, description: 'Panel identifier' },
    { field: 'timestamp', type: 'date', required: true, description: 'Data timestamp' },
    { field: 'value', type: 'number', required: true, description: 'Data value' },
    { field: 'series', type: 'string', required: false, description: 'Series name' },
    { field: 'tags', type: 'json', required: false, description: 'Data tags (JSON)' },
  ],
  'template-batch': [
    { field: 'templateId', type: 'string', required: true, description: 'Template identifier' },
    { field: 'name', type: 'string', required: true, description: 'Dashboard name' },
    { field: 'variables', type: 'json', required: false, description: 'Template variables (JSON)' },
    { field: 'folderId', type: 'string', required: false, description: 'Target folder' },
  ],
  'metrics-data': [
    { field: 'timestamp', type: 'date', required: true, description: 'Metric timestamp' },
    { field: 'metric', type: 'string', required: true, description: 'Metric name' },
    { field: 'value', type: 'number', required: true, description: 'Metric value' },
    { field: 'labels', type: 'json', required: false, description: 'Metric labels' },
    { field: 'equipmentId', type: 'string', required: false, description: 'Equipment identifier' },
  ],
  'variables-config': [
    { field: 'name', type: 'string', required: true, description: 'Variable name' },
    { field: 'type', type: 'enum', required: true, description: 'Variable type' },
    { field: 'query', type: 'string', required: false, description: 'Variable query' },
    { field: 'options', type: 'json', required: false, description: 'Variable options (JSON)' },
    { field: 'defaultValue', type: 'string', required: false, description: 'Default value' },
  ]
};

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' },
  { value: 'json', label: 'JSON' },
  { value: 'enum', label: 'Enum' }
];

const TRANSFORM_FUNCTIONS: { value: TransformFunction; label: string }[] = [
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'trim', label: 'Trim Whitespace' },
  { value: 'parseNumber', label: 'Parse Number' },
  { value: 'parseDate', label: 'Parse Date' },
  { value: 'parseBoolean', label: 'Parse Boolean' },
  { value: 'splitArray', label: 'Split to Array' },
  { value: 'parseJSON', label: 'Parse JSON' }
];

export default function FieldMapping({
  sourceHeaders,
  importType,
  initialMapping,
  onMappingChange,
  onValidationChange,
  className = ''
}: FieldMappingProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [defaults, setDefaults] = useState<Record<string, any>>({});
  const [autoMapEnabled, setAutoMapEnabled] = useState(true);

  const targetFields = TARGET_FIELDS[importType] || [];

  // Initialize mappings
  useEffect(() => {
    if (initialMapping) {
      setMappings(initialMapping.mappings);
      setDefaults(initialMapping.defaults);
    } else if (autoMapEnabled) {
      autoMapFields();
    }
  }, [sourceHeaders, importType, initialMapping]);

  // Auto-map fields based on name similarity
  const autoMapFields = () => {
    const newMappings: ColumnMapping[] = [];
    
    for (const targetField of targetFields) {
      const sourceColumn = findBestMatch(targetField.field, sourceHeaders);
      if (sourceColumn) {
        newMappings.push({
          sourceColumn,
          targetField: targetField.field,
          fieldType: targetField.type,
          required: targetField.required,
          defaultValue: undefined
        });
      }
    }
    
    setMappings(newMappings);
  };

  // Find best matching source column for target field
  const findBestMatch = (targetField: string, headers: string[]): string | null => {
    const target = targetField.toLowerCase();
    
    // Exact match
    const exact = headers.find(h => h.toLowerCase() === target);
    if (exact) return exact;
    
    // Partial match
    const partial = headers.find(h => 
      h.toLowerCase().includes(target) || target.includes(h.toLowerCase())
    );
    if (partial) return partial;
    
    // Common aliases
    const aliases: Record<string, string[]> = {
      'uid': ['id', 'identifier', 'uuid', 'key'],
      'title': ['name', 'label', 'caption'],
      'description': ['desc', 'summary', 'details'],
      'timestamp': ['time', 'date', 'datetime', 'created'],
      'value': ['val', 'amount', 'quantity', 'measure'],
      'tags': ['tag', 'categories', 'labels'],
      'metric': ['measure', 'indicator', 'kpi'],
      'panelId': ['panel', 'widget', 'chart']
    };
    
    if (aliases[target]) {
      for (const alias of aliases[target]) {
        const match = headers.find(h => h.toLowerCase().includes(alias));
        if (match) return match;
      }
    }
    
    return null;
  };

  // Update mapping
  const updateMapping = (index: number, updates: Partial<ColumnMapping>) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    setMappings(newMappings);
    updateFieldMapping(newMappings, defaults);
  };

  // Add new mapping
  const addMapping = () => {
    const newMapping: ColumnMapping = {
      sourceColumn: '',
      targetField: '',
      fieldType: 'string',
      required: false
    };
    const newMappings = [...mappings, newMapping];
    setMappings(newMappings);
    updateFieldMapping(newMappings, defaults);
  };

  // Remove mapping
  const removeMapping = (index: number) => {
    const newMappings = mappings.filter((_, i) => i !== index);
    setMappings(newMappings);
    updateFieldMapping(newMappings, defaults);
  };

  // Update defaults
  const updateDefaults = (field: string, value: any) => {
    const newDefaults = { ...defaults, [field]: value };
    setDefaults(newDefaults);
    updateFieldMapping(mappings, newDefaults);
  };

  // Update field mapping and notify parent
  const updateFieldMapping = (newMappings: ColumnMapping[], newDefaults: Record<string, any>) => {
    const fieldMapping: FieldMappingType = {
      mappings: newMappings,
      transforms: [], // Will be populated by transforms section
      defaults: newDefaults
    };
    
    onMappingChange(fieldMapping);
    
    // Validate mapping
    const isValid = validateMapping(newMappings);
    onValidationChange?.(isValid);
  };

  // Validate current mapping
  const validateMapping = (currentMappings: ColumnMapping[]): boolean => {
    // Check required fields are mapped
    const requiredFields = targetFields.filter(f => f.required);
    const mappedTargets = currentMappings.map(m => m.targetField);
    
    for (const required of requiredFields) {
      if (!mappedTargets.includes(required.field)) {
        return false;
      }
    }
    
    // Check for duplicate mappings
    const targetCounts = mappedTargets.reduce((acc, target) => {
      acc[target] = (acc[target] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return !Object.values(targetCounts).some(count => count > 1);
  };

  // Get unmapped required fields
  const getUnmappedRequired = (): string[] => {
    const mappedTargets = mappings.map(m => m.targetField);
    return targetFields
      .filter(f => f.required && !mappedTargets.includes(f.field))
      .map(f => f.field);
  };

  // Get available target fields for dropdown
  const getAvailableTargets = (currentTarget?: string): typeof targetFields => {
    const usedTargets = mappings
      .map(m => m.targetField)
      .filter(t => t !== currentTarget);
    
    return targetFields.filter(f => !usedTargets.includes(f.field));
  };

  const unmappedRequired = getUnmappedRequired();
  const isValid = validateMapping(mappings);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Field Mapping</h3>
          <p className="text-sm text-gray-600">
            Map source columns to target fields for {importType.replace('-', ' ')} import
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoMapEnabled}
              onChange={(e) => {
                setAutoMapEnabled(e.target.checked);
                if (e.target.checked) autoMapFields();
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-map fields</span>
          </label>
          
          <button
            onClick={autoMapFields}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 inline mr-1" />
            Re-map
          </button>
        </div>
      </div>

      {/* Validation Status */}
      <div className="flex items-center space-x-2">
        {isValid ? (
          <>
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-700 font-medium">
              Mapping validation passed
            </span>
          </>
        ) : (
          <>
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <span className="text-sm text-red-700 font-medium">
              Mapping validation failed
            </span>
            {unmappedRequired.length > 0 && (
              <span className="text-sm text-red-600">
                - Missing required fields: {unmappedRequired.join(', ')}
              </span>
            )}
          </>
        )}
      </div>

      {/* Mapping Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Column Mappings</h4>
            <button
              onClick={addMapping}
              className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Mapping
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {mappings.map((mapping, index) => (
            <div key={index} className="p-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Source Column */}
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Source Column
                  </label>
                  <select
                    value={mapping.sourceColumn}
                    onChange={(e) => updateMapping(index, { sourceColumn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select column...</option>
                    {sourceHeaders.map((header, i) => (
                      <option key={i} value={header}>
                        {header || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Arrow */}
                <div className="col-span-1 flex justify-center">
                  <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                </div>

                {/* Target Field */}
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Target Field
                    {mapping.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <select
                    value={mapping.targetField}
                    onChange={(e) => {
                      const targetField = targetFields.find(f => f.field === e.target.value);
                      updateMapping(index, {
                        targetField: e.target.value,
                        fieldType: targetField?.type || 'string',
                        required: targetField?.required || false
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select field...</option>
                    {getAvailableTargets(mapping.targetField).map((field) => (
                      <option key={field.field} value={field.field}>
                        {field.field} ({field.type})
                      </option>
                    ))}
                  </select>
                  {mapping.targetField && (
                    <div className="text-xs text-gray-500 mt-1">
                      {targetFields.find(f => f.field === mapping.targetField)?.description}
                    </div>
                  )}
                </div>

                {/* Field Type */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={mapping.fieldType}
                    onChange={(e) => updateMapping(index, { fieldType: e.target.value as FieldType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transform */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Transform
                  </label>
                  <select
                    value={mapping.transform || ''}
                    onChange={(e) => updateMapping(index, { 
                      transform: e.target.value ? e.target.value as TransformFunction : undefined 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">None</option>
                    {TRANSFORM_FUNCTIONS.map((transform) => (
                      <option key={transform.value} value={transform.value}>
                        {transform.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeMapping(index)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Default Value */}
              {!mapping.sourceColumn && mapping.targetField && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={mapping.defaultValue || ''}
                    onChange={(e) => updateMapping(index, { defaultValue: e.target.value })}
                    placeholder="Enter default value..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          ))}

          {mappings.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <p>No field mappings configured.</p>
              <button
                onClick={addMapping}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                Add your first mapping
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Default Values Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Global Default Values</h4>
        <p className="text-sm text-gray-600 mb-4">
          Set default values for fields that are not mapped from source columns
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {targetFields
            .filter(field => !mappings.some(m => m.targetField === field.field))
            .map((field) => (
              <div key={field.field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.field}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'datetime-local' : 'text'}
                  value={defaults[field.field] || ''}
                  onChange={(e) => updateDefaults(field.field, e.target.value)}
                  placeholder={field.description}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
        </div>
      </div>

      {/* Mapping Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Mapping Summary</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>• {mappings.length} field mappings configured</div>
          <div>• {mappings.filter(m => m.sourceColumn).length} columns mapped from source</div>
          <div>• {Object.keys(defaults).length} global defaults set</div>
          <div>• {targetFields.filter(f => f.required).length} required fields ({unmappedRequired.length} unmapped)</div>
        </div>
      </div>
    </div>
  );
}