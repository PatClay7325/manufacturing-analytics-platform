# Analytics Parity Implementation Guide

## Overview

This guide provides concrete implementation steps to achieve full Analytics parity in your Manufacturing Analytics Platform. Each section includes code examples and architectural patterns matching Analytics's approach.

## 1. Variables and Templating System (CRITICAL)

### Implementation Structure

```typescript
// src/core/Analytics-engine/variables/VariableTypes.ts
export interface Variable {
  id: string;
  name: string;
  label?: string;
  type: 'query' | 'custom' | 'constant' | 'datasource' | 'interval' | 'textbox' | 'adhoc';
  query?: string;
  datasource?: string;
  current: VariableOption;
  options: VariableOption[];
  multi?: boolean;
  includeAll?: boolean;
  refresh?: 'never' | 'on-dashboard-load' | 'on-time-range-change';
  regex?: string;
  sort?: 'disabled' | 'alphabetical' | 'numerical' | 'alphabetical-case-insensitive';
  hide?: 'label' | 'variable' | '';
}

export interface VariableOption {
  text: string;
  value: string | string[];
  selected: boolean;
}
```

### Variable Manager Implementation

```typescript
// src/core/Analytics-engine/variables/VariableManager.ts
import { Variable, VariableOption } from './VariableTypes';

export class VariableManager {
  private variables: Map<string, Variable> = new Map();
  private dependencies: Map<string, Set<string>> = new Map();
  
  async initializeVariables(dashboardVariables: Variable[]) {
    // Sort by dependencies
    const sorted = this.topologicalSort(dashboardVariables);
    
    for (const variable of sorted) {
      await this.refreshVariable(variable);
      this.variables.set(variable.name, variable);
    }
  }
  
  async refreshVariable(variable: Variable) {
    switch (variable.type) {
      case 'query':
        variable.options = await this.executeQuery(variable);
        break;
      case 'custom':
        variable.options = this.parseCustomOptions(variable.query || '');
        break;
      case 'interval':
        variable.options = this.getIntervalOptions();
        break;
      // ... other types
    }
    
    // Apply regex filter if present
    if (variable.regex) {
      variable.options = this.applyRegexFilter(variable.options, variable.regex);
    }
    
    // Sort options
    if (variable.sort !== 'disabled') {
      variable.options = this.sortOptions(variable.options, variable.sort);
    }
    
    // Add "All" option if enabled
    if (variable.includeAll) {
      variable.options.unshift({
        text: 'All',
        value: '$__all',
        selected: false
      });
    }
    
    // Set current value
    this.updateCurrentValue(variable);
  }
  
  interpolateQuery(query: string): string {
    let interpolated = query;
    
    // Replace variable references
    this.variables.forEach((variable, name) => {
      const regex = new RegExp(`\\$\\{${name}(?::([^}]+))?\\}|\\$${name}\\b`, 'g');
      interpolated = interpolated.replace(regex, (match, format) => {
        return this.formatVariableValue(variable, format);
      });
    });
    
    // Replace built-in variables
    interpolated = this.replaceBuiltInVariables(interpolated);
    
    return interpolated;
  }
  
  private formatVariableValue(variable: Variable, format?: string): string {
    const value = variable.current.value;
    
    if (Array.isArray(value)) {
      switch (format) {
        case 'csv':
          return value.join(',');
        case 'pipe':
          return value.join('|');
        case 'regex':
          return `(${value.join('|')})`;
        case 'glob':
          return `{${value.join(',')}}`;
        case 'json':
          return JSON.stringify(value);
        default:
          return value.join(',');
      }
    }
    
    return String(value);
  }
}
```

### UI Component for Variables

```typescript
// src/components/Analytics-engine/variables/VariableDropdown.tsx
import React from 'react';
import { Variable } from '@/core/Analytics-engine/variables/VariableTypes';

interface VariableDropdownProps {
  variable: Variable;
  onChange: (variable: Variable, value: string | string[]) => void;
}

export function VariableDropdown({ variable, onChange }: VariableDropdownProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (variable.multi) {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      onChange(variable, selectedOptions);
    } else {
      onChange(variable, e.target.value);
    }
  };
  
  return (
    <div className="manufacturingPlatform-variable-dropdown">
      {variable.hide !== 'label' && (
        <label className="text-xs text-gray-400">
          {variable.label || variable.name}
        </label>
      )}
      <select
        multiple={variable.multi}
        value={variable.multi ? variable.current.value as string[] : variable.current.value as string}
        onChange={handleChange}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
      >
        {variable.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.text}
          </option>
        ))}
      </select>
    </div>
  );
}
```

