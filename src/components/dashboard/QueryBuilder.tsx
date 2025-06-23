'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Minus, Play, Code, Eye, EyeOff, ChevronDown, ChevronRight,
  Database, Filter, Group, SortAsc, Hash, Calendar, Type
} from 'lucide-react';

interface QueryField {
  name: string;
  type: 'string' | 'number' | 'datetime' | 'boolean';
  description?: string;
}

interface QueryCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
  type: 'where' | 'having';
}

interface QueryGroup {
  id: string;
  field: string;
  alias?: string;
  aggregation?: string;
}

interface QuerySort {
  id: string;
  field: string;
  direction: 'asc' | 'desc';
}

interface Query {
  id: string;
  name: string;
  dataSource: string;
  table: string;
  fields: string[];
  conditions: QueryCondition[];
  groups: QueryGroup[];
  sorts: QuerySort[];
  limit?: number;
  timeField?: string;
  timeRange?: {
    from: string;
    to: string;
  };
}

interface QueryBuilderProps {
  query?: Query;
  onQueryChange?: (query: Query) => void;
  onExecute?: (query: Query) => void;
  availableDataSources?: string[];
  className?: string;
}

const OPERATORS = {
  string: [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'not equals' },
    { value: 'LIKE', label: 'contains' },
    { value: 'NOT LIKE', label: 'does not contain' },
    { value: 'IN', label: 'is one of' },
    { value: 'NOT IN', label: 'is not one of' },
    { value: 'IS NULL', label: 'is empty' },
    { value: 'IS NOT NULL', label: 'is not empty' },
  ],
  number: [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'not equals' },
    { value: '>', label: 'greater than' },
    { value: '>=', label: 'greater than or equal' },
    { value: '<', label: 'less than' },
    { value: '<=', label: 'less than or equal' },
    { value: 'BETWEEN', label: 'between' },
    { value: 'IN', label: 'is one of' },
    { value: 'IS NULL', label: 'is empty' },
    { value: 'IS NOT NULL', label: 'is not empty' },
  ],
  datetime: [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'not equals' },
    { value: '>', label: 'after' },
    { value: '>=', label: 'after or equal' },
    { value: '<', label: 'before' },
    { value: '<=', label: 'before or equal' },
    { value: 'BETWEEN', label: 'between' },
  ],
  boolean: [
    { value: '=', label: 'is' },
    { value: '!=', label: 'is not' },
  ]
};

const AGGREGATIONS = [
  { value: '', label: 'None' },
  { value: 'COUNT', label: 'Count' },
  { value: 'SUM', label: 'Sum' },
  { value: 'AVG', label: 'Average' },
  { value: 'MIN', label: 'Minimum' },
  { value: 'MAX', label: 'Maximum' },
  { value: 'STDDEV', label: 'Standard Deviation' },
  { value: 'FIRST', label: 'First' },
  { value: 'LAST', label: 'Last' },
];

// Sample manufacturing fields
const MANUFACTURING_FIELDS: QueryField[] = [
  { name: 'timestamp', type: 'datetime', description: 'Measurement timestamp' },
  { name: 'workUnitId', type: 'string', description: 'Work unit identifier' },
  { name: 'metricName', type: 'string', description: 'Metric name' },
  { name: 'value', type: 'number', description: 'Metric value' },
  { name: 'quality', type: 'number', description: 'Quality score' },
  { name: 'availability', type: 'number', description: 'Equipment availability' },
  { name: 'performance', type: 'number', description: 'Performance efficiency' },
  { name: 'oeeScore', type: 'number', description: 'Overall Equipment Effectiveness' },
  { name: 'temperature', type: 'number', description: 'Temperature reading' },
  { name: 'pressure', type: 'number', description: 'Pressure reading' },
  { name: 'isOperational', type: 'boolean', description: 'Equipment status' },
  { name: 'operator', type: 'string', description: 'Operator name' },
  { name: 'shift', type: 'string', description: 'Work shift' },
  { name: 'productionLine', type: 'string', description: 'Production line' },
];