## 2. Panel Editor (CRITICAL)

### Panel Edit Mode Implementation

```typescript
// src/components/Analytics-engine/panels/PanelEditor.tsx
import React, { useState } from 'react';
import { Panel } from '@/types/dashboard';
import { QueryEditor } from './QueryEditor';
import { VisualizationPicker } from './VisualizationPicker';
import { PanelOptionsEditor } from './PanelOptionsEditor';
import { TransformationsEditor } from './TransformationsEditor';
import { AlertRulesEditor } from './AlertRulesEditor';

interface PanelEditorProps {
  panel: Panel;
  onSave: (panel: Panel) => void;
  onCancel: () => void;
}

export function PanelEditor({ panel, onSave, onCancel }: PanelEditorProps) {
  const [activeTab, setActiveTab] = useState<'queries' | 'transform' | 'visualize' | 'alert'>('queries');
  const [editedPanel, setEditedPanel] = useState(panel);
  
  const tabs = [
    { id: 'queries', label: 'Queries', icon: 'database' },
    { id: 'transform', label: 'Transform', icon: 'shuffle' },
    { id: 'visualize', label: 'Visualization', icon: 'chart-line' },
    { id: 'alert', label: 'Alert', icon: 'bell' }
  ];
  
  return (
    <div className="manufacturingPlatform-panel-editor h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-lg font-medium">Edit Panel</h2>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded"
          >
            Discard
          </button>
          <button
            onClick={() => onSave(editedPanel)}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded"
          >
            Apply
          </button>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className={`fas fa-${tab.icon} mr-2`} />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Editor */}
        <div className="w-1/2 border-r border-gray-800 overflow-auto">
          {activeTab === 'queries' && (
            <QueryEditor
              queries={editedPanel.targets || []}
              onChange={queries => setEditedPanel({ ...editedPanel, targets: queries })}
            />
          )}
          {activeTab === 'transform' && (
            <TransformationsEditor
              transformations={editedPanel.transformations || []}
              onChange={transformations => setEditedPanel({ ...editedPanel, transformations })}
            />
          )}
          {activeTab === 'visualize' && (
            <div className="p-4">
              <VisualizationPicker
                current={editedPanel.type}
                onChange={type => setEditedPanel({ ...editedPanel, type })}
              />
              <PanelOptionsEditor
                panelType={editedPanel.type}
                options={editedPanel.options || {}}
                onChange={options => setEditedPanel({ ...editedPanel, options })}
              />
            </div>
          )}
          {activeTab === 'alert' && (
            <AlertRulesEditor
              rules={editedPanel.alert || []}
              onChange={alert => setEditedPanel({ ...editedPanel, alert })}
            />
          )}
        </div>
        
        {/* Right Panel - Preview */}
        <div className="w-1/2 p-4">
          <div className="h-full bg-gray-950 rounded border border-gray-800">
            <PanelRenderer panel={editedPanel} isPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Query Editor Implementation

```typescript
// src/components/Analytics-engine/panels/QueryEditor.tsx
import React from 'react';
import { Query } from '@/types/dashboard';
import CodeEditor from '@/components/common/CodeEditor';

interface QueryEditorProps {
  queries: Query[];
  onChange: (queries: Query[]) => void;
}

export function QueryEditor({ queries, onChange }: QueryEditorProps) {
  const addQuery = () => {
    onChange([
      ...queries,
      {
        refId: String.fromCharCode(65 + queries.length), // A, B, C...
        datasource: 'default',
        expr: '',
        hide: false
      }
    ]);
  };
  
  return (
    <div className="p-4">
      {queries.map((query, index) => (
        <div key={query.refId} className="mb-4 border border-gray-800 rounded p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-400">{query.refId}</span>
              <select
                value={query.datasource}
                onChange={e => {
                  const updated = [...queries];
                  updated[index] = { ...query, datasource: e.target.value };
                  onChange(updated);
                }}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              >
                <option value="prisma">Prisma</option>
                <option value="prometheus">Prometheus</option>
                <option value="influxdb">InfluxDB</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const updated = [...queries];
                  updated[index] = { ...query, hide: !query.hide };
                  onChange(updated);
                }}
                className={`px-2 py-1 text-xs rounded ${
                  query.hide ? 'bg-gray-700' : 'bg-gray-800'
                }`}
              >
                <i className={`fas fa-eye${query.hide ? '-slash' : ''}`} />
              </button>
              <button
                onClick={() => onChange(queries.filter((_, i) => i !== index))}
                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
              >
                <i className="fas fa-trash" />
              </button>
            </div>
          </div>
          
          {/* Query Input based on datasource type */}
          {query.datasource === 'prometheus' ? (
            <input
              type="text"
              value={query.expr}
              onChange={e => {
                const updated = [...queries];
                updated[index] = { ...query, expr: e.target.value };
                onChange(updated);
              }}
              placeholder="Enter PromQL query..."
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 font-mono text-sm"
            />
          ) : (
            <CodeEditor
              value={query.expr}
              onChange={value => {
                const updated = [...queries];
                updated[index] = { ...query, expr: value };
                onChange(updated);
              }}
              language="sql"
              height="100px"
            />
          )}
          
          {/* Additional Options */}
          <div className="mt-2 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-gray-400">Format as:</span>
              <select
                value={query.format || 'time_series'}
                onChange={e => {
                  const updated = [...queries];
                  updated[index] = { ...query, format: e.target.value };
                  onChange(updated);
                }}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
              >
                <option value="time_series">Time series</option>
                <option value="table">Table</option>
                <option value="heatmap">Heatmap</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-gray-400">Min interval:</span>
              <input
                type="text"
                value={query.interval || ''}
                onChange={e => {
                  const updated = [...queries];
                  updated[index] = { ...query, interval: e.target.value };
                  onChange(updated);
                }}
                placeholder="1m"
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-16"
              />
            </label>
          </div>
        </div>
      ))}
      
      <button
        onClick={addQuery}
        className="w-full py-2 border border-gray-700 border-dashed rounded hover:border-gray-600 text-gray-400 hover:text-white"
      >
        <i className="fas fa-plus mr-2" />
        Add Query
      </button>
    </div>
  );
}
```

## 3. Explore Mode Implementation

```typescript
// src/app/explore/page.tsx
import React, { useState } from 'react';
import { QueryEditor } from '@/components/Analytics-engine/panels/QueryEditor';
import { DataSourcePicker } from '@/components/Analytics-engine/datasources/DataSourcePicker';
import { TimeRangePicker } from '@/components/Analytics-engine/layout/TimeRangePicker';
import { LogsViewer } from '@/components/Analytics-engine/explore/LogsViewer';
import { MetricsExplorer } from '@/components/Analytics-engine/explore/MetricsExplorer';
import { QueryHistory } from '@/components/Analytics-engine/explore/QueryHistory';

export default function ExplorePage() {
  const [datasource, setDatasource] = useState('prisma');
  const [queries, setQueries] = useState([{ refId: 'A', expr: '', datasource }]);
  const [splitView, setSplitView] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  const runQueries = async () => {
    // Execute queries and update results
    const response = await fetch('/api/query/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries, timeRange, datasource })
    });
    const data = await response.json();
    setResults(data);
  };
  
  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Explore Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Explore</h1>
          <DataSourcePicker
            current={datasource}
            onChange={setDatasource}
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSplitView(!splitView)}
            className={`px-3 py-1 rounded ${
              splitView ? 'bg-blue-600' : 'bg-gray-800'
            }`}
          >
            <i className="fas fa-columns" /> Split
          </button>
          <TimeRangePicker />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Query Section */}
        <div className={`${splitView ? 'w-1/2' : 'w-full'} flex flex-col`}>
          <div className="p-4 border-b border-gray-800">
            <QueryEditor
              queries={queries}
              onChange={setQueries}
              datasource={datasource}
            />
            <button
              onClick={runQueries}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Run Query
            </button>
          </div>
          
          {/* Results */}
          <div className="flex-1 overflow-auto">
            {datasource === 'loki' ? (
              <LogsViewer logs={results?.logs || []} />
            ) : (
              <MetricsExplorer data={results?.series || []} />
            )}
          </div>
        </div>
        
        {/* Split View */}
        {splitView && (
          <div className="w-1/2 border-l border-gray-800">
            {/* Second explore pane */}
          </div>
        )}
      </div>
      
      {/* Query History Drawer */}
      <QueryHistory
        onSelectQuery={query => setQueries([query])}
      />
    </div>
  );
}
```

## 4. Data Source Plugin System

```typescript
// src/core/Analytics-engine/datasources/DataSourcePlugin.ts
export interface DataSourcePlugin {
  id: string;
  name: string;
  type: string;
  module: string;
  baseUrl?: string;
  info: {
    description: string;
    author: { name: string; url?: string };
    logos: { small: string; large: string };
    version: string;
    updated: string;
  };
}