export function QueryBuilder({
  query: initialQuery,
  onQueryChange,
  onExecute,
  availableDataSources = ['Manufacturing Metrics', 'Quality Data', 'Equipment Status'],
  className = ''
}: QueryBuilderProps) {
  const [query, setQuery] = useState<Query>({
    id: 'query-1',
    name: 'New Query',
    dataSource: availableDataSources[0] || 'Manufacturing Metrics',
    table: 'metrics',
    fields: ['timestamp', 'value'],
    conditions: [],
    groups: [],
    sorts: [],
    timeField: 'timestamp',
    timeRange: { from: 'now-1h', to: 'now' },
    ...initialQuery
  });

  const [showRawSQL, setShowRawSQL] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    fields: true,
    filters: true,
    grouping: false,
    sorting: false,
    options: false
  });

  useEffect(() => {
    if (onQueryChange) {
      onQueryChange(query);
    }
  }, [query, onQueryChange]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const addCondition = () => {
    const newCondition: QueryCondition = {
      id: `condition-${Date.now()}`,
      field: MANUFACTURING_FIELDS[0].name,
      operator: '=',
      value: '',
      type: 'where'
    };
    setQuery(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  };

  const updateCondition = (id: string, updates: Partial<QueryCondition>) => {
    setQuery(prev => ({
      ...prev,
      conditions: prev.conditions.map(condition =>
        condition.id === id ? { ...condition, ...updates } : condition
      )
    }));
  };

  const removeCondition = (id: string) => {
    setQuery(prev => ({
      ...prev,
      conditions: prev.conditions.filter(condition => condition.id !== id)
    }));
  };

  const addGroup = () => {
    const newGroup: QueryGroup = {
      id: `group-${Date.now()}`,
      field: MANUFACTURING_FIELDS[0].name,
      aggregation: ''
    };
    setQuery(prev => ({
      ...prev,
      groups: [...prev.groups, newGroup]
    }));
  };

  const updateGroup = (id: string, updates: Partial<QueryGroup>) => {
    setQuery(prev => ({
      ...prev,
      groups: prev.groups.map(group =>
        group.id === id ? { ...group, ...updates } : group
      )
    }));
  };

  const removeGroup = (id: string) => {
    setQuery(prev => ({
      ...prev,
      groups: prev.groups.filter(group => group.id !== id)
    }));
  };

  const addSort = () => {
    const newSort: QuerySort = {
      id: `sort-${Date.now()}`,
      field: MANUFACTURING_FIELDS[0].name,
      direction: 'desc'
    };
    setQuery(prev => ({
      ...prev,
      sorts: [...prev.sorts, newSort]
    }));
  };

  const updateSort = (id: string, updates: Partial<QuerySort>) => {
    setQuery(prev => ({
      ...prev,
      sorts: prev.sorts.map(sort =>
        sort.id === id ? { ...sort, ...updates } : sort
      )
    }));
  };

  const removeSort = (id: string) => {
    setQuery(prev => ({
      ...prev,
      sorts: prev.sorts.filter(sort => sort.id !== id)
    }));
  };

  const generateSQL = () => {
    let sql = `SELECT ${query.fields.join(', ')}`;
    if (query.groups.length > 0) {
      const groupFields = query.groups.map(g => 
        g.aggregation ? `${g.aggregation}(${g.field})${g.alias ? ` as ${g.alias}` : ''}` : g.field
      );
      sql = `SELECT ${groupFields.join(', ')}`;
    }
    
    sql += `\nFROM ${query.table}`;
    
    if (query.conditions.length > 0) {
      const whereConditions = query.conditions
        .filter(c => c.type === 'where')
        .map(c => `${c.field} ${c.operator} ${typeof c.value === 'string' ? `'${c.value}'` : c.value}`)
        .join(' AND ');
      if (whereConditions) {
        sql += `\nWHERE ${whereConditions}`;
      }
    }
    
    if (query.groups.length > 0 && query.groups.some(g => !g.aggregation)) {
      const groupByFields = query.groups.filter(g => !g.aggregation).map(g => g.field);
      if (groupByFields.length > 0) {
        sql += `\nGROUP BY ${groupByFields.join(', ')}`;
      }
    }
    
    if (query.sorts.length > 0) {
      const orderBy = query.sorts.map(s => `${s.field} ${s.direction.toUpperCase()}`).join(', ');
      sql += `\nORDER BY ${orderBy}`;
    }
    
    if (query.limit) {
      sql += `\nLIMIT ${query.limit}`;
    }
    
    return sql;
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'string': return <Type className="h-4 w-4" />;
      case 'number': return <Hash className="h-4 w-4" />;
      case 'datetime': return <Calendar className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Query Builder</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowRawSQL(!showRawSQL)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showRawSQL ? <Eye className="h-4 w-4 mr-1" /> : <Code className="h-4 w-4 mr-1" />}
              {showRawSQL ? 'Visual' : 'SQL'}
            </button>
            <button
              onClick={() => onExecute?.(query)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Play className="h-4 w-4 mr-2" />
              Run Query
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {showRawSQL ? (
          /* SQL Editor View */
          <div className="space-y-4">
            <textarea
              value={generateSQL()}
              readOnly
              className="w-full h-64 p-3 border border-gray-300 rounded-md font-mono text-sm bg-gray-50"
            />
          </div>
        ) : (
          /* Visual Query Builder */
          <div className="space-y-6">
            {/* Data Source Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Source
              </label>
              <select
                value={query.dataSource}
                onChange={(e) => setQuery(prev => ({ ...prev, dataSource: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {availableDataSources.map(ds => (
                  <option key={ds} value={ds}>{ds}</option>
                ))}
              </select>
            </div>

            {/* Fields Selection */}
            <div>
              <button
                onClick={() => toggleSection('fields')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-sm font-medium text-gray-900">Fields</h4>
                {expandedSections.fields ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </button>
              
              {expandedSections.fields && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {MANUFACTURING_FIELDS.map(field => (
                      <label key={field.name} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={query.fields.includes(field.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setQuery(prev => ({
                                ...prev,
                                fields: [...prev.fields, field.name]
                              }));
                            } else {
                              setQuery(prev => ({
                                ...prev,
                                fields: prev.fields.filter(f => f !== field.name)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-1">
                          {getFieldIcon(field.type)}
                          <span className="text-sm text-gray-700">{field.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filters */}
            <div>
              <button
                onClick={() => toggleSection('filters')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-sm font-medium text-gray-900">Filters</h4>
                {expandedSections.filters ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </button>
              
              {expandedSections.filters && (
                <div className="mt-3 space-y-3">
                  {query.conditions.map(condition => {
                    const field = MANUFACTURING_FIELDS.find(f => f.name === condition.field);
                    const operators = field ? OPERATORS[field.type] : OPERATORS.string;
                    
                    return (
                      <div key={condition.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                        <Filter className="h-4 w-4 text-gray-400" />
                        
                        {/* Field Selection */}
                        <select
                          value={condition.field}
                          onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {MANUFACTURING_FIELDS.map(field => (
                            <option key={field.name} value={field.name}>{field.name}</option>
                          ))}
                        </select>
                        
                        {/* Operator Selection */}
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {operators.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        
                        {/* Value Input */}
                        {!['IS NULL', 'IS NOT NULL'].includes(condition.operator) && (
                          <input
                            type={field?.type === 'number' ? 'number' : 'text'}
                            value={condition.value}
                            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                            placeholder="Value"
                          />
                        )}
                        
                        <button
                          onClick={() => removeCondition(condition.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                  
                  <button
                    onClick={addCondition}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Filter
                  </button>
                </div>
              )}
            </div>

            {/* Grouping */}
            <div>
              <button
                onClick={() => toggleSection('grouping')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-sm font-medium text-gray-900">Grouping & Aggregation</h4>
                {expandedSections.grouping ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </button>
              
              {expandedSections.grouping && (
                <div className="mt-3 space-y-3">
                  {query.groups.map(group => (
                    <div key={group.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                      <Group className="h-4 w-4 text-gray-400" />
                      
                      <select
                        value={group.field}
                        onChange={(e) => updateGroup(group.id, { field: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {MANUFACTURING_FIELDS.map(field => (
                          <option key={field.name} value={field.name}>{field.name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={group.aggregation || ''}
                        onChange={(e) => updateGroup(group.id, { aggregation: e.target.value || undefined })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {AGGREGATIONS.map(agg => (
                          <option key={agg.value} value={agg.value}>{agg.label}</option>
                        ))}
                      </select>
                      
                      <input
                        type="text"
                        value={group.alias || ''}
                        onChange={(e) => updateGroup(group.id, { alias: e.target.value || undefined })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                        placeholder="Alias (optional)"
                      />
                      
                      <button
                        onClick={() => removeGroup(group.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={addGroup}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Grouping
                  </button>
                </div>
              )}
            </div>

            {/* Sorting */}
            <div>
              <button
                onClick={() => toggleSection('sorting')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-sm font-medium text-gray-900">Sorting</h4>
                {expandedSections.sorting ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </button>
              
              {expandedSections.sorting && (
                <div className="mt-3 space-y-3">
                  {query.sorts.map(sort => (
                    <div key={sort.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                      <SortAsc className="h-4 w-4 text-gray-400" />
                      
                      <select
                        value={sort.field}
                        onChange={(e) => updateSort(sort.id, { field: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                      >
                        {MANUFACTURING_FIELDS.map(field => (
                          <option key={field.name} value={field.name}>{field.name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={sort.direction}
                        onChange={(e) => updateSort(sort.id, { direction: e.target.value as 'asc' | 'desc' })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                      
                      <button
                        onClick={() => removeSort(sort.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={addSort}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Sort
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}