export interface DataSourceApi {
  query(options: DataSourceQueryOptions): Promise<QueryResult>;
  testDatasource(): Promise<{ status: string; message: string }>;
  metricFindQuery?(query: string): Promise<MetricFindValue[]>;
  getLogRowContext?(row: LogRowModel, options?: any): Promise<{ data: DataFrame[] }>;
  modifyQuery?(query: DataQuery, action: QueryFixAction): DataQuery;
  getHighlighterExpression?(query: DataQuery): string[];
  languageProvider?: any;
}

// src/core/Analytics-engine/datasources/prometheus/PrometheusDataSource.ts
export class PrometheusDataSource implements DataSourceApi {
  constructor(private config: DataSourceConfig) {}
  
  async query(options: DataSourceQueryOptions): Promise<QueryResult> {
    const { targets, range, interval } = options;
    const promises = targets.map(target => this.performQuery(target, range, interval));
    const results = await Promise.all(promises);
    
    return {
      data: results.flat(),
      state: 'Done'
    };
  }
  
  private async performQuery(target: Query, range: TimeRange, interval: string) {
    const query = this.interpolateQuery(target.expr, range, interval);
    const response = await fetch(`${this.config.url}/api/v1/query_range`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        query,
        start: range.from.unix().toString(),
        end: range.to.unix().toString(),
        step: interval
      })
    });
    
    const data = await response.json();
    return this.transformResponse(data, target);
  }
  
  async metricFindQuery(query: string): Promise<MetricFindValue[]> {
    // Implement metric discovery
    const response = await fetch(`${this.config.url}/api/v1/label/__name__/values`);
    const data = await response.json();
    
    return data.data.map((metric: string) => ({
      text: metric,
      value: metric
    }));
  }
  
  async testDatasource(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${this.config.url}/api/v1/query?query=1`);
      if (response.ok) {
        return { status: 'success', message: 'Data source is working' };
      }
      return { status: 'error', message: `HTTP error ${response.status}` };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}
```

## 5. Unified Alerting System

```typescript
// src/core/Analytics-engine/alerting/UnifiedAlerting.ts
export interface AlertRule {
  uid: string;
  title: string;
  condition: string;
  data: AlertQuery[];
  noDataState: 'NoData' | 'Alerting' | 'OK';
  execErrState: 'Alerting' | 'OK';
  for: string;
  annotations: Record<string, string>;
  labels: Record<string, string>;
  folderUID: string;
  ruleGroup: string;
  namespace: string;
}

export class UnifiedAlertingEngine {
  async evaluateRule(rule: AlertRule): Promise<AlertEvaluation> {
    try {
      // Execute all queries
      const queryResults = await this.executeQueries(rule.data);
      
      // Evaluate condition
      const conditionResult = await this.evaluateCondition(
        rule.condition,
        queryResults
      );
      
      // Check for state
      if (conditionResult.matches) {
        return {
          state: 'Alerting',
          results: conditionResult.values,
          evaluatedAt: new Date()
        };
      }
      
      return {
        state: 'Normal',
        results: [],
        evaluatedAt: new Date()
      };
    } catch (error) {
      return {
        state: rule.execErrState === 'Alerting' ? 'Alerting' : 'Normal',
        error: error.message,
        evaluatedAt: new Date()
      };
    }
  }
  
  private async evaluateCondition(
    condition: string,
    data: QueryResult[]
  ): Promise<ConditionResult> {
    // Parse and evaluate condition expression
    // Support for math expressions, reduce functions, etc.
    const parser = new ConditionParser();
    const ast = parser.parse(condition);
    return this.evalAST(ast, data);
  }
}
```

## 6. Dashboard As Code (JSON Model)

```typescript
// src/core/Analytics-engine/dashboard/DashboardModel.ts
export interface DashboardModel {
  id?: number;
  uid: string;
  title: string;
  tags: string[];
  timezone: 'browser' | 'utc' | string;
  schemaVersion: number;
  version: number;
  weekStart: string;
  gnetId?: string;
  panels: PanelModel[];
  templating: {
    list: VariableModel[];
  };
  annotations: {
    list: AnnotationQuery[];
  };
  refresh?: string;
  time: {
    from: string;
    to: string;
  };
  timepicker: TimePickerConfig;
  fiscalYearStartMonth?: number;
  liveNow?: boolean;
  editable: boolean;
  links: DashboardLink[];
}

// Implement Analytics's JSON model import/export
export class DashboardImporter {
  async importDashboard(json: string | object): Promise<Dashboard> {
    const model = typeof json === 'string' ? JSON.parse(json) : json;
    
    // Validate schema
    this.validateDashboardModel(model);
    
    // Transform to internal format
    const dashboard = this.transformToInternal(model);
    
    // Process panels
    dashboard.panels = await Promise.all(
      model.panels.map(panel => this.transformPanel(panel))
    );
    
    // Process variables
    dashboard.variables = model.templating.list.map(
      v => this.transformVariable(v)
    );
    
    return dashboard;
  }
  
  exportDashboard(dashboard: Dashboard): DashboardModel {
    return {
      uid: dashboard.uid,
      title: dashboard.title,
      tags: dashboard.tags,
      timezone: dashboard.timezone || 'browser',
      schemaVersion: 37, // Current Analytics schema
      version: dashboard.version,
      panels: dashboard.panels.map((p, i) => ({
        ...p,
        id: i + 1,
        gridPos: p.gridPos
      })),
      templating: {
        list: dashboard.variables || []
      },
      annotations: {
        list: dashboard.annotations || []
      },
      time: dashboard.timeRange,
      timepicker: dashboard.timepicker || this.getDefaultTimepicker(),
      editable: true,
      links: dashboard.links || []
    };
  }
}
```

## Implementation Priority

### Phase 1: Core Foundation (Weeks 1-4)
1. **Variables System** ✅ Implementation provided above
2. **Panel Editor** ✅ Implementation provided above
3. **Additional Panel Types**:
   - Graph (Time Series)
   - Bar Chart
   - Pie Chart
   - Logs Panel
   - News Panel

### Phase 2: Data & Queries (Weeks 5-8)
1. **Query Builder UI**
2. **Data Source Plugins**:
   - Prometheus
   - InfluxDB
   - Elasticsearch
   - MySQL/PostgreSQL
3. **Mixed Data Sources**
4. **Explore Mode** ✅ Implementation provided above

### Phase 3: Advanced Features (Weeks 9-12)
1. **Unified Alerting** ✅ Framework provided above
2. **Annotations System**
3. **Dashboard Links & Drilldowns**
4. **Library Panels**
5. **Playlists**

### Phase 4: Enterprise Features (Weeks 13-16)
1. **RBAC & Team Management**
2. **LDAP/OAuth Integration**
3. **Reporting & PDF Export**
4. **White Labeling**
5. **Audit Logs**

## Testing Strategy

```typescript
// src/__tests__/Analytics-engine/manufacturingPlatform-parity.test.ts
describe('Analytics Parity Tests', () => {
  describe('Variables', () => {
    it('should support all Analytics variable types', () => {
      const types = ['query', 'custom', 'constant', 'datasource', 'interval', 'textbox', 'adhoc'];
      types.forEach(type => {
        const variable = createVariable({ type });
        expect(variableManager.isSupported(variable)).toBe(true);
      });
    });
    
    it('should interpolate variables in queries', () => {
      const query = 'SELECT * FROM metrics WHERE host = $hostname';
      const interpolated = variableManager.interpolateQuery(query);
      expect(interpolated).toBe('SELECT * FROM metrics WHERE host = \'server1\'');
    });
  });
  
  describe('Panel Editor', () => {
    it('should support in-place editing', async () => {
      const { getByText, getByRole } = render(<Panel editable />);
      fireEvent.click(getByText('Edit'));
      expect(getByRole('dialog')).toBeInTheDocument();
    });
  });
  
  describe('Import/Export', () => {
    it('should import Analytics Dashboard JSON', async () => {
      const manufacturingPlatformJson = loadFixture('manufacturingPlatform-dashboard.json');
      const dashboard = await importer.importDashboard(manufacturingPlatformJson);
      expect(dashboard.panels).toHaveLength(6);
      expect(dashboard.variables).toHaveLength(3);
    });
  });
});
```

## Conclusion

This implementation guide provides the critical missing components to achieve Analytics parity. The code examples follow Analytics's architectural patterns while maintaining your own implementation. Focus on Phase 1 first as these are the most critical gaps that users will notice immediately